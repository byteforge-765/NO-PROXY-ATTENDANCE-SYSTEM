-- ════════════════════════════════════════════════════════════════
--  ICMS PostgreSQL Schema v3 — Tables Only (run seed.js for data)
--  psql -U icms_user -d icms -f database/schema.sql
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, code VARCHAR(20) UNIQUE,
  hod_name VARCHAR(100), created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY, user_id VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL, name VARCHAR(100) NOT NULL,
  dob DATE, department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS faculty (
  id SERIAL PRIMARY KEY, user_id VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL, name VARCHAR(100) NOT NULL,
  dob DATE, mobile VARCHAR(15), whatsapp_phone VARCHAR(15), email VARCHAR(100),
  designation VARCHAR(100), photo_url VARCHAR(255),
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY, user_id VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL, name VARCHAR(100) NOT NULL,
  admission_no VARCHAR(50) UNIQUE NOT NULL, roll_no VARCHAR(20),
  dob DATE NOT NULL, gender VARCHAR(10) DEFAULT 'Male',
  mobile VARCHAR(15), whatsapp_phone VARCHAR(15), email VARCHAR(100),
  batch VARCHAR(100), course VARCHAR(100), semester VARCHAR(20), section VARCHAR(20),
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  father_name VARCHAR(100), blood_group VARCHAR(5), address TEXT, category VARCHAR(50),
  photo_url VARCHAR(255), face_enrolled BOOLEAN DEFAULT FALSE,
  face_photo_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
);

-- Face embeddings: up to 5 stored (uploaded photos) + temp (live recognition)
CREATE TABLE IF NOT EXISTS student_face_embeddings (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  embedding FLOAT[] NOT NULL,
  photo_index INTEGER DEFAULT 1,
  embed_type VARCHAR(20) DEFAULT 'stored',
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, photo_index, embed_type)
);

-- Up to 5 face photos per student (admin/faculty upload via panel)
CREATE TABLE IF NOT EXISTS student_face_photos (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  photo_url VARCHAR(255) NOT NULL,
  photo_index INTEGER DEFAULT 1,
  uploaded_by VARCHAR(20) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classrooms (
  id SERIAL PRIMARY KEY, name VARCHAR(50) NOT NULL UNIQUE, block VARCHAR(50),
  lat DECIMAL(10,7) DEFAULT 28.675624, lon DECIMAL(10,7) DEFAULT 77.503096,
  radius_metres INTEGER DEFAULT 50, capacity INTEGER DEFAULT 60
);
CREATE TABLE IF NOT EXISTS classes (
  id SERIAL PRIMARY KEY, subject VARCHAR(100) NOT NULL, subject_code VARCHAR(30),
  batch VARCHAR(100), section VARCHAR(20),
  class_date DATE NOT NULL, start_time TIME NOT NULL, end_time TIME,
  room VARCHAR(50), classroom_lat DECIMAL(10,7) DEFAULT 28.675624,
  classroom_lon DECIMAL(10,7) DEFAULT 77.503096, classroom_radius INTEGER DEFAULT 50,
  faculty_id INTEGER REFERENCES faculty(id) ON DELETE SET NULL,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS class_enrollments (
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  PRIMARY KEY (class_id, student_id)
);
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'present', method VARCHAR(20) DEFAULT 'smart',
  face_confidence FLOAT, gps_distance_m FLOAT,
  marked_at TIMESTAMP DEFAULT NOW(),
  manual_override BOOLEAN DEFAULT FALSE, override_by VARCHAR(50), override_note TEXT,
  UNIQUE (class_id, student_id)
);
CREATE TABLE IF NOT EXISTS timetable (
  id SERIAL PRIMARY KEY, day VARCHAR(15) NOT NULL, slot_time VARCHAR(20) NOT NULL,
  subject VARCHAR(100) NOT NULL, subject_code VARCHAR(30), room VARCHAR(50),
  batch VARCHAR(100), section VARCHAR(20),
  faculty_id INTEGER REFERENCES faculty(id) ON DELETE SET NULL,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS study_materials (
  id SERIAL PRIMARY KEY, title VARCHAR(200) NOT NULL, subject VARCHAR(100) NOT NULL,
  batch VARCHAR(100), description TEXT, file_url VARCHAR(255) NOT NULL,
  file_type VARCHAR(100), file_size INTEGER,
  uploaded_by INTEGER REFERENCES faculty(id) ON DELETE SET NULL,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY, student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  message TEXT NOT NULL, type VARCHAR(20) DEFAULT 'in-app',
  sent_by INTEGER, is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_students_batch     ON students(batch);
CREATE INDEX IF NOT EXISTS idx_students_dept      ON students(department_id);
CREATE INDEX IF NOT EXISTS idx_students_section   ON students(section);
CREATE INDEX IF NOT EXISTS idx_classes_date       ON classes(class_date);
CREATE INDEX IF NOT EXISTS idx_classes_faculty    ON classes(faculty_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class   ON attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_timetable_batch    ON timetable(batch);
CREATE INDEX IF NOT EXISTS idx_timetable_section  ON timetable(section);
CREATE INDEX IF NOT EXISTS idx_notifs_student     ON notifications(student_id);
CREATE INDEX IF NOT EXISTS idx_face_emb_student   ON student_face_embeddings(student_id);
CREATE INDEX IF NOT EXISTS idx_face_photos_stu    ON student_face_photos(student_id);

-- NOTE: Run  node database/seed.js  after this to insert all data
