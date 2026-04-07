const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pgPool } = require('../../config/db');
const { ok, fail } = require('../../utils/response');

// POST /api/auth/login
const login = async (req, res) => {
  const { user_id, password } = req.body;
  if (!user_id || !password) return fail(res, 'user_id and password required');

  try {
    let user = null, role = null;

    // Try Admin
    const adminRes = await pgPool.query(
      'SELECT id, user_id, name, password_hash FROM admins WHERE user_id=$1', [user_id]);
    if (adminRes.rows.length) { user = adminRes.rows[0]; role = 'admin'; }

    // Try Faculty
    if (!user) {
      const facRes = await pgPool.query(
        'SELECT id, user_id, name, password_hash, department_id FROM faculty WHERE user_id=$1 OR email=$1', [user_id]);
      if (facRes.rows.length) { user = facRes.rows[0]; role = 'faculty'; }
    }

    // Try Student
    if (!user) {
      const stuRes = await pgPool.query(
        'SELECT id, user_id, name, password_hash, department_id, batch, semester, section FROM students WHERE user_id=$1 OR email=$1 OR admission_no=$1', [user_id]);
      if (stuRes.rows.length) { user = stuRes.rows[0]; role = 'student'; }
    }

    if (!user) return fail(res, 'User not found', 401);

    const pwOk = await bcrypt.compare(password, user.password_hash);
    if (!pwOk) return fail(res, 'Invalid password', 401);

    const payload = { id: user.id, user_id: user.user_id, name: user.name, role, department_id: user.department_id || null, batch: user.batch || null, semester: user.semester || null, section: user.section || null };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'icms_secret', { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

    delete user.password_hash;
    return ok(res, { token, user: { ...user, role } }, 'Login successful');
  } catch (err) {
    console.error('[Auth] Login:', err.message);
    return fail(res, 'Server error', 500);
  }
};

// GET /api/auth/me
const me = async (req, res) => {
  const { id, role } = req.user;
  try {
    let result;
    if (role === 'admin') return ok(res, { user: req.user });
    if (role === 'student') {
      result = await pgPool.query(
        `SELECT s.id, s.user_id, s.name, s.email, s.mobile, s.whatsapp_phone,
                s.batch, s.semester, s.roll_no, s.admission_no, s.photo_url,
                s.face_enrolled, d.name AS department
         FROM students s LEFT JOIN departments d ON s.department_id = d.id WHERE s.id=$1`, [id]);
    } else {
      result = await pgPool.query(
        `SELECT f.id, f.user_id, f.name, f.email, f.mobile, f.whatsapp_phone,
                f.designation, f.photo_url, d.name AS department
         FROM faculty f LEFT JOIN departments d ON f.department_id = d.id WHERE f.id=$1`, [id]);
    }
    if (!result.rows.length) return fail(res, 'User not found', 404);
    return ok(res, { user: { ...result.rows[0], role } });
  } catch (err) { return fail(res, 'Server error', 500); }
};

// POST /api/auth/change-password
const changePassword = async (req, res) => {
  const { old_password, new_password } = req.body;
  const { id, role } = req.user;
  if (!old_password || !new_password || new_password.length < 6)
    return fail(res, 'Both passwords required. New password min 6 chars.');
  const table = role === 'student' ? 'students' : role === 'admin' ? 'admins' : 'faculty';
  try {
    const r = await pgPool.query(`SELECT password_hash FROM ${table} WHERE id=$1`, [id]);
    if (!r.rows.length) return fail(res, 'User not found', 404);
    if (!await bcrypt.compare(old_password, r.rows[0].password_hash)) return fail(res, 'Old password wrong', 401);
    await pgPool.query(`UPDATE ${table} SET password_hash=$1 WHERE id=$2`, [await bcrypt.hash(new_password, 10), id]);
    return ok(res, {}, 'Password changed');
  } catch (err) { return fail(res, 'Server error', 500); }
};

module.exports = { login, me, changePassword };
