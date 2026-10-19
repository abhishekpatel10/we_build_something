import React, { useEffect, useState } from 'react';
import type { UrlStats } from '../types';
import { apiService } from '../services/api';
import { XIcon, ExternalLinkIcon, BarChart3Icon, RefreshCwIcon } from './Icons';

interface StatsModalProps {
  shortCode: string | null;
  onClose: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({ shortCode, onClose, onShowToast }) => {
  const [stats, setStats] = useState<UrlStats | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    if (!shortCode) return;
    setLoading(true);
    try {
      const data = await apiService.getUrlStats(shortCode);
      setStats(data);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to load stats', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shortCode) {
      fetchStats();
    }
  }, [shortCode]);

  if (!shortCode) return null;

  const referrers = stats?.referrerBreakdown ? Object.entries(stats.referrerBreakdown) : [];
  const maxReferrerCount = referrers.length > 0 ? Math.max(...referrers.map(([, count]) => count), 1) : 1;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container stats-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="badge-icon-wrap">
              <BarChart3Icon size={20} />
            </div>
            <div>
              <h3 className="modal-title">Analytics: /{shortCode}</h3>
              <p className="modal-subtitle">Real-time click telemetry and traffic source breakdown</p>
            </div>
          </div>
          <div className="modal-header-actions">
            <button
              type="button"
              className="action-icon-btn"
              onClick={fetchStats}
              disabled={loading}
              title="Refresh statistics"
            >
              <RefreshCwIcon size={16} className={loading ? 'spin' : ''} />
            </button>
            <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
              <XIcon size={20} />
            </button>
          </div>
        </div>

        {loading && !stats ? (
          <div className="modal-loading-state">
            <RefreshCwIcon size={28} className="spin" />
            <p>Gathering click telemetry from cluster...</p>
          </div>
        ) : stats ? (
          <div className="stats-modal-body">
            {/* Top Stat Overview Cards */}
            <div className="stats-metric-cards">
              <div className="metric-card">
                <span className="metric-label">Total Clicks</span>
                <span className="metric-value text-cyan">{stats.clickCount.toLocaleString()}</span>
                <span className="metric-meta">Processed redirects</span>
              </div>

              <div className="metric-card">
                <span className="metric-label">Link Type</span>
                <span className="metric-value text-purple">
                  {stats.isCustom ? 'Custom Alias' : 'Sequential Base62'}
                </span>
                <span className="metric-meta">Zero collision guarantee</span>
              </div>

              <div className="metric-card">
                <span className="metric-label">Created At</span>
                <span className="metric-value-sm">
                  {new Date(stats.createdAt).toLocaleString()}
                </span>
                <span className="metric-meta">
                  {stats.expiresAt ? `Expires: ${new Date(stats.expiresAt).toLocaleDateString()}` : 'Never expires'}
                </span>
              </div>
            </div>

            {/* Target URL Info Banner */}
            <div className="stats-target-box">
              <span className="target-badge">Destination URL:</span>
              <a
                href={stats.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="target-link mono"
                title={stats.originalUrl}
              >
                {stats.originalUrl}
                <ExternalLinkIcon size={14} />
              </a>
            </div>

            {/* Referrer Breakdown & Recent Clicks Grid */}
            <div className="stats-grid">
              {/* Traffic Referrers */}
              <div className="stats-panel">
                <div className="panel-header">
                  <h4>Top Referrers</h4>
                  <span className="panel-badge">{referrers.length} sources</span>
                </div>
                {referrers.length === 0 ? (
                  <div className="empty-hint">No referrers logged yet. Direct visits only.</div>
                ) : (
                  <div className="referrer-list">
                    {referrers.map(([ref, count]) => {
                      const pct = Math.round((count / maxReferrerCount) * 100);
                      return (
                        <div key={ref} className="referrer-item">
                          <div className="referrer-info">
                            <span className="referrer-name">{ref || 'Direct / Internal'}</span>
                            <span className="referrer-count mono">{count} clicks</span>
                          </div>
                          <div className="referrer-bar-track">
                            <div className="referrer-bar-fill" style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recent Click Stream */}
              <div className="stats-panel">
                <div className="panel-header">
                  <h4>Recent Click Stream</h4>
                  <span className="panel-badge">{stats.recentClicks?.length || 0} latest</span>
                </div>
                {(!stats.recentClicks || stats.recentClicks.length === 0) ? (
                  <div className="empty-hint">No clicks recorded yet. Share your short link to view activity!</div>
                ) : (
                  <div className="clicks-table-wrap">
                    <table className="mini-table">
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Referrer</th>
                          <th>Device / Client</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentClicks.map((click, idx) => (
                          <tr key={idx}>
                            <td className="mono">{new Date(click.clicked_at).toLocaleTimeString()}</td>
                            <td>{click.referrer || 'Direct'}</td>
                            <td className="truncate-cell" title={click.user_agent || 'Unknown'}>
                              {click.user_agent ? click.user_agent.substring(0, 24) + '...' : 'Unknown'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
