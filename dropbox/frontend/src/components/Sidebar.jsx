import React from 'react';
import { 
  Folder, 
  Layers, 
  Cpu, 
  Terminal, 
  HardDrive, 
  CloudLightning,
  ShieldCheck 
} from 'lucide-react';

export default function Sidebar({ activeTab, onSelectTab, workspace }) {
  const quotaBytes = workspace?.storage_quota_bytes || 53687091200; // 50 GB
  const usedBytes = workspace?.used_storage_bytes || 0;
  const quotaGb = (quotaBytes / (1024 ** 3)).toFixed(1);
  const usedMb = (usedBytes / (1024 ** 2)).toFixed(1);
  const usedPercentage = Math.min(100, Math.max(0.5, ((usedBytes / quotaBytes) * 100).toFixed(2)));

  const navItems = [
    {
      id: 'files',
      label: 'File Explorer',
      icon: Folder,
      badge: 'Drive View'
    },
    {
      id: 'chunking',
      label: '50GB Chunking Lab',
      icon: Layers,
      badge: '5MB Slices'
    },
    {
      id: 'architecture',
      label: 'System Blueprint',
      icon: Cpu,
      badge: 'Design Deep-Dive'
    },
    {
      id: 'api_test',
      label: 'Presigned S3 Console',
      icon: Terminal,
      badge: 'boto3 Live'
    },
  ];

  return (
    <aside style={{
      width: '260px',
      background: 'rgba(15, 23, 42, 0.7)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '20px 14px',
      flexShrink: 0
    }}>
      {/* Top Nav Section */}
      <div>
        <div style={{
          padding: '0 12px 14px',
          fontSize: '0.72rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--text-muted)'
        }}>
          Storage Engine
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: isActive ? 'rgba(0, 97, 255, 0.16)' : 'transparent',
                  color: isActive ? '#60a5fa' : 'var(--text-secondary)',
                  border: isActive ? '1px solid rgba(0, 97, 255, 0.35)' : '1px solid transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon size={17} color={isActive ? '#38bdf8' : 'currentColor'} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span style={{
                    fontSize: '0.65rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: isActive ? 'rgba(0, 97, 255, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                    color: isActive ? '#bfdbfe' : 'var(--text-muted)'
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Storage Quota Meter */}
      <div className="glass-panel" style={{ padding: '16px', background: 'rgba(17, 24, 39, 0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <HardDrive size={14} color="#60a5fa" />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>Storage Quota</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            {usedPercentage}%
          </span>
        </div>

        {/* Progress Bar */}
        <div style={{
          width: '100%',
          height: '6px',
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '999px',
          overflow: 'hidden',
          marginBottom: '8px'
        }}>
          <div style={{
            width: `${usedPercentage}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #0061ff 0%, #00dfd8 100%)',
            borderRadius: '999px'
          }} />
        </div>

        <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
          <span>{usedMb} MB used</span>
          <span>{quotaGb} GB total</span>
        </div>

        <div style={{
          marginTop: '12px',
          paddingTop: '10px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.7rem',
          color: '#34d399'
        }}>
          <ShieldCheck size={13} />
          <span>S3 Presigned Direct I/O</span>
        </div>
      </div>
    </aside>
  );
}
