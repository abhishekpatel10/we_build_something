import React from 'react';
import { Database, FileText, Layers, ShieldCheck, Zap } from 'lucide-react';

export default function StorageOverview({ workspace, files = [] }) {
  const activeFilesCount = files.filter(f => f.status === 'ACTIVE').length;
  const totalChunks = files.reduce((acc, f) => acc + (f.total_chunks || 0), 0);
  const usedMb = ((workspace?.used_storage_bytes || 0) / (1024 * 1024)).toFixed(1);

  const metrics = [
    {
      title: 'Current Storage Used',
      value: `${usedMb} MB`,
      sub: `of ${(workspace?.storage_quota_bytes || 53687091200) / (1024 ** 3)} GB Quota`,
      icon: Database,
      color: '#38bdf8'
    },
    {
      title: 'Active Synced Files',
      value: activeFilesCount,
      sub: `${files.length} registered sessions`,
      icon: FileText,
      color: '#34d399'
    },
    {
      title: 'Stored 5MB Chunks',
      value: totalChunks,
      sub: 'Content-Addressed Parts',
      icon: Layers,
      color: '#a78bfa'
    },
    {
      title: 'S3 Storage Backend',
      value: 'MinIO Local S3',
      sub: 'Bypassing Django Gateway',
      icon: ShieldCheck,
      color: '#fbbf24'
    }
  ];

  return (
    <div style={{ marginBottom: '24px' }}>
      {/* Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '20px'
      }}>
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div key={idx} className="glass-panel" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {m.title}
                </span>
                <div style={{
                  padding: '8px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: m.color
                }}>
                  <Icon size={18} />
                </div>
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                {m.value}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {m.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* Week 2 System Design Architecture Notice Banner */}
      <div className="glass-panel" style={{
        padding: '16px 20px',
        borderLeft: '4px solid var(--primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(90deg, rgba(0, 97, 255, 0.08) 0%, rgba(17, 24, 39, 0.5) 100%)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(0, 97, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#60a5fa'
          }}>
            <Zap size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff' }}>
              Week 2: S3 Direct Chunking & Verification Workflow Active
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Django metadata APIs + boto3 head_object chunk verifier are live. Uploads stream directly to S3.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
