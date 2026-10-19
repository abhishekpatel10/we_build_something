# ⚡ Bitly High-Throughput URL Shortener & Analytics System

A production-grade URL Shortener backend, distributed counter engine, and interactive system design dashboard built in **Node.js (TypeScript)**, implementing the architecture outlined in Hello Interview's System Design guide by Evan (former Meta Staff Engineer).

---

## 🏗️ Architecture Overview

The system is designed to handle **100 Million Daily Active Users (DAU)**, **1 Billion stored URLs**, and peak read traffic of **10,000 to 100,000 QPS** with **sub-millisecond redirects (<200ms)**.

```
                                  +-----------------------+
                                  |     Client Browser    |
                                  +-----------+-----------+
                                              |
                                              v
                              +-------------------------------+
                              |    Nginx Reverse Proxy / LB   |
                              |   (SSL, Rate Limits, Routing) |
                              +-------+---------------+-------+
                                      |               |
                         /api/v1/urls |               | /{shortCode}
                      (Write Traffic) |               | (Read Traffic)
                                      v               v
                      +-------------------+       +-------------------+
                      |   Write Service   |       |   Read Service    |
                      | (Node.js/TS Node) |       | (Node.js/TS Node) |
                      +---------+---------+       +---------+---------+
                                |                           |
          Atomic Batch Token    |                           | Sub-ms LRU Cache
          Reservation (INCRBY)  v                           v Read-Through
                      +-----------------------------------------------+
                      |              Redis In-Memory Cache            |
                      |   1. Distributed Global Counter (INCRBY)      |
                      |   2. LRU URL Cache (80/20 Power Law)          |
                      +-----------------------+-----------------------+
                                              |
                                              | Cache Miss Fallback
                                              v
                                  +-----------------------+
                                  |  PostgreSQL Database  |
                                  | (B-Tree PK short_code)|
                                  +-----------------------+
```

---

## 🔑 Core System Design Decisions

### 1. Sequential Counter + Bijective Feistel Cipher + Base62
* **Zero Collisions**: Avoids the Birthday Paradox collisions inherent in truncated MD5 / MurmurHash / random string approaches (~880,000 expected collisions per 1B links), eliminating the need for expensive database uniqueness pre-checks.
* **Unguessable IDs**: Raw sequential integers (1, 2, 3...) make URL enumeration trivial for attackers. We pass the sequential counter through a 40-bit reversible **Feistel cipher** (`FeistelCipher.obfuscate`), which deterministically scrambles consecutive values across a ~1.1 trillion integer space before **Base62** encoding.

### 2. Distributed Counter with Batch Range Allocation
* Rather than calling Redis `INCR` on every single incoming write request, write service instances allocate a batch (e.g. 1,000 tokens) using an atomic `INCRBY bitly:global_counter 1000`.
* The instance allocates sequentially from its local memory range `[currentCounter..maxCounter]`. Network roundtrips to Redis are reduced by **1,000x**, allowing individual write instances to sustain high write QPS with zero lock contention.

### 3. Sub-millisecond 302 Redirects via Redis LRU Cache
* URLs experience a heavy 80/20 power-law distribution (recent viral links receive high read traffic; old links go cold).
* Read-Through caching in Redis (`bitly:url:{shortCode}`) provides sub-millisecond redirect latency.
* **Why 302 Found instead of 301 Moved Permanently?** 301 redirects are permanently cached by browsers and CDNs, which disables click tracking, geo analytics, and expiration enforcement. 302 Found guarantees every click hits the server for analytics while keeping latency under 1ms via Redis.

---

## 🚀 Quick Start

### Prerequisites
* Node.js v20+ (v22 or v26 recommended)
* npm v10+
* *(Optional for Docker deployment)* Docker & Docker Compose

### 1. Installation & Build
```bash
# Install dependencies in both backend and frontend
npm --prefix backend install
npm --prefix frontend install

# Build both backend and frontend
npm run build:all
```

### 2. Run Locally
```bash
# Run backend API server (port 3000)
npm run dev:backend

# Run modern React SPA (port 5173 with Vite proxy)
npm run dev:frontend
```
Open `http://localhost:5173` to explore the interactive React frontend!

> **Zero Setup Resilience:** If local PostgreSQL or Redis servers are not running, the backend automatically initializes its high-performance in-memory fallback engine with logging. It works out-of-the-box on any machine!

### 3. Run Automated Tests
```bash
npm test
```
Runs 12 unit and integration tests verifying:
- Base62 bijective encoding, decoding, padding, and roundtrip BigInt conversions
- Feistel cipher reversibility, zero collisions across consecutive ranges, and avalanche dispersion
- Distributed Counter batch range allocation
- URL creation, custom alias collision rejection (409 Conflict), expiration enforcement, and analytics tracking

---

## 🐳 Production Deployment with Docker Compose

Deploy the complete multi-tier architecture (PostgreSQL 16, Redis 7 LRU, Node.js API, React Frontend SPA, and Nginx reverse proxy):

```bash
docker compose up --build -d
```

Services initialized:
- `http://localhost:8080/`: Nginx reverse proxy edge gateway
- `frontend:80`: React Single-Page Application (SPA) dashboard
- `api:3000`: Containerized Node.js TypeScript application
- `redis:6379`: Redis cache configured with `maxmemory-policy allkeys-lru`
- `postgres:5432`: PostgreSQL primary database with persistent volume

---

## 📡 REST API Reference

### 1. Create Short URL
```http
POST /api/v1/urls
Content-Type: application/json

{
  "originalUrl": "https://hellointerview.com/blog/system-design-url-shortener",
  "alias": "system-design",            // optional custom alias
  "expirationTime": 1798761600         // optional Unix timestamp (seconds or ms)
}
```
**Response (201 Created):**
```json
{
  "shortCode": "system-design",
  "shortUrl": "http://localhost:3000/system-design",
  "originalUrl": "https://hellointerview.com/blog/system-design-url-shortener",
  "createdAt": "2026-10-01T15:40:00.000Z",
  "expiresAt": "2026-12-31T00:00:00.000Z",
  "isCustom": true
}
```

### 2. Redirection (HTTP 302 Found)
```http
GET /{shortCode}
```
**Response Headers:**
```http
HTTP/1.1 302 Found
Location: https://hellointerview.com/blog/system-design-url-shortener
X-Cache-Status: HIT
X-Response-Time: 0.485ms
```

### 3. Link Analytics & Stats
```http
GET /api/v1/urls/{shortCode}/stats
```
**Response (200 OK):**
```json
{
  "shortCode": "system-design",
  "originalUrl": "https://hellointerview.com/...",
  "createdAt": "2026-10-01T15:40:00.000Z",
  "expiresAt": null,
  "clickCount": 42,
  "referrerBreakdown": {
    "https://twitter.com": 30,
    "Direct / None": 12
  },
  "recentClicks": [
    {
      "id": 1,
      "short_code": "system-design",
      "clicked_at": "2026-10-01T15:42:10.000Z",
      "referrer": "https://twitter.com",
      "user_agent": "Mozilla/5.0...",
      "ip_hash": "a1b2c3d4e5f6"
    }
  ]
}
```

### 4. Distributed Counter & Batch Introspection
```http
GET /api/v1/counter/status
```

### 5. Health Check
```http
GET /api/v1/health
```

---

## 📊 Interactive Web Dashboard

Access the interactive Bitly Engine dashboard:
* **Development Mode (Vite SPA)**: [http://localhost:5173](http://localhost:5173) (Direct hot-reload React UI proxied to API)
* **API / Integrated Dashboard**: [http://localhost:3000](http://localhost:3000) (Serves API routes and integrated dashboard)
* **Docker Compose Edge Gateway**: [http://localhost:8080](http://localhost:8080) (Nginx reverse proxy routing to frontend SPA and API)

### Key Dashboard Capabilities:
- **Interactive URL Shortening**: Create short links, set custom aliases, or pick expiration presets.
- **1-Click Testing**: Test 302 redirects with live latency measurement.
- **System Architecture Visualizer**: Step-by-step interactive inspection of the distributed system components.
- **Distributed Counter Inspector**: Real-time progress bar of token batch allocation and remaining capacity.
- **Analytics Modal**: Inspect total clicks, referrer breakdown, and recent click events.

