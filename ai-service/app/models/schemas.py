"""
Pydantic schemas — all API request/response models
"""
from pydantic import BaseModel, Field
from typing import Optional


# ── Enrollment ────────────────────────────────────────────────────

class EnrollRequest(BaseModel):
    student_id:   str = Field(..., example="STU2024001")
    image_base64: str = Field(..., description="Base64 JPEG/PNG — clear frontal face photo")

class EnrollResponse(BaseModel):
    success:    bool
    student_id: str
    message:    str


class AutoEnrollRequest(BaseModel):
    student_id: str = Field(..., description="Will use profile_pic_url from students table")

class BulkEnrollRequest(BaseModel):
    class_id: str = Field(..., description="Enroll all students in this class from their profile pics")

class BulkEnrollResponse(BaseModel):
    enrolled: list[dict]
    failed:   list[dict]
    summary:  str


# ── Step 1 — Student verify (selfie + GPS) ────────────────────────

class VerifyStudentRequest(BaseModel):
    student_id:    str   = Field(..., example="STU2024001")
    class_id:      str   = Field(..., example="CLASS-UUID-123")
    selfie_base64: str   = Field(..., description="Live selfie from Flutter camera")
    latitude:      float = Field(..., example=28.7041)
    longitude:     float = Field(..., example=77.1025)

class VerifyStudentResponse(BaseModel):
    student_id:          str
    face_matched:        bool
    face_confidence:     float
    gps_inside:          bool
    gps_distance_meters: float
    step1_passed:        bool
    message:             str


# ── Step 3 — Faculty headcount + cross-check ─────────────────────

class HeadcountRequest(BaseModel):
    class_id:           str       = Field(..., example="CLASS-UUID-123")
    faculty_id:         str       = Field(..., example="FAC001")
    photo_base64:       str       = Field(..., description="Class photo taken by faculty")
    step1_verified_ids: list[str] = Field(..., description="Student IDs that passed Step 1")

class DetectedFace(BaseModel):
    student_id:    Optional[str]  = Field(None, description="None if face is unrecognised")
    student_name:  Optional[str]  = None
    roll_no:       Optional[str]  = None
    confidence:    float
    bbox:          list[int]      = Field(..., description="[x1, y1, x2, y2] pixels in faculty photo")
    in_step1_list: bool

class HeadcountResponse(BaseModel):
    class_id:             str
    total_faces_detected: int
    detected_faces:       list[DetectedFace]
    unmatched_face_count: int
    cross_check_passed:   list[str]   = Field(..., description="Confirmed present — get WhatsApp OTP")
    cross_check_failed:   list[str]   = Field(..., description="Step-1 passed but not seen in photo")
    final_present_count:  int
    message:              str


# ── Multi-photo enrollment ────────────────────────────────────────

class EnrollMultiRequest(BaseModel):
    student_id:   str = Field(..., example="1")
    image_base64: str = Field(..., description="Base64 face photo")
    photo_index:  int = Field(1, description="Slot 1-5 for stored, 0 for temp")
    embed_type:   str = Field("stored", description="'stored' or 'temp'")

class EnrollMultiResponse(BaseModel):
    success:     bool
    student_id:  str
    photo_index: int
    message:     str
