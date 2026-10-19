# 📦 Dropbox System Design & Chunked Cloud Storage Engine

Production-grade implementation of the **"Design Dropbox"** system design architecture, handling large files (up to 50 GB), client-side chunking, cryptographic fingerprinting, and direct S3/MinIO uploads via Presigned URLs.

---

## 🏛 High-Level Architecture Overview

```
 [ Client Device / React / Sync Daemon ]
                   |
     +-------------+-------------+
     | 1. Metadata Only          | 2. Direct 5MB Raw Chunk Streams
     v                           v
[ Django API Gateway ]    [ MinIO Object Storage (S3) ]
     |                           ^
     | Writes                    | Calls s3.head_object()
     v                           | for "Trust but Verify"
[ PostgreSQL Database ] ---------+
(Workspaces, Files, Chunks)
```

### Why this design?
1. **Bypasses API Gateway Bandwidth Bottleneck**: Routing 50 GB files through Django/API Gateway leads to severe memory exhaustion and request body limits. Chunks stream directly from the client to MinIO/S3 using **Presigned PUT URLs**.
2. **Chunking & Fingerprinting (5 MB)**: Slicing files uniformly creates content-addressed chunks with SHA-256 hashes, enabling:
   - **Resumability**: Only failed or missing chunks are uploaded.
   - **Parallel Uploads**: Multiple chunks upload concurrently over HTTP.
   - **Delta Sync**: When a file is modified, only changed chunks are transferred.
3. **Trust but Verify**: Django verifies chunk existence via `s3.head_object()` before marking records `VERIFIED` and activating files.

---

## 📂 Repository Structure

```
dropbox/
├── docker-compose.yml          # PostgreSQL 16 + MinIO S3 + Bucket Auto-Provisioning
├── .env.example                # Full environment config template
├── README.md                   # System design & setup guide
├── backend/                    # Django REST Framework + Boto3 S3 Service
│   ├── .env                    # Configured for MinIO & DB (PostgreSQL + SQLite fallback)
│   ├── requirements.txt        # Django 5, DRF, boto3, psycopg2, cors-headers
│   ├── manage.py
│   ├── dropbox_server/         # Settings, URLs, WSGI, ASGI
│   │   ├── settings.py         # CORS, MinIO configs, DB fallback, REST settings
│   │   └── urls.py
│   └── core/                   # Core Dropbox Storage App
│       ├── models/
│       │   ├── workspace.py    # Multi-tenant workspace with storage quota
│       │   ├── file.py         # File metadata, size, total_chunks, status, hash
│       │   └── chunk.py        # FileChunk model with SHA-256 fingerprint & S3 key
│       ├── services/
│       │   └── s3_service.py   # Boto3 client for Presigned PUT/GET & head_object
│       ├── serializers/
│       │   └── storage_serializers.py
│       ├── views/
│       │   └── storage_views.py # Health, Presigned PUT/GET, Verify, Workspaces, Files
│       ├── urls.py
│       ├── tests/
│       │   └── test_s3_service.py # 8 comprehensive unit tests
│       └── management/commands/
│           └── demo_presigned_urls.py # Live CLI demonstration of presigned URL generation
└── frontend/                   # Modern React Web Dashboard (Google Drive Style)
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── App.jsx             # Main application shell with real-time polling
        ├── index.css           # Glassmorphism design system & dark aesthetic
        ├── services/api.js     # Backend client communicating with Django API
        └── components/
            ├── Header.jsx          # Live connectivity indicators (Django & MinIO)
            ├── Sidebar.jsx         # Navigation + Quota progress meter (50GB)
            ├── StorageOverview.jsx # High-level stats & metrics
            ├── FileList.jsx        # Google Drive style file explorer
            ├── ChunkingLab.jsx     # Interactive 50GB client slicer & direct MinIO uploader
            ├── ArchitectureMap.jsx # Interactive 5-week system blueprint
            ├── PresignedConsole.jsx# Live boto3 S3 presigned URL testing console
            └── ChunksModal.jsx     # Detailed chunk-by-chunk matrix inspection
```

---

## 🚀 Quick Start Guide

### 1. Start Infrastructure via Docker Compose
Starts PostgreSQL on port `5432` and MinIO S3 on port `9000` (API) & `9001` (Web Console):

```bash
docker-compose up -d
```

- **MinIO Console**: [http://localhost:9001](http://localhost:9001) (User: `minioadmin`, Password: `minioadmin`)
- **MinIO S3 API**: [http://localhost:9000](http://localhost:9000)
- **Bucket**: `dropbox-files` (automatically created by `minio-init` container with CORS enabled)

*(Note: If Docker is not running, the Django backend automatically falls back to SQLite so you can test all models and presigned URL generation immediately).*

---

### 2. Run the Django Backend

```bash
cd backend
# Activate virtual environment
.\venv\Scripts\activate

# Run database migrations
python manage.py migrate

# Run Week 1 unit test suite
python manage.py test core

# Run the live Presigned PUT & GET demonstration command
python manage.py demo_presigned_urls --file-name project_backup.zip --file-size-mb 20

# Start Django development server on port 8000
python manage.py runserver 8000
```

---

### 3. Run the React Web Dashboard

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser:
- **File Explorer**: Browse files, inspect chunks, and generate presigned GET download links.
- **50GB Chunking Lab**: Pick any file to see the client slice it into 5MB parts using `File.slice()`, compute real SHA-256 fingerprints with `WebCrypto`, and direct-upload to MinIO S3!
- **Presigned Console**: Test generating presigned PUT/GET URLs and verifying objects directly via `boto3`.

---

## 🧪 Architectural Verification & Feature Checklist

| Requirement | Implementation | Status |
|---|---|---|
| **PostgreSQL & MinIO Docker Setup** | `docker-compose.yml` with `postgres:16`, `minio/minio`, `mc` auto-bucket & CORS provisioner | ✅ Implemented |
| **Django DRF & Boto3** | `core.services.s3_service.S3StorageService` with signature v4 and path addressing | ✅ Implemented |
| **Models: Workspace, File, FileChunk** | Models in `core/models/` with 5MB chunking, quotas, and SHA-256 fingerprints | ✅ Implemented & Migrated |
| **Presigned PUT & GET URLs** | `generate_presigned_put_url()` and `generate_presigned_get_url()` | ✅ Tested & Verified |
| **Test Suite** | 12 unit tests in `core/tests/test_s3_service.py` passing with 100% OK | ✅ All Tests Pass |
| **Decoupled Architecture** | `backend/` and `frontend/` directories created with clean REST contract | ✅ Complete |
| **POST /api/files/init-upload/** | Validates quota, creates File (PENDING), generates 5MB chunk parts & presigned PUT URLs | ✅ Implemented & Tested |
| **PATCH /api/files/<id>/chunks/<index>/complete/** | Trust-but-verify calling `s3.head_object()` before marking VERIFIED in DB | ✅ Implemented & Tested |
| **POST /api/files/<id>/finalize/** | Verifies all chunks uploaded, updates file_hash, marks ACTIVE, updates quota | ✅ Implemented & Tested |
| **GET /api/files/<id>/upload-status/** | Resumability endpoint returning verified/pending matrix & fresh URLs | ✅ Implemented & Tested |
| **React Web Dashboard** | Google Drive style explorer, 50GB Chunking Lab, Presigned Console & Quota tracker | ✅ Implemented |

---

## 🗓 Implementation Roadmap

- [x] **Phase 1**: Django Backend & MinIO S3 Setup (Models, Boto3 Presigned Service, Docker Compose, React Foundation)
- [x] **Phase 2**: Django Metadata & Chunk Verification APIs (`init-upload/`, `chunks/<idx>/complete/` via `head_object`, `finalize/`, `upload-status/`)
- [x] **Phase 3**: React Web Dashboard & Direct-to-MinIO Upload of 50GB files (WebCrypto SHA-256 client slicer, parallel streaming, chunk matrix inspection)
- [ ] **Phase 4**: Delta Sync & File Downloads (Presigned GET URLs + Client-side Blob Reconstruction)
- [ ] **Phase 5**: Desktop Sync Daemon (`watchdog` file monitor + embedded SQLite database)

