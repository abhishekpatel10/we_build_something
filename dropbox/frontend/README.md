# 📦 Dropbox Frontend Web Dashboard

Modern React Single Page Application (SPA) inspired by Google Drive and Dropbox, featuring client-side file slicing, cryptographic fingerprinting, direct-to-S3/MinIO upload pipelines, and storage quota management.

---

## 🛠️ Tech Stack

* **Framework**: React 18
* **Build Tool**: Vite
* **Styling**: Vanilla CSS (Tailored dark mode, glassmorphism, responsive grid)
* **Icons**: Lucide React
* **Cryptography**: Native WebCrypto API (`crypto.subtle.digest('SHA-256', ...)`)
* **Chunking**: HTML5 `File.slice()` API (5 MB chunks)

---

## 🚀 Running the Frontend Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional)
The frontend communicates with the Django API backend and MinIO S3:
```env
VITE_API_URL=http://localhost:8000/api
VITE_MINIO_URL=http://localhost:9000
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

## 🧩 Key Dashboard Components

* **`ChunkingLab.jsx`**: Interactive 50GB file slicer. Watch your browser slice files into 5MB chunks, compute SHA-256 hashes using `WebCrypto`, request presigned PUT URLs, and stream chunks directly to MinIO S3 without traversing the Django API.
* **`FileList.jsx`**: File explorer showing file size, total chunks, upload status (`PENDING`, `UPLOADING`, `ACTIVE`), and one-click presigned GET download links.
* **`ChunksModal.jsx`**: Deep-dive chunk matrix inspector displaying each chunk's index, byte range, SHA-256 fingerprint, and MinIO S3 object key.
* **`PresignedConsole.jsx`**: Real-time console for testing Boto3 presigned PUT/GET generation and executing `head_object` verification.
* **`Sidebar.jsx` & `StorageOverview.jsx`**: Multi-tenant workspace metrics and visual storage quota progress meter.
* **`ArchitectureMap.jsx`**: Interactive system design blueprint tracing client, API gateway, MinIO S3, and PostgreSQL interactions.
