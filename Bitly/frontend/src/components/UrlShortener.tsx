import React, { useState } from 'react';
import type { ShortenResponse } from '../types';
import { apiService } from '../services/api';
import {
  GlobeIcon,
  ScissorsIcon,
  ChevronDownIcon,
  CopyIcon,
  CheckIcon,
  ExternalLinkIcon,
  BarChart3Icon,
  QrCodeIcon,
  SparklesIcon,
} from './Icons';

interface UrlShortenerProps {
  onSuccess: (result: ShortenResponse) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenStats: (shortCode: string) => void;
  onOpenQr: (url: string, shortCode: string) => void;
}

export const UrlShortener: React.FC<UrlShortenerProps> = ({
  onSuccess,
  onShowToast,
  onOpenStats,
  onOpenQr,
}) => {
  const [originalUrl, setOriginalUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [expirationChoice, setExpirationChoice] = useState('never');
  const [customExpiry, setCustomExpiry] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<ShortenResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setOriginalUrl(text);
        onShowToast('Pasted from clipboard!', 'info');
      }
    } catch {
      onShowToast('Clipboard access was denied by browser', 'error');
    }
  };

  const getExpirationTimestamp = (): number | undefined => {
    const now = Date.now();
    switch (expirationChoice) {
      case '1h':
        return Math.floor((now + 3600 * 1000) / 1000);
      case '24h':
        return Math.floor((now + 86400 * 1000) / 1000);
      case '7d':
        return Math.floor((now + 7 * 86400 * 1000) / 1000);
      case '30d':
        return Math.floor((now + 30 * 86400 * 1000) / 1000);
      case 'custom':
        if (customExpiry) {
          return Math.floor(new Date(customExpiry).getTime() / 1000);
        }
        return undefined;
      default:
        return undefined;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = originalUrl.trim();
    if (!trimmedUrl) return;

    setSubmitting(true);
    try {
      const expirationTime = getExpirationTimestamp();
      const payload = {
        originalUrl: trimmedUrl,
        alias: customAlias.trim() || undefined,
        expirationTime,
      };

      const result = await apiService.createShortUrl(payload);
      setLastResult(result);
      onSuccess(result);
      onShowToast('Short link generated successfully!', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Error generating short URL', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onShowToast('Copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onShowToast('Failed to copy', 'error');
    }
  };

  return (
    <section className="hero-section">
      <div className="badge-container">
        <span className="glow-pill">
          <SparklesIcon size={14} className="text-cyan" />
          <span>Bijective Base62 & Distributed Batch Engine</span>
        </span>
      </div>

      <h1 className="hero-title">
        High-Throughput URL Shortener <br />
        <span className="gradient-text">Engineered for 100M Daily Links</span>
      </h1>

      <p className="hero-subtitle">
        Zero-collision sequential counter, reversible Feistel cipher obfuscation, 
        atomic Redis batch reservation, and sub-millisecond 302 redirects.
      </p>

      {/* Main Glassmorphic Form Card */}
      <div className="glass-card shortener-card">
        <form onSubmit={handleSubmit} className="shorten-form">
          <div className="input-group">
            <div className="input-icon">
              <GlobeIcon size={20} />
            </div>

            <input
              type="url"
              className="url-input"
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
              placeholder="Paste any long URL (e.g. https://systemdesign.example.com/deep-dive-scale)"
              required
              autoFocus
            />

            <button
              type="button"
              className="secondary-btn paste-btn"
              onClick={handlePaste}
              title="Paste from clipboard"
            >
              Paste
            </button>

            <button
              type="submit"
              className="primary-btn submit-btn"
              disabled={submitting || !originalUrl.trim()}
            >
              <ScissorsIcon size={18} />
              <span>{submitting ? 'Generating...' : 'Shorten URL'}</span>
            </button>
          </div>

          {/* Advanced Options Accordion Header */}
          <div className="advanced-toggle-bar">
            <button
              type="button"
              className={`toggle-link ${showAdvanced ? 'active' : ''}`}
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <ChevronDownIcon size={16} className={`chevron ${showAdvanced ? 'rotate' : ''}`} />
              <span>Custom Alias & Expiration Settings</span>
            </button>
          </div>

          {/* Advanced Options Panel */}
          {showAdvanced && (
            <div className="advanced-options-panel">
              <div className="options-grid">
                <div className="option-field">
                  <label htmlFor="custom-alias">Custom Short Alias (Optional)</label>
                  <div className="alias-input-wrapper">
                    <span className="alias-domain">bit.ly/</span>
                    <input
                      id="custom-alias"
                      type="text"
                      className="alias-input"
                      value={customAlias}
                      onChange={(e) => setCustomAlias(e.target.value)}
                      placeholder="e.g. launch2026, tech-conf"
                      pattern="^[a-zA-Z0-9_-]{3,32}$"
                    />
                  </div>
                  <span className="field-hint">3 to 32 characters (letters, numbers, hyphens)</span>
                </div>

                <div className="option-field">
                  <label htmlFor="expiration-select">Link Expiration</label>
                  <select
                    id="expiration-select"
                    className="select-input"
                    value={expirationChoice}
                    onChange={(e) => setExpirationChoice(e.target.value)}
                  >
                    <option value="never">Never expires (Permanent)</option>
                    <option value="1h">1 Hour</option>
                    <option value="24h">24 Hours (1 Day)</option>
                    <option value="7d">7 Days (1 Week)</option>
                    <option value="30d">30 Days (1 Month)</option>
                    <option value="custom">Custom Date & Time...</option>
                  </select>

                  {expirationChoice === 'custom' && (
                    <input
                      type="datetime-local"
                      className="datetime-input"
                      value={customExpiry}
                      onChange={(e) => setCustomExpiry(e.target.value)}
                    />
                  )}
                  <span className="field-hint">Expired links return HTTP 410 Gone</span>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Dynamic Result Showcase Card */}
        {lastResult && (
          <div className="result-box">
            <div className="result-header">
              <div className="result-badges">
                <span className="badge-success">Short URL Ready!</span>
                {lastResult.isCustom && <span className="badge-info">Custom Alias</span>}
                {lastResult.expiresAt && (
                  <span className="badge-warning" title={new Date(lastResult.expiresAt).toLocaleString()}>
                    Expiring
                  </span>
                )}
              </div>
              <span className="result-created-at">
                {new Date(lastResult.createdAt).toLocaleTimeString()}
              </span>
            </div>

            <div className="result-row">
              <div className="result-url-display">
                <span className="url-label">Short Link:</span>
                <a
                  href={lastResult.shortUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="short-link-anchor mono"
                >
                  {lastResult.shortUrl}
                </a>
              </div>

              <div className="result-actions">
                <button
                  type="button"
                  className={`action-btn ${copied ? 'btn-copied' : ''}`}
                  onClick={() => handleCopy(lastResult.shortUrl)}
                >
                  {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>

                <a
                  href={lastResult.shortUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-btn primary-action"
                >
                  <ExternalLinkIcon size={16} />
                  <span>Test 302</span>
                </a>

                <button
                  type="button"
                  className="action-btn"
                  onClick={() => onOpenQr(lastResult.shortUrl, lastResult.shortCode)}
                  title="Generate QR Code"
                >
                  <QrCodeIcon size={16} />
                  <span>QR Code</span>
                </button>

                <button
                  type="button"
                  className="action-btn"
                  onClick={() => onOpenStats(lastResult.shortCode)}
                >
                  <BarChart3Icon size={16} />
                  <span>Stats</span>
                </button>
              </div>
            </div>

            <div className="result-details">
              <span className="target-title">Destination:</span>
              <span className="target-url" title={lastResult.originalUrl}>
                {lastResult.originalUrl}
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
