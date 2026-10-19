# ⚡ Bitly Frontend Dashboard

Interactive React Single Page Application (SPA) for URL shortening, custom alias generation, expiration management, live redirect latency testing, and clickstream analytics.

---

## 🛠️ Tech Stack

* **Framework**: React 18 + TypeScript
* **Build Tool**: Vite 5
* **Styling**: Tailored Modern CSS (Dark Mode / Glassmorphism)
* **Icons**: Lucide React
* **Proxy**: Vite development proxy routing `/api` and `/:shortCode` requests to the Node.js backend

---

## 🚀 Running the Frontend Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Vite Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser. Requests to `/api/v1/...` and shortcode redirects are automatically proxied to the backend at `http://localhost:3000`.

### 3. Build for Production
```bash
npm run build
```
Generates production assets in the `dist/` directory, which can be served directly by the Node.js backend or Nginx.

---

## 🧩 Features

* **Interactive URL Shortening**: Enter long URLs, configure optional custom vanity aliases, and set expiration presets (1 hour, 24 hours, 7 days, 30 days).
* **Distributed Counter Inspector**: Real-time progress bar of local token batch allocation and remaining capacity before the next atomic Redis batch reservation.
* **1-Click Live Redirect Benchmark**: Measure sub-millisecond redirection latency with Redis cache HIT/MISS indicators.
* **Analytics Modal**: View total clicks, referrer breakdown charts, user agent stats, and timestamped click history.
* **Interactive Architecture Visualizer**: Step-by-step interactive blueprint tracing write paths and read paths through the distributed system.
