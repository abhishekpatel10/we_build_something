# 🎟️ Ticketmaster System Design & High-Concurrency Booking Engine

A production-grade, distributed event ticketing and flash-sale reservation system designed to withstand extreme traffic spikes (e.g. Taylor Swift / stadium tour on-sales) with **zero double-bookings**, **sub-second search queries**, and **real-time seat map synchronization**.

Built with **Django 5 & Django REST Framework**, **PostgreSQL 16**, **Redis 7 (Distributed Locks & Sorted Sets)**, **Elasticsearch 8.13**, **Celery + Celery Beat**, and **React 19 + TypeScript + Vite**.

---

## 🏗️ System Architecture Overview

```
                                  [ Client Browser (React 19 SPA) ]
                                      │                     │
                     Search & Browse  │                     │ Flash Sale / Seat Selection
                     (Read Path)      │                     │ (Write Path)
                                      ▼                     ▼
                             ┌─────────────────────────────────┐
                             │    API Gateway / Load Balancer  │
                             └────────────────┬────────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
          ┌───────────────────────┐                       ┌───────────────────────┐
          │  Search Service       │                       │ Virtual Waiting Room  │
          │  (Elasticsearch 8.13) │                       │ (Redis ZSET Queue)    │
          └───────────────────────┘                       └───────────┬───────────┘
                      │                                               │
             Sub-10ms Inverted Index                       Leased Admission Token (15m)
             Fuzzy & Geo-Distance Query                               ▼
                                                          ┌───────────────────────┐
                                                          │ Booking API Service   │
                                                          │ (Django REST / Python)│
                                                          └───────────┬───────────┘
                                                                      │
                      ┌───────────────────────────────────────────────┴───────────────────────────────┐
                      ▼                                               ▼                               ▼
          ┌───────────────────────┐                       ┌───────────────────────┐       ┌───────────────────────┐
          │ Distributed Lock      │                       │ Relational Database   │       │ Real-Time SSE Stream  │
          │ Redis 7 (SETNX + Lua) │                       │ PostgreSQL 16 (ACID)  │       │ Redis Pub/Sub Broker  │
          └───────────────────────┘                       └───────────────────────┘       └───────────────────────┘
           10-Min Temporary Hold                           select_for_update() Lock        Live Seat Status Push
           prevents lock collisions                        OCC Version Checking            to all viewing clients
```

---

## 🔑 Core System Design Decisions

### 1. Virtual Waiting Room (Surge Traffic Choke Point)
* **The Problem**: During stadium concert flash sales, 1,000,000+ concurrent users hit the site within seconds. Allowing this traffic directly into the database causes immediate connection pool exhaustion, database deadlocks, and cascading service outages.
* **The Solution**: Traffic is routed into a **Virtual Waiting Room** powered by a **Redis Sorted Set (ZSET)** (`queue:event:{eventId}`) scored by user arrival timestamp.
* **Admission Control**: Celery Beat runs periodic batch releases (e.g., 200 users every few seconds), granting valid time-limited admission tokens (`token:admitted:{userId}:{eventId}`). Unadmitted users are blocked from seat reservation endpoints (`HTTP 429 Too Many Requests`), protecting database throughput.

### 2. Two-Phase Distributed Seat Reservation & Zero Double-Booking
* **Phase 1 (Temporary Hold)**: When a user selects a seat, the backend acquires an atomic distributed lock via Redis:
  ```redis
  SET ticket:{ticketId} {userId} NX EX 600
  ```
  `NX` guarantees only one user can claim the seat; `EX 600` automatically expires the hold after 10 minutes if the user abandons checkout.
* **Phase 2 (Safe Lua Release)**: When releasing the hold, an atomic Lua script validates that the lock is still owned by the requesting user before deleting:
  ```lua
  if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
  else
      return 0
  end
  ```
* **Phase 3 (Pessimistic DB Commit & OCC)**: When finalizing payment, the database transaction executes:
  ```python
  ticket = Ticket.objects.select_for_update().get(id=ticket_id)
  ```
  The status transitions from `AVAILABLE` to `BOOKED` while incrementing an **Optimistic Concurrency Control (OCC)** version counter, guaranteeing strict ACID consistency across concurrent workers.

### 3. Real-Time Seat Map Updates via Redis Pub/Sub & SSE
* Seat status changes are published immediately to Redis channel `event:{eventId}:seats`.
* Clients subscribe to Server-Sent Events (`GET /api/events/{eventId}/seats/stream/`).
* When User A reserves or purchases Seat B-14, all other users viewing the seat map receive an instantaneous event pushing the updated status (`LOCKED` or `BOOKED`) without polling.

### 4. Elasticsearch Inverted Index & Geospatial Discovery
* Events, venues, and performers are indexed in Elasticsearch 8.13 with custom token analyzers.
* Features fuzzy matching (`fuzziness: AUTO`), field boosting (`title^3`, `performer.name^2`), and geo-distance queries (`location: {lat, lon}, distance: 50km`).
* **Zero-Setup Resilience**: If Elasticsearch is unavailable, the search API seamlessly falls back to relational database `Q()` queries.

---

## 📂 Repository Structure

```
Ticketmaster/
├── docker-compose.yml              # PostgreSQL 16 + Redis 7 + Elasticsearch 8.13 + Celery + API
├── .env.example                    # Environment variable template
├── backend/
│   ├── Dockerfile
│   ├── entrypoint.sh               # Wait-for-postgres, auto-migrate & auto-seed
│   ├── requirements.txt            # Django 5, DRF, Celery, Redis, Elasticsearch, Stripe
│   ├── manage.py
│   ├── config/                     # Settings, Celery app, ASGI/WSGI, root URLs
│   └── apps/
│       ├── authentication/         # JWT registration, login, and profile
│       ├── events/                 # Venues, Performers, Events, Seat Maps & SSE stream
│       │   └── management/commands/seed_data.py # Realistic stadium & tour seed data
│       ├── bookings/               # Distributed Redis locks, OCC, Stripe checkout, Celery tasks
│       ├── waiting_room/           # Redis ZSET virtual queue & batch admission worker
│       └── search/                 # Elasticsearch 8 client, mappings, and search views
└── frontend/
    ├── package.json                # React 19, TypeScript, Vite, Tailwind CSS, TanStack Query
    ├── vite.config.ts
    └── src/
        ├── api/                    # Typed API client for auth, events, bookings, queue, search
        ├── components/
        │   ├── Navbar.tsx          # Navigation, search bar, and System Design modal trigger
        │   ├── SeatMap.tsx         # SVG/Canvas color-coded interactive seat grid with SSE listener
        │   ├── CheckoutModal.tsx   # Stripe payment card checkout & 10-minute hold timer
        │   ├── WaitingRoomModal.tsx# Queue position tracker & live polling
        │   └── SystemDesignModal.tsx # Interactive 5-tier architecture visualizer
        └── pages/
            ├── HomePage.tsx        # Featured stadium tours, trending events, category filters
            ├── SearchPage.tsx      # Elasticsearch facet search & city/date filters
            ├── EventDetailPage.tsx # Event hero, seat map, tier pricing & live reservations
            ├── QueuePage.tsx       # Standalone virtual queue waiting room
            └── MyBookingsPage.tsx  # Confirmed tickets and Stripe payment receipts
```

---

## 🚀 Quick Start Guide

### Option 1: Full Docker Compose Deployment (Recommended)

Starts the entire multi-container infrastructure (PostgreSQL, Redis, Elasticsearch, Django API, Celery Worker, Celery Beat):

```bash
# 1. Clone repository and navigate to Ticketmaster folder
cd Ticketmaster

# 2. Copy environment configuration
cp .env.example .env

# 3. Build and launch all services
docker compose up --build -d
```

#### Services Initialized:
* **Django API & Admin**: [http://localhost:8000](http://localhost:8000)
* **API Health Check**: [http://localhost:8000/api/health/](http://localhost:8000/api/health/)
* **Elasticsearch Engine**: [http://localhost:9200](http://localhost:9200)
* **Redis Server**: `localhost:6379`
* **PostgreSQL Database**: `localhost:5432` (DB: `ticketmaster_db`)

The backend container automatically runs database migrations and seeds initial venues (SoFi Stadium, Madison Square Garden), artists, events, and thousands of seats with demo accounts.

---

### Option 2: Local Development Setup (Without Docker)

You can run Ticketmaster locally on any machine with Python 3.11+ and Node.js 20+:

#### 1. Backend Setup:
```bash
cd Ticketmaster/backend

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate      # Windows (PowerShell)
# source venv/bin/activate  # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Run migrations (uses SQLite by default if PostgreSQL is not running)
python manage.py migrate

# Seed sample stadium venues, concerts, and seats
python manage.py seed_data

# Start Django development server (port 8000)
python manage.py runserver 8000
```

> **Default Seed Credentials**:
> - **Demo Buyer**: `username: demo_user` | `password: demopassword123`
> - **Admin**: `username: admin` | `password: adminpassword123`

#### 2. Frontend Setup:
```bash
cd Ticketmaster/frontend

# Install dependencies
npm install

# Start Vite React development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser!

---

## 📡 REST API Reference

### 1. Authentication
* `POST /api/auth/register/` - Register new user account.
* `POST /api/auth/login/` - Authenticate and obtain JWT access & refresh tokens.
* `POST /api/auth/token/refresh/` - Refresh expired JWT access token.
* `GET /api/auth/me/` - Retrieve authenticated profile.

### 2. Events & Real-Time Seat Map
* `GET /api/events/` - List all upcoming events.
* `GET /api/events/{id}/` - Detailed event information including venue configuration.
* `GET /api/events/{id}/seats/` - Seat map layout with real-time status (`AVAILABLE`, `RESERVED`, `BOOKED`).
* `GET /api/events/{id}/seats/stream/` - **Server-Sent Events (SSE)** live seat stream. Emits `seat_update` events whenever any seat transitions state.

### 3. Search Engine (Elasticsearch)
* `GET /api/search/?term={query}&location={city}&type={concert|sports}&date={YYYY-MM-DD}`
  - High-speed fuzzy search powered by Elasticsearch 8.13 with automatic fallback to relational database.

### 4. Virtual Waiting Room (Flash Sales)
* `POST /api/waiting-room/join/` - Enqueue user in the event waiting room (`queue:event:{id}`).
  - Returns `position`, `total_queued`, and `estimated_wait_seconds`.
* `GET /api/waiting-room/status/?event_id={id}` - Check current queue position or verify if user has received admission.
* `POST /api/waiting-room/leave/` - Voluntarily vacate position in queue.
* `POST /api/waiting-room/admit-now/` - Admin trigger to release top N users into booking pipeline.

### 5. High-Concurrency Booking Pipeline
* `POST /api/bookings/reserve/`
  - **Body**: `{"ticket_id": 42}`
  - Acquires atomic Redis distributed lock (`SETNX EX 600`).
  - Returns 10-minute countdown lease. Fails with `409 Conflict` if held by another buyer.
* `POST /api/bookings/confirm/`
  - **Body**: `{"ticket_id": 42, "payment_token": "tok_visa"}`
  - Validates lock ownership, processes Stripe payment intent with idempotency key, acquires DB `select_for_update()`, commits booking, increments OCC version, releases Redis lock, and broadcasts booked status via SSE.
* `POST /api/bookings/release/`
  - Voluntarily releases an active seat hold.
* `GET /api/bookings/my-bookings/`
  - Lists historical bookings and payment receipts for the logged-in user.

---

## 🧪 Automated Test Suite

Run unit and integration tests verifying distributed locking, OCC, and search indexing:

```bash
cd backend
python manage.py test apps.bookings apps.search
```

### Verified Scenarios:
1. **Lock Concurrency**: User A acquires seat lock; User B receives immediate lock rejection.
2. **Safe Lua Release**: Only the lock holder can release the lock; third-party releases fail silently without deleting.
3. **Database OCC**: Two concurrent confirmation transactions attempting to claim the same seat are serialized via `select_for_update()`.
4. **Elasticsearch Indexing**: Documents map correctly to inverted indices with analyzer tokenizer validation.

---

## 📊 Interactive Web Dashboard Features

* **Live Seat Map Canvas**: Visual representation of stadium seating sections (VIP, Lower Bowl, Club, Upper Terrace) with dynamic color status.
* **Real-time SSE Connectivity Indicator**: Green pulse indicating active Server-Sent Events connection to the backend event bus.
* **Hold Timer Countdown**: Persistent 10:00 countdown clock synced to the Redis TTL.
* **Interactive System Design Modal**: Built-in architecture visualizer allowing you to trace each step of the read/write request lifecycles.
