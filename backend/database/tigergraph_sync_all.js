/**
 * TigerGraph Full Sync
 * Run ONCE after TigerGraph setup to push existing PostgreSQL data to graph
 * Usage: node database/tigergraph_sync_all.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const { upsertVertex, upsertEdge, ping } = require('../src/config/tigergraph');

const pgPool = new Pool({
  host:     process.env.POSTGRES_HOST     || 'localhost',
  port:     parseInt(process.env.POSTGRES_PORT) || 5432,
  database: process.env.POSTGRES_DB       || 'icms',
  user:     process.env.POSTGRES_USER     || 'icms_user',
  password: process.env.POSTGRES_PASSWORD || 'icms123',
});

async function syncAll() {
  console.log('\n[TigerGraph Sync] Starting full sync from PostgreSQL → TigerGraph...\n');

  // Check TigerGraph connection
  const connected = await ping();
  if (!connected) {
    console.error('[TigerGraph Sync] ❌ Cannot connect to TigerGraph. Ensure it is running.');
    console.log('  Start TigerGraph with: docker-compose up tigergraph');
    process.exit(1);
  }
  console.log('[TigerGraph Sync] ✓ Connected to TigerGraph\n');

  // ── 1. Sync Departments ────────────────────────────────────────
  console.log('[Sync] Departments...');
  const depts = await pgPool.query('SELECT * FROM departments');
  for (const d of depts.rows) {
    await upsertVertex('Department', String(d.id), {
      name: { value: d.name }, code: { value: d.code || '' },
    });
  }
  console.log(`  ✓ ${depts.rows.length} departments synced`);

  // ── 2. Sync Students ───────────────────────────────────────────
  console.log('[Sync] Students...');
  const students = await pgPool.query(`
    SELECT s.id, s.name, s.batch, s.section, s.is_active, d.name AS department
    FROM students s LEFT JOIN departments d ON s.department_id = d.id
  `);
  for (const s of students.rows) {
    await upsertVertex('Student', String(s.id), {
      name:       { value: s.name || '' },
      batch:      { value: s.batch || '' },
      section:    { value: s.section || '' },
      department: { value: s.department || '' },
      is_active:  { value: s.is_active !== false },
    });
    if (s.department_id) {
      await upsertEdge('Student', String(s.id), 'BELONGS_TO_DEPT', 'Department', String(s.department_id), {});
    }
  }
  console.log(`  ✓ ${students.rows.length} students synced`);

  // ── 3. Sync Faculty ────────────────────────────────────────────
  console.log('[Sync] Faculty...');
  const faculty = await pgPool.query(`
    SELECT f.id, f.name, d.name AS department, f.department_id
    FROM faculty f LEFT JOIN departments d ON f.department_id = d.id
  `);
  for (const f of faculty.rows) {
    await upsertVertex('Faculty', String(f.id), {
      name:       { value: f.name || '' },
      department: { value: f.department || '' },
    });
  }
  console.log(`  ✓ ${faculty.rows.length} faculty synced`);

  // ── 4. Sync Classes ────────────────────────────────────────────
  console.log('[Sync] Classes...');
  const classes = await pgPool.query('SELECT * FROM classes');
  for (const c of classes.rows) {
    await upsertVertex('Class', String(c.id), {
      subject:      { value: c.subject || '' },
      subject_code: { value: c.subject_code || '' },
      class_date:   { value: String(c.class_date || '') },
      start_time:   { value: String(c.start_time || '') },
      batch:        { value: c.batch || '' },
      section:      { value: c.section || '' },
    });
    if (c.faculty_id) {
      await upsertEdge('Faculty', String(c.faculty_id), 'TEACHES', 'Class', String(c.id), {});
    }
  }
  console.log(`  ✓ ${classes.rows.length} classes synced`);

  // ── 5. Sync Enrollments ────────────────────────────────────────
  console.log('[Sync] Enrollments...');
  const enrollments = await pgPool.query('SELECT * FROM class_enrollments');
  for (const e of enrollments.rows) {
    await upsertEdge('Student', String(e.student_id), 'ENROLLED_IN', 'Class', String(e.class_id), {});
  }
  console.log(`  ✓ ${enrollments.rows.length} enrollments synced`);

  // ── 6. Sync Attendance Records ─────────────────────────────────
  console.log('[Sync] Attendance records...');
  const attendance = await pgPool.query('SELECT * FROM attendance ORDER BY marked_at');
  let presentCount = 0, absentCount = 0;
  for (const a of attendance.rows) {
    if (a.status === 'present') {
      await upsertEdge('Student', String(a.student_id), 'ATTENDED', 'Class', String(a.class_id), {
        method:             { value: a.method || 'smart' },
        status:             { value: 'present' },
        face_confidence:    { value: parseFloat(a.face_confidence) || 0 },
        gps_distance_m:     { value: parseFloat(a.gps_distance_m) || 0 },
        marked_at:          { value: String(a.marked_at || '') },
        is_proxy_suspected: { value: false },
      });
      presentCount++;
    } else {
      await upsertEdge('Student', String(a.student_id), 'ABSENT_FROM', 'Class', String(a.class_id), {
        reason: { value: a.status || 'absent' },
      });
      absentCount++;
    }
  }
  console.log(`  ✓ ${presentCount} present, ${absentCount} absent records synced`);

  console.log('\n[TigerGraph Sync] ✅ Full sync complete!\n');
  console.log('  Students:    ', students.rows.length);
  console.log('  Classes:     ', classes.rows.length);
  console.log('  Attendance:  ', attendance.rows.length);
  console.log('\n  Run graph queries at: http://localhost:14240\n');

  await pgPool.end();
}

syncAll().catch(err => {
  console.error('[TigerGraph Sync] Fatal error:', err.message);
  process.exit(1);
});
