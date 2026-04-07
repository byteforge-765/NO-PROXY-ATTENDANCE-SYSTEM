# ICMS — Integrated Campus Management System
### Hybrid Architecture: PostgreSQL + MongoDB + TigerGraph

---

## 🏗️ Architecture Overview

```
┌──────────────────────┬───────────────────────┬────────────────────────────┐
│   PostgreSQL         │   MongoDB              │   TigerGraph 🐯            │
├──────────────────────┼───────────────────────┼────────────────────────────┤
│ Students, Faculty    │ Live attendance        │ Attendance Pattern Graph    │
│ Classes, Timetable   │ sessions (step1/2/3)   │ Proxy Detection (edges)     │
│ Attendance records   │                        │ Consecutive Absence Alerts  │
│ Auth / JWT           │                        │ Low Attendance Batch Scan   │
│ Study Materials      │                        │ (fires-and-forgets on sync) │
└──────────────────────┴───────────────────────┴────────────────────────────┘
```

**TigerGraph = graph analytics only.** All core data stays in PostgreSQL/MongoDB.
Auto-sync happens every time a student marks attendance via OTP.

---

## 🚀 Quick Start

### Option A — Docker Compose (Recommended)

```bash
# 1. Copy env
cp backend/.env.example backend/.env

# 2. Start everything
docker-compose up -d

# 3. Wait ~2 min for TigerGraph, then:
docker-compose exec backend node database/tigergraph_setup.js
docker-compose exec backend node database/seed.js
docker-compose exec backend node database/tigergraph_sync_all.js

# 4. Frontend
cd web-admin && npm install && npm run dev
```

### Option B — Manual Local

```bash
# Requirements: PostgreSQL 14+, MongoDB 6+, Redis 7+, Node 20+, Python 3.10+
# TigerGraph Developer Edition: https://dl.tigergraph.com/

# 1. Create DB
psql -U postgres -c "CREATE USER icms_user WITH PASSWORD 'icms123';"
psql -U postgres -c "CREATE DATABASE icms OWNER icms_user;"
psql -U icms_user -d icms -f backend/database/schema.sql

# 2. Backend
cd backend
cp .env.example .env
npm install
node database/seed.js
npm start                          # port 5001

# 3. TigerGraph (after it's running on :14240)
node database/tigergraph_setup.js
node database/tigergraph_sync_all.js

# 4. AI Service
cd ai-service && pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001

# 5. Frontend
cd web-admin && npm install && npm run dev   # port 8080
```

---

## 🐯 TigerGraph Setup

```bash
# Docker (quickest)
docker run -d --name tigergraph \
  -p 14240:14240 -p 9000:9000 \
  tigergraph/tigergraph:3.9.3

# Verify (after ~2 min)
curl http://localhost:14240/echo    # → "Hello GSQL"

# Setup ICMS graph
cd backend
node database/tigergraph_setup.js
node database/tigergraph_sync_all.js
```

> **Mock Mode:** If TigerGraph is not running, backend auto-falls-back to PostgreSQL-based analysis. All other features work normally.

### .env TigerGraph Variables
```env
TIGERGRAPH_HOST=http://localhost
TIGERGRAPH_PORT=14240
TIGERGRAPH_GRAPH=ICMS
TIGERGRAPH_USER=tigergraph
TIGERGRAPH_PASSWORD=tigergraph123
TIGERGRAPH_SECRET=
```

---

## 📊 TigerGraph API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/tigergraph/health` | None | Connection status |
| GET | `/api/tigergraph/proxy-detection/:class_id` | Admin/Faculty | Proxy suspects in a class |
| GET | `/api/tigergraph/attendance-pattern/:student_id` | Any | Graph-based pattern analysis |
| GET | `/api/tigergraph/low-attendance?batch=X&threshold=75` | Admin/Faculty | Below-threshold students |
| GET | `/api/tigergraph/consecutive-absences/:student_id` | Any | Per-subject streak |
| POST | `/api/tigergraph/sync/class/:class_id` | Admin | Manual TG sync |
| POST | `/api/tigergraph/sync/student/:student_id` | Admin | Manual student sync |

---

## 🔑 Default Login Credentials

| Role | User ID | Password |
|------|---------|----------|
| Admin | `ADMIN01` | `12345` |
| Faculty | `FAC001` | `1234` |
| Student | `STU2401` | `1231` |

---

## 🛠️ Services & Ports

| Service | Port |
|---------|------|
| Backend (Node.js) | 5001 |
| AI Service (Python) | 8001 |
| PostgreSQL | 5432 |
| MongoDB | 27017 |
| Redis | 6379 |
| **TigerGraph** | **14240** |
| Frontend (React) | 8080 |

---

## 📁 Key New Files (TigerGraph Integration)

```
backend/
  src/config/tigergraph.js                ← TigerGraph REST client
  src/modules/tigergraph/
    tigergraph.service.js                 ← Sync + analysis logic
    tigergraph.controller.js              ← HTTP handlers
    tigergraph.routes.js                  ← /api/tigergraph/* routes
  database/
    tigergraph_setup.js                   ← GSQL schema + queries
    tigergraph_sync_all.js                ← Full PostgreSQL→TG sync

web-admin/src/pages/
  TigerGraphPage.tsx                      ← Graph analytics dashboard
```
