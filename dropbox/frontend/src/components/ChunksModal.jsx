import React from 'react';
import { X, Layers, Hash } from 'lucide-react';

export default function ChunksModal({ file, onClose }) {
  if (!file) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '720px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px',
        background: '#0f172a'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={20} color="#60a5fa" />
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
                Chunk Matrix: {file.file_name}
              </h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {file.total_chunks} parts • 5MB uniform partitioning • S3 direct mapping
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '6px', borderRadius: '50%' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Chunks List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
          {(!file.chunks || file.chunks.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
              No chunk parts registered in metadata DB yet.
            </div>
          ) : (
            file.chunks.map((chunk) => (
              <div
                key={chunk.id || chunk.chunk_index}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    background: 'rgba(0, 97, 255, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#93c5fd'
                  }}>
                    #{chunk.chunk_index}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#fff' }}>
                      Part {chunk.chunk_index} ({(chunk.size_bytes / (1024 * 1024)).toFixed(2)} MB)
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {chunk.s3_key}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {chunk.chunk_hash && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#a78bfa', fontFamily: 'var(--font-mono)' }}>
                      <Hash size={12} />
                      <span>{chunk.chunk_hash.slice(0, 10)}...</span>
                    </div>
                  )}

                  <span className={`status-badge ${chunk.status.toLowerCase()}`}>
                    {chunk.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '16px',
          paddingTop: '14px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
