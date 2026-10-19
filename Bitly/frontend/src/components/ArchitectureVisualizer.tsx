import React, { useState } from 'react';
import { ServerIcon, CpuIcon, DatabaseIcon, ZapIcon, ShieldCheckIcon } from './Icons';

export const ArchitectureVisualizer: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(1);

  const steps = [
    {
      id: 1,
      title: 'Nginx Edge Gateway & Load Balancer',
      role: 'Ingress & Traffic Shaping',
      icon: <ServerIcon size={22} className="text-cyan" />,
      tag: 'Reverse Proxy',
      description:
        'Dual rate-limiting leaky buckets isolate write floods (100 QPS limit) from redirect reads (1,000 QPS limit). SSL termination and keepalive connection pooling to backend upstream clusters.',
      metrics: ['Dual Upstream Pools', 'Microsecond Connection Reuse', 'DDoS Mitigation'],
    },
    {
      id: 2,
      title: 'Node.js Microservice Cluster',
      role: 'Distributed Logic & Encoding',
      icon: <CpuIcon size={22} className="text-purple" />,
      tag: 'Stateless Workers',
      description:
        'Decoupled write and read workers. Write workers grab batches of 1,000 tokens from Redis and encode sequential counters using a 4-round Feistel permutation + Base62 bijective encoding. Zero collision lookups required.',
      metrics: ['Bijective Encoding', 'Feistel Obfuscation', 'Sub-millisecond 302 Redirect'],
    },
    {
      id: 3,
      title: 'Redis Cache & Distributed Counter',
      role: 'In-Memory Cache & Token Dispenser',
      icon: <ZapIcon size={22} className="text-amber" />,
      tag: 'Atomic In-Memory',
      description:
        'Holds the global counter with atomic INCRBY operations to dispense blocks of 1,000 IDs to workers. Also acts as an LRU read cache serving 80% of top redirect queries in under 1ms.',
      metrics: ['Atomic INCRBY', 'allkeys-lru Eviction', '80/20 Power Law Cache'],
    },
    {
      id: 4,
      title: 'PostgreSQL Relational Storage',
      role: 'System of Record & Click Streams',
      icon: <DatabaseIcon size={22} className="text-emerald" />,
      tag: 'ACID Persistence',
      description:
        'B-Tree indexed table on short_code allows sub-5ms lookups when cache misses occur. URL click analytics are recorded for audit and analytics dashboards.',
      metrics: ['B-Tree Indexing', 'Read Replicas Capable', 'Relational Integrity'],
    },
  ];

  return (
    <div className="tab-pane-container">
      <div className="section-header-row">
        <div>
          <h2 className="section-title">System Architecture Visualizer</h2>
          <p className="section-subtitle">
            Interactive breakdown of the high-availability Bitly URL Shortener design
          </p>
        </div>
      </div>

      {/* Interactive Step Flow Pipeline */}
      <div className="flow-pipeline-card glass-card">
        <div className="pipeline-steps">
          {steps.map((step) => (
            <button
              key={step.id}
              type="button"
              className={`pipeline-step-item ${activeStep === step.id ? 'active' : ''}`}
              onClick={() => setActiveStep(step.id)}
            >
              <div className="step-number-pill">Stage {step.id}</div>
              <div className="step-icon-wrap">{step.icon}</div>
              <div className="step-name">{step.title}</div>
              <div className="step-role">{step.role}</div>
            </button>
          ))}
        </div>

        {/* Selected Step Deep Dive Banner */}
        <div className="pipeline-detail-banner">
          <div className="detail-header">
            <div className="detail-title-group">
              <span className="badge-info">{steps[activeStep - 1].tag}</span>
              <h3>{steps[activeStep - 1].title}</h3>
            </div>
            <span className="detail-stage-badge">Stage {activeStep} of 4</span>
          </div>

          <p className="detail-desc">{steps[activeStep - 1].description}</p>

          <div className="detail-tags-list">
            {steps[activeStep - 1].metrics.map((m, idx) => (
              <span key={idx} className="metric-tag">
                <ShieldCheckIcon size={14} className="text-cyan" />
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Calculations & Design Scale Benchmarks */}
      <div className="architecture-grid" style={{ marginTop: '2rem' }}>
        <div className="arch-card">
          <div className="arch-card-header">
            <span className="arch-step">Scale Estimation</span>
            <h3>100M URLs Created / Day</h3>
          </div>
          <p>
            • <strong>Write QPS:</strong> ~1,160 writes/sec average (~2,300 writes/sec peak).<br />
            • <strong>Read QPS:</strong> 10:1 Read-to-Write ratio = ~11,600 reads/sec average (~23,000 peak).<br />
            • <strong>Storage (5 years):</strong> 100M × 365 × 5 = 182.5 Billion URLs × 500 bytes ≈ 91 TB storage.
          </p>
          <div className="arch-metrics">
            <span className="metric-tag">182B URLs in 5 Years</span>
            <span className="metric-tag">62^7 = 3.5 Trillion Capacity</span>
          </div>
        </div>

        <div className="arch-card">
          <div className="arch-card-header">
            <span className="arch-step">Cache Sizing</span>
            <h3>80/20 Pareto Distribution</h3>
          </div>
          <p>
            • Top 20% of URLs generate 80% of redirect traffic.<br />
            • Daily active redirects: 1 Billion clicks/day.<br />
            • 20% of daily URLs to cache: 20M URLs × 500 bytes = <strong>10 GB RAM</strong>.<br />
            Easily served by a modern Redis instance with sub-millisecond response time.
          </p>
          <div className="arch-metrics">
            <span className="metric-tag">10 GB Redis LRU</span>
            <span className="metric-tag">&gt; 99% Cache Hit Ratio</span>
          </div>
        </div>

        <div className="arch-card">
          <div className="arch-card-header">
            <span className="arch-step">High Availability</span>
            <h3>Zero Single Point of Failure</h3>
          </div>
          <p>
            • <strong>Nginx:</strong> Horizontal active-passive or DNS round-robin.<br />
            • <strong>Node.js:</strong> Fully stateless containers scaling horizontally on ECS/K8s.<br />
            • <strong>Redis:</strong> Redis Sentinel / Cluster with AOF persistence.<br />
            • <strong>Postgres:</strong> Primary-replica with automatic failover.
          </p>
          <div className="arch-metrics">
            <span className="metric-tag">Stateless App Tier</span>
            <span className="metric-tag">99.99% Target Uptime</span>
          </div>
        </div>
      </div>
    </div>
  );
};
