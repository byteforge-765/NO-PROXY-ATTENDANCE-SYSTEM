FROM python:3.11-slim

WORKDIR /app

# System libs needed by InsightFace + OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download InsightFace model at build time
# So container start is instant (no download on first request)
RUN python - <<'PYEOF'
from insightface.app import FaceAnalysis
app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
app.prepare(ctx_id=0, det_size=(640, 640))
print("Model ready")
PYEOF

COPY . .

EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2"]
