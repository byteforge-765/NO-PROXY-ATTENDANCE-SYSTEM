"""
InsightFace model loader
─────────────────────────────────────────────────────────────────
Model   : buffalo_l  (best accuracy, ArcFace trained)
Embedding: 512-dim float32 vector per face
First run: downloads ~300MB to ~/.insightface/models/buffalo_l/
After that: loads from cache instantly

buffalo_l is a PRE-TRAINED model — it already knows millions of faces.
We do NOT re-train it. We just:
  1. At enrollment  → extract embedding from student's photo → store in DB
  2. At attendance  → extract embedding from live selfie → compare with stored
─────────────────────────────────────────────────────────────────
"""
import numpy as np
from insightface.app import FaceAnalysis

_face_app: FaceAnalysis | None = None


def load_model_on_startup():
    global _face_app
    print("[Model] Loading InsightFace buffalo_l ...")
    _face_app = FaceAnalysis(
        name="buffalo_l",
        providers=["CPUExecutionProvider"],
        # Use ["CUDAExecutionProvider"] if you have an NVIDIA GPU
    )
    # det_size=(640,640) → better accuracy for group photos (headcount)
    _face_app.prepare(ctx_id=0, det_size=(640, 640))
    print("[Model] InsightFace buffalo_l ready ✓")


def _app() -> FaceAnalysis:
    if _face_app is None:
        raise RuntimeError("Model not loaded. Server still starting up.")
    return _face_app


def get_single_embedding(bgr_image: np.ndarray) -> np.ndarray | None:
    """
    Detect faces in image → return embedding of the LARGEST face.
    'Largest face' = highest (width × height) bounding box.
    This avoids matching a background face instead of the student in foreground.
    Returns None if no face found.
    """
    faces = _app().get(bgr_image)
    if not faces:
        return None
    # Pick largest face
    best = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
    return best.embedding.astype(np.float32)


def get_all_face_objects(bgr_image: np.ndarray) -> list:
    """
    Detect ALL faces in image.
    Returns list of InsightFace Face objects.
    Each object has: .embedding (512-dim), .bbox ([x1,y1,x2,y2]), .det_score (0–1)
    Used for faculty headcount — we want every face in the classroom photo.
    """
    return _app().get(bgr_image)


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """
    Cosine similarity between two 512-dim embeddings.
    Range: -1.0 to 1.0
    Same person typically scores 0.45–0.85 with buffalo_l.
    Different people typically score < 0.35.
    """
    a = a.astype(np.float32)
    b = b.astype(np.float32)
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)
