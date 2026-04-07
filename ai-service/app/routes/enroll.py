"""
Enrollment Routes
──────────────────────────────────────────────────────────────
POST /api/v1/enroll                 — Manual: admin uploads fresh photo
POST /api/v1/enroll/auto            — Auto: use student's profile_pic_url from DB
POST /api/v1/enroll/bulk            — Auto-enroll ALL students in a class at once

Best practice flow:
  When teacher creates a class → call /enroll/bulk for that class_id
  This processes all enrolled students' profile pics automatically.
  Admin only needs to call /enroll manually if a student's pic is bad.
"""
from fastapi import APIRouter
from app.models.schemas import (
    EnrollRequest, EnrollResponse,
    AutoEnrollRequest,
    BulkEnrollRequest, BulkEnrollResponse,
)
from app.services.face_service import enroll_face, auto_enroll_from_profile_pic, bulk_auto_enroll

router = APIRouter()


@router.post("/enroll", response_model=EnrollResponse)
def enroll_manual(req: EnrollRequest):
    """Admin uploads a fresh photo for a student."""
    r = enroll_face(req.student_id, req.image_base64)
    return EnrollResponse(success=r["success"], student_id=req.student_id, message=r["message"])


@router.post("/enroll/auto", response_model=EnrollResponse)
def enroll_auto(req: AutoEnrollRequest):
    """Auto-enroll from profile pic URL already stored in students table."""
    r = auto_enroll_from_profile_pic(req.student_id)
    return EnrollResponse(success=r["success"], student_id=req.student_id, message=r["message"])


@router.post("/enroll/bulk", response_model=BulkEnrollResponse)
def enroll_bulk(req: BulkEnrollRequest):
    """
    Auto-enroll all students in a class from their profile pics.
    Call this when teacher creates/activates a class session.
    Node.js backend should trigger this after class creation.
    """
    r = bulk_auto_enroll(req.class_id)
    return BulkEnrollResponse(
        enrolled=r["enrolled"],
        failed=r["failed"],
        summary=r["summary"],
    )


from app.models.schemas import EnrollMultiRequest, EnrollMultiResponse
from app.services.face_service import enroll_face_multi

@router.post("/enroll-multi", response_model=EnrollMultiResponse)
def enroll_multi(req: EnrollMultiRequest):
    """Enroll a single photo into a specific slot (1-5) for multi-embedding."""
    r = enroll_face_multi(req.student_id, req.image_base64, req.photo_index, req.embed_type)
    return EnrollMultiResponse(
        success=r["success"], student_id=req.student_id,
        photo_index=req.photo_index, message=r["message"]
    )
