import React from 'react';
import type { HealthStatus, CounterStatus } from '../types';
import { LinkIcon, RefreshCwIcon, DatabaseIcon, ZapIcon, ActivityIcon } from './Icons';

interface HeaderProps {
  health: HealthStatus | null;
  counter: CounterStatus | null;
  loadingTelemetry: boolean;
  onRefreshTelemetry: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  counter,
  loadingTelemetry,
  onRefreshTelemetry,
  activeTab,
  setActiveTab,
}) => {
  const redisHealthy = health?.redis?.status === 'ready' || health?.redis?.status === 'ok';
  const dbHealthy = health?.postgres?.status === 'connected' || health?.postgres?.status === 'ok';

  return (
    <header className="navbar">
      <div className="nav-container">
        {/* Brand identity */}
        <div className="brand" onClick={() => setActiveTab('shortener')} style={{ cursor: 'pointer' }}>
          <div className="brand-logo">
            <LinkIcon size={22} />
          </div>
          <div className="brand-text">
            <span className="brand-name">
              Bitly<span className="brand-accent">Engine</span>
            </span>
            <span className="brand-badge">Distributed v1</span>
          </div>
        </div>

        {/* Live System Telemetry Strip */}
        <div className="telemetry-bar">
          <div className={`telemetry-pill ${redisHealthy ? 'pill-healthy' : 'pill-offline'}`}>
            <span className="pill-dot"></span>
            <ActivityIcon size={14} className="pill-icon-svg" />
            <span className="pill-label">Redis Cache:</span>
            <span className="pill-val">
              {health?.redis?.mode ? health.redis.mode.toUpperCase() : 'CONNECTING...'}
            </span>
          </div>

          <div className={`telemetry-pill ${dbHealthy ? 'pill-healthy' : 'pill-offline'}`}>
            <span className="pill-dot"></span>
            <DatabaseIcon size={14} className="pill-icon-svg" />
            <span className="pill-label">PostgreSQL:</span>
            <span className="pill-val">
              {health?.postgres?.mode ? health.postgres.mode.toUpperCase() : 'CONNECTING...'}
            </span>
          </div>

          <div className="telemetry-pill accent-pill">
            <ZapIcon size={14} className="pill-icon-svg text-amber" />
            <span className="pill-label">Batch Range:</span>
            <span className="pill-val mono">
              {counter ? `[${counter.currentCounter}..${counter.maxCounter}]` : '...'}
            </span>
          </div>

          <button
            type="button"
            className="telemetry-refresh-btn"
            onClick={onRefreshTelemetry}
            title="Refresh cluster telemetry"
            disabled={loadingTelemetry}
          >
            <RefreshCwIcon size={14} className={loadingTelemetry ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Subnav Bar */}
      <nav className="subnav-bar">
        <div className="subnav-container">
          <button
            type="button"
            className={`subnav-item ${activeTab === 'shortener' ? 'active' : ''}`}
            onClick={() => setActiveTab('shortener')}
          >
            Shorten & QR
          </button>
          <button
            type="button"
            className={`subnav-item ${activeTab === 'counter' ? 'active' : ''}`}
            onClick={() => setActiveTab('counter')}
          >
            Distributed Counter
          </button>
          <button
            type="button"
            className={`subnav-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Recent Links & Analytics
          </button>
          <button
            type="button"
            className={`subnav-item ${activeTab === 'architecture' ? 'active' : ''}`}
            onClick={() => setActiveTab('architecture')}
          >
            System Architecture
          </button>
          <button
            type="button"
            className={`subnav-item ${activeTab === 'playground' ? 'active' : ''}`}
            onClick={() => setActiveTab('playground')}
          >
            API Playground
          </button>
        </div>
      </nav>
    </header>
  );
};
