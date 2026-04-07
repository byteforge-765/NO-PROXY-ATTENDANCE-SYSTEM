"""
Route: Step 3 — Faculty Headcount + Cross-Verification
──────────────────────────────────────────────────────────────────
POST /api/v1/headcount

Called by faculty React dashboard.

What happens:
  1. Faculty takes/uploads a photo of the class
  2. AI detects every face in the photo using InsightFace
  3. Each detected face is matched against the class student DB
  4. Cross-check with step1_verified_ids:
       → cross_check_passed  = in BOTH step1 list AND visible in photo
                               These students get WhatsApp OTP next
       → cross_check_failed  = passed step1 but NOT seen in photo
                               Flagged — faculty reviews manually

Faculty can edit the final list before confirming.
Node.js backend reads cross_check_passed to send WhatsApp OTPs.
"""
from fastapi import APIRouter
from app.models.schemas import HeadcountRequest, HeadcountResponse, DetectedFace
from app.services.face_service import match_class_photo

router = APIRouter()


@router.post("/headcount", response_model=HeadcountResponse)
def faculty_headcount(req: HeadcountRequest):
    result = match_class_photo(
        photo_base64=req.photo_base64,
        class_id=req.class_id,
        step1_verified_ids=req.step1_verified_ids,
    )

    faces = [
        DetectedFace(
            student_id=f["student_id"],
            student_name=f["student_name"],
            confidence=f["confidence"],
            bbox=f["bbox"],
            in_step1_list=f["in_step1_list"],
        )
        for f in result["detected_faces"]
    ]

    return HeadcountResponse(
        class_id=req.class_id,
        total_faces_detected=result["total_faces_detected"],
        detected_faces=faces,
        unmatched_face_count=result["unmatched_face_count"],
        cross_check_passed=result["cross_check_passed"],
        cross_check_failed=result["cross_check_failed"],
        final_present_count=result["final_present_count"],
        message=result["message"],
    )
