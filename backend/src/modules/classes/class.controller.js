const {pgPool}=require('../../config/db');
const {ok,fail}=require('../../utils/response');
const axios=require('axios');
const AI_URL=process.env.AI_SERVICE_URL||'http://localhost:8001';

const getAll=async(req,res)=>{
  try{
    const {faculty_id,department_id,date,section,batch}=req.query;
    let q=`SELECT c.*,f.name AS faculty_name,d.name AS department_name,
           (SELECT COUNT(*) FROM class_enrollments ce WHERE ce.class_id=c.id) AS enrolled_count
           FROM classes c LEFT JOIN faculty f ON c.faculty_id=f.id LEFT JOIN departments d ON c.department_id=d.id WHERE 1=1`;
    const p=[];
    if(faculty_id){p.push(faculty_id);q+=` AND c.faculty_id=$${p.length}`;}
    if(department_id){p.push(department_id);q+=` AND c.department_id=$${p.length}`;}
    if(date){p.push(date);q+=` AND c.class_date=$${p.length}`;}
    if(section){p.push(section);q+=` AND c.section=$${p.length}`;}
    if(batch){p.push(batch);q+=` AND c.batch=$${p.length}`;}
    if(req.user.role==='faculty'){p.push(req.user.id);q+=` AND c.faculty_id=$${p.length}`;}
    q+=' ORDER BY c.class_date DESC,c.start_time DESC';
    const r=await pgPool.query(q,p);
    return ok(res,{classes:r.rows});
  }catch(err){console.error('[Class] getAll:',err.message);return fail(res,'Server error',500);}
};

const getOne=async(req,res)=>{
  try{
    const cls=await pgPool.query(`SELECT c.*,f.name AS faculty_name,d.name AS department_name
      FROM classes c LEFT JOIN faculty f ON c.faculty_id=f.id LEFT JOIN departments d ON c.department_id=d.id
      WHERE c.id=$1`,[req.params.id]);
    if(!cls.rows.length)return fail(res,'Class not found',404);
    const enrolled=await pgPool.query(
      `SELECT s.id,s.user_id,s.name,s.roll_no,s.photo_url,s.whatsapp_phone,s.face_enrolled,s.face_photo_count
       FROM class_enrollments ce JOIN students s ON ce.student_id=s.id WHERE ce.class_id=$1 ORDER BY s.roll_no`,[req.params.id]);
    return ok(res,{class:cls.rows[0],students:enrolled.rows});
  }catch(err){return fail(res,'Server error',500);}
};

const create=async(req,res)=>{
  const {subject,subject_code,batch,section,class_date,start_time,end_time,room,
         classroom_lat,classroom_lon,classroom_radius,department_id,student_ids}=req.body;
  if(!subject||!class_date||!start_time)return fail(res,'subject,class_date,start_time required');
  const faculty_id=req.user.role==='faculty'?req.user.id:req.body.faculty_id;
  try{
    const r=await pgPool.query(
      `INSERT INTO classes(subject,subject_code,batch,section,class_date,start_time,end_time,room,
       classroom_lat,classroom_lon,classroom_radius,faculty_id,department_id,status)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'active') RETURNING *`,
      [subject,subject_code||null,batch||null,section||null,class_date,start_time,end_time||null,room||null,
       classroom_lat||28.675624,classroom_lon||77.503096,classroom_radius||50,
       faculty_id,department_id||null]);
    const cls=r.rows[0];
    // Enroll students by section + batch if not explicit list
    if(student_ids&&student_ids.length>0){
      for(const sid of student_ids){
        await pgPool.query('INSERT INTO class_enrollments(class_id,student_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[cls.id,sid]);
      }
    } else if(section&&batch){
      await pgPool.query(
        `INSERT INTO class_enrollments(class_id,student_id)
         SELECT $1,id FROM students WHERE section=$2 AND batch=$3
         ON CONFLICT DO NOTHING`,[cls.id,section,batch]);
    } else if(section){
      await pgPool.query(
        `INSERT INTO class_enrollments(class_id,student_id)
         SELECT $1,id FROM students WHERE section=$2
         ON CONFLICT DO NOTHING`,[cls.id,section]);
    } else if(batch){
      await pgPool.query(
        `INSERT INTO class_enrollments(class_id,student_id)
         SELECT $1,id FROM students WHERE batch=$2
         ON CONFLICT DO NOTHING`,[cls.id,batch]);
    }
    // Auto-bulk enroll faces
    _triggerBulkEnroll(cls.id).catch(e=>console.warn('[Face] bulk enroll:',e.message));
    return ok(res,{class:cls},'Class created',201);
  }catch(err){console.error('[Class] create:',err.message);return fail(res,'Server error',500);}
};

const update=async(req,res)=>{
  const {subject,subject_code,batch,section,class_date,start_time,end_time,room,status}=req.body;
  try{
    await pgPool.query(
      `UPDATE classes SET subject=$1,subject_code=$2,batch=$3,section=$4,class_date=$5,
       start_time=$6,end_time=$7,room=$8,status=$9,updated_at=NOW() WHERE id=$10`,
      [subject,subject_code,batch,section,class_date,start_time,end_time,room,status,req.params.id]);
    return ok(res,{},'Class updated');
  }catch(err){return fail(res,'Server error',500);}
};

const remove=async(req,res)=>{
  try{await pgPool.query('DELETE FROM classes WHERE id=$1',[req.params.id]);return ok(res,{},'Deleted');}
  catch(err){return fail(res,'Server error',500);}
};

const myClasses=async(req,res)=>{
  try{
    const r=await pgPool.query(
      `SELECT c.*,f.name AS faculty_name FROM class_enrollments ce
       JOIN classes c ON ce.class_id=c.id LEFT JOIN faculty f ON c.faculty_id=f.id
       WHERE ce.student_id=$1 ORDER BY c.class_date DESC,c.start_time DESC`,[req.user.id]);
    return ok(res,{classes:r.rows});
  }catch(err){return fail(res,'Server error',500);}
};

const _triggerBulkEnroll = async(classId) => {
  await axios.post(`${AI_URL}/api/v1/enroll/bulk`,{class_id:String(classId)},{timeout:60000});
  console.log(`[Face] Bulk enroll triggered for class ${classId}`);
};

module.exports={getAll,getOne,create,update,remove,myClasses};
