import React from 'react';
import { XIcon, DownloadIcon, ExternalLinkIcon, CopyIcon } from './Icons';

interface QrModalProps {
  url: string | null;
  shortCode: string | null;
  onClose: () => void;
  onCopy: (text: string) => void;
}

export const QrModal: React.FC<QrModalProps> = ({ url, shortCode, onClose, onCopy }) => {
  if (!url || !shortCode) return null;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(
    url
  )}&margin=10&color=0e1526&bgcolor=ffffff`;

  const handleDownload = async () => {
    try {
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `bitly-qr-${shortCode}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(qrImageUrl, '_blank');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container qr-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">QR Code: /{shortCode}</h3>
            <p className="modal-subtitle">Scan with mobile camera to test 302 instant redirection</p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <XIcon size={20} />
          </button>
        </div>

        <div className="qr-body">
          <div className="qr-wrapper">
            <img
              src={qrImageUrl}
              alt={`QR Code for ${url}`}
              className="qr-image"
              width={260}
              height={260}
              loading="lazy"
            />
          </div>

          <div className="qr-url-pill">
            <span className="mono">{url}</span>
          </div>

          <div className="qr-actions">
            <button
              type="button"
              className="action-btn"
              onClick={() => onCopy(url)}
            >
              <CopyIcon size={16} />
              <span>Copy Link</span>
            </button>

            <button
              type="button"
              className="action-btn"
              onClick={handleDownload}
            >
              <DownloadIcon size={16} />
              <span>Download PNG</span>
            </button>

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="action-btn primary-action"
            >
              <ExternalLinkIcon size={16} />
              <span>Open Link</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
