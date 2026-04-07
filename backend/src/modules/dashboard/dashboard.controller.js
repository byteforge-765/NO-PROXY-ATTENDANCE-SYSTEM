const {pgPool}=require('../../config/db');
const {ok,fail}=require('../../utils/response');

const adminDashboard=async(req,res)=>{
  try{
    const [students,faculty,depts,classesToday,presentToday]=await Promise.all([
      pgPool.query('SELECT COUNT(*) FROM students'),
      pgPool.query('SELECT COUNT(*) FROM faculty'),
      pgPool.query('SELECT COUNT(*) FROM departments'),
      pgPool.query("SELECT COUNT(*) FROM classes WHERE class_date=CURRENT_DATE"),
      pgPool.query(`SELECT COUNT(*) FROM attendance a JOIN classes c ON a.class_id=c.id WHERE c.class_date=CURRENT_DATE AND a.status='present'`),
    ]);

    const weekStats=await pgPool.query(`
      SELECT c.class_date::text AS date,
             COUNT(CASE WHEN a.status='present' THEN 1 END) AS present,
             COUNT(a.id) AS total
      FROM classes c LEFT JOIN attendance a ON a.class_id=c.id
      WHERE c.class_date>=CURRENT_DATE-INTERVAL '7 days'
      GROUP BY c.class_date ORDER BY c.class_date`);

    const recentStudents=await pgPool.query(
      `SELECT s.name,s.admission_no,d.name AS department,s.created_at
       FROM students s LEFT JOIN departments d ON s.department_id=d.id
       ORDER BY s.created_at DESC LIMIT 5`);

    return ok(res,{
      stats:{
        total_students:parseInt(students.rows[0].count),
        total_faculty:parseInt(faculty.rows[0].count),
        total_departments:parseInt(depts.rows[0].count),
        classes_today:parseInt(classesToday.rows[0].count),
        present_today:parseInt(presentToday.rows[0].count),
      },
      week_attendance:weekStats.rows,
      recent_students:recentStudents.rows,
    });
  }catch(err){console.error('[Dashboard] admin:',err.message);return fail(res,'Server error',500);}
};

const studentDashboard=async(req,res)=>{
  const studentId=req.user.id;
  try{
    const attRes=await pgPool.query(
      `SELECT COUNT(CASE WHEN a.status='present' THEN 1 END) AS present,COUNT(a.id) AS total
       FROM attendance a WHERE a.student_id=$1`,[studentId]);

    const subjRes=await pgPool.query(
      `SELECT c.subject,COUNT(CASE WHEN a.status='present' THEN 1 END) AS present,COUNT(a.id) AS total
       FROM attendance a JOIN classes c ON a.class_id=c.id WHERE a.student_id=$1 GROUP BY c.subject ORDER BY c.subject`,[studentId]);

    const upcomingRes=await pgPool.query(
      `SELECT c.*,f.name AS faculty_name FROM class_enrollments ce
       JOIN classes c ON ce.class_id=c.id LEFT JOIN faculty f ON c.faculty_id=f.id
       WHERE ce.student_id=$1 AND c.class_date>=CURRENT_DATE AND c.status='active'
       ORDER BY c.class_date,c.start_time LIMIT 5`,[studentId]);

    const notifs=await pgPool.query(
      'SELECT COUNT(*) FROM notifications WHERE student_id=$1 AND is_read=false',[studentId]);

    const present=parseInt(attRes.rows[0].present)||0;
    const total=parseInt(attRes.rows[0].total)||0;
    return ok(res,{
      attendance_pct:total>0?Math.round((present/total)*100):0,
      present_classes:present,
      total_classes:total,
      subject_wise:subjRes.rows.map(r=>({
        subject:r.subject,present:parseInt(r.present),total:parseInt(r.total),
        pct:parseInt(r.total)>0?Math.round((parseInt(r.present)/parseInt(r.total))*100):0})),
      upcoming_classes:upcomingRes.rows,
      unread_notifications:parseInt(notifs.rows[0].count),
    });
  }catch(err){console.error('[Dashboard] student:',err.message);return fail(res,'Server error',500);}
};

module.exports={adminDashboard,studentDashboard};