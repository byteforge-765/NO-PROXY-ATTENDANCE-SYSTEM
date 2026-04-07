const mongoose=require('mongoose');
const schema=new mongoose.Schema({
  class_id:   {type:Number,required:true},
  student_id: {type:Number,required:true},
  face_verified:             {type:Boolean,default:false},
  face_confidence:           {type:Number, default:0},
  gps_verified:              {type:Boolean,default:false},
  gps_distance:              {type:Number, default:0},
  step1_at:                  {type:Date},
  faculty_headcount_confirmed:{type:Boolean,default:false},
  otp_verified:              {type:Boolean,default:false},
  otp_verified_at:           {type:Date},
  final_status:              {type:String,enum:['present','absent','pending'],default:'pending'},
},{timestamps:true});
schema.index({class_id:1,student_id:1},{unique:true});
module.exports=mongoose.model('AttendanceSession',schema);