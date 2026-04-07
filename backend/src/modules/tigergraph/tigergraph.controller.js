/**
 * TigerGraph Analysis Controller
 * Exposes graph-powered analytics endpoints
 */

const { pgPool } = require('../../config/db');
const { ok, fail } = require('../../utils/response');
const tgService = require('./tigergraph.service');

// GET /api/tigergraph/health
const health = async (req, res) => {
  try {
    const status = await tgService.healthCheck();
    return ok(res, status, status.connected ? 'TigerGraph connected ✓' : 'TigerGraph not connected (mock mode)');
  } catch (err) {
    return fail(res, 'TigerGraph health check failed', 500);
  }
};

// GET /api/tigergraph/proxy-detection/:class_id
// Detects students who may be proxies in a given class
const proxyDetection = async (req, res) => {
  const { class_id } = req.params;
  try {
    // Also load from PostgreSQL for context
    const pgResult = await pgPool.query(
      `SELECT a.student_id, s.name, s.roll_no,
              a.face_confidence, a.gps_distance_m, a.method, a.marked_at
       FROM attendance a
       JOIN students s ON a.student_id = s.id
       WHERE a.class_id = $1 AND a.status = 'present'`,
      [class_id]
    );

    // TigerGraph analysis
    const tgAnalysis = await tgService.detectProxyCandidates(class_id);

    // Local rule-based proxy detection (always available even without TigerGraph)
    const localSuspects = pgResult.rows.filter(r =>
      (r.face_confidence !== null && r.face_confidence < 0.5) ||
      (r.gps_distance_m !== null && r.gps_distance_m > 80) ||
      r.method === 'manual'
    ).map(r => ({
      student_id:     r.student_id,
      name:           r.name,
      roll_no:        r.roll_no,
      face_confidence: r.face_confidence,
      gps_distance_m:  r.gps_distance_m,
      method:          r.method,
      risk_level:      r.face_confidence < 0.4 ? 'HIGH' : r.face_confidence < 0.6 ? 'MEDIUM' : 'LOW',
      flags:           [
        r.face_confidence < 0.5 ? 'Low face confidence' : null,
        r.gps_distance_m > 80 ? `GPS ${Math.round(r.gps_distance_m)}m away` : null,
        r.method === 'manual' ? 'Manual override' : null,
      ].filter(Boolean),
    }));

    return ok(res, {
      class_id: parseInt(class_id),
      total_present: pgResult.rows.length,
      local_suspects: localSuspects,
      graph_analysis: tgAnalysis,
      analysis_source: tgAnalysis.source,
    }, 'Proxy detection complete');
  } catch (err) {
    console.error('[TigerGraph] proxyDetection:', err.message);
    return fail(res, 'Proxy detection failed', 500);
  }
};

// GET /api/tigergraph/attendance-pattern/:student_id
// Graph-based attendance pattern analysis for a student
const attendancePattern = async (req, res) => {
  const { student_id } = req.params;
  const { last_n = 20 } = req.query;

  try {
    // PostgreSQL data for fallback / enrichment
    const pgResult = await pgPool.query(
      `SELECT a.status, a.method, a.face_confidence, a.gps_distance_m, a.marked_at,
              c.subject, c.class_date, c.start_time, c.batch, c.section
       FROM attendance a
       JOIN classes c ON a.class_id = c.id
       WHERE a.student_id = $1
       ORDER BY c.class_date DESC, c.start_time DESC
       LIMIT $2`,
      [student_id, parseInt(last_n)]
    );

    // Subject-wise summary from PostgreSQL
    const subjectSummary = {};
    for (const row of pgResult.rows) {
      if (!subjectSummary[row.subject]) {
        subjectSummary[row.subject] = { present: 0, absent: 0, total: 0 };
      }
      subjectSummary[row.subject].total++;
      if (row.status === 'present') subjectSummary[row.subject].present++;
      else subjectSummary[row.subject].absent++;
    }
    for (const s of Object.values(subjectSummary)) {
      s.percentage = s.total > 0 ? Math.round((s.present / s.total) * 100) : 0;
      s.below_75   = s.percentage < 75;
    }

    // Consecutive absences detection from PostgreSQL data
    let consecutive = 0;
    let maxConsecutive = 0;
    let tempConsec = 0;
    const sorted = [...pgResult.rows].sort((a, b) => new Date(a.class_date) - new Date(b.class_date));
    for (const row of sorted) {
      if (row.status !== 'present') { tempConsec++; maxConsecutive = Math.max(maxConsecutive, tempConsec); }
      else tempConsec = 0;
    }
    // Current streak (from end)
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].status !== 'present') consecutive++;
      else break;
    }

    // TigerGraph pattern analysis (enrichment)
    const graphPattern = await tgService.getAttendancePattern(student_id, parseInt(last_n));

    return ok(res, {
      student_id: parseInt(student_id),
      recent_records: pgResult.rows,
      subject_summary: subjectSummary,
      consecutive_absences_now: consecutive,
      max_consecutive_absences: maxConsecutive,
      alert: consecutive >= 3 ? `⚠️ Student has been absent for ${consecutive} consecutive classes!` : null,
      graph_analysis: graphPattern,
    }, 'Attendance pattern analysis complete');
  } catch (err) {
    console.error('[TigerGraph] attendancePattern:', err.message);
    return fail(res, 'Pattern analysis failed', 500);
  }
};

// GET /api/tigergraph/low-attendance?batch=BCA-2024&threshold=75
// Returns students below attendance threshold using graph query
const lowAttendance = async (req, res) => {
  const { batch, threshold = 75, department_id } = req.query;
  if (!batch && !department_id) return fail(res, 'batch or department_id required');

  try {
    const thresholdPct = parseFloat(threshold) / 100;

    // PostgreSQL calculation (always available)
    let q = `
      SELECT s.id AS student_id, s.name, s.roll_no, s.batch, s.section,
             d.name AS department,
             COUNT(CASE WHEN a.status = 'present' THEN 1 END) AS present_count,
             COUNT(a.id) AS total_count
      FROM students s
      LEFT JOIN attendance a ON s.id = a.student_id
      LEFT JOIN departments d ON s.department_id = d.id
      WHERE s.is_active = TRUE
    `;
    const p = [];
    if (batch)         { p.push(batch);         q += ` AND s.batch = $${p.length}`; }
    if (department_id) { p.push(department_id);  q += ` AND s.department_id = $${p.length}`; }
    q += ' GROUP BY s.id, s.name, s.roll_no, s.batch, s.section, d.name ORDER BY s.name';

    const pgResult = await pgPool.query(q, p);
    const students = pgResult.rows.map(r => {
      const pct = r.total_count > 0 ? Math.round((r.present_count / r.total_count) * 100) : 100;
      return {
        ...r,
        attendance_pct: pct,
        below_75: pct < 75,
        below_60: pct < 60,
        risk: pct < 60 ? 'CRITICAL' : pct < 75 ? 'WARNING' : 'OK',
      };
    }).filter(r => r.attendance_pct < parseFloat(threshold));

    // TigerGraph graph query (enrichment if available)
    let graphData = null;
    if (batch) {
      const tg = await tgService.getLowAttendanceStudents(batch, thresholdPct);
      graphData = tg;
    }

    return ok(res, {
      batch,
      threshold_pct: parseFloat(threshold),
      pg_students:   students,
      critical_count: students.filter(s => s.risk === 'CRITICAL').length,
      warning_count:  students.filter(s => s.risk === 'WARNING').length,
      graph_analysis: graphData,
    }, `Found ${students.length} students below ${threshold}% attendance`);
  } catch (err) {
    console.error('[TigerGraph] lowAttendance:', err.message);
    return fail(res, 'Low attendance query failed', 500);
  }
};

// POST /api/tigergraph/sync/class/:class_id
// Manually trigger sync of a class's attendance to TigerGraph
const syncClass = async (req, res) => {
  const { class_id } = req.params;
  try {
    const cls = await pgPool.query('SELECT * FROM classes WHERE id = $1', [class_id]);
    if (!cls.rows.length) return fail(res, 'Class not found', 404);

    const attendanceRows = await pgPool.query(
      'SELECT * FROM attendance WHERE class_id = $1', [class_id]
    );
    const enrolled = await pgPool.query(
      'SELECT student_id FROM class_enrollments WHERE class_id = $1', [class_id]
    );

    // Sync class vertex
    await tgService.syncClass(cls.rows[0]);

    // Sync all attendance
    let synced = 0;
    for (const row of attendanceRows.rows) {
      if (row.status === 'present') {
        await tgService.syncAttendancePresent({
          student_id: row.student_id, class_id: cls.rows[0].id,
          method: row.method, face_confidence: row.face_confidence,
          gps_distance_m: row.gps_distance_m, marked_at: row.marked_at,
        });
      } else {
        await tgService.syncAttendanceAbsent({ student_id: row.student_id, class_id: cls.rows[0].id });
      }
      synced++;
    }

    return ok(res, { class_id: parseInt(class_id), synced_records: synced }, `Synced ${synced} attendance records to TigerGraph`);
  } catch (err) {
    console.error('[TigerGraph] syncClass:', err.message);
    return fail(res, 'Sync failed', 500);
  }
};

// POST /api/tigergraph/sync/student/:student_id
const syncStudent = async (req, res) => {
  const { student_id } = req.params;
  try {
    const r = await pgPool.query(
      `SELECT s.*, d.name AS department FROM students s LEFT JOIN departments d ON s.department_id = d.id WHERE s.id = $1`,
      [student_id]
    );
    if (!r.rows.length) return fail(res, 'Student not found', 404);
    const result = await tgService.syncStudent(r.rows[0]);
    return ok(res, { student_id: parseInt(student_id), tg_result: result }, 'Student synced to TigerGraph');
  } catch (err) {
    return fail(res, 'Sync failed', 500);
  }
};

// GET /api/tigergraph/consecutive-absences/:student_id
const consecutiveAbsences = async (req, res) => {
  const { student_id } = req.params;
  try {
    const data = await tgService.getConsecutiveAbsences(student_id);

    // Enrich with PostgreSQL
    const pgResult = await pgPool.query(
      `SELECT c.subject, c.class_date, a.status
       FROM attendance a JOIN classes c ON a.class_id = c.id
       WHERE a.student_id = $1
       ORDER BY c.class_date DESC, c.start_time DESC LIMIT 30`,
      [student_id]
    );

    // Per-subject consecutive absences
    const bySubject = {};
    for (const row of pgResult.rows) {
      if (!bySubject[row.subject]) bySubject[row.subject] = { streak: 0, records: [] };
      bySubject[row.subject].records.push(row);
    }
    for (const [subj, d] of Object.entries(bySubject)) {
      let streak = 0;
      for (const r of d.records) {
        if (r.status !== 'present') streak++;
        else break;
      }
      d.streak = streak;
      d.alert  = streak >= 3 ? `⚠️ ${streak} consecutive absences in ${subj}` : null;
    }

    return ok(res, {
      student_id: parseInt(student_id),
      by_subject: bySubject,
      graph_data: data,
    }, 'Consecutive absence analysis complete');
  } catch (err) {
    return fail(res, 'Analysis failed', 500);
  }
};

module.exports = { health, proxyDetection, attendancePattern, lowAttendance, syncClass, syncStudent, consecutiveAbsences };
