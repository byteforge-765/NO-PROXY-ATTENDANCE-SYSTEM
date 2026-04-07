/**
 * ICMS Database Seeder
 * Run: node database/seed.js
 * Generates correct bcrypt hashes and inserts/updates all seed data.
 * Safe to run multiple times — uses upsert everywhere.
 */
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host:     process.env.POSTGRES_HOST     || 'localhost',
  port:     parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB       || 'icms',
  user:     process.env.POSTGRES_USER     || 'icms_user',
  password: process.env.POSTGRES_PASSWORD || 'icms123',
});

async function seed() {
  const client = await pool.connect();
  console.log('\n[SEED] Connected to PostgreSQL\n');

  try {
    await client.query('BEGIN');

    // ── Hash passwords ─────────────────────────────────────────
    const [h12345, h1234, h1231] = await Promise.all([
      bcrypt.hash('12345', 10),  // admin
      bcrypt.hash('1234',  10),  // faculty
      bcrypt.hash('1231',  10),  // students
    ]);
    console.log('[SEED] Passwords hashed ✓');

    // ── Departments ────────────────────────────────────────────
    await client.query(`
      INSERT INTO departments(name,code,hod_name) VALUES
        ('Information Technology','IT','Dr. Anupama Sharma'),
        ('Computer Science & IT','CSIT','Dr. Vikash Roshan'),
        ('Electronics & Communication','ECE','Dr. R.K. Mehta'),
        ('Mechanical Engineering','ME','Dr. P.K. Singh'),
        ('Civil Engineering','CE','Dr. S.K. Gupta'),
        ('Administration','ADM',NULL)
      ON CONFLICT (code) DO NOTHING
    `);
    console.log('[SEED] Departments ✓');

    // ── Get dept IDs ───────────────────────────────────────────
    const depts = {};
    const dr = await client.query('SELECT id, code FROM departments');
    dr.rows.forEach(r => depts[r.code] = r.id);

    // ── Admin ──────────────────────────────────────────────────
    await client.query(`
      INSERT INTO admins(user_id, password_hash, name, dob, department_id)
      VALUES ($1,$2,'Rajesh Kumar','1980-03-20',$3)
      ON CONFLICT (user_id) DO UPDATE SET password_hash=$2
    `, ['ADMIN01', h12345, depts['ADM']]);
    console.log('[SEED] Admin ADMIN01 (password: 12345) ✓');

    // ── Faculty helper ─────────────────────────────────────────
    const insertFaculty = async (rows, deptCode) => {
      for (const [uid, name, dob, desig, mobile, email] of rows) {
        await client.query(`
          INSERT INTO faculty(user_id,password_hash,name,dob,designation,department_id,mobile,whatsapp_phone,email)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$8)
          ON CONFLICT (user_id) DO UPDATE SET
            password_hash=$2, name=$3, designation=$5, department_id=$6, mobile=$7, whatsapp_phone=$7, email=$8
        `, [uid, h1234, name, dob, desig, depts[deptCode], mobile, email]);
      }
    };

    // ── IT Faculty (FAC001-FAC008) ─────────────────────────────
    await insertFaculty([
      ['FAC001','Dr. Shivani Agarwal', '1982-04-10','Associate Professor','9876501001','shivani.agarwal@icms.edu'],
      ['FAC002','Mr. Sumit Sharma',    '1988-07-22','Assistant Professor','9876501002','sumit.sharma@icms.edu'],
      ['FAC003','Dr. Nitin Sharma',    '1980-11-05','Associate Professor','9876501003','nitin.sharma@icms.edu'],
      ['FAC004','Dr. Anupama Sharma',  '1979-03-18','Professor & HOD',    '9876501004','anupama.sharma@icms.edu'],
      ['FAC005','Ms. Priti Choudhary', '1990-06-30','Assistant Professor','9876501005','priti.choudhary@icms.edu'],
      ['FAC006','Mr. Birendra Kumar',  '1985-09-14','Assistant Professor','9876501006','birendra.kumar@icms.edu'],
      ['FAC007','Dr. Ruchi Gupta',     '1983-01-25','Associate Professor','9876501007','ruchi.gupta@icms.edu'],
      ['FAC008','Mr. Mohit Tiwari',    '1991-08-12','Assistant Professor','9876501008','mohit.tiwari@icms.edu'],
    ], 'IT');
    console.log('[SEED] IT Faculty FAC001-FAC008 (password: 1234) ✓');

    await insertFaculty([
      ['FAC009','Dr. Vikash Roshan', '1978-05-20','Professor & HOD',    '9876502001','vikash.roshan@icms.edu'],
      ['FAC010','Ms. Tanu Gupta',    '1992-02-14','Assistant Professor','9876502002','tanu.gupta@icms.edu'],
      ['FAC011','Mr. Pankaj Singh',  '1987-10-08','Assistant Professor','9876502003','pankaj.singh@icms.edu'],
      ['FAC012','Ms. Shikha Agarwal','1989-04-22','Assistant Professor','9876502004','shikha.agarwal@icms.edu'],
    ], 'CSIT');
    console.log('[SEED] CSIT Faculty FAC009-FAC012 ✓');

    await insertFaculty([
      ['FAC013','Dr. R.K. Mehta',     '1975-07-30','Professor & HOD',    '9876503001','rk.mehta@icms.edu'],
      ['FAC014','Mr. Vishal Gupta',   '1988-12-05','Assistant Professor','9876503002','vishal.gupta@icms.edu'],
      ['FAC015','Ms. Mili Srivastava','1993-03-18','Assistant Professor','9876503003','mili.srivastava@icms.edu'],
      ['FAC016','Mr. Achintya Pandey','1986-09-11','Assistant Professor','9876503004','achintya.pandey@icms.edu'],
    ], 'ECE');
    console.log('[SEED] ECE Faculty FAC013-FAC016 ✓');

    await insertFaculty([
      ['FAC017','Dr. P.K. Singh',      '1974-11-22','Professor & HOD',    '9876504001','pk.singh@icms.edu'],
      ['FAC018','Mr. Pancham Singh',   '1990-06-15','Assistant Professor','9876504002','pancham.singh@icms.edu'],
      ['FAC019','Mr. Sudhakar Dwivedi','1985-08-28','Assistant Professor','9876504003','sudhakar.dwivedi@icms.edu'],
      ['FAC020','Mr. Anupam Saini',    '1988-01-10','Assistant Professor','9876504004','anupam.saini@icms.edu'],
    ], 'ME');
    console.log('[SEED] ME Faculty FAC017-FAC020 ✓');

    // Get faculty IDs
    const fac = {};
    const fr = await client.query('SELECT id, user_id FROM faculty');
    fr.rows.forEach(r => fac[r.user_id] = r.id);

    // ── Students helper ────────────────────────────────────────
    // Uses INSERT ... ON CONFLICT (user_id) to safely upsert.
    // Also deletes any old row with same admission_no but different user_id first.
    const insertStudent = async (uid, name, admNo, roll, dob, gender, section, mobile, email, deptCode, batch, course, sem) => {
      // Clean up old row with same admission_no if it has a different user_id
      await client.query(
        `DELETE FROM students WHERE admission_no=$1 AND user_id!=$2`,
        [admNo, uid]
      );
      await client.query(`
        INSERT INTO students(user_id,password_hash,name,admission_no,roll_no,dob,gender,
          batch,course,semester,section,department_id,mobile,whatsapp_phone,email)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13,$14)
        ON CONFLICT (user_id) DO UPDATE SET
          password_hash=$2, name=$3, admission_no=$4, roll_no=$5,
          batch=$8, course=$9, semester=$10, section=$11,
          department_id=$12, mobile=$13, whatsapp_phone=$13, email=$14
      `, [uid, h1231, name, admNo, roll, dob, gender,
          batch, course, sem, section, depts[deptCode], mobile, email]);
    };

    // ── IT-1 ──────────────────────────────────────────────────
    await insertStudent('STU2401','Ayush Singh Bhadoria','IT2024-001','IT-101','2005-03-15','Male',  'IT-1','9988771001','ayush.bhadoria@icms.edu',  'IT','2024-2028','B.Tech IT','4th Semester');
    await insertStudent('STU2402','Aditi Gupta',         'IT2024-002','IT-102','2005-07-22','Female','IT-1','9988771002','aditi.gupta@icms.edu',      'IT','2024-2028','B.Tech IT','4th Semester');
    await insertStudent('STU2403','Rahul Verma',         'IT2024-003','IT-103','2005-01-10','Male',  'IT-1','9988771003','rahul.verma@icms.edu',      'IT','2024-2028','B.Tech IT','4th Semester');
    await insertStudent('STU2404','Priya Singh',         'IT2024-004','IT-104','2005-09-05','Female','IT-1','9988771004','priya.singh@icms.edu',      'IT','2024-2028','B.Tech IT','4th Semester');
    await insertStudent('STU2405','Mohit Sharma',        'IT2024-005','IT-105','2005-05-18','Male',  'IT-1','9988771005','mohit.sharma@icms.edu',     'IT','2024-2028','B.Tech IT','4th Semester');
    console.log('[SEED] IT-1 students (Ayush + Aditi + 3) ✓');

    // ── IT-2 ──────────────────────────────────────────────────
    await insertStudent('STU2406','Ankit Mishra',   'IT2024-006','IT-201','2005-02-28','Male',  'IT-2','9988771006','ankit.mishra@icms.edu',  'IT','2024-2028','B.Tech IT','4th Semester');
    await insertStudent('STU2407','Sneha Tiwari',   'IT2024-007','IT-202','2005-11-14','Female','IT-2','9988771007','sneha.tiwari@icms.edu',  'IT','2024-2028','B.Tech IT','4th Semester');
    await insertStudent('STU2408','Kartik Soni',    'IT2024-008','IT-203','2005-06-20','Male',  'IT-2','9988771008','kartik.soni@icms.edu',   'IT','2024-2028','B.Tech IT','4th Semester');
    await insertStudent('STU2409','Divya Yadav',    'IT2024-009','IT-204','2005-04-03','Female','IT-2','9988771009','divya.yadav@icms.edu',   'IT','2024-2028','B.Tech IT','4th Semester');
    await insertStudent('STU2410','Saurabh Chauhan','IT2024-010','IT-205','2005-08-25','Male',  'IT-2','9988771010','saurabh.chauhan@icms.edu','IT','2024-2028','B.Tech IT','4th Semester');
    console.log('[SEED] IT-2 students ✓');

    // ── IT-3 ──────────────────────────────────────────────────
    await insertStudent('STU2411','Nikhil Pandey','IT2024-011','IT-301','2005-01-17','Male',  'IT-3','9988771011','nikhil.pandey@icms.edu','IT','2024-2028','B.Tech IT','4th Semester');
    await insertStudent('STU2412','Anjali Saxena','IT2024-012','IT-302','2005-10-08','Female','IT-3','9988771012','anjali.saxena@icms.edu','IT','2024-2028','B.Tech IT','4th Semester');
    await insertStudent('STU2413','Vivek Kumar',  'IT2024-013','IT-303','2005-03-30','Male',  'IT-3','9988771013','vivek.kumar@icms.edu',  'IT','2024-2028','B.Tech IT','4th Semester');
    await insertStudent('STU2414','Pooja Rajput', 'IT2024-014','IT-304','2005-07-12','Female','IT-3','9988771014','pooja.rajput@icms.edu', 'IT','2024-2028','B.Tech IT','4th Semester');
    await insertStudent('STU2415','Deepak Rao',   'IT2024-015','IT-305','2005-05-05','Male',  'IT-3','9988771015','deepak.rao@icms.edu',   'IT','2024-2028','B.Tech IT','4th Semester');
    console.log('[SEED] IT-3 students ✓');

    // ── CSIT-1 ────────────────────────────────────────────────
    await insertStudent('STU2416','Rishabh Dubey', 'CSIT2024-001','CSIT-101','2005-02-14','Male',  'CSIT-1','9988772001','rishabh.dubey@icms.edu', 'CSIT','2024-2028','B.Tech CSIT','4th Semester');
    await insertStudent('STU2417','Khushi Agarwal','CSIT2024-002','CSIT-102','2005-09-19','Female','CSIT-1','9988772002','khushi.agarwal@icms.edu','CSIT','2024-2028','B.Tech CSIT','4th Semester');
    await insertStudent('STU2418','Abhinav Singh', 'CSIT2024-003','CSIT-103','2005-06-27','Male',  'CSIT-1','9988772003','abhinav.singh@icms.edu', 'CSIT','2024-2028','B.Tech CSIT','4th Semester');
    await insertStudent('STU2419','Neha Joshi',    'CSIT2024-004','CSIT-104','2005-04-11','Female','CSIT-1','9988772004','neha.joshi@icms.edu',    'CSIT','2024-2028','B.Tech CSIT','4th Semester');
    await insertStudent('STU2420','Harsh Vardhan', 'CSIT2024-005','CSIT-105','2005-11-03','Male',  'CSIT-1','9988772005','harsh.vardhan@icms.edu', 'CSIT','2024-2028','B.Tech CSIT','4th Semester');
    console.log('[SEED] CSIT-1 students ✓');

    // ── CSIT-2 ────────────────────────────────────────────────
    await insertStudent('STU2421','Sumit Patel',     'CSIT2024-006','CSIT-201','2005-08-16','Male',  'CSIT-2','9988772006','sumit.patel@icms.edu',    'CSIT','2024-2028','B.Tech CSIT','4th Semester');
    await insertStudent('STU2422','Shivangi Rai',    'CSIT2024-007','CSIT-202','2005-03-24','Female','CSIT-2','9988772007','shivangi.rai@icms.edu',   'CSIT','2024-2028','B.Tech CSIT','4th Semester');
    await insertStudent('STU2423','Gaurav Tripathi', 'CSIT2024-008','CSIT-203','2005-07-07','Male',  'CSIT-2','9988772008','gaurav.tripathi@icms.edu','CSIT','2024-2028','B.Tech CSIT','4th Semester');
    await insertStudent('STU2424','Palak Shukla',    'CSIT2024-009','CSIT-204','2005-01-29','Female','CSIT-2','9988772009','palak.shukla@icms.edu',   'CSIT','2024-2028','B.Tech CSIT','4th Semester');
    await insertStudent('STU2425','Rohan Srivastava','CSIT2024-010','CSIT-205','2005-10-20','Male',  'CSIT-2','9988772010','rohan.srivastava@icms.edu','CSIT','2024-2028','B.Tech CSIT','4th Semester');
    console.log('[SEED] CSIT-2 students ✓');

    // ── ECE-1 ─────────────────────────────────────────────────
    await insertStudent('STU2426','Aryan Kapoor','ECE2024-001','ECE-101','2005-04-08','Male',  'ECE-1','9988773001','aryan.kapoor@icms.edu','ECE','2024-2028','B.Tech ECE','4th Semester');
    await insertStudent('STU2427','Shreya Jain', 'ECE2024-002','ECE-102','2005-12-01','Female','ECE-1','9988773002','shreya.jain@icms.edu', 'ECE','2024-2028','B.Tech ECE','4th Semester');
    await insertStudent('STU2428','Tarun Negi',  'ECE2024-003','ECE-103','2005-06-13','Male',  'ECE-1','9988773003','tarun.negi@icms.edu',  'ECE','2024-2028','B.Tech ECE','4th Semester');
    await insertStudent('STU2429','Aastha Dixit','ECE2024-004','ECE-104','2005-09-26','Female','ECE-1','9988773004','aastha.dixit@icms.edu','ECE','2024-2028','B.Tech ECE','4th Semester');
    await insertStudent('STU2430','Yash Tomar',  'ECE2024-005','ECE-105','2005-02-19','Male',  'ECE-1','9988773005','yash.tomar@icms.edu',  'ECE','2024-2028','B.Tech ECE','4th Semester');
    console.log('[SEED] ECE-1 students ✓');

    // ── ME-1 ──────────────────────────────────────────────────
    await insertStudent('STU2431','Amit Yadav',      'ME2024-001','ME-101','2005-05-23','Male',  'ME-1','9988774001','amit.yadav@icms.edu',     'ME','2024-2028','B.Tech ME','4th Semester');
    await insertStudent('STU2432','Riya Maurya',     'ME2024-002','ME-102','2005-08-10','Female','ME-1','9988774002','riya.maurya@icms.edu',    'ME','2024-2028','B.Tech ME','4th Semester');
    await insertStudent('STU2433','Siddharth Bajpai','ME2024-003','ME-103','2005-11-28','Male',  'ME-1','9988774003','siddharth.bajpai@icms.edu','ME','2024-2028','B.Tech ME','4th Semester');
    await insertStudent('STU2434','Kratika Singh',   'ME2024-004','ME-104','2005-03-07','Female','ME-1','9988774004','kratika.singh@icms.edu',  'ME','2024-2028','B.Tech ME','4th Semester');
    await insertStudent('STU2435','Lokesh Verma',    'ME2024-005','ME-105','2005-07-16','Male',  'ME-1','9988774005','lokesh.verma@icms.edu',   'ME','2024-2028','B.Tech ME','4th Semester');
    console.log('[SEED] ME-1 students ✓');

    // ── Classrooms ─────────────────────────────────────────────
    const rooms = [
      ['NLT-1',28.675624,77.503096],['NLT-2',28.675700,77.503200],
      ['NLT-3',28.675800,77.503300],['NLT-4',28.675900,77.503400],
      ['NLT-5',28.676000,77.503500],['NLT-6',28.676100,77.503600],
      ['NLT-7',28.676200,77.503700],['NLT-8',28.676300,77.503800],
    ];
    for (const [name, lat, lon] of rooms) {
      await client.query(`
        INSERT INTO classrooms(name,block,lat,lon,radius_metres,capacity)
        VALUES ($1,'NLT Block',$2,$3,50,60)
        ON CONFLICT (name) DO NOTHING
      `, [name, lat, lon]);
    }
    console.log('[SEED] Classrooms NLT-1 to NLT-8 ✓');

    // Get faculty IDs again (in case changed)
    const fr2 = await client.query('SELECT id, user_id FROM faculty');
    fr2.rows.forEach(r => fac[r.user_id] = r.id);

    // ── Timetable helper ───────────────────────────────────────
    const seedTimetable = async (section, entries) => {
      await client.query(`DELETE FROM timetable WHERE section=$1`, [section]);
      for (const [day, slot, subj, code, room, facUid, deptCode] of entries) {
        await client.query(`
          INSERT INTO timetable(day,slot_time,subject,subject_code,room,batch,section,faculty_id,department_id)
          VALUES ($1,$2,$3,$4,$5,'2024-2028',$6,$7,$8)
        `, [day, slot, subj, code, room, section, fac[facUid], depts[deptCode]]);
      }
    };

    // ── IT-1 Timetable ─────────────────────────────────────────
    await seedTimetable('IT-1', [
      ['Monday',   '9:30-10:30', 'OOPS with Java',   'BCS-401','NLT-1','FAC001','IT'],
      ['Monday',   '10:30-11:30','Operating Systems', 'BCS-402','NLT-1','FAC003','IT'],
      ['Monday',   '11:30-12:30','Database Mgmt',     'BCS-403','NLT-1','FAC007','IT'],
      ['Monday',   '1:30-3:30',  'Java Lab',          'BCS-452','NLT-1','FAC001','IT'],
      ['Tuesday',  '9:30-10:30', 'Operating Systems', 'BCS-402','NLT-1','FAC003','IT'],
      ['Tuesday',  '10:30-11:30','OOPS with Java',    'BCS-401','NLT-1','FAC001','IT'],
      ['Tuesday',  '11:30-12:30','Database Mgmt',     'BCS-403','NLT-1','FAC007','IT'],
      ['Tuesday',  '1:30-3:30',  'OS Lab',            'BCS-451','NLT-1','FAC003','IT'],
      ['Wednesday','9:30-10:30', 'Database Mgmt',     'BCS-403','NLT-1','FAC007','IT'],
      ['Wednesday','10:30-11:30','Operating Systems',  'BCS-402','NLT-1','FAC003','IT'],
      ['Wednesday','11:30-12:30','OOPS with Java',     'BCS-401','NLT-1','FAC001','IT'],
      ['Wednesday','1:30-3:30',  'DBMS Lab',           'BCS-453','NLT-1','FAC007','IT'],
      ['Thursday', '9:30-10:30', 'OOPS with Java',    'BCS-401','NLT-1','FAC001','IT'],
      ['Thursday', '10:30-11:30','Database Mgmt',      'BCS-403','NLT-1','FAC007','IT'],
      ['Thursday', '11:30-12:30','Operating Systems',  'BCS-402','NLT-1','FAC003','IT'],
      ['Thursday', '1:30-3:30',  'Java Lab',           'BCS-452','NLT-1','FAC001','IT'],
      ['Friday',   '9:30-10:30', 'Database Mgmt',     'BCS-403','NLT-1','FAC007','IT'],
      ['Friday',   '10:30-11:30','OOPS with Java',    'BCS-401','NLT-1','FAC001','IT'],
      ['Friday',   '11:30-12:30','Operating Systems',  'BCS-402','NLT-1','FAC003','IT'],
      ['Friday',   '1:30-3:30',  'OS Lab',             'BCS-451','NLT-1','FAC003','IT'],
      ['Saturday', '9:30-10:30', 'OOPS with Java',    'BCS-401','NLT-1','FAC001','IT'],
      ['Saturday', '10:30-11:30','Database Mgmt',      'BCS-403','NLT-1','FAC007','IT'],
      ['Saturday', '11:30-12:30','Operating Systems',  'BCS-402','NLT-1','FAC003','IT'],
    ]);
    console.log('[SEED] IT-1 Timetable (23 slots, Room NLT-1) ✓');

    // ── IT-2 Timetable ─────────────────────────────────────────
    await seedTimetable('IT-2', [
      ['Monday',   '9:30-10:30', 'OOPS with Java',   'BCS-401','NLT-2','FAC002','IT'],
      ['Monday',   '10:30-11:30','Database Mgmt',     'BCS-403','NLT-2','FAC004','IT'],
      ['Monday',   '11:30-12:30','Operating Systems', 'BCS-402','NLT-2','FAC006','IT'],
      ['Tuesday',  '9:30-10:30', 'Database Mgmt',     'BCS-403','NLT-2','FAC004','IT'],
      ['Tuesday',  '10:30-11:30','OOPS with Java',    'BCS-401','NLT-2','FAC002','IT'],
      ['Wednesday','9:30-10:30', 'Operating Systems', 'BCS-402','NLT-2','FAC006','IT'],
      ['Thursday', '9:30-10:30', 'OOPS with Java',   'BCS-401','NLT-2','FAC002','IT'],
      ['Friday',   '9:30-10:30', 'Database Mgmt',     'BCS-403','NLT-2','FAC004','IT'],
    ]);
    console.log('[SEED] IT-2 Timetable ✓');

    // ── IT-3 Timetable ─────────────────────────────────────────
    await seedTimetable('IT-3', [
      ['Monday',   '9:30-10:30', 'OOPS with Java',   'BCS-401','NLT-3','FAC005','IT'],
      ['Monday',   '10:30-11:30','Database Mgmt',     'BCS-403','NLT-3','FAC008','IT'],
      ['Tuesday',  '9:30-10:30', 'Operating Systems', 'BCS-402','NLT-3','FAC006','IT'],
      ['Wednesday','9:30-10:30', 'OOPS with Java',   'BCS-401','NLT-3','FAC005','IT'],
      ['Thursday', '9:30-10:30', 'Database Mgmt',     'BCS-403','NLT-3','FAC008','IT'],
    ]);
    console.log('[SEED] IT-3 Timetable ✓');

    // ── CSIT-1 Timetable ───────────────────────────────────────
    await seedTimetable('CSIT-1', [
      ['Monday',   '9:30-10:30', 'Computer Networks',   'BNC-602','NLT-4','FAC009','CSIT'],
      ['Monday',   '10:30-11:30','Software Engineering', 'BCS-601','NLT-4','FAC010','CSIT'],
      ['Tuesday',  '9:30-10:30', 'Software Engineering', 'BCS-601','NLT-4','FAC010','CSIT'],
      ['Wednesday','9:30-10:30', 'Computer Networks',   'BNC-602','NLT-4','FAC009','CSIT'],
      ['Thursday', '9:30-10:30', 'Cyber Security',      'BCS-063','NLT-4','FAC011','CSIT'],
      ['Friday',   '9:30-10:30', 'Data Analytics',      'BCS-603','NLT-4','FAC012','CSIT'],
    ]);
    console.log('[SEED] CSIT-1 Timetable ✓');

    await client.query('COMMIT');

    console.log('\n[SEED] ✅ All data seeded successfully!\n');
    console.log('─────────────────────────────────────────────────');
    console.log('  Admin    : ADMIN01       password: 12345');
    console.log('  Faculty  : FAC001-FAC020 password: 1234');
    console.log('  Students : STU2401-STU2435 password: 1231');
    console.log('  ─────────────────────────────────────────────');
    console.log('  Ayush    : STU2401 / 1231  (IT-1, NLT-1)');
    console.log('  Aditi    : STU2402 / 1231  (IT-1, NLT-1)');
    console.log('  ─────────────────────────────────────────────');
    console.log('  IT-1 Faculty:');
    console.log('    FAC001 Dr. Shivani Agarwal  → OOPS/Java (BCS-401)');
    console.log('    FAC003 Dr. Nitin Sharma     → OS        (BCS-402)');
    console.log('    FAC007 Dr. Ruchi Gupta      → DBMS      (BCS-403)');
    console.log('─────────────────────────────────────────────────\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[SEED] ❌ Error:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => { console.error(err.message); process.exit(1); });
