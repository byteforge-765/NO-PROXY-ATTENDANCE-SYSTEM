const path=require('path');
const fs=require('fs');
const {pgPool}=require('../../config/db');
const {ok,fail}=require('../../utils/response');

const getAll=async(req,res)=>{
  try{
    const {subject,batch,department_id}=req.query;
    let q=`SELECT sm.*,f.name AS uploaded_by_name FROM study_materials sm LEFT JOIN faculty f ON sm.uploaded_by=f.id WHERE 1=1`;
    const p=[];
    if(req.user.role==='student'){
      const stu=await pgPool.query('SELECT batch FROM students WHERE id=$1',[req.user.id]);
      if(stu.rows[0]?.batch){p.push(stu.rows[0].batch);q+=` AND (sm.batch=$${p.length} OR sm.batch IS NULL)`;}
    }
    if(subject){p.push(subject);q+=` AND sm.subject=$${p.length}`;}
    if(batch&&req.user.role!=='student'){p.push(batch);q+=` AND sm.batch=$${p.length}`;}
    if(department_id){p.push(department_id);q+=` AND sm.department_id=$${p.length}`;}
    q+=' ORDER BY sm.created_at DESC';
    const r=await pgPool.query(q,p);
    return ok(res,{materials:r.rows});
  }catch(err){return fail(res,'Server error',500);}
};

const upload=async(req,res)=>{
  if(!req.file)return fail(res,'File required');
  const {title,subject,batch,description,department_id}=req.body;
  if(!title||!subject)return fail(res,'title and subject required');
  try{
    const file_url=`/uploads/study-material/${req.file.filename}`;
    const r=await pgPool.query(
      `INSERT INTO study_materials(title,subject,batch,description,file_url,file_type,file_size,uploaded_by,department_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [title,subject,batch||null,description||null,file_url,req.file.mimetype,req.file.size,req.user.id,department_id||null]);
    return ok(res,{material:r.rows[0]},'Uploaded',201);
  }catch(err){return fail(res,'Server error',500);}
};

const remove=async(req,res)=>{
  try{
    const r=await pgPool.query('SELECT file_url FROM study_materials WHERE id=$1',[req.params.id]);
    if(!r.rows.length)return fail(res,'Not found',404);
    const fp=path.join(__dirname,'../../',r.rows[0].file_url);
    if(fs.existsSync(fp))fs.unlinkSync(fp);
    await pgPool.query('DELETE FROM study_materials WHERE id=$1',[req.params.id]);
    return ok(res,{},'Deleted');
  }catch(err){return fail(res,'Server error',500);}
};

module.exports={getAll,upload,remove};