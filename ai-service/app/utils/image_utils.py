"""
Image utilities
─────────────────────────────────────────────────────────────────
decode_base64_image  → base64 string  →  BGR numpy array (OpenCV format)
url_to_image         → http/https URL →  BGR numpy array  (for profile pics stored in S3/Cloudinary)
embedding_to_pglist  → numpy array   →  Python list  (psycopg2 stores list as PostgreSQL FLOAT[])
pglist_to_embedding  → Python list   →  numpy float32 array
─────────────────────────────────────────────────────────────────
"""
import base64
import urllib.request
import numpy as np
import cv2
from fastapi import HTTPException


def decode_base64_image(b64_string: str) -> np.ndarray:
    """
    Decode base64 → BGR numpy array.
    Accepts both:
      - Raw base64           :  /9j/4AAQ...
      - Data-URI format      :  data:image/jpeg;base64,/9j/4AAQ...
    """
    if not b64_string or not b64_string.strip():
        raise HTTPException(status_code=400, detail="Empty image string received.")

    # Strip data-URI prefix if present
    if "," in b64_string:
        b64_string = b64_string.split(",", 1)[1]

    try:
        raw   = base64.b64decode(b64_string)
        arr   = np.frombuffer(raw, dtype=np.uint8)
        img   = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not decode image bytes: {e}")

    if img is None:
        raise HTTPException(status_code=400, detail="Image decoded to None — send a valid JPEG or PNG.")

    return img


def url_to_image(url: str) -> np.ndarray:
    """
    Download image from URL and return as BGR numpy array.
    Used to process a student's profile_pic_url (stored in PostgreSQL)
    without the admin needing to re-upload the photo.
    """
    try:
        req  = urllib.request.Request(url, headers={"User-Agent": "ICMS-AI/2.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw = resp.read()
        arr = np.frombuffer(raw, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not download image from URL: {e}")

    if img is None:
        raise HTTPException(status_code=400, detail=f"Downloaded file from {url} is not a valid image.")

    return img


def embedding_to_pglist(emb: np.ndarray) -> list:
    """
    Convert numpy float32 array → plain Python list.
    psycopg2 automatically maps Python list[float] → PostgreSQL FLOAT[].
    This is the fix for the FLOAT[] storage issue.
    """
    return emb.astype(np.float32).tolist()


def pglist_to_embedding(lst: list) -> np.ndarray:
    """Convert PostgreSQL FLOAT[] (returned as Python list) → numpy float32."""
    return np.array(lst, dtype=np.float32)
