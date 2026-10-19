import React, { useState } from 'react';
import { 
  Layers, 
  UploadCloud, 
  Hash, 
  CheckCircle, 
  CheckCircle2, 
  Copy, 
  Play, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { initUpload, completeChunk, finalizeUpload } from '../services/api';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB

export default function ChunkingLab({ workspace, onUploadCompleted }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [session, setSession] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState(1); // 1: Select, 2: Prepared, 3: Uploading & Verifying, 4: Finalized
  const [overallProgress, setOverallProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  const calculateHash = async (blob) => {
    const buffer = await blob.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(digest));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setChunks([]);
      setSession(null);
      setStep(1);
      setErrorMsg(null);
    }
  };

  const handlePrepareUpload = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setErrorMsg(null);
    setChunks([]);

    try {
      const totalChunks = Math.ceil(selectedFile.size / CHUNK_SIZE);
      const computedHashes = [];
      const preparedChunks = [];

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(selectedFile.size, start + CHUNK_SIZE);
        const sliceBlob = selectedFile.slice(start, end);
        const hash = await calculateHash(sliceBlob);
        computedHashes.push(hash);

        preparedChunks.push({
          index: i,
          start,
          end,
          size: end - start,
          hash,
          blob: sliceBlob,
          status: 'PENDING',
          verified: false,
          etag: null,
          presignedUrl: null,
        });
      }

      const initRes = await initUpload({
        workspace_id: workspace?.id,
        file_name: selectedFile.name,
        folder_path: '/Uploads',
        size_bytes: selectedFile.size,
        mime_type: selectedFile.type || 'application/octet-stream',
        chunk_size_bytes: CHUNK_SIZE,
        chunk_hashes: computedHashes,
      });

      initRes.chunks.forEach((c) => {
        if (preparedChunks[c.chunk_index]) {
          preparedChunks[c.chunk_index].presignedUrl = c.presigned_put_url;
          preparedChunks[c.chunk_index].s3Key = c.s3_key;
        }
      });

      setSession(initRes);
      setChunks(preparedChunks);
      setStep(2);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to initialize upload session.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartEndToEndUpload = async () => {
    if (!session || chunks.length === 0) return;
    setIsProcessing(true);
    setStep(3);
    setErrorMsg(null);

    const updatedChunks = [...chunks];
    let completedCount = 0;

    for (let i = 0; i < updatedChunks.length; i++) {
      const chunk = updatedChunks[i];
      chunk.status = 'UPLOADING';
      setChunks([...updatedChunks]);

      try {
        let etag = '';
        if (chunk.presignedUrl) {
          const putRes = await fetch(chunk.presignedUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: chunk.blob
          });

          if (!putRes.ok && putRes.status !== 0) {
            throw new Error(`MinIO upload returned HTTP ${putRes.status}`);
          }
          etag = putRes.headers.get('ETag') || `etag-chunk-${i}`;
        }

        chunk.status = 'VERIFYING';
        setChunks([...updatedChunks]);

        const verifyRes = await completeChunk({
          file_id: session.file_id,
          chunk_index: chunk.index,
          etag: etag.replace(/"/g, ''),
          chunk_hash: chunk.hash,
        });

        chunk.status = 'VERIFIED';
        chunk.verified = true;
        chunk.etag = verifyRes.etag;
        completedCount++;
        setOverallProgress(Math.round((completedCount / updatedChunks.length) * 100));
        setChunks([...updatedChunks]);
      } catch (err) {
        console.error(`Chunk #${i} failed:`, err);
        chunk.status = 'FAILED';
        setErrorMsg(`Chunk #${i} failed: ${err.message}`);
        setChunks([...updatedChunks]);
        setIsProcessing(false);
        return;
      }
    }

    try {
      const finalRes = await finalizeUpload({
        file_id: session.file_id,
        file_hash: chunks.map(c => c.hash.slice(0, 8)).join('')
      });

      setStep(4);
      if (onUploadCompleted) onUploadCompleted(finalRes.file);
    } catch (err) {
      setErrorMsg(`Finalize failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="glass-panel" style={{ padding: '28px' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={24} color="#38bdf8" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
              S3 Direct Chunking & Verification Workflow
            </h2>
          </div>
          <span style={{
            fontSize: '0.72rem',
            padding: '3px 10px',
            borderRadius: '999px',
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#34d399',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            Week 2 Endpoints Active
          </span>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
          Full 4-stage pipeline: <strong>1. Client Slicing</strong> → <strong>2. POST /api/files/init-upload/</strong> → <strong>3. Direct MinIO PUT & s3.head_object() Verification</strong> → <strong>4. POST /api/files/finalize/</strong>.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '10px',
        marginBottom: '24px'
      }}>
        {[
          { num: 1, label: 'Select & Slice', active: step >= 1 },
          { num: 2, label: 'Init Session', active: step >= 2 },
          { num: 3, label: 'Direct S3 & Verify', active: step >= 3 },
          { num: 4, label: 'Finalize Active', active: step >= 4 },
        ].map((s) => (
          <div
            key={s.num}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: s.active ? 'rgba(0, 97, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              border: s.active ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: s.active ? '#60a5fa' : 'var(--text-muted)'
            }}
          >
            <span style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: s.active ? '#0061ff' : 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              fontSize: '0.72rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {s.num}
            </span>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {errorMsg && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          background: 'rgba(244, 63, 94, 0.15)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          color: '#fb7185',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '20px'
        }}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div style={{
        border: '2px dashed var(--border-hover)',
        borderRadius: '12px',
        padding: '30px 20px',
        textAlign: 'center',
        background: 'rgba(255, 255, 255, 0.01)',
        marginBottom: '24px'
      }}>
        <UploadCloud size={38} color="#60a5fa" style={{ margin: '0 auto 10px' }} />
        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
          {selectedFile ? selectedFile.name : 'Select or drop any file to test Chunking & Verification'}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          {selectedFile 
            ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • ${Math.ceil(selectedFile.size / CHUNK_SIZE)} chunks (5MB each)`
            : 'Simulate files up to 50 GB'}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <label className="btn-secondary" style={{ cursor: 'pointer' }}>
            Choose File
            <input type="file" onChange={handleFileChange} style={{ display: 'none' }} />
          </label>

          {selectedFile && step === 1 && (
            <button
              onClick={handlePrepareUpload}
              disabled={isProcessing}
              className="btn-primary"
            >
              <Sparkles size={15} />
              <span>{isProcessing ? 'Slicing & Initializing...' : 'Initialize Upload Session (POST /init-upload/)'}</span>
            </button>
          )}

          {step >= 2 && step < 4 && (
            <button
              onClick={handleStartEndToEndUpload}
              disabled={isProcessing}
              className="btn-primary"
            >
              <Play size={15} />
              <span>{isProcessing ? `Uploading Chunks (${overallProgress}%)...` : 'Execute Direct S3 Upload & HEAD Verify'}</span>
            </button>
          )}
        </div>
      </div>

      {step >= 3 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Upload & Verification Progress</span>
            <strong style={{ color: '#fff' }}>{overallProgress}%</strong>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{
              width: `${overallProgress}%`,
              height: '100%',
              background: step === 4 ? '#10b981' : 'linear-gradient(90deg, #0061ff 0%, #38bdf8 100%)',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      )}

      {step === 4 && (
        <div style={{
          padding: '16px 20px',
          borderRadius: '10px',
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <CheckCircle2 size={24} color="#34d399" />
          <div>
            <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>
              File Successfully Finalized & Activated in PostgreSQL!
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              All {chunks.length} chunks verified via <code style={{ color: '#34d399' }}>s3.head_object()</code>. Quota updated.
            </div>
          </div>
        </div>
      )}

      {chunks.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>
              Chunk Matrix ({chunks.length} total)
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Status: {session?.status} • File ID: {session?.file_id?.slice(0, 8)}...
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {chunks.map((c) => (
              <div
                key={c.index}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '180px' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    background: c.verified ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0, 97, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    color: c.verified ? '#34d399' : '#60a5fa'
                  }}>
                    #{c.index}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#fff' }}>
                      {(c.size / (1024 * 1024)).toFixed(2)} MB
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      Bytes {c.start.toLocaleString()} - {c.end.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Hash size={12} color="#a78bfa" />
                    <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: '#e2e8f0' }}>
                      {c.hash.slice(0, 24)}...
                    </span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {c.s3Key || 'Pending S3 Key'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {c.presignedUrl && (
                    <button
                      onClick={() => copyToClipboard(c.presignedUrl, `url-${c.index}`)}
                      className="btn-secondary"
                      style={{ padding: '5px 8px', fontSize: '0.72rem' }}
                    >
                      <Copy size={11} />
                      <span>{copiedKey === `url-${c.index}` ? 'Copied' : 'Presigned URL'}</span>
                    </button>
                  )}

                  <span className={`status-badge ${c.verified ? 'active' : c.status.toLowerCase()}`}>
                    {c.verified && <CheckCircle size={11} />}
                    {c.verified ? 'VERIFIED (HEAD)' : c.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
