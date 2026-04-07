const {pgPool}=require('../../config/db');
const {ok,fail}=require('../../utils/response');

const DAY_ORDER="CASE day WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 ELSE 7 END";

const getAll=async(req,res)=>{
  try{
    const {batch,section,faculty_id,department_id}=req.query;
    let q=`SELECT t.*,f.name AS faculty_name,d.name AS department_name
           FROM timetable t LEFT JOIN faculty f ON t.faculty_id=f.id LEFT JOIN departments d ON t.department_id=d.id WHERE 1=1`;
    const p=[];
    if(req.user.role==='student'){
      // Student sees their own section timetable
      const stu=await pgPool.query('SELECT batch,section FROM students WHERE id=$1',[req.user.id]);
      if(stu.rows[0]?.section){p.push(stu.rows[0].section);q+=` AND t.section=$${p.length}`;}
      if(stu.rows[0]?.batch){p.push(stu.rows[0].batch);q+=` AND t.batch=$${p.length}`;}
    } else if(req.user.role==='faculty'){
      p.push(req.user.id);q+=` AND t.faculty_id=$${p.length}`;
    } else {
      // Admin: filter by any param
      if(section){p.push(section);q+=` AND t.section=$${p.length}`;}
      else if(batch){p.push(batch);q+=` AND t.batch=$${p.length}`;}
      if(faculty_id){p.push(faculty_id);q+=` AND t.faculty_id=$${p.length}`;}
      if(department_id){p.push(department_id);q+=` AND t.department_id=$${p.length}`;}
    }
    q+=` ORDER BY ${DAY_ORDER},t.slot_time`;
    const r=await pgPool.query(q,p);
    return ok(res,{timetable:r.rows});
  }catch(err){console.error('[TT]',err.message);return fail(res,'Server error',500);}
};

const create=async(req,res)=>{
  const {day,slot_time,subject,subject_code,room,batch,section,faculty_id,department_id}=req.body;
  if(!day||!slot_time||!subject)return fail(res,'day,slot_time,subject required');
  try{
    const r=await pgPool.query(
      'INSERT INTO timetable(day,slot_time,subject,subject_code,room,batch,section,faculty_id,department_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [day,slot_time,subject,subject_code||null,room||null,batch||null,section||null,faculty_id||null,department_id||null]);
    return ok(res,{entry:r.rows[0]},'Entry created',201);
  }catch(err){return fail(res,'Server error',500);}
};

const update=async(req,res)=>{
  const {day,slot_time,subject,subject_code,room,batch,section,faculty_id}=req.body;
  try{
    await pgPool.query('UPDATE timetable SET day=$1,slot_time=$2,subject=$3,subject_code=$4,room=$5,batch=$6,section=$7,faculty_id=$8 WHERE id=$9',
      [day,slot_time,subject,subject_code,room,batch,section,faculty_id,req.params.id]);
    return ok(res,{},'Updated');
  }catch(err){return fail(res,'Server error',500);}
};

const remove=async(req,res)=>{
  try{await pgPool.query('DELETE FROM timetable WHERE id=$1',[req.params.id]);return ok(res,{},'Deleted');}
  catch(err){return fail(res,'Server error',500);}
};

module.exports={getAll,create,update,remove};
