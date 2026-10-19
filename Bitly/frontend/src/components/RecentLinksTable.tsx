import React, { useState } from 'react';
import type { UrlItem } from '../types';
import {
  ExternalLinkIcon,
  CopyIcon,
  CheckIcon,
  BarChart3Icon,
  QrCodeIcon,
  RefreshCwIcon,
  LinkIcon,
} from './Icons';

interface RecentLinksTableProps {
  urls: UrlItem[];
  loading: boolean;
  onRefresh: () => void;
  onOpenStats: (shortCode: string) => void;
  onOpenQr: (url: string, shortCode: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const RecentLinksTable: React.FC<RecentLinksTableProps> = ({
  urls,
  loading,
  onRefresh,
  onOpenStats,
  onOpenQr,
  onShowToast,
}) => {
  const [filter, setFilter] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const filteredUrls = urls.filter((item) => {
    if (!filter) return true;
    const query = filter.toLowerCase();
    return (
      item.short_code.toLowerCase().includes(query) ||
      item.original_url.toLowerCase().includes(query)
    );
  });

  const handleCopy = async (shortCode: string) => {
    const fullUrl = `${window.location.origin}/${shortCode}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedCode(shortCode);
      onShowToast(`Copied /${shortCode} to clipboard!`, 'success');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      onShowToast('Failed to copy', 'error');
    }
  };

  return (
    <div className="tab-pane-container">
      <div className="section-header-row">
        <div>
          <h2 className="section-title">Recent Links & Click Analytics</h2>
          <p className="section-subtitle">
            Overview of recently minted short codes, click counts, and expiration lifecycles
          </p>
        </div>

        <div className="table-controls">
          <input
            type="text"
            className="search-input"
            placeholder="Search by code or URL..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <button
            type="button"
            className="action-btn"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCwIcon size={16} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="glass-card table-card">
        {loading && urls.length === 0 ? (
          <div className="table-empty-state">
            <RefreshCwIcon size={32} className="spin text-cyan" />
            <p>Loading recent links from cluster...</p>
          </div>
        ) : filteredUrls.length === 0 ? (
          <div className="table-empty-state">
            <LinkIcon size={36} className="text-muted" />
            <p>
              {filter
                ? `No shortened links matching "${filter}"`
                : 'No links shortened yet. Create your first link in the Shorten tab!'}
            </p>
          </div>
        ) : (
          <div className="responsive-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Short Code</th>
                  <th>Destination Target URL</th>
                  <th>Clicks</th>
                  <th>Created Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUrls.map((item) => {
                  const fullUrl = `${window.location.origin}/${item.short_code}`;
                  const isExpired = item.expires_at && new Date(item.expires_at) < new Date();
                  const isCopied = copiedCode === item.short_code;

                  return (
                    <tr key={item.short_code}>
                      <td>
                        <div className="short-code-cell">
                          <a
                            href={fullUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="short-code-link mono"
                          >
                            /{item.short_code}
                          </a>
                          {item.is_custom && <span className="badge-info badge-mini">Custom</span>}
                        </div>
                      </td>

                      <td>
                        <div className="dest-url-cell" title={item.original_url}>
                          {item.original_url}
                        </div>
                      </td>

                      <td>
                        <span className="click-counter-badge mono">
                          {item.click_count.toLocaleString()}
                        </span>
                      </td>

                      <td className="date-cell">
                        {new Date(item.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      <td>
                        {isExpired ? (
                          <span className="badge-warning">Expired</span>
                        ) : (
                          <span className="badge-success">Active</span>
                        )}
                      </td>

                      <td>
                        <div className="table-actions-cell">
                          <button
                            type="button"
                            className={`mini-action-btn ${isCopied ? 'copied' : ''}`}
                            onClick={() => handleCopy(item.short_code)}
                            title="Copy short link"
                          >
                            {isCopied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                          </button>

                          <a
                            href={fullUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mini-action-btn"
                            title="Test 302 Redirection"
                          >
                            <ExternalLinkIcon size={14} />
                          </a>

                          <button
                            type="button"
                            className="mini-action-btn"
                            onClick={() => onOpenQr(fullUrl, item.short_code)}
                            title="View QR Code"
                          >
                            <QrCodeIcon size={14} />
                          </button>

                          <button
                            type="button"
                            className="mini-action-btn btn-inspect"
                            onClick={() => onOpenStats(item.short_code)}
                            title="Inspect detailed click telemetry"
                          >
                            <BarChart3Icon size={14} />
                            <span>Inspect</span>
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
    </div>
  );
};
