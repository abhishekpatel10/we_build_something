import React from 'react';
import { 
  Laptop, 
  Server, 
  Database, 
  Cloud, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  RefreshCw,
  Cpu
} from 'lucide-react';

export default function ArchitectureMap() {
  const steps = [
    {
      num: '01',
      title: 'Client Chunking (5 MB)',
      desc: 'The client slices large files (up to 50 GB) into 5 MB chunks via File.slice() and generates cryptographic SHA-256 fingerprints.',
      icon: Laptop,
      color: '#38bdf8'
    },
    {
      num: '02',
      title: 'Django Metadata & Presigned URLs',
      desc: 'Client sends only metadata to Django. Django generates AWS S3 / MinIO Presigned URLs via boto3 and registers chunk entries in PostgreSQL.',
      icon: Server,
      color: '#818cf8'
    },
    {
      num: '03',
      title: 'Direct S3 High-Speed Upload',
      desc: 'The client uploads chunks concurrently and directly into MinIO/S3 via HTTP PUT, completely bypassing Django server bandwidth.',
      icon: Cloud,
      color: '#34d399'
    },
    {
      num: '04',
      title: 'Trust-But-Verify & Finalize',
      desc: 'Django calls s3.head_object() to verify chunk existence before marking the chunk as VERIFIED and activating the file.',
      icon: ShieldCheck,
      color: '#f59e0b'
    },
  ];

  const roadmap = [
    { week: 'Week 1', title: 'Django Backend & MinIO S3 Setup', status: 'Completed', detail: 'Docker compose (PostgreSQL + MinIO), Django models (Workspace, File, FileChunk), boto3 presigned PUT/GET generator.' },
    { week: 'Week 2', title: 'Django Metadata & Chunk Verification APIs', status: 'Completed', detail: 'POST /api/files/init-upload/, PATCH chunks/<index>/complete/ (head_object verify), POST finalize/.' },
    { week: 'Week 3', title: 'React Web Dashboard (Google Drive Style)', status: 'Next', detail: 'Folder browsing, progress bar showing uploaded chunks, direct upload of 1GB-5GB files into MinIO.' },
    { week: 'Week 4', title: 'Delta Sync & File Downloads', status: 'Upcoming', detail: 'GET /api/files/<id>/download/, presigned GET URLs, client-side Blob reassembly.' },
    { week: 'Week 5', title: 'Desktop Sync Daemon', status: 'Upcoming', detail: 'Python watchdog daemon with local SQLite DB to auto-sync ~/DropboxFolder changes.' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Visual Flow Pipeline */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <div style={{ marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Cpu size={22} color="#0061ff" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
              High-Level System Design & Presigned Architecture
            </h2>
          </div>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Dropbox avoids server bottlenecks by isolating metadata operations from high-volume raw chunk streaming.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
          position: 'relative'
        }}>
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '20px 16px',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: s.color
                  }}>
                    <Icon size={18} />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                    {s.num}
                  </span>
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>
                  {s.title}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {s.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5-Week Implementation Roadmap */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '18px' }}>
          5-Week Implementation Roadmap
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {roadmap.map((r, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderRadius: '10px',
                background: r.status === 'Completed' ? 'rgba(16, 185, 129, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                border: r.status === 'Completed' ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid var(--border-subtle)',
                gap: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: r.status === 'Completed' ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap'
                }}>
                  {r.week}
                </span>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>
                    {r.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {r.detail}
                  </div>
                </div>
              </div>

              <span className={`status-badge ${r.status === 'Completed' ? 'active' : 'pending'}`}>
                {r.status === 'Completed' ? 'Week 1 Live' : r.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
