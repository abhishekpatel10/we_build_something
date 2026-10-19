# 🎟️ Ticketmaster Frontend Application

Modern React 19 Single Page Application (SPA) implementing an interactive stadium seat map, virtual waiting room queue, and checkout flow for high-concurrency ticket reservations.

---

## 🛠️ Tech Stack

* **Framework**: React 19 + TypeScript
* **Build Tool**: Vite 8 (Hot Module Replacement)
* **Styling**: Tailwind CSS 3.4
* **State & Data Fetching**: TanStack React Query 5
* **Routing**: React Router DOM 7
* **Icons**: Lucide React
* **Real-Time Updates**: Native Server-Sent Events (SSE) API connecting to Redis Pub/Sub

---

## 🚀 Running the Frontend Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional)
By default, the frontend connects to `http://localhost:8000`. To customize the backend URL, create a `.env` file:
```env
VITE_API_BASE_URL=http://localhost:8000
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for Production
```bash
npm run build
```

---

## 🧩 Key Components & Pages

* **`SeatMap.tsx`**: Interactive seat grid with color-coded tiers (VIP, Lower Bowl, Club, Upper Terrace) and real-time SSE listener (`/api/events/{id}/seats/stream/`) for instant seat status transitions.
* **`WaitingRoomModal.tsx` & `QueuePage.tsx`**: Virtual waiting room polling UI showing real-time queue position, estimated wait time, and automatic entry redirection when an admission token is granted.
* **`CheckoutModal.tsx` & `CountdownTimer.tsx`**: 10-minute hold countdown timer tied to Redis TTL with simulated Stripe payment completion.
* **`SystemDesignModal.tsx`**: Built-in architecture blueprint modal detailing the distributed locking, caching, and database isolation strategy.
* **`SearchPage.tsx`**: Full-text event discovery powered by the Elasticsearch backend.
* **`MyBookingsPage.tsx`**: View confirmed tickets, seat allocations, and payment receipts.
