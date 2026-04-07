const {pgPool}=require('../../config/db');
const {ok,fail}=require('../../utils/response');

const getAll=async(req,res)=>{
  try{
    const r=await pgPool.query(`
      SELECT d.*,
        (SELECT COUNT(*) FROM students s WHERE s.department_id=d.id) AS student_count,
        (SELECT COUNT(*) FROM faculty f WHERE f.department_id=d.id) AS faculty_count
      FROM departments d ORDER BY d.name`);
    return ok(res,{departments:r.rows});
  }catch(err){return fail(res,'Server error',500);}
};

const getOne=async(req,res)=>{
  try{
    const r=await pgPool.query('SELECT * FROM departments WHERE id=$1',[req.params.id]);
    if(!r.rows.length)return fail(res,'Department not found',404);
    return ok(res,{department:r.rows[0]});
  }catch(err){return fail(res,'Server error',500);}
};

const create=async(req,res)=>{
  const {name,code,hod_name}=req.body;
  if(!name)return fail(res,'name required');
  try{
    const r=await pgPool.query('INSERT INTO departments(name,code,hod_name) VALUES($1,$2,$3) RETURNING *',[name,code||null,hod_name||null]);
    return ok(res,{department:r.rows[0]},'Department created',201);
  }catch(err){return fail(res,'Server error',500);}
};

const update=async(req,res)=>{
  const {name,code,hod_name}=req.body;
  try{
    await pgPool.query('UPDATE departments SET name=$1,code=$2,hod_name=$3 WHERE id=$4',[name,code,hod_name,req.params.id]);
    return ok(res,{},'Updated');
  }catch(err){return fail(res,'Server error',500);}
};

const remove=async(req,res)=>{
  try{await pgPool.query('DELETE FROM departments WHERE id=$1',[req.params.id]);return ok(res,{},'Deleted');}
  catch(err){return fail(res,'Server error',500);}
};

module.exports={getAll,getOne,create,update,remove};