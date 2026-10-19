import React from 'react';
import { Cloud, HardDrive, RefreshCw, CheckCircle2, AlertTriangle, Plus } from 'lucide-react';

export default function Header({
  health,
  workspaces,
  activeWorkspace,
  onSelectWorkspace,
  onOpenUpload,
  onRefresh,
  loading
}) {
  const isHealthy = health?.status === 'healthy';
  const minioOk = health?.components?.minio_s3?.status === 'connected';

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 28px',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(11, 15, 25, 0.85)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      {/* Brand & Subtitle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #0061ff 0%, #0042a5 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 14px var(--primary-glow)'
        }}>
          <Cloud size={24} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' }}>
              CloudVault
            </h1>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '6px',
              background: 'rgba(0, 97, 255, 0.2)',
              color: '#60a5fa',
              border: '1px solid rgba(96, 165, 250, 0.3)'
            }}>
              WEEK 1 ARCHITECTURE
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            High-Scale S3 Chunking & Metadata Engine
          </p>
        </div>
      </div>

      {/* Middle & Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* MinIO S3 & DB Connectivity Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '6px 14px',
          borderRadius: '9999px',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.78rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isHealthy ? '#10b981' : '#f59e0b',
              boxShadow: isHealthy ? '0 0 8px #10b981' : '0 0 8px #f59e0b'
            }} />
            <span style={{ color: 'var(--text-secondary)' }}>API:</span>
            <strong style={{ color: '#fff' }}>{health?.components?.database?.engine || 'Django'}</strong>
          </div>

          <span style={{ color: 'var(--border-hover)' }}>|</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <HardDrive size={13} color={minioOk ? '#10b981' : '#9ca3af'} />
            <span style={{ color: 'var(--text-secondary)' }}>MinIO:</span>
            <strong style={{ color: minioOk ? '#34d399' : '#fbbf24' }}>
              {minioOk ? 'Ready' : 'Docker Port 9000'}
            </strong>
          </div>
        </div>

        {/* Workspace Selector */}
        {workspaces?.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              value={activeWorkspace?.id || ''}
              onChange={(e) => {
                const found = workspaces.find(w => w.id === e.target.value);
                if (found) onSelectWorkspace(found);
              }}
              style={{
                background: 'var(--bg-surface)',
                color: '#fff',
                border: '1px solid var(--border-subtle)',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {workspaces.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          className="btn-secondary"
          title="Refresh State"
          style={{ padding: '8px 12px' }}
        >
          <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>

        {/* Upload Trigger */}
        <button onClick={onOpenUpload} className="btn-primary">
          <Plus size={16} />
          <span>New Upload</span>
        </button>
      </div>
    </header>
  );
}
