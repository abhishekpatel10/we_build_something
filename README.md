# 🌐 Large-Scale Distributed Systems Design Portfolio
### *Production-Grade Engineering Implementations for 100M+ User Workloads*

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python_3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Django](https://img.shields.io/badge/Django_5-092E20?style=for-the-badge&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker_Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Redis](https://img.shields.io/badge/Redis_7-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL_16-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Elasticsearch](https://img.shields.io/badge/Elasticsearch_8.13-005571?style=for-the-badge&logo=elasticsearch&logoColor=white)](https://www.elastic.co/)
[![MinIO](https://img.shields.io/badge/MinIO_S3-C72C48?style=for-the-badge&logo=minio&logoColor=white)](https://min.io/)

This monorepo contains end-to-end, production-grade implementations of the foundational system designs that power modern internet-scale applications. Built specifically to bridge the gap between abstract whiteboard interview diagrams and real distributed software engineering, each project implements the exact algorithms, concurrency controls, caching layers, and asynchronous pipelines needed to sustain millions of users.

---

## 🏛️ Flagship Systems Overview

```
                                      ┌────────────────────────────────────────────────────────┐
                                      │        Distributed Systems Monorepo Overview           │
                                      └────────────────────────────────────────────────────────┘
                                                                  │
                     ┌────────────────────────────────────────────┼────────────────────────────────────────────┐
                     ▼                                            ▼                                            ▼
       ┌───────────────────────────┐                ┌───────────────────────────┐                ┌───────────────────────────┐
       │         ⚡ Bitly          │                │      🎟️ Ticketmaster      │                │        📦 Dropbox         │
       ├───────────────────────────┤                ├───────────────────────────┤                ├───────────────────────────┤
       │ • 100M DAU / 100K QPS     │                │ • Flash-Sale Surge Traffic│                │ • 50GB Large File Storage │
       │ • Bijective Feistel Cipher│                │ • Redis ZSET Waiting Room │                │ • Direct S3 Presigned PUT │
       │ • Batch Counter (INCRBY)  │                │ • Distributed SETNX Locks │                │ • 5MB Client Slicing      │
       │ • Sub-ms 302 LRU Redirects│                │ • PostgreSQL ACID OCC     │                │ • SHA-256 Fingerprinting  │
       │ • Clickstream Analytics   │                │ • Redis SSE Seat Map Push │                │ • Trust-but-Verify Checks │
       │ • Node.js, TS, React SPA  │                │ • Elasticsearch 8 Search  │                │ • Django, MinIO, React    │
       └───────────────────────────┘                └───────────────────────────┘                └───────────────────────────┘
```

---

## 📊 Distributed Systems Comparison Matrix

| Architectural Dimension | ⚡ Bitly ([Read More](./Bitly/README.md)) | 🎟️ Ticketmaster ([Read More](./Ticketmaster/README.md)) | 📦 Dropbox ([Read More](./dropbox/README.md)) |
|:---|:---|:---|:---|
| **Primary Domain** | High-Throughput Read & Key Generation | High-Concurrency Flash Sales & Contention | High-Bandwidth Object Storage & Deduplication |
| **Scale Target** | 100M DAU, 1B URLs, 100K read QPS | Millions of concurrent fans, zero overselling | 50 GB files, petabyte storage, 5MB chunks |
| **Backend Core** | Node.js (TypeScript) + Express | Python 3.11 + Django 5 + Django REST | Python 3.11 + Django 5 + Boto3 SDK |
| **Frontend UI** | Modern React SPA + Live Benchmark | React 19 + Interactive Seat Grid + SSE | React + Google Drive UI + 50GB Chunking Lab |
| **Primary Database** | PostgreSQL 16 (B-Tree indexes) | PostgreSQL 16 (`select_for_update`) | PostgreSQL 16 (Metadata & Chunk records) |
| **In-Memory & Cache** | Redis 7 (AllKeys-LRU + Global Counter) | Redis 7 (ZSET Queue + Pub/Sub Broker) | MinIO S3 Object Storage + S3 head_object |
| **Concurrency Control** | Range token leasing (`INCRBY 1000`) | Redis `SET NX EX` + Lua + DB OCC | Optimistic chunk verification + S3 ETags |
| **Asynchronous Engine** | Non-blocking Event Loop | Celery 5 + Celery Beat scheduler | Client-side WebCrypto workers + Presigned URLs |
| **Search & Discovery** | B-Tree Primary Key Lookups | Elasticsearch 8.13 (Fuzzy + Geo) | Relational multi-tenant workspace queries |
| **Bandwidth Optimization**| 302 Found caching & Redis read-through | SSE streaming over lightweight HTTP | Direct-to-storage upload, bypassing API gateway |
| **Resilience & Fallback**| In-memory token & cache fallback | In-memory queue & local lock mutex fallback| SQLite DB fallback & local S3 emulation |

---

## ⚡ 1. Bitly — High-Throughput URL Shortener

> **Directory**: [`./Bitly`](./Bitly/) &bull; **Full Guide**: [`Bitly/README.md`](./Bitly/README.md) &bull; **Deployment**: [`Bitly/DEPLOYMENT.md`](./Bitly/DEPLOYMENT.md)

### Architectural Problem & Distributed Solution
* **Zero Collisions without DB Lookups**: Standard MD5 or MurmurHash truncation suffers from the Birthday Paradox (~880,000 expected collisions per 1B links). Instead, Bitly implements a **Sequential Counter + 40-bit Bijective Feistel Cipher + Base62 Encoding**. Every generated ID is strictly unique, mathematically scrambled (unguessable), and requires zero database collision checks.
* **Reducing Redis Network Roundtrips by 1,000x**: Rather than executing `INCR` on Redis for every write, worker nodes reserve a token range via `INCRBY bitly:global_counter 1000` and allocate locally in-memory, completely eliminating lock contention.
* **Sub-Millisecond 302 Redirects**: Employs Redis Read-Through caching following an **80/20 Power-Law distribution**. 302 Found redirects guarantee link click tracking and analytics while keeping redirects under 1ms.

```
[Write Traffic] ──> [API Server] ──> [Atomic Batch INCRBY 1000] ──> [Feistel Cipher] ──> [Base62] ──> [DB Commit]
[Read Traffic]  ──> [Nginx / LB] ──> [Redis LRU Cache] ──(Hit <1ms)──> [302 Found Redirect]
                                         │ (Miss)
                                         └──> [Postgres B-Tree] ──> [Populate Cache]
```

---

## 🎟️ Ticketmaster — High-Concurrency Flash-Sale Engine

> **Directory**: [`./Ticketmaster`](./Ticketmaster/) &bull; **Full Guide**: [`Ticketmaster/README.md`](./Ticketmaster/README.md) &bull; **Frontend**: [`Ticketmaster/frontend/README.md`](./Ticketmaster/frontend/README.md)

### Architectural Problem & Distributed Solution
* **The "Stadium Tour" Flash-Sale Problem**: Millions of fans hit the checkout pipeline concurrently. Allowing unchecked traffic into the relational database triggers deadlocks and service failure. Ticketmaster solves this with a **Virtual Waiting Room** using **Redis Sorted Sets (ZSET)**. Users receive arrival-timestamp scores; Celery Beat releases users in controlled batches (e.g. 200 users/minute) leasing 15-minute admission tokens.
* **Guaranteed Zero Double-Booking**:
  1. **Phase 1 (Temporary Hold)**: Atomic distributed lock via Redis `SET ticket:{id} {userId} NX EX 600`.
  2. **Phase 2 (Safe Lua Release)**: Atomic Lua script ensures users can only release locks they legitimately hold.
  3. **Phase 3 (ACID DB Commit)**: Database transaction executes `select_for_update()`, commits payment intent with Stripe idempotency keys, and increments the **Optimistic Concurrency Control (OCC)** version counter.
* **Real-Time Seat Map via Redis Pub/Sub & SSE**: When a seat changes state (`AVAILABLE` -> `RESERVED` -> `BOOKED`), an event is published to Redis and pushed via **Server-Sent Events (SSE)** to all viewing clients.
* **Elasticsearch 8.13 Search Engine**: Full-text inverted index supporting fuzzy matching (`fuzziness: AUTO`), field boosting (`title^3`, `performer^2`), and geo-radius queries (`50km`).

```
[Incoming Fan Traffic]
          │
          ▼
┌───────────────────────────┐
│ Virtual Waiting Room ZSET │ ──(Unadmitted)──> [429 Too Many Requests Modal]
└─────────────┬─────────────┘
              │ (Batch Leased Admission Token)
              ▼
┌───────────────────────────┐       ┌───────────────────────────┐
│ Redis Distributed Lock    │ ───>  │ PostgreSQL 16 Transaction │ ───> [Stripe Payment] ───> [SSE Broadcast]
│ SET ticket:{id} NX EX 600 │       │ select_for_update() + OCC │
└───────────────────────────┘       └───────────────────────────┘
```

---

## 📦 Dropbox — Large-Scale Chunked Cloud Storage

> **Directory**: [`./dropbox`](./dropbox/) &bull; **Full Guide**: [`dropbox/README.md`](./dropbox/README.md) &bull; **Frontend**: [`dropbox/frontend/README.md`](./dropbox/frontend/README.md)

### Architectural Problem & Distributed Solution
* **Bypassing the API Gateway Bottleneck**: Routing 50 GB files through the Django application server causes memory exhaustion, slow worker starvation, and gateway timeouts. In this architecture, clients stream raw binary data **directly to MinIO/S3 Object Storage** using short-lived **Presigned PUT URLs**.
* **5MB Uniform Chunking & SHA-256 Fingerprinting**: Files are sliced in the browser using HTML5 `File.slice()`. Each chunk is fingerprinted with the native **WebCrypto API**. This enables:
  1. **Resumable Uploads**: Upload only missing chunks after connection loss.
  2. **Parallel Transfers**: Upload chunks concurrently across multiple HTTP connections.
  3. **Delta Sync & Deduplication**: If a 10 GB file has 1 MB altered, only the modified 5MB chunk is transferred.
* **Trust-but-Verify Protocol**: Clients notify Django after uploading a chunk. The backend invokes `s3.head_object()` to verify payload existence and byte size directly against object storage before marking the database record `VERIFIED`.

```
                        ┌────────────────────────────────────────────────────────┐
                        │                  Client Web Browser                    │
                        └───────────────────────┬────────────────────────────────┘
                                                │
                 1. Metadata Only               │ 2. Direct 5MB Chunk Streams
                 (File size, quota check)       │ (Presigned PUT URLs)
                        │                       │
                        ▼                       ▼
             ┌─────────────────────┐   3. head_object()   ┌─────────────────────┐
             │  Django REST API    │ ───────────────────> │ MinIO Object Store  │
             └──────────┬──────────┘  Trust-but-Verify    └─────────────────────┘
                        │
                        ▼
             ┌─────────────────────┐
             │ PostgreSQL Metadata │
             │ (Workspaces/Chunks) │
             └─────────────────────┘
```

---

## 🚀 Unified Quick Start Guide

### Prerequisites
* **Node.js**: v20+ (v22 LTS recommended)
* **Python**: v3.11+
* **Docker & Docker Compose**: v2.20+ (optional, for containerized deployments)
* **Git**: v2.40+

---

### Option A: Launch Everything via Docker Compose

Each project contains a complete, production-grade `docker-compose.yml` configured with isolated networks, persistent volumes, and healthchecks:

```bash
# 1. Launch Bitly (Node.js API, React SPA, Redis 7, Postgres 16, Nginx)
cd Bitly
docker compose up --build -d

# 2. Launch Ticketmaster (Django, Celery, Redis 7, Postgres 16, Elasticsearch 8.13)
cd ../Ticketmaster
docker compose up --build -d

# 3. Launch Dropbox (Django, MinIO S3, MinIO Init, Postgres 16)
cd ../dropbox
docker compose up --build -d
```

---

### Option B: Local Development (Without Docker)

Every project has built-in **zero-setup resilience** — if external databases or Redis clusters are not running, services automatically fall back to local in-memory engines or SQLite so you can test immediately:

#### 1. Running Bitly Locally
```bash
cd Bitly
npm --prefix backend install && npm --prefix frontend install
npm run dev:backend       # Backend API on port 3000
npm run dev:frontend      # Vite React SPA on port 5173
```

#### 2. Running Ticketmaster Locally
```bash
cd Ticketmaster/backend
python -m venv venv && .\venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate && python manage.py seed_data
python manage.py runserver 8000

# In a separate terminal:
cd ../frontend
npm install && npm run dev  # Vite React SPA on port 5173
```

#### 3. Running Dropbox Locally
```bash
cd dropbox/backend
python -m venv venv && .\venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000

# In a separate terminal:
cd ../frontend
npm install && npm run dev  # Vite React SPA on port 5173
```

---

## 🌐 Unified Service & Port Reference

| Project | Component | Default Local Port | Docker Compose Port | Access URL |
|:---|:---|:---|:---|:---|
| **⚡ Bitly** | React SPA Frontend | `5173` | `80` (Internal) | [http://localhost:5173](http://localhost:5173) |
| **⚡ Bitly** | Node.js / Express API | `3000` | `3000` | [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health) |
| **⚡ Bitly** | Nginx Edge Gateway | — | `8080` | [http://localhost:8080](http://localhost:8080) |
| **⚡ Bitly** | Redis Cache & Counter | `6379` | `6379` | `localhost:6379` |
| **⚡ Bitly** | PostgreSQL Primary | `5432` | `5432` | `localhost:5432` (`bitly_db`) |
| **🎟️ Ticketmaster** | React 19 Frontend | `5173` | — | [http://localhost:5173](http://localhost:5173) |
| **🎟️ Ticketmaster** | Django Core API | `8000` | `8000` | [http://localhost:8000/api/health/](http://localhost:8000/api/health/) |
| **🎟️ Ticketmaster** | Elasticsearch Engine | `9200` | `9200` | [http://localhost:9200](http://localhost:9200) |
| **🎟️ Ticketmaster** | Redis Lock & ZSET | `6379` | `6379` | `localhost:6379` |
| **🎟️ Ticketmaster** | Celery Worker & Beat | Background | Containers | Logs via `docker compose logs -f` |
| **📦 Dropbox** | React Dashboard | `5173` | — | [http://localhost:5173](http://localhost:5173) |
| **📦 Dropbox** | Django Storage API | `8000` | — | [http://localhost:8000/api/health/](http://localhost:8000/api/health/) |
| **📦 Dropbox** | MinIO S3 API | `9000` | `9000` | [http://localhost:9000](http://localhost:9000) |
| **📦 Dropbox** | MinIO Web Console | `9001` | `9001` | [http://localhost:9001](http://localhost:9001) (`minioadmin`/`minioadmin`) |

---

## 🧪 Automated Testing & Quality Assurance

Each subproject includes an extensive automated test suite covering mathematical guarantees, concurrency constraints, and cryptographic integrity:

```bash
# Test Bitly (Base62 bijective encoding, Feistel avalanche, and distributed token batching)
cd Bitly
npm test

# Test Ticketmaster (Redis SETNX concurrency, safe Lua lock release, and Elasticsearch schema)
cd ../Ticketmaster/backend
python manage.py test apps.bookings apps.search

# Test Dropbox (Presigned PUT/GET generation, Boto3 S3 communication, and chunk verification)
cd ../../dropbox/backend
python manage.py test core
```

---

## 📂 Monorepo Directory Structure

```
we_made_something/
│
├── README.md                       # Master Distributed Systems Architecture Guide (This file)
│
├── Bitly/                          # ⚡ High-Throughput URL Shortener & Analytics System
│   ├── README.md                   # Bitly Architecture, Math, and API Documentation
│   ├── DEPLOYMENT.md               # Linux Server, Systemd & Production Deployment Guide
│   ├── docker-compose.yml          # Multi-tier container cluster (Nginx, API, Redis, Postgres)
│   ├── package.json                # Monorepo scripts for backend and frontend
│   ├── backend/                    # Node.js + TypeScript service (Feistel, Base62, Redis batch)
│   ├── frontend/                   # React Single-Page Application (Live Latency Benchmark)
│   └── nginx/                      # Edge reverse proxy with rate limiting configuration
│
├── Ticketmaster/                   # 🎟️ High-Concurrency Flash Sale Ticketing Engine
│   ├── README.md                   # Ticketmaster Architecture, Waiting Room & Locking Guide
│   ├── docker-compose.yml          # Postgres 16, Redis 7, ES 8.13, Celery Worker, Beat, Django
│   ├── .env.example                # Full environment template
│   ├── backend/                    # Django REST Framework, Celery tasks, SSE stream & seed data
│   │   ├── apps/authentication/    # JWT auth and profile management
│   │   ├── apps/events/            # Venues, events, seats, and SSE Pub/Sub broadcaster
│   │   ├── apps/bookings/          # Redis SETNX locks, Lua release, OCC versioning & Stripe
│   │   ├── apps/waiting_room/      # Redis ZSET queue & batch admission worker
│   │   └── apps/search/            # Elasticsearch client, fuzzy analyzer, and geo queries
│   └── frontend/                   # React 19 + TypeScript + Tailwind CSS stadium seat visualizer
│
└── dropbox/                        # 📦 Petabyte-Scale Chunked Cloud Storage Engine
    ├── README.md                   # Dropbox System Architecture, Presigned S3 & Chunking Guide
    ├── docker-compose.yml          # Postgres 16 + MinIO S3 + auto-bucket CORS provisioner
    ├── .env.example                # MinIO & PostgreSQL environment template
    ├── backend/                    # Django 5 + Boto3 S3 Service (init-upload, verify, finalize)
    │   ├── core/models/            # Workspace, File, and FileChunk models
    │   ├── core/services/          # S3StorageService (Presigned PUT/GET, head_object)
    │   └── core/tests/             # Comprehensive unit and integration test suite
    └── frontend/                   # React Web Dashboard (Google Drive style + 50GB Chunking Lab)
```

---

## 💡 Key Architectural Lessons Learned

1. **Hashing vs Mathematical Counter Encryption**: Truncated hashes (MD5, SHA-256) inevitably lead to database collisions at scale. Combining an atomic distributed counter with a bijective **Feistel cipher** guarantees 100% uniqueness with zero pre-check latency.
2. **Database Ingress Protection via Virtual Queues**: The database cannot be the first line of defense during a flash sale. Absorbing traffic with lightweight in-memory data structures (Redis ZSETs) protects downstream relational systems from cascading failures.
3. **Bandwidth Offloading with Content Addressing**: Application servers should handle metadata, never high-volume byte streams. Pushing chunking to the client and streaming directly to object storage via presigned URLs scales bandwidth horizontally without inflating API server infrastructure costs.
