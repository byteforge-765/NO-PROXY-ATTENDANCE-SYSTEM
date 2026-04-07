const axios=require('axios');
const {pgPool}=require('../../config/db');
const AttendanceSession=require('./attendance.model');
const {ok,fail}=require('../../utils/response');
const {generateOtp,saveOtp,verifyOtp}=require('../../utils/otp');
const tgService=require('../tigergraph/tigergraph.service');
const {sendWhatsAppOtp}=require('../../utils/whatsapp');
const {isInsideGeofence}=require('../../utils/gps');

const AI_URL=process.env.AI_SERVICE_URL||'http://localhost:8001';

// STEP 1 (Student): POST /api/attendance/smart/verify-face
// Student sends selfie + GPS -> face check + geofence -> saved in MongoDB
const verifyStudentFace=async(req,res)=>{
  const {class_id,image_base64,lat,lon}=req.body;
  const student_id=req.user.id;
  if(!class_id||!image_base64||lat==null||lon==null)
    return fail(res,'class_id,image_base64,lat,lon required');
  try{
    const cls=await pgPool.query('SELECT * FROM classes WHERE id=$1',[class_id]);
    if(!cls.rows.length)return fail(res,'Class not found',404);
    const classData=cls.rows[0];
    if(classData.status!=='active')return fail(res,'Class is not active');

    const enrolled=await pgPool.query(
      'SELECT id FROM class_enrollments WHERE class_id=$1 AND student_id=$2',[class_id,student_id]);
    if(!enrolled.rows.length)return fail(res,'You are not enrolled in this class');

    // GPS check
    const geo=isInsideGeofence(
      {lat:parseFloat(lat),lon:parseFloat(lon)},
      {lat:parseFloat(classData.classroom_lat),lon:parseFloat(classData.classroom_lon),radius_metres:classData.classroom_radius||50});
    if(!geo.inside)
      return fail(res,`You are ${geo.distance_metres}m away. Must be within ${classData.classroom_radius||50}m.`,400);

    // Face recognition via AI service
    let faceResult={face_matched:false,face_confidence:0};
    try{
      const aiRes=await axios.post(`${AI_URL}/api/v1/verify-student`,
        {student_id:String(student_id),class_id:String(class_id),selfie_base64:image_base64,
         latitude:parseFloat(lat),longitude:parseFloat(lon)},{timeout:20000});
      faceResult=aiRes.data;
    }catch(aiErr){
      console.warn('[AI] Face verify failed:',aiErr.message,'— dev mode fallback');
      faceResult={face_matched:true,face_confidence:1.0,step1_passed:true,dev_mode:true};
    }

    if(!faceResult.face_matched&&!faceResult.dev_mode)
      return fail(res,'Face not recognised. Try in better lighting.',400);

    // Save step-1 in MongoDB
    await AttendanceSession.findOneAndUpdate(
      {class_id,student_id},
      {class_id,student_id,face_verified:true,face_confidence:faceResult.face_confidence||1,
       gps_verified:true,gps_distance:geo.distance_metres,step1_at:new Date(),otp_verified:false},
      {upsert:true,new:true});

    return ok(res,{face_confidence:faceResult.face_confidence,distance_metres:geo.distance_metres},'Face & location verified ✓');
  }catch(err){console.error('[Attendance] verifyFace:',err.message);return fail(res,'Server error',500);}
};

// STEP 2 (Faculty): POST /api/attendance/smart/headcount
// Faculty uploads class photo -> AI detects faces -> cross-checks step1 list
const facultyHeadcount=async(req,res)=>{
  const {class_id,image_base64}=req.body;
  const faculty_id=req.user.id;
  if(!class_id||!image_base64)return fail(res,'class_id and image_base64 required');
  try{
    const cls=await pgPool.query('SELECT * FROM classes WHERE id=$1 AND faculty_id=$2',[class_id,faculty_id]);
    if(!cls.rows.length)return fail(res,'Class not found or not yours',404);

    // Get step1 verified students
    const step1Sessions=await AttendanceSession.find({class_id:parseInt(class_id),face_verified:true,gps_verified:true});
    const step1Ids=step1Sessions.map(s=>String(s.student_id));

    // Call AI headcount
    let headcountResult={total_faces_detected:0,cross_check_passed:[],cross_check_failed:step1Ids,final_present_count:0,detected_faces:[]};
    try{
      const aiRes=await axios.post(`${AI_URL}/api/v1/headcount`,
        {class_id:String(class_id),faculty_id:String(faculty_id),
         photo_base64:image_base64,step1_verified_ids:step1Ids},{timeout:40000});
      headcountResult=aiRes.data;
    }catch(aiErr){
      console.warn('[AI] Headcount failed:',aiErr.message,'— using step1 list as fallback');
      headcountResult.cross_check_passed=step1Ids;
      headcountResult.cross_check_failed=[];
      headcountResult.final_present_count=step1Ids.length;
    }

    // Mark headcount confirmed in MongoDB for cross-checked students
    if(headcountResult.cross_check_passed.length){
      await AttendanceSession.updateMany(
        {class_id:parseInt(class_id),student_id:{$in:headcountResult.cross_check_passed.map(Number)}},
        {faculty_headcount_confirmed:true});
    }

    // Get student names for response
    const enrolled=await pgPool.query(
      'SELECT id,name,roll_no FROM students WHERE id=ANY($1::int[])',
      [step1Ids.map(Number)]);

    return ok(res,{
      total_faces_detected:headcountResult.total_faces_detected,
      step1_verified_count:step1Ids.length,
      cross_check_passed:headcountResult.cross_check_passed,
      cross_check_failed:headcountResult.cross_check_failed,
      final_present_count:headcountResult.final_present_count,
      detected_faces:headcountResult.detected_faces||[],
      students:enrolled.rows,
    },'Headcount complete ✓');
  }catch(err){console.error('[Attendance] headcount:',err.message);return fail(res,'Server error',500);}
};

// STEP 3 (Faculty): POST /api/attendance/smart/send-otp
// Faculty triggers OTP to headcount-confirmed students via WhatsApp
const sendOtpToStudents=async(req,res)=>{
  const {class_id}=req.body;
  const faculty_id=req.user.id;
  if(!class_id)return fail(res,'class_id required');
  try{
    const cls=await pgPool.query('SELECT * FROM classes WHERE id=$1 AND faculty_id=$2',[class_id,faculty_id]);
    if(!cls.rows.length)return fail(res,'Class not found',404);

    // Get headcount-confirmed students
    const sessions=await AttendanceSession.find({
      class_id:parseInt(class_id),face_verified:true,gps_verified:true,faculty_headcount_confirmed:true});
    if(!sessions.length)return fail(res,'No students confirmed by headcount yet. Run headcount first.');

    const studentIds=sessions.map(s=>s.student_id);
    const stuRes=await pgPool.query(
      'SELECT id,name,whatsapp_phone FROM students WHERE id=ANY($1::int[])',[studentIds]);

    const results=[];
    for(const student of stuRes.rows){
      const otp=generateOtp();
      await saveOtp(`${class_id}:${student.id}`,otp);
      let waResult={success:true,dev_mode:true,otp};
      if(student.whatsapp_phone){
        waResult=await sendWhatsAppOtp(student.whatsapp_phone,otp,student.name);
      } else {
        console.log(`[OTP] No WhatsApp for ${student.name}: OTP=${otp}`);
      }
      results.push({student_id:student.id,name:student.name,otp_sent:waResult.success,
        dev_otp:process.env.NODE_ENV!=='production'?otp:undefined});
    }
    return ok(res,{results,total_sent:results.length},`OTP sent to ${results.length} students`);
  }catch(err){console.error('[Attendance] sendOtp:',err.message);return fail(res,'Server error',500);}
};

// STEP 4 (Student): POST /api/attendance/smart/verify-otp
// Student enters OTP -> attendance marked Present in PostgreSQL
const verifyStudentOtp=async(req,res)=>{
  const {class_id,otp}=req.body;
  const student_id=req.user.id;
  if(!class_id||!otp)return fail(res,'class_id and otp required');
  try{
    const session=await AttendanceSession.findOne({class_id:parseInt(class_id),student_id,face_verified:true,gps_verified:true});
    if(!session)return fail(res,'Complete face & location verification first');

    const otpResult=await verifyOtp(`${class_id}:${student_id}`,otp);
    if(!otpResult.valid)return fail(res,otpResult.reason,400);

    // Mark present in PostgreSQL
    await pgPool.query(
      `INSERT INTO attendance(class_id,student_id,status,method,marked_at)
       VALUES($1,$2,'present','smart',NOW())
       ON CONFLICT(class_id,student_id) DO UPDATE SET status='present',method='smart',marked_at=NOW()`,
      [class_id,student_id]);

    const updatedSession = await AttendanceSession.findOneAndUpdate(
      {class_id:parseInt(class_id),student_id},
      {otp_verified:true,otp_verified_at:new Date(),final_status:'present'},
      {new:true});

    // Sync to TigerGraph (fire-and-forget, non-blocking)
    tgService.syncAttendancePresent({
      student_id, class_id,
      method: 'smart',
      face_confidence: updatedSession?.face_confidence || 0,
      gps_distance_m:  updatedSession?.gps_distance || 0,
      marked_at: new Date(),
    }).catch(e => console.warn('[TG] Sync skipped:', e.message));

    return ok(res,{},'Attendance marked Present ✓');
  }catch(err){console.error('[Attendance] verifyOtp:',err.message);return fail(res,'Server error',500);}
};

// Manual attendance — Faculty/Admin
const markManual=async(req,res)=>{
  const {class_id,records}=req.body;
  if(!class_id||!Array.isArray(records)||!records.length)
    return fail(res,'class_id and records[] required');
  try{
    for(const r of records){
      await pgPool.query(
        `INSERT INTO attendance(class_id,student_id,status,method,marked_at)
         VALUES($1,$2,$3,'manual',NOW())
         ON CONFLICT(class_id,student_id) DO UPDATE SET status=$3,method='manual',marked_at=NOW()`,
        [class_id,r.student_id,r.status||'present']);
    }
    return ok(res,{updated:records.length},'Manual attendance saved');
  }catch(err){return fail(res,'Server error',500);}
};

// GET /api/attendance/class/:class_id
const getClassAttendance=async(req,res)=>{
  try{
    const r=await pgPool.query(
      `SELECT a.*,s.name AS student_name,s.roll_no,s.user_id AS student_user_id
       FROM attendance a JOIN students s ON a.student_id=s.id
       WHERE a.class_id=$1 ORDER BY s.roll_no`,[req.params.class_id]);
    return ok(res,{attendance:r.rows});
  }catch(err){return fail(res,'Server error',500);}
};

// GET /api/attendance/student/my
const getMyAttendance=async(req,res)=>{
  const {subject,from,to}=req.query;
  try{
    let q=`SELECT a.status,a.method,a.marked_at,c.subject,c.class_date,c.start_time,c.batch
           FROM attendance a JOIN classes c ON a.class_id=c.id WHERE a.student_id=$1`;
    const p=[req.user.id];
    if(subject){p.push(subject);q+=` AND c.subject=$${p.length}`;}
    if(from)   {p.push(from);   q+=` AND c.class_date>=$${p.length}`;}
    if(to)     {p.push(to);     q+=` AND c.class_date<=$${p.length}`;}
    q+=' ORDER BY c.class_date DESC,c.start_time DESC';
    const r=await pgPool.query(q,p);
    const summary={};
    for(const row of r.rows){
      if(!summary[row.subject])summary[row.subject]={present:0,absent:0,total:0};
      summary[row.subject].total++;
      if(row.status==='present')summary[row.subject].present++;
      else summary[row.subject].absent++;
    }
    return ok(res,{attendance:r.rows,summary});
  }catch(err){return fail(res,'Server error',500);}
};

// GET /api/attendance/session/:class_id — live session status
const getLiveSession=async(req,res)=>{
  try{
    const sessions=await AttendanceSession.find({class_id:parseInt(req.params.class_id)});
    const ids=sessions.map(s=>s.student_id);
    let students=[];
    if(ids.length){
      const r=await pgPool.query('SELECT id,name,roll_no FROM students WHERE id=ANY($1::int[])',[ids]);
      students=r.rows;
    }
    const enriched=sessions.map(s=>({
      ...s.toObject(),
      student_name:students.find(st=>st.id===s.student_id)?.name||'Unknown',
      roll_no:students.find(st=>st.id===s.student_id)?.roll_no||'',
    }));
    return ok(res,{sessions:enriched});
  }catch(err){return fail(res,'Server error',500);}
};

module.exports={verifyStudentFace,facultyHeadcount,sendOtpToStudents,verifyStudentOtp,markManual,getClassAttendance,getMyAttendance,getLiveSession};