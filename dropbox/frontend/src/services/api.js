/**
 * API Service for CloudVault (Dropbox System Design Frontend)
 */
const API_BASE = (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_API_BASE_URL)
  ? import.meta.env.VITE_API_BASE_URL
  : '/api';

export async function fetchHealth() {
  try {
    const res = await fetch(`${API_BASE}/health/`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return {
      status: 'offline',
      components: {
        database: { status: 'disconnected', engine: 'unknown' },
        minio_s3: { status: 'unreachable', message: err.message },
      }
    };
  }
}

export async function fetchWorkspaces() {
  try {
    const res = await fetch(`${API_BASE}/workspaces/`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : data.results || [];
  } catch (err) {
    console.warn('Failed to fetch workspaces from backend:', err);
    return [];
  }
}

export async function createWorkspace({ name, slug, owner_id = 'demo-user', storage_quota_gb = 50 }) {
  const res = await fetch(`${API_BASE}/workspaces/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      slug,
      owner_id,
      storage_quota_bytes: storage_quota_gb * 1024 * 1024 * 1024,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(err) || `HTTP ${res.status}`);
  }
  return await res.json();
}

export async function fetchFiles(workspaceId = null) {
  try {
    const url = workspaceId ? `${API_BASE}/files/?workspace_id=${workspaceId}` : `${API_BASE}/files/`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : data.results || [];
  } catch (err) {
    console.warn('Failed to fetch files from backend:', err);
    return [];
  }
}

export async function generatePresignedPut({ s3_key, content_type = 'application/octet-stream', expires_in = 3600 }) {
  const res = await fetch(`${API_BASE}/presigned/put/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ s3_key, content_type, expires_in }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function generatePresignedGet({ s3_key, download_filename, expires_in = 3600 }) {
  const res = await fetch(`${API_BASE}/presigned/get/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ s3_key, download_filename, expires_in }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function verifyChunkExistence(s3_key) {
  const res = await fetch(`${API_BASE}/presigned/verify/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ s3_key }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

// ============================================================================
// Week 2 APIs: init-upload, complete-chunk, finalize-upload, upload-status
// ============================================================================

export async function initUpload({
  workspace_id,
  file_name,
  folder_path = '/',
  size_bytes,
  mime_type = 'application/octet-stream',
  chunk_size_bytes = 5242880,
  chunk_hashes = [],
}) {
  const res = await fetch(`${API_BASE}/files/init-upload/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workspace_id,
      file_name,
      folder_path,
      size_bytes,
      mime_type,
      chunk_size_bytes,
      chunk_hashes,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || JSON.stringify(err) || `HTTP ${res.status}`);
  }
  return await res.json();
}

export async function completeChunk({ file_id, chunk_index, etag = '', chunk_hash = '' }) {
  const res = await fetch(`${API_BASE}/files/${file_id}/chunks/${chunk_index}/complete/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ etag, chunk_hash }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || JSON.stringify(err) || `HTTP ${res.status}`);
  }
  return await res.json();
}

export async function finalizeUpload({ file_id, file_hash = '' }) {
  const res = await fetch(`${API_BASE}/files/${file_id}/finalize/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_hash }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || JSON.stringify(err) || `HTTP ${res.status}`);
  }
  return await res.json();
}

export async function fetchFileUploadStatus(file_id, regenerate_urls = true) {
  const res = await fetch(`${API_BASE}/files/${file_id}/upload-status/?regenerate_urls=${regenerate_urls}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}
