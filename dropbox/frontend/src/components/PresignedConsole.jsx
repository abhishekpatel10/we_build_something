import React, { useState } from 'react';
import { Terminal, Send, Copy } from 'lucide-react';
import { generatePresignedPut, generatePresignedGet, verifyChunkExistence } from '../services/api';

export default function PresignedConsole() {
  const [method, setMethod] = useState('PUT');
  const [s3Key, setS3Key] = useState('workspaces/test-vault/files/sample_video.mp4/chunk_00000.part');
  const [contentType, setContentType] = useState('application/octet-stream');
  const [expiresIn, setExpiresIn] = useState(3600);
  const [downloadFilename, setDownloadFilename] = useState('sample_video.part0');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      let res;
      if (method === 'PUT') {
        res = await generatePresignedPut({ s3_key: s3Key, content_type: contentType, expires_in: Number(expiresIn) });
      } else if (method === 'GET') {
        res = await generatePresignedGet({ s3_key: s3Key, download_filename: downloadFilename, expires_in: Number(expiresIn) });
      } else if (method === 'VERIFY') {
        res = await verifyChunkExistence(s3Key);
      }
      setResult({ success: true, data: res });
    } catch (err) {
      setResult({ success: false, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const copyResult = () => {
    if (!result?.data) return;
    const text = result.data.presigned_put_url || result.data.presigned_get_url || JSON.stringify(result.data, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel" style={{ padding: '28px' }}>
      <div style={{ marginBottom: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <Terminal size={22} color="#10b981" />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
            MinIO S3 Presigned URL & boto3 Testing Console
          </h2>
        </div>
        <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
          Directly execute Django's <code style={{ color: '#38bdf8' }}>S3StorageService</code> to generate presigned upload/download URLs or perform <code style={{ color: '#38bdf8' }}>s3.head_object()</code> chunk verification.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Input Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Operation
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {['PUT', 'GET', 'VERIFY'].map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setMethod(m)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: method === m ? 'rgba(0, 97, 255, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                    border: method === m ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                    color: method === m ? '#60a5fa' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.825rem',
                    cursor: 'pointer'
                  }}
                >
                  {m === 'PUT' ? 'Presigned PUT' : m === 'GET' ? 'Presigned GET' : 'HEAD Verify'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              S3 Object Key
            </label>
            <input
              type="text"
              value={s3Key}
              onChange={(e) => setS3Key(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontFamily: 'var(--font-mono)'
              }}
              required
            />
          </div>

          {method === 'PUT' && (
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Content-Type
              </label>
              <input
                type="text"
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  color: '#fff',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontFamily: 'var(--font-mono)'
                }}
              />
            </div>
          )}

          {method === 'GET' && (
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Download Attachment Filename (optional)
              </label>
              <input
                type="text"
                value={downloadFilename}
                onChange={(e) => setDownloadFilename(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  color: '#fff',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontFamily: 'var(--font-mono)'
                }}
              />
            </div>
          )}

          {method !== 'VERIFY' && (
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Expiry Time (seconds)
              </label>
              <input
                type="number"
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  color: '#fff',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontFamily: 'var(--font-mono)'
                }}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ justifyContent: 'center', marginTop: '6px' }}
          >
            <Send size={15} />
            <span>{loading ? 'Invoking Django API...' : `Execute ${method} Request`}</span>
          </button>
        </form>

        {/* Live Output */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Live API Response
            </span>
            {result?.data && (
              <button
                onClick={copyResult}
                className="btn-secondary"
                style={{ padding: '4px 8px', fontSize: '0.72rem' }}
              >
                <Copy size={12} />
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            )}
          </div>

          <div
            className="code-preview"
            style={{
              flex: 1,
              minHeight: '260px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: result ? 'flex-start' : 'center',
              alignItems: result ? 'flex-start' : 'center',
              color: result?.success === false ? '#fb7185' : '#38bdf8'
            }}
          >
            {result ? (
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '0.8rem' }}>
                {JSON.stringify(result.data || result.error, null, 2)}
              </pre>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Click Execute to call the Django backend and generate a signed MinIO S3 URL.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
