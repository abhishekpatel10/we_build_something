import React, { useState } from 'react';
import { 
  FileText, 
  Film, 
  Image, 
  Archive, 
  FileCode, 
  Download, 
  Layers, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  ChevronRight,
  FolderOpen
} from 'lucide-react';
import { generatePresignedGet } from '../services/api';

export default function FileList({ files = [], onInspectChunks }) {
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadUrlMap, setDownloadUrlMap] = useState({});

  const formatBytes = (bytes) => {
    if (!bytes && bytes !== 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType = '', fileName = '') => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (mimeType.startsWith('video') || ['mp4', 'mov', 'mkv', 'avi'].includes(ext)) {
      return <Film size={18} color="#f43f5e" />;
    }
    if (mimeType.startsWith('image') || ['png', 'jpg', 'jpeg', 'svg', 'webp'].includes(ext)) {
      return <Image size={18} color="#06b6d4" />;
    }
    if (['zip', 'tar', 'gz', '7z', 'rar'].includes(ext)) {
      return <Archive size={18} color="#eab308" />;
    }
    if (['js', 'py', 'json', 'html', 'css', 'ts'].includes(ext)) {
      return <FileCode size={18} color="#a855f7" />;
    }
    return <FileText size={18} color="#3b82f6" />;
  };

  const handleDownload = async (file) => {
    setDownloadingId(file.id);
    try {
      // If file has chunks, generate presigned GET for chunk 0 or file key
      const firstChunk = file.chunks?.[0];
      const s3Key = firstChunk?.s3_key || `workspaces/${file.workspace}/files/${file.id}/file.bin`;
      const res = await generatePresignedGet({
        s3_key: s3Key,
        download_filename: file.file_name,
        expires_in: 3600
      });
      if (res?.presigned_get_url) {
        setDownloadUrlMap(prev => ({ ...prev, [file.id]: res.presigned_get_url }));
        window.open(res.presigned_get_url, '_blank');
      }
    } catch (err) {
      alert(`Could not generate presigned GET URL: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      {/* Title & Breadcrumbs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        paddingBottom: '14px',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FolderOpen size={20} color="#60a5fa" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>
            Root Storage / Files
          </h2>
          <span style={{
            fontSize: '0.72rem',
            padding: '2px 8px',
            borderRadius: '999px',
            background: 'rgba(255, 255, 255, 0.08)',
            color: 'var(--text-secondary)'
          }}>
            {files.length} items
          </span>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          MinIO Bucket: <strong style={{ color: '#fff' }}>dropbox-files</strong>
        </div>
      </div>

      {/* Files Table */}
      {files.length === 0 ? (
        <div style={{
          padding: '60px 20px',
          textAlign: 'center',
          color: 'var(--text-secondary)'
        }}>
          <FileText size={48} color="var(--border-hover)" style={{ margin: '0 auto 14px' }} />
          <h3 style={{ color: '#fff', fontSize: '1rem', marginBottom: '6px' }}>No files registered yet</h3>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 16px' }}>
            Run the management command <code style={{ color: '#38bdf8' }}>python manage.py demo_presigned_urls</code> or use the 50GB Chunking Lab tab to simulate slicing and presigned uploads!
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '12px 14px', fontWeight: 500 }}>Name</th>
                <th style={{ padding: '12px 14px', fontWeight: 500 }}>Folder</th>
                <th style={{ padding: '12px 14px', fontWeight: 500 }}>Size</th>
                <th style={{ padding: '12px 14px', fontWeight: 500 }}>Chunks (5MB)</th>
                <th style={{ padding: '12px 14px', fontWeight: 500 }}>Status</th>
                <th style={{ padding: '12px 14px', fontWeight: 500, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => {
                const statusClass = file.status.toLowerCase();
                return (
                  <tr
                    key={file.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Name & Icon */}
                    <td style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          padding: '8px',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          display: 'flex',
                          alignItems: 'center'
                        }}>
                          {getFileIcon(file.mime_type, file.file_name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#fff' }}>{file.file_name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            v{file.version} • {file.mime_type}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Folder Path */}
                    <td style={{ padding: '14px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                      {file.folder_path || '/'}
                    </td>

                    {/* Size */}
                    <td style={{ padding: '14px', fontWeight: 500, color: '#fff' }}>
                      {formatBytes(file.size_bytes)}
                    </td>

                    {/* Chunks */}
                    <td style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Layers size={14} color="#60a5fa" />
                        <span style={{ fontWeight: 600, color: '#fff' }}>{file.total_chunks}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>chunks</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '14px' }}>
                      <span className={`status-badge ${statusClass}`}>
                        {file.status === 'ACTIVE' && <CheckCircle2 size={11} />}
                        {file.status === 'PENDING' && <Clock size={11} />}
                        {file.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => onInspectChunks(file)}
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                          title="Inspect Chunks Breakdown"
                        >
                          <Layers size={13} />
                          <span>Chunks</span>
                        </button>

                        <button
                          onClick={() => handleDownload(file)}
                          className="btn-primary"
                          disabled={downloadingId === file.id}
                          style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                          title="Generate Presigned GET & Download"
                        >
                          <Download size={13} />
                          <span>{downloadingId === file.id ? 'Signing...' : 'Presigned GET'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
