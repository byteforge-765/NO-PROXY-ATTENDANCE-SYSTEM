"""
Route: Step 1 — Student Self-Verification
──────────────────────────────────────────────────────────────────
POST /api/v1/verify-student

Called by Flutter app when student taps "Mark Attendance".

Two checks happen in parallel, BOTH must pass:
  1. Face recognition  — selfie vs stored enrollment embedding
  2. GPS geofence      — phone location inside classroom boundary

If step1_passed = true, Node.js backend adds student to the
"pending headcount" list and notifies teacher.
"""
from fastapi import APIRouter
from app.models.schemas import VerifyStudentRequest, VerifyStudentResponse
from app.services.face_service import verify_selfie
from app.services.gps_service import check_location

router = APIRouter()


@router.post("/verify-student", response_model=VerifyStudentResponse)
def verify_student(req: VerifyStudentRequest):

    # ── 1. Face recognition ───────────────────────────────────
    face = verify_selfie(req.student_id, req.selfie_base64)

    # ── 2. GPS check ─────────────────────────────────────────
    gps = check_location(req.class_id, req.latitude, req.longitude)

    # ── 3. Final decision ─────────────────────────────────────
    passed = face["face_matched"] and gps["inside"]

    parts = []
    if not face["face_matched"]:
        parts.append(f"Face check failed: {face['message']}")
    if not gps["inside"]:
        parts.append(f"Location check failed: {gps['message']}")
    if passed:
        parts.append("Step 1 complete — face matched and location verified ✓")

    return VerifyStudentResponse(
        student_id=req.student_id,
        face_matched=face["face_matched"],
        face_confidence=face["confidence"],
        gps_inside=gps["inside"],
        gps_distance_meters=gps["distance_meters"],
        step1_passed=passed,
        message=" | ".join(parts),
    )
