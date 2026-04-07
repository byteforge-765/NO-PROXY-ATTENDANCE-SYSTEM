"""
Face Recognition Service — Multi-Embedding Support
════════════════════════════════════════════════════════════════════
ENROLLMENT:
  - Each student can have up to 5 stored embeddings (from 5 uploaded photos)
  - During face recognition, a fresh temporary embedding is created from live photo
  - The temp embedding is compared against ALL 5 stored embeddings
  - Best match score determines verification (handles beard/glasses/lighting changes)

VERIFICATION FLOW:
  Step 1 (Student self-verify): Live selfie → best match across 5 stored embeddings
  Step 3 (Faculty class photo): All faces → matched against class students' stored embeddings
════════════════════════════════════════════════════════════════════
"""
import numpy as np
from app.core.database import DBConn
from app.core.config import settings
from app.utils.model_loader import get_single_embedding, get_all_face_objects, cosine_similarity
from app.utils.image_utils import (
    decode_base64_image,
    url_to_image,
    embedding_to_pglist,
    pglist_to_embedding,
)

THRESHOLD = settings.FACE_MATCH_THRESHOLD


# ══════════════════════════════════════════════════════════════════
#  DB HELPERS
# ══════════════════════════════════════════════════════════════════

def _store_embedding_multi(student_id: str, embedding: np.ndarray, photo_index: int = 1, embed_type: str = 'stored') -> None:
    """Upsert a student's face embedding for a specific photo slot."""
    with DBConn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO student_face_embeddings (student_id, embedding, photo_index, embed_type, updated_at)
                VALUES (%s, %s, %s, %s, NOW())
                ON CONFLICT (student_id, photo_index, embed_type) DO UPDATE
                    SET embedding  = EXCLUDED.embedding,
                        updated_at = NOW()
                """,
                (student_id, embedding_to_pglist(embedding), photo_index, embed_type),
            )
        conn.commit()


def _fetch_all_stored_embeddings(student_id: str) -> list:
    """Fetch all stored embeddings for a student (up to 5). Returns list of np.ndarray."""
    with DBConn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT embedding FROM student_face_embeddings WHERE student_id = %s AND embed_type = 'stored' ORDER BY photo_index",
                (str(student_id),),
            )
            rows = cur.fetchall()
    return [pglist_to_embedding(row[0]) for row in rows] if rows else []


def _fetch_class_embeddings(class_id: str) -> dict:
    """
    Fetch ALL stored embeddings for ALL students enrolled in a class.
    Returns: { student_id: { "embeddings": [np.ndarray, ...], "name": str, "roll_no": str } }
    """
    with DBConn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT sfe.student_id, sfe.embedding, s.name, s.roll_no
                FROM   student_face_embeddings sfe
                JOIN   class_enrollments       ce  ON ce.student_id = sfe.student_id::integer
                JOIN   students                s   ON s.id          = sfe.student_id::integer
                WHERE  ce.class_id = %s AND sfe.embed_type = 'stored'
                ORDER  BY sfe.student_id, sfe.photo_index
                """,
                (class_id,),
            )
            rows = cur.fetchall()

    result = {}
    for row in rows:
        sid = str(row[0])
        if sid not in result:
            result[sid] = {"embeddings": [], "name": row[2], "roll_no": row[3]}
        result[sid]["embeddings"].append(pglist_to_embedding(row[1]))
    return result


def _best_score_against_stored(live_emb: np.ndarray, stored_embeddings: list) -> float:
    """Compare live embedding against all stored embeddings, return best (max) score."""
    if not stored_embeddings:
        return 0.0
    scores = [cosine_similarity(live_emb, s) for s in stored_embeddings]
    return max(scores)


# ══════════════════════════════════════════════════════════════════
#  ENROLLMENT
# ══════════════════════════════════════════════════════════════════

def enroll_face(student_id: str, image_base64: str) -> dict:
    """Enroll/update single photo (legacy: slot 1). Used by old code path."""
    img = decode_base64_image(image_base64)
    embedding = get_single_embedding(img)
    if embedding is None:
        return {"success": False, "message": "No face detected. Use a clear frontal face photo."}
    _store_embedding_multi(student_id, embedding, photo_index=1, embed_type='stored')
    return {"success": True, "message": f"Face enrolled for student {student_id} ✓"}


def enroll_face_multi(student_id: str, image_base64: str, photo_index: int = 1, embed_type: str = 'stored') -> dict:
    """
    Enroll one photo into a specific slot (1-5 for stored, 0 for temp).
    Admin/faculty calls this when uploading photos via panel.
    """
    img = decode_base64_image(image_base64)
    embedding = get_single_embedding(img)
    if embedding is None:
        return {
            "success": False,
            "message": f"No face detected in photo {photo_index}. Use a clear, well-lit frontal photo. Beard/glasses are handled automatically.",
        }
    _store_embedding_multi(student_id, embedding, photo_index=photo_index, embed_type=embed_type)
    return {"success": True, "message": f"Photo {photo_index} enrolled for student {student_id} ✓"}


def auto_enroll_from_profile_pic(student_id: str) -> dict:
    """Auto-enroll from profile_pic_url in DB (slot 1)."""
    with DBConn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT photo_url FROM students WHERE id = %s", (student_id,))
            row = cur.fetchone()
    if not row or not row[0]:
        return {"success": False, "message": f"No profile photo found for student {student_id}."}
    try:
        img = url_to_image(row[0])
    except Exception as e:
        return {"success": False, "message": str(e)}
    embedding = get_single_embedding(img)
    if embedding is None:
        return {"success": False, "message": "No face detected in profile photo."}
    _store_embedding_multi(student_id, embedding, photo_index=1, embed_type='stored')
    return {"success": True, "message": f"Auto-enrolled from profile pic ✓"}


def bulk_auto_enroll(class_id: str) -> dict:
    """Auto-enroll all students in a class from profile pics."""
    with DBConn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """SELECT s.id, s.name, s.photo_url FROM class_enrollments ce
                   JOIN students s ON s.id = ce.student_id WHERE ce.class_id = %s""",
                (class_id,),
            )
            students = cur.fetchall()

    results = {"enrolled": [], "failed": []}
    for sid, name, pic_url in students:
        if not pic_url:
            results["failed"].append({"student_id": sid, "name": name, "reason": "No profile pic"})
            continue
        try:
            img = url_to_image(pic_url)
        except Exception as e:
            results["failed"].append({"student_id": sid, "name": name, "reason": str(e)})
            continue
        embedding = get_single_embedding(img)
        if embedding is None:
            results["failed"].append({"student_id": sid, "name": name, "reason": "No face in pic"})
            continue
        _store_embedding_multi(str(sid), embedding, photo_index=1, embed_type='stored')
        results["enrolled"].append({"student_id": sid, "name": name})
    results["summary"] = f"{len(results['enrolled'])} enrolled, {len(results['failed'])} failed"
    return results


# ══════════════════════════════════════════════════════════════════
#  STEP 1 — STUDENT SELFIE VERIFICATION
#  Compare live selfie against ALL stored embeddings → best match
# ══════════════════════════════════════════════════════════════════

def verify_selfie(student_id: str, selfie_base64: str) -> dict:
    """
    Verify student's live selfie against all their stored face embeddings.
    Uses best-of-N matching — so beard, glasses, lighting changes are handled.
    """
    stored_embeddings = _fetch_all_stored_embeddings(str(student_id))

    if not stored_embeddings:
        # Try auto-enroll from profile pic
        auto_result = auto_enroll_from_profile_pic(str(student_id))
        if not auto_result["success"]:
            return {
                "face_matched": False, "confidence": 0.0,
                "message": "Not enrolled. Upload face photos first.",
            }
        stored_embeddings = _fetch_all_stored_embeddings(str(student_id))

    img  = decode_base64_image(selfie_base64)
    live = get_single_embedding(img)

    if live is None:
        return {
            "face_matched": False, "confidence": 0.0,
            "message": "No face detected in selfie. Ensure face is visible with good lighting.",
        }

    # Compare against ALL stored embeddings, take best score
    score   = _best_score_against_stored(live, stored_embeddings)
    matched = score >= THRESHOLD

    return {
        "face_matched": matched,
        "confidence":   round(score, 4),
        "message": (
            f"Face verified ✓ (confidence: {score:.2f}, matched against {len(stored_embeddings)} reference photo(s))"
            if matched else
            f"Face not matched — score {score:.3f} below threshold {THRESHOLD}. "
            f"Try better lighting. ({len(stored_embeddings)} reference photos checked)"
        ),
    }


# ══════════════════════════════════════════════════════════════════
#  STEP 3 — FACULTY CLASS PHOTO VERIFICATION
#  Detect all faces in class photo → match each against stored embeddings
# ══════════════════════════════════════════════════════════════════

def match_class_photo(photo_base64: str, class_id: str, step1_verified_ids: list) -> dict:
    """
    Detect and identify every face in faculty's class photo.
    Each face is matched against ALL stored embeddings for enrolled students.
    """
    img            = decode_base64_image(photo_base64)
    detected_faces = get_all_face_objects(img)

    if not detected_faces:
        return {
            "total_faces_detected": 0,
            "detected_faces":       [],
            "unmatched_face_count": 0,
            "cross_check_passed":   [],
            "cross_check_failed":   step1_verified_ids,
            "final_present_count":  0,
            "message": "No faces detected. Retake photo with better lighting.",
        }

    class_embeddings = _fetch_class_embeddings(class_id)
    seen_ids         = set()
    output_faces     = []
    unmatched        = 0

    for face in detected_faces:
        if face.det_score < 0.60:
            unmatched += 1
            continue

        live_emb   = face.embedding.astype(np.float32)
        best_id    = None
        best_score = 0.0
        best_name  = None
        best_roll  = None

        for sid, data in class_embeddings.items():
            # Compare against ALL stored embeddings for this student
            score = _best_score_against_stored(live_emb, data["embeddings"])
            if score > best_score:
                best_score = score
                best_id    = sid
                best_name  = data["name"]
                best_roll  = data["roll_no"]

        bbox = [int(x) for x in face.bbox]

        if best_id and best_score >= THRESHOLD:
            seen_ids.add(best_id)
            output_faces.append({
                "student_id":    best_id,
                "student_name":  best_name,
                "roll_no":       best_roll,
                "confidence":    round(best_score, 4),
                "bbox":          bbox,
                "in_step1_list": best_id in step1_verified_ids,
            })
        else:
            unmatched += 1
            output_faces.append({
                "student_id":    None,
                "student_name":  None,
                "roll_no":       None,
                "confidence":    round(best_score, 4),
                "bbox":          bbox,
                "in_step1_list": False,
            })

    cross_passed = [sid for sid in step1_verified_ids if sid in seen_ids]
    cross_failed = [sid for sid in step1_verified_ids if sid not in seen_ids]

    return {
        "total_faces_detected": len(detected_faces),
        "detected_faces":       output_faces,
        "unmatched_face_count": unmatched,
        "cross_check_passed":   cross_passed,
        "cross_check_failed":   cross_failed,
        "final_present_count":  len(cross_passed),
        "message": (
            f"{len(cross_passed)} students confirmed present. "
            f"{len(cross_failed)} from Step-1 not found in photo."
        ),
    }
