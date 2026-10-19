import React, { useState } from 'react';
import { ZapIcon, CheckIcon, CopyIcon } from './Icons';

interface Endpoint {
  method: 'GET' | 'POST';
  path: string;
  description: string;
  defaultBody?: string;
  params?: string;
}

export const ApiPlayground: React.FC = () => {
  const endpoints: Endpoint[] = [
    {
      method: 'POST',
      path: '/api/v1/urls',
      description: 'Create a shortened URL with optional custom alias and expiration timestamp',
      defaultBody: JSON.stringify(
        {
          originalUrl: 'https://github.com/systemdesign/bitly-high-throughput',
          alias: '',
          expirationTime: Math.floor(Date.now() / 1000) + 86400,
        },
        null,
        2
      ),
    },
    {
      method: 'GET',
      path: '/api/v1/urls/recent?limit=5',
      description: 'Fetch the most recently created short links in the system',
    },
    {
      method: 'GET',
      path: '/api/v1/counter/status',
      description: 'Inspect distributed counter batch reservation, worker instance ID, and token bounds',
    },
    {
      method: 'GET',
      path: '/api/v1/health',
      description: 'Check connectivity and operational mode of PostgreSQL and Redis cluster nodes',
    },
    {
      method: 'GET',
      path: '/api/v1/urls/{shortCode}/stats',
      description: 'Get analytical telemetry and referrer click stream for a given short code',
      params: 'test',
    },
  ];

  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint>(endpoints[0]);
  const [requestBody, setRequestBody] = useState(endpoints[0].defaultBody || '');
  const [paramValue, setParamValue] = useState('demo');
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [responsePayload, setResponsePayload] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const handleSelect = (ep: Endpoint) => {
    setSelectedEndpoint(ep);
    setRequestBody(ep.defaultBody || '');
    setResponseStatus(null);
    setResponseTime(null);
    setResponsePayload('');
  };

  const getResolvedPath = () => {
    if (selectedEndpoint.path.includes('{shortCode}')) {
      return selectedEndpoint.path.replace('{shortCode}', encodeURIComponent(paramValue || 'demo'));
    }
    return selectedEndpoint.path;
  };

  const generateCurl = () => {
    const fullUrl = `${window.location.origin}${getResolvedPath()}`;
    if (selectedEndpoint.method === 'POST') {
      return `curl -X POST "${fullUrl}" \\\n  -H "Content-Type: application/json" \\\n  -d '${requestBody.replace(/\n/g, '')}'`;
    }
    return `curl -X GET "${fullUrl}"`;
  };

  const handleExecute = async () => {
    setLoading(true);
    setResponseStatus(null);
    setResponseTime(null);
    setResponsePayload('');

    const start = performance.now();
    try {
      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers: { 'Content-Type': 'application/json' },
      };

      if (selectedEndpoint.method === 'POST' && requestBody) {
        options.body = requestBody;
      }

      const res = await fetch(getResolvedPath(), options);
      const end = performance.now();
      setResponseTime(Math.round(end - start));
      setResponseStatus(res.status);

      const json = await res.json();
      setResponsePayload(JSON.stringify(json, null, 2));
    } catch (err: any) {
      const end = performance.now();
      setResponseTime(Math.round(end - start));
      setResponseStatus(500);
      setResponsePayload(JSON.stringify({ error: err.message || 'Network error' }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const copyCurl = async () => {
    try {
      await navigator.clipboard.writeText(generateCurl());
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="tab-pane-container">
      <div className="section-header-row">
        <div>
          <h2 className="section-title">REST API Playground & Test Harness</h2>
          <p className="section-subtitle">
            Directly test backend API endpoints and generate production cURL snippets
          </p>
        </div>
      </div>

      <div className="playground-layout">
        {/* Endpoints Sidebar */}
        <div className="glass-card endpoints-sidebar">
          <h3 className="sidebar-heading">Service Endpoints</h3>
          <div className="endpoint-list">
            {endpoints.map((ep, idx) => {
              const isSelected = selectedEndpoint.path === ep.path;
              return (
                <button
                  key={idx}
                  type="button"
                  className={`endpoint-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => handleSelect(ep)}
                >
                  <span className={`method-badge method-${ep.method.toLowerCase()}`}>{ep.method}</span>
                  <span className="endpoint-path mono">{ep.path}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Request / Response Panel */}
        <div className="glass-card playground-main">
          <div className="playground-header">
            <div className="endpoint-title-row">
              <span className={`method-badge method-${selectedEndpoint.method.toLowerCase()}`}>
                {selectedEndpoint.method}
              </span>
              <span className="mono endpoint-full-path">{getResolvedPath()}</span>
            </div>
            <p className="endpoint-desc">{selectedEndpoint.description}</p>
          </div>

          {/* If endpoint has path parameter */}
          {selectedEndpoint.path.includes('{shortCode}') && (
            <div className="param-field">
              <label>shortCode Parameter:</label>
              <input
                type="text"
                className="param-input mono"
                value={paramValue}
                onChange={(e) => setParamValue(e.target.value)}
                placeholder="Enter short code"
              />
            </div>
          )}

          {/* Request Body (for POST) */}
          {selectedEndpoint.method === 'POST' && (
            <div className="request-body-wrap">
              <label className="code-label">Request Payload (JSON):</label>
              <textarea
                className="code-textarea mono"
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                rows={6}
              />
            </div>
          )}

          {/* Execute & cURL Bar */}
          <div className="playground-actions-bar">
            <button
              type="button"
              className="primary-btn execute-btn"
              onClick={handleExecute}
              disabled={loading}
            >
              <ZapIcon size={16} />
              <span>{loading ? 'Sending Request...' : 'Send Request'}</span>
            </button>

            <button
              type="button"
              className="action-btn copy-curl-btn"
              onClick={copyCurl}
            >
              {copiedCurl ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
              <span>{copiedCurl ? 'Copied cURL!' : 'Copy cURL'}</span>
            </button>
          </div>

          {/* Response Inspector */}
          <div className="response-inspector">
            <div className="response-header">
              <span className="code-label">Response:</span>
              {responseStatus !== null && (
                <div className="status-tags">
                  <span
                    className={`status-pill ${
                      responseStatus >= 200 && responseStatus < 300
                        ? 'status-2xx'
                        : 'status-err'
                    }`}
                  >
                    HTTP {responseStatus}
                  </span>
                  {responseTime !== null && (
                    <span className="latency-pill mono">{responseTime} ms</span>
                  )}
                </div>
              )}
            </div>

            <pre className="response-code-block mono">
              {loading ? (
                <span className="text-muted">Awaiting response from API cluster...</span>
              ) : responsePayload ? (
                responsePayload
              ) : (
                <span className="text-muted">Click "Send Request" to test this endpoint.</span>
              )}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
