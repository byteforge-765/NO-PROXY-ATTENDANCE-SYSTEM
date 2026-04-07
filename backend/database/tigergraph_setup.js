// ════════════════════════════════════════════════════════════════
//  ICMS TigerGraph Schema Setup
//  Run: node database/tigergraph_setup.js
//  Purpose: Attendance Pattern Analysis + Proxy Detection Graph
// ════════════════════════════════════════════════════════════════

const axios = require('axios');
require('dotenv').config({ path: '../.env' });

const TG_HOST = process.env.TIGERGRAPH_HOST  || 'http://localhost';
const TG_PORT = process.env.TIGERGRAPH_PORT  || '14240';
const TG_USER = process.env.TIGERGRAPH_USER  || 'tigergraph';
const TG_PASS = process.env.TIGERGRAPH_PASSWORD || 'tigergraph123';
const TG_GRAPH= process.env.TIGERGRAPH_GRAPH || 'ICMS';

const GSQL_SCHEMA = `
USE GLOBAL
CREATE VERTEX Student (PRIMARY_ID student_id STRING, name STRING, batch STRING, section STRING, department STRING, is_active BOOL DEFAULT TRUE)
CREATE VERTEX Class   (PRIMARY_ID class_id STRING, subject STRING, subject_code STRING, class_date STRING, start_time STRING, batch STRING, section STRING)
CREATE VERTEX Faculty (PRIMARY_ID faculty_id STRING, name STRING, department STRING)
CREATE VERTEX Department (PRIMARY_ID dept_id STRING, name STRING, code STRING)

CREATE DIRECTED EDGE ATTENDED (FROM Student, TO Class, DISCRIMINATOR(method STRING), status STRING DEFAULT "present", face_confidence FLOAT DEFAULT 0, gps_distance_m FLOAT DEFAULT 0, marked_at STRING, is_proxy_suspected BOOL DEFAULT FALSE)
CREATE DIRECTED EDGE ABSENT_FROM (FROM Student, TO Class, reason STRING DEFAULT "")
CREATE DIRECTED EDGE TEACHES (FROM Faculty, TO Class)
CREATE DIRECTED EDGE ENROLLED_IN (FROM Student, TO Class)
CREATE DIRECTED EDGE BELONGS_TO_DEPT (FROM Student, TO Department)
CREATE DIRECTED EDGE TEACHES_IN_DEPT (FROM Faculty, TO Department)

CREATE GRAPH ${TG_GRAPH} (Student, Class, Faculty, Department, ATTENDED, ABSENT_FROM, TEACHES, ENROLLED_IN, BELONGS_TO_DEPT, TEACHES_IN_DEPT)
`;

// ── Pre-installed Queries (GSQL) ──────────────────────────────────────────────
const QUERY_PROXY_DETECTION = `
USE GRAPH ${TG_GRAPH}
CREATE OR REPLACE QUERY detect_proxy_candidates(INT class_id_int) FOR GRAPH ${TG_GRAPH} {
  /* Returns students who attended but have suspicious GPS patterns:
     - GPS distance > 100m AND face_confidence < 0.6
     - OR attended but same GPS coordinates as multiple other students (cluster) */
  SumAccum<INT> @attendedClasses;
  SumAccum<FLOAT> @avgConfidence;
  SumAccum<FLOAT> @avgGpsDistance;
  BOOL @proxyFlag;

  STRING class_id = to_string(class_id_int);

  Attendees = SELECT s FROM Student:s -(ATTENDED:e)-> Class:c
              WHERE c.class_id == class_id
              ACCUM s.@attendedClasses += 1, s.@avgConfidence += e.face_confidence, s.@avgGpsDistance += e.gps_distance_m
              POST-ACCUM s.@proxyFlag = (s.@avgGpsDistance > 100 AND s.@avgConfidence < 0.6);

  Suspects = SELECT s FROM Attendees:s WHERE s.@proxyFlag == TRUE;
  PRINT Suspects[Suspects.student_id, Suspects.name, Suspects.@avgConfidence AS avg_confidence, Suspects.@avgGpsDistance AS avg_gps_distance];
}
`;

const QUERY_ATTENDANCE_PATTERN = `
USE GRAPH ${TG_GRAPH}
CREATE OR REPLACE QUERY attendance_pattern(STRING student_id, INT last_n_classes) FOR GRAPH ${TG_GRAPH} {
  /* Returns attendance pattern for a student: subject-wise, consecutive absences */
  ListAccum<STRING> @classIds;
  ListAccum<STRING> @statuses;
  MapAccum<STRING, SumAccum<INT>> @subjectPresent;
  MapAccum<STRING, SumAccum<INT>> @subjectTotal;
  SumAccum<INT> @consecutiveAbsent;
  SumAccum<INT> @maxConsecutiveAbsent;

  Students = {Student.*};
  Target = SELECT s FROM Students:s WHERE s.student_id == student_id;

  // Attended classes
  Attended = SELECT c FROM Target:s -(ATTENDED:e)-> Class:c
             ACCUM Target.@subjectPresent += (c.subject -> 1), Target.@subjectTotal += (c.subject -> 1);

  // Absent classes
  Absent = SELECT c FROM Target:s -(ABSENT_FROM)-> Class:c
           ACCUM Target.@subjectTotal += (c.subject -> 1);

  PRINT Target[Target.student_id, Target.name, Target.@subjectPresent AS present_per_subject, Target.@subjectTotal AS total_per_subject];
}
`;

const QUERY_LOW_ATTENDANCE = `
USE GRAPH ${TG_GRAPH}
CREATE OR REPLACE QUERY low_attendance_students(STRING batch, FLOAT threshold) FOR GRAPH ${TG_GRAPH} {
  /* Returns students whose overall attendance < threshold (e.g. 0.75 = 75%) */
  SumAccum<INT> @presentCount;
  SumAccum<INT> @totalCount;
  FLOAT @attendancePct;

  Students = {Student.*};
  Batch = SELECT s FROM Students:s WHERE s.batch == batch;

  SELECT s FROM Batch:s -(ATTENDED)-> Class:c ACCUM s.@presentCount += 1, s.@totalCount += 1;
  SELECT s FROM Batch:s -(ABSENT_FROM)-> Class:c ACCUM s.@totalCount += 1;

  Low = SELECT s FROM Batch:s
        POST-ACCUM s.@attendancePct = (s.@totalCount > 0 ? (s.@presentCount * 1.0 / s.@totalCount) : 1.0)
        WHERE s.@attendancePct < threshold;

  PRINT Low[Low.student_id, Low.name, Low.batch, Low.@presentCount AS present_count, Low.@totalCount AS total_count, Low.@attendancePct AS attendance_pct];
}
`;

const QUERY_CONSECUTIVE_ABSENCES = `
USE GRAPH ${TG_GRAPH}
CREATE OR REPLACE QUERY consecutive_absences(STRING student_id) FOR GRAPH ${TG_GRAPH} {
  /* Returns how many consecutive classes student has been absent from, per subject */
  SumAccum<INT> @recentAbsences;
  Students = {Student.*};
  Target = SELECT s FROM Students:s WHERE s.student_id == student_id;
  Recent = SELECT c FROM Target:s -(ABSENT_FROM)-> Class:c ORDER BY c.class_date DESC LIMIT 10;
  PRINT Target, Recent;
}
`;

async function runGSQL(gsql) {
  try {
    const res = await axios.post(
      `${TG_HOST}:${TG_PORT}/gsql`,
      gsql,
      { auth: { username: TG_USER, password: TG_PASS }, headers: { 'Content-Type': 'text/plain' }, timeout: 30000 }
    );
    console.log('[TigerGraph GSQL]', res.data?.substring ? res.data.substring(0, 200) : res.data);
    return true;
  } catch (err) {
    console.error('[TigerGraph GSQL Error]', err.response?.data || err.message);
    return false;
  }
}

async function setup() {
  console.log('\n[TigerGraph Setup] Starting...');
  console.log(`[TigerGraph] Connecting to ${TG_HOST}:${TG_PORT}`);

  let ok = await runGSQL(GSQL_SCHEMA);
  if (!ok) { console.warn('[TigerGraph] Schema creation failed (may already exist — continuing)'); }

  await runGSQL(QUERY_PROXY_DETECTION);
  await runGSQL(QUERY_ATTENDANCE_PATTERN);
  await runGSQL(QUERY_LOW_ATTENDANCE);
  await runGSQL(QUERY_CONSECUTIVE_ABSENCES);

  // Install queries
  try {
    const install = await axios.get(
      `${TG_HOST}:${TG_PORT}/installquery/${TG_GRAPH}?queries=detect_proxy_candidates,attendance_pattern,low_attendance_students,consecutive_absences`,
      { auth: { username: TG_USER, password: TG_PASS }, timeout: 60000 }
    );
    console.log('[TigerGraph] Queries installed:', install.data);
  } catch (err) {
    console.warn('[TigerGraph] Query install skipped:', err.message);
  }

  console.log('[TigerGraph Setup] Complete ✓\n');
}

setup().catch(console.error);
