/**
 * TigerGraph Attendance Graph Service
 *
 * WHAT goes to TigerGraph:
 *   - Student vertices (id, name, batch, section, dept)
 *   - Class vertices (id, subject, date, time)
 *   - ATTENDED edges (with face_confidence, gps_distance)
 *   - ABSENT_FROM edges
 *
 * WHAT stays in PostgreSQL:
 *   - Everything else (auth, fee, timetable, departments, faculty)
 *
 * WHAT stays in MongoDB:
 *   - Live attendance sessions (step1/step2/step3 state)
 */

const { upsertVertex, upsertEdge, runQuery, ping, TG_GRAPH } = require('../../config/tigergraph');

// ────────────────────────────────────────────────────────────────────────────
// SYNC: Push student to TigerGraph
// ────────────────────────────────────────────────────────────────────────────
const syncStudent = async (student) => {
  return upsertVertex('Student', String(student.id), {
    name:       { value: student.name || '' },
    batch:      { value: student.batch || '' },
    section:    { value: student.section || '' },
    department: { value: student.department || '' },
    is_active:  { value: student.is_active !== false },
  });
};

// ────────────────────────────────────────────────────────────────────────────
// SYNC: Push class to TigerGraph
// ────────────────────────────────────────────────────────────────────────────
const syncClass = async (cls) => {
  return upsertVertex('Class', String(cls.id), {
    subject:      { value: cls.subject || '' },
    subject_code: { value: cls.subject_code || '' },
    class_date:   { value: String(cls.class_date || '') },
    start_time:   { value: String(cls.start_time || '') },
    batch:        { value: cls.batch || '' },
    section:      { value: cls.section || '' },
  });
};

// ────────────────────────────────────────────────────────────────────────────
// SYNC: Push attendance record (present) to TigerGraph
// ────────────────────────────────────────────────────────────────────────────
const syncAttendancePresent = async ({ student_id, class_id, method = 'smart', face_confidence = 0, gps_distance_m = 0, marked_at = new Date() }) => {
  // Also ensure vertices exist
  await upsertVertex('Student', String(student_id), {});
  await upsertVertex('Class',   String(class_id),   {});

  return upsertEdge('Student', String(student_id), 'ATTENDED', 'Class', String(class_id), {
    method:               { value: method },
    status:               { value: 'present' },
    face_confidence:      { value: parseFloat(face_confidence) || 0 },
    gps_distance_m:       { value: parseFloat(gps_distance_m) || 0 },
    marked_at:            { value: String(marked_at) },
    is_proxy_suspected:   { value: false },
  });
};

// ────────────────────────────────────────────────────────────────────────────
// SYNC: Push absent record to TigerGraph
// ────────────────────────────────────────────────────────────────────────────
const syncAttendanceAbsent = async ({ student_id, class_id }) => {
  await upsertVertex('Student', String(student_id), {});
  await upsertVertex('Class',   String(class_id),   {});
  return upsertEdge('Student', String(student_id), 'ABSENT_FROM', 'Class', String(class_id), {
    reason: { value: 'auto' },
  });
};

// ────────────────────────────────────────────────────────────────────────────
// SYNC: Bulk sync a full class attendance list to TigerGraph
//       Called after OTP verification closes for a class
// ────────────────────────────────────────────────────────────────────────────
const bulkSyncClassAttendance = async (classData, attendanceRows, enrolledStudentIds) => {
  // Sync class vertex
  await syncClass(classData);

  const presentIds = new Set(attendanceRows.filter(r => r.status === 'present').map(r => String(r.student_id)));

  for (const row of attendanceRows) {
    if (row.status === 'present') {
      await syncAttendancePresent({
        student_id:     row.student_id,
        class_id:       classData.id,
        method:         row.method || 'smart',
        face_confidence: row.face_confidence || 0,
        gps_distance_m:  row.gps_distance_m || 0,
        marked_at:       row.marked_at,
      });
    } else {
      await syncAttendanceAbsent({ student_id: row.student_id, class_id: classData.id });
    }
  }

  // Students enrolled but no attendance record → mark absent
  for (const sid of enrolledStudentIds) {
    if (!presentIds.has(String(sid))) {
      await syncAttendanceAbsent({ student_id: sid, class_id: classData.id });
    }
  }
};

// ────────────────────────────────────────────────────────────────────────────
// ANALYSIS: Detect proxy suspects for a class
// ────────────────────────────────────────────────────────────────────────────
const detectProxyCandidates = async (class_id) => {
  // Try TigerGraph query first
  const tgResult = await runQuery('detect_proxy_candidates', { class_id_int: class_id });
  if (tgResult.ok && tgResult.data?.results) {
    const rows = tgResult.data.results[0]?.Suspects || [];
    return {
      source: 'tigergraph',
      suspects: rows.map(r => ({
        student_id:     r.student_id,
        name:           r.name,
        avg_confidence: r.avg_confidence,
        avg_gps_distance: r.avg_gps_distance,
        risk_level:     r.avg_confidence < 0.4 ? 'HIGH' : 'MEDIUM',
      })),
    };
  }

  // Fallback: mock analysis (TigerGraph not available)
  return {
    source: 'mock',
    suspects: [],
    note: 'TigerGraph not connected — proxy detection unavailable in real-time. Data will be analysed when TigerGraph is connected.',
  };
};

// ────────────────────────────────────────────────────────────────────────────
// ANALYSIS: Get attendance pattern for a student
// ────────────────────────────────────────────────────────────────────────────
const getAttendancePattern = async (student_id, last_n_classes = 20) => {
  const tgResult = await runQuery('attendance_pattern', { student_id: String(student_id), last_n_classes });
  if (tgResult.ok && tgResult.data?.results) {
    return { source: 'tigergraph', pattern: tgResult.data.results };
  }
  return {
    source: 'mock',
    pattern: null,
    note: 'TigerGraph not connected — pattern analysis unavailable.',
  };
};

// ────────────────────────────────────────────────────────────────────────────
// ANALYSIS: Students with low attendance (< threshold %) in a batch
// ────────────────────────────────────────────────────────────────────────────
const getLowAttendanceStudents = async (batch, threshold = 0.75) => {
  const tgResult = await runQuery('low_attendance_students', { batch, threshold });
  if (tgResult.ok && tgResult.data?.results) {
    const rows = tgResult.data.results[0]?.Low || [];
    return {
      source: 'tigergraph',
      students: rows.map(r => ({
        student_id:     r.student_id,
        name:           r.name,
        present_count:  r.present_count,
        total_count:    r.total_count,
        attendance_pct: Math.round(r.attendance_pct * 100),
        is_below_75:    r.attendance_pct < 0.75,
        is_below_60:    r.attendance_pct < 0.60,
      })),
    };
  }
  return {
    source: 'mock',
    students: [],
    note: 'TigerGraph not connected.',
  };
};

// ────────────────────────────────────────────────────────────────────────────
// ANALYSIS: Consecutive absences for a student
// ────────────────────────────────────────────────────────────────────────────
const getConsecutiveAbsences = async (student_id) => {
  const tgResult = await runQuery('consecutive_absences', { student_id: String(student_id) });
  if (tgResult.ok) {
    return { source: 'tigergraph', data: tgResult.data?.results };
  }
  return { source: 'mock', data: null };
};

// ────────────────────────────────────────────────────────────────────────────
// HEALTH CHECK
// ────────────────────────────────────────────────────────────────────────────
const healthCheck = async () => {
  const connected = await ping();
  return { connected, graph: TG_GRAPH };
};

module.exports = {
  syncStudent,
  syncClass,
  syncAttendancePresent,
  syncAttendanceAbsent,
  bulkSyncClassAttendance,
  detectProxyCandidates,
  getAttendancePattern,
  getLowAttendanceStudents,
  getConsecutiveAbsences,
  healthCheck,
};
