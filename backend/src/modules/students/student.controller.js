const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { pgPool } = require('../../config/db');
const { ok, fail } = require('../../utils/response');
const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';

const getAll = async (req, res) => {
  try {
    const { department_id, batch, semester, section, search, page=1, limit=50 } = req.query;
    let q = `SELECT s.id,s.user_id,s.admission_no,s.roll_no,s.name,s.email,
             s.mobile,s.whatsapp_phone,s.batch,s.semester,s.section,s.gender,
             s.photo_url,s.face_enrolled,s.face_photo_count,
             d.name AS department,d.id AS department_id
             FROM students s LEFT JOIN departments d ON s.department_id=d.id WHERE 1=1`;
    const p = [];
    if (department_id){ p.push(department_id); q+=` AND s.department_id=$${p.length}`; }
    if (batch)        { p.push(batch);         q+=` AND s.batch=$${p.length}`; }
    if (semester)     { p.push(semester);      q+=` AND s.semester=$${p.length}`; }
    if (section)      { p.push(section);       q+=` AND s.section=$${p.length}`; }
    if (search)       { p.push(`%${search}%`); q+=` AND (s.name ILIKE $${p.length} OR s.user_id ILIKE $${p.length} OR s.admission_no ILIKE $${p.length})`; }
    const offset=(parseInt(page)-1)*parseInt(limit);
    p.push(parseInt(limit)); q+=` LIMIT $${p.length}`;
    p.push(offset);          q+=` OFFSET $${p.length}`;
    q+=' ORDER BY s.name';
    const r=await pgPool.query(q,p);
    return ok(res,{students:r.rows});
  } catch(err){ console.error('[Student] getAll:',err.message); return fail(res,'Server error',500); }
};

const getOne = async (req, res) => {
  try {
    const r=await pgPool.query(
      `SELECT s.*,d.name AS department FROM students s LEFT JOIN departments d ON s.department_id=d.id WHERE s.id=$1`,
      [req.params.id]);
    if(!r.rows.length) return fail(res,'Student not found',404);
    const s=r.rows[0]; delete s.password_hash;
    // fetch face photos
    const photos=await pgPool.query(
      `SELECT id,photo_url,photo_index,uploaded_by,created_at FROM student_face_photos WHERE student_id=$1 ORDER BY photo_index`,
      [req.params.id]);
    s.face_photos = photos.rows;
    return ok(res,{student:s});
  } catch(err){ return fail(res,'Server error',500); }
};

const create = async (req, res) => {
  const {user_id,password,name,admission_no,roll_no,dob,gender,mobile,whatsapp_phone,
         email,batch,course,semester,section,department_id,father_name,blood_group,address,category}=req.body;
  if(!user_id||!password||!name||!admission_no||!dob) return fail(res,'user_id,password,name,admission_no,dob required');
  try {
    const dup=await pgPool.query('SELECT id FROM students WHERE user_id=$1 OR admission_no=$2',[user_id,admission_no]);
    if(dup.rows.length) return fail(res,'User ID or Admission No already exists');
    const hash=await bcrypt.hash(password,10);
    const photo_url=req.file?`/uploads/photos/${req.file.filename}`:null;
    const r=await pgPool.query(
      `INSERT INTO students(user_id,password_hash,name,admission_no,roll_no,dob,gender,mobile,
       whatsapp_phone,email,batch,course,semester,section,department_id,father_name,blood_group,address,category,photo_url)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING id,user_id,name,admission_no,photo_url`,
      [user_id,hash,name,admission_no,roll_no||null,dob,gender||'Male',
       mobile||null,whatsapp_phone||mobile||null,email||null,
       batch||null,course||null,semester||null,section||null,department_id||null,
       father_name||null,blood_group||null,address||null,category||null,photo_url]);
    const student=r.rows[0];
    if(photo_url&&req.file) _autoEnrollFace(String(student.id),req.file.path,1).catch(e=>console.warn('[Face]',e.message));
    return ok(res,{student},'Student created',201);
  } catch(err){ console.error('[Student] create:',err.message); return fail(res,'Server error',500); }
};

const update = async (req, res) => {
  const {name,email,mobile,whatsapp_phone,batch,semester,section,department_id,roll_no,address,blood_group}=req.body;
  try {
    let photo_url;
    if(req.file){
      photo_url=`/uploads/photos/${req.file.filename}`;
      const old=await pgPool.query('SELECT photo_url FROM students WHERE id=$1',[req.params.id]);
      if(old.rows[0]?.photo_url){ const p=path.join(__dirname,'../../',old.rows[0].photo_url); if(fs.existsSync(p)) fs.unlinkSync(p); }
    }
    // Explicit whitelist prevents field injection attacks
    const ALLOWED=['name','email','mobile','whatsapp_phone','batch','semester','section','department_id','roll_no','address','blood_group'];
    const fields={name,email,mobile,whatsapp_phone,batch,semester,section,department_id,roll_no,address,blood_group};
    if(photo_url) fields.photo_url=photo_url;
    const entries=Object.entries(fields).filter(([k,v])=>v!==undefined&&(ALLOWED.includes(k)||k==='photo_url'));
    if(!entries.length) return fail(res,'Nothing to update');
    const set=entries.map(([k],i)=>`${k}=$${i+2}`).join(', ');
    await pgPool.query(`UPDATE students SET ${set},updated_at=NOW() WHERE id=$1`,[req.params.id,...entries.map(([,v])=>v)]);
    return ok(res,{},'Student updated');
  } catch(err){ return fail(res,'Server error',500); }
};

const remove = async (req, res) => {
  try {
    await pgPool.query('DELETE FROM students WHERE id=$1',[req.params.id]);
    return ok(res,{},'Student deleted');
  } catch(err){ return fail(res,'Server error',500); }
};

// GET /students/:id/face-photos
const getFacePhotos = async (req, res) => {
  try {
    const photos = await pgPool.query(
      `SELECT id,photo_url,photo_index,uploaded_by,created_at FROM student_face_photos WHERE student_id=$1 ORDER BY photo_index`,
      [req.params.id]);
    const count = photos.rows.length;
    return ok(res, { photos: photos.rows, count, max: 5, can_add: count < 5 });
  } catch(err){ return fail(res,'Server error',500); }
};

// POST /students/:id/face-photos  — upload 1–5 photos, create embeddings
const uploadFacePhotos = async (req, res) => {
  const studentId = req.params.id;
  try {
    const existing = await pgPool.query(
      `SELECT id,photo_index FROM student_face_photos WHERE student_id=$1 ORDER BY photo_index`,
      [studentId]);
    const usedIndexes = existing.rows.map(r=>r.photo_index);
    const nextIndex = [1,2,3,4,5].find(i=>!usedIndexes.includes(i));
    if(!nextIndex) return fail(res,'Already has 5 face photos. Delete one first to add new.');

    if(!req.files||req.files.length===0) return fail(res,'No photos uploaded');

    const results = [];
    let photoIndex = nextIndex;
    const uploadedBy = req.user.role === 'faculty' ? 'faculty' : 'admin';

    for (const file of req.files) {
      if (photoIndex > 5) break;
      const photoUrl = `/uploads/photos/${file.filename}`;
      // Store in face_photos table
      const pr = await pgPool.query(
        `INSERT INTO student_face_photos(student_id,photo_url,photo_index,uploaded_by) VALUES($1,$2,$3,$4) RETURNING id`,
        [studentId, photoUrl, photoIndex, uploadedBy]);
      // Generate embedding via AI service
      try {
        const imageData = fs.readFileSync(file.path).toString('base64');
        const aiRes = await axios.post(`${AI_URL}/api/v1/enroll-multi`, {
          student_id: studentId,
          image_base64: imageData,
          photo_index: photoIndex,
          embed_type: 'stored'
        }, {timeout: 30000});
        results.push({ photo_index: photoIndex, photo_url: photoUrl, enrolled: aiRes.data?.success });
      } catch(aiErr) {
        console.warn('[Face] AI enroll failed for photo', photoIndex, aiErr.message);
        results.push({ photo_index: photoIndex, photo_url: photoUrl, enrolled: false, error: aiErr.message });
      }
      photoIndex = [1,2,3,4,5].find(i=>!usedIndexes.includes(i) && i>photoIndex) || photoIndex+1;
    }

    // Update face_photo_count and face_enrolled status
    const totalPhotos = await pgPool.query(
      `SELECT COUNT(*) as cnt FROM student_face_photos WHERE student_id=$1`, [studentId]);
    const count = parseInt(totalPhotos.rows[0].cnt);
    await pgPool.query(
      `UPDATE students SET face_photo_count=$1, face_enrolled=$2, updated_at=NOW() WHERE id=$3`,
      [count, count > 0, studentId]);

    return ok(res, { results, total_photos: count, face_enrolled: count > 0 }, `${results.length} photo(s) uploaded`);
  } catch(err){ console.error('[Face] uploadFacePhotos:', err.message); return fail(res,'Server error',500); }
};

// DELETE /students/:id/face-photos/:photoId
const deleteFacePhoto = async (req, res) => {
  const { id: studentId, photoId } = req.params;
  try {
    const photo = await pgPool.query(`SELECT * FROM student_face_photos WHERE id=$1 AND student_id=$2`, [photoId, studentId]);
    if(!photo.rows.length) return fail(res,'Photo not found',404);
    const { photo_url, photo_index } = photo.rows[0];
    // Delete file
    const filePath = path.join(__dirname,'../../', photo_url);
    if(fs.existsSync(filePath)) fs.unlinkSync(filePath);
    // Delete DB record
    await pgPool.query(`DELETE FROM student_face_photos WHERE id=$1`, [photoId]);
    // Delete embedding for this index
    await pgPool.query(`DELETE FROM student_face_embeddings WHERE student_id=$1 AND photo_index=$2 AND embed_type='stored'`, [studentId, photo_index]);
    // Update count
    const count = await pgPool.query(`SELECT COUNT(*) as cnt FROM student_face_photos WHERE student_id=$1`, [studentId]);
    const cnt = parseInt(count.rows[0].cnt);
    await pgPool.query(`UPDATE students SET face_photo_count=$1, face_enrolled=$2, updated_at=NOW() WHERE id=$3`, [cnt, cnt>0, studentId]);
    return ok(res, { total_photos: cnt }, 'Photo deleted');
  } catch(err){ return fail(res,'Server error',500); }
};

const enrollFace = async (req, res) => {
  try {
    const {rows}=await pgPool.query('SELECT photo_url FROM students WHERE id=$1',[req.params.id]);
    if(!rows.length) return fail(res,'Student not found',404);
    if(!rows[0].photo_url) return fail(res,'No photo uploaded yet');
    const photoPath=path.join(__dirname,'../../',rows[0].photo_url);
    if(!fs.existsSync(photoPath)) return fail(res,'Photo file not found');
    const imageData=fs.readFileSync(photoPath).toString('base64');
    const aiRes=await axios.post(`${AI_URL}/api/v1/enroll`,{student_id:req.params.id,image_base64:imageData},{timeout:30000});
    await pgPool.query('UPDATE students SET face_enrolled=true WHERE id=$1',[req.params.id]);
    return ok(res,{ai_response:aiRes.data},'Face enrolled ✓');
  } catch(err){ return fail(res,`Face enroll failed: ${err.message}`,500); }
};

const _autoEnrollFace = async (studentId, filePath, photoIndex=1) => {
  const imageData=fs.readFileSync(filePath).toString('base64');
  try {
    await axios.post(`${AI_URL}/api/v1/enroll-multi`,{student_id:studentId,image_base64:imageData,photo_index:photoIndex,embed_type:'stored'},{timeout:30000});
  } catch {
    // fallback to single enroll
    await axios.post(`${AI_URL}/api/v1/enroll`,{student_id:studentId,image_base64:imageData},{timeout:30000});
  }
  await pgPool.query('UPDATE students SET face_enrolled=true,face_photo_count=GREATEST(face_photo_count,1) WHERE id=$1',[studentId]);
  console.log(`[Face] Auto-enrolled ${studentId} ✓`);
};

module.exports={getAll,getOne,create,update,remove,enrollFace,getFacePhotos,uploadFacePhotos,deleteFacePhoto};
