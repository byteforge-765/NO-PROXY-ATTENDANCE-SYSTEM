const bcrypt=require('bcryptjs');
const path=require('path');
const fs=require('fs');
const {pgPool}=require('../../config/db');
const {ok,fail}=require('../../utils/response');

const getAll=async(req,res)=>{
  try{
    const {department_id,search}=req.query;
    let q=`SELECT f.id,f.user_id,f.name,f.dob,f.mobile,f.whatsapp_phone,
           f.email,f.designation,f.photo_url,d.name AS department,d.id AS department_id
           FROM faculty f LEFT JOIN departments d ON f.department_id=d.id WHERE 1=1`;
    const p=[];
    if(department_id){p.push(department_id);q+=` AND f.department_id=$${p.length}`;}
    if(search){p.push(`%${search}%`);q+=` AND (f.name ILIKE $${p.length} OR f.user_id ILIKE $${p.length})`;}
    q+=' ORDER BY f.name';
    const r=await pgPool.query(q,p);
    return ok(res,{faculty:r.rows});
  }catch(err){return fail(res,'Server error',500);}
};

const getOne=async(req,res)=>{
  try{
    const r=await pgPool.query(`SELECT f.*,d.name AS department FROM faculty f LEFT JOIN departments d ON f.department_id=d.id WHERE f.id=$1`,[req.params.id]);
    if(!r.rows.length) return fail(res,'Faculty not found',404);
    const f=r.rows[0];delete f.password_hash;
    return ok(res,{faculty:f});
  }catch(err){return fail(res,'Server error',500);}
};

const create=async(req,res)=>{
  const {user_id,password,name,dob,mobile,whatsapp_phone,email,designation,department_id}=req.body;
  if(!user_id||!password||!name) return fail(res,'user_id,password,name required');
  try{
    const dup=await pgPool.query('SELECT id FROM faculty WHERE user_id=$1',[user_id]);
    if(dup.rows.length) return fail(res,'User ID already exists');
    const hash=await bcrypt.hash(password,10);
    const photo_url=req.file?`/uploads/photos/${req.file.filename}`:null;
    const r=await pgPool.query(
      `INSERT INTO faculty(user_id,password_hash,name,dob,mobile,whatsapp_phone,email,designation,department_id,photo_url)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id,user_id,name,photo_url`,
      [user_id,hash,name,dob,mobile||null,whatsapp_phone||mobile||null,email||null,designation||null,department_id||null,photo_url]);
    return ok(res,{faculty:r.rows[0]},'Faculty created',201);
  }catch(err){console.error('[Faculty] create:',err.message);return fail(res,'Server error',500);}
};

const update=async(req,res)=>{
  const {name,dob,mobile,whatsapp_phone,email,designation,department_id}=req.body;
  try{
    let photo_url;
    if(req.file){
      photo_url=`/uploads/photos/${req.file.filename}`;
      const old=await pgPool.query('SELECT photo_url FROM faculty WHERE id=$1',[req.params.id]);
      if(old.rows[0]?.photo_url){const p=path.join(__dirname,'../../',old.rows[0].photo_url);if(fs.existsSync(p))fs.unlinkSync(p);}
    }
    // Explicit whitelist prevents field injection
    const ALLOWED=['name','dob','mobile','whatsapp_phone','email','designation','department_id'];
    const fields={name,dob,mobile,whatsapp_phone,email,designation,department_id};
    if(photo_url)fields.photo_url=photo_url;
    const entries=Object.entries(fields).filter(([k,v])=>v!==undefined&&(ALLOWED.includes(k)||k==='photo_url'));
    if(!entries.length)return fail(res,'Nothing to update');
    const set=entries.map(([k],i)=>`${k}=$${i+2}`).join(', ');
    await pgPool.query(`UPDATE faculty SET ${set},updated_at=NOW() WHERE id=$1`,[req.params.id,...entries.map(([,v])=>v)]);
    return ok(res,{},'Faculty updated');
  }catch(err){return fail(res,'Server error',500);}
};

const remove=async(req,res)=>{
  try{await pgPool.query('DELETE FROM faculty WHERE id=$1',[req.params.id]);return ok(res,{},'Faculty deleted');}
  catch(err){return fail(res,'Server error',500);}
};

module.exports={getAll,getOne,create,update,remove};