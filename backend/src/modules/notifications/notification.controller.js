const {pgPool}=require('../../config/db');
const {sendWhatsAppOtp}=require('../../utils/whatsapp');
const {ok,fail}=require('../../utils/response');

const send=async(req,res)=>{
  const {type,message,batch,student_ids}=req.body;
  if(!message)return fail(res,'message required');
  try{
    let targets=[];
    if(student_ids&&student_ids.length){
      const r=await pgPool.query('SELECT id,name,whatsapp_phone FROM students WHERE id=ANY($1::int[])',[student_ids]);
      targets=r.rows;
    }else if(batch){
      const r=await pgPool.query('SELECT id,name,whatsapp_phone FROM students WHERE batch=$1',[batch]);
      targets=r.rows;
    }else return fail(res,'Provide student_ids or batch');
    for(const t of targets){
      await pgPool.query('INSERT INTO notifications(student_id,message,sent_by,type) VALUES($1,$2,$3,$4)',
        [t.id,message,req.user.id,type||'in-app']);
      if(type==='whatsapp'&&t.whatsapp_phone) await sendWhatsAppOtp(t.whatsapp_phone,message,t.name);
    }
    return ok(res,{sent_to:targets.length},'Sent');
  }catch(err){return fail(res,'Server error',500);}
};

const getMyNotifications=async(req,res)=>{
  try{
    const r=await pgPool.query('SELECT * FROM notifications WHERE student_id=$1 ORDER BY created_at DESC LIMIT 50',[req.user.id]);
    return ok(res,{notifications:r.rows});
  }catch(err){return fail(res,'Server error',500);}
};

const markRead=async(req,res)=>{
  try{
    await pgPool.query('UPDATE notifications SET is_read=true WHERE id=$1 AND student_id=$2',[req.params.id,req.user.id]);
    return ok(res,{},'Marked read');
  }catch(err){return fail(res,'Server error',500);}
};

module.exports={send,getMyNotifications,markRead};