import React, { useState } from 'react';
import { X, Layers, Database, ShieldCheck, Zap, Server, Activity, ArrowRight, CheckCircle2 } from 'lucide-react';

interface SystemDesignModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemDesignModal: React.FC<SystemDesignModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'two_phase' | 'surge' | 'search'>('architecture');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#0b0f19] rounded-3xl border border-indigo-500/30 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-6 border-b border-tm-border flex items-center justify-between bg-gradient-to-r from-[#0d1424] to-[#121c33]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
              <Layers className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">System Design Architecture Breakdown</h2>
              <p className="text-xs text-gray-400">Phase 1: Ticket Booking Service Foundation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-tm-border bg-[#090d16] px-6 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`py-3.5 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'architecture' ? 'border-sky-400 text-sky-400' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            High-Level Design (HLD)
          </button>
          <button
            onClick={() => setActiveTab('two_phase')}
            className={`py-3.5 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'two_phase' ? 'border-sky-400 text-sky-400' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Two-Phase Booking Pattern
          </button>
          <button
            onClick={() => setActiveTab('surge')}
            className={`py-3.5 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'surge' ? 'border-sky-400 text-sky-400' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Surge Traffic & Virtual Queue
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`py-3.5 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'search' ? 'border-sky-400 text-sky-400' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Elasticsearch & Geospatial
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-gray-300">
          {activeTab === 'architecture' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-tm-card border border-tm-border">
                  <div className="text-xs uppercase font-bold text-sky-400 mb-1">Consistency (CAP)</div>
                  <div className="text-base font-bold text-white">Strong Consistency</div>
                  <p className="text-xs text-gray-400 mt-1">Strict double-booking prevention through Redis mutex locks and PostgreSQL atomic isolation.</p>
                </div>
                <div className="p-4 rounded-2xl bg-tm-card border border-tm-border">
                  <div className="text-xs uppercase font-bold text-emerald-400 mb-1">Read:Write Ratio</div>
                  <div className="text-base font-bold text-white">100:1 to 1000:1</div>
                  <p className="text-xs text-gray-400 mt-1">Heavily read-biased workload decoupled into Elasticsearch and Edge CDN caching.</p>
                </div>
                <div className="p-4 rounded-2xl bg-tm-card border border-tm-border">
                  <div className="text-xs uppercase font-bold text-amber-400 mb-1">Surge Resilience</div>
                  <div className="text-base font-bold text-white">Virtual Queue Choke</div>
                  <p className="text-xs text-gray-400 mt-1">Redis ZSET throttles sudden millions of requests into controlled batches (Taylor Swift problem).</p>
                </div>
              </div>

              {/* ASCII / Diagram Flow */}
              <div className="p-5 rounded-2xl bg-[#070a12] border border-tm-border font-mono text-xs text-sky-300 overflow-x-auto leading-relaxed">
                <pre>{`[ React 18 + Vite (TS) ] ─── SSE Stream (Live Seats) ───► Real-Time Seat Map
             │
        HTTP / REST (JWT Auth)
             ▼
  [ Django 5 + DRF ] ────────┬──────► [ PostgreSQL 16 ] (ACID Source of Truth)
                             ├──────► [ Redis 7 ] (Locks: SET NX EX, ZSET Queue)
                             ├──────► [ Elasticsearch 8 ] (Inverted Index, Geo-Radius)
                             ├──────► [ Stripe API ] (Payment Gateway + Idempotency)
                             └──────► [ Celery + Beat ] (Reservation Expiration Cleanup)`}</pre>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-tm-card/60 border border-tm-border">
                  <span className="font-bold text-white block">PostgreSQL 16</span>
                  <span className="text-gray-400">ACID source of truth, ticket rows</span>
                </div>
                <div className="p-3 rounded-xl bg-tm-card/60 border border-tm-border">
                  <span className="font-bold text-white block">Redis 7</span>
                  <span className="text-gray-400">Distributed lock engine & ZSET queue</span>
                </div>
                <div className="p-3 rounded-xl bg-tm-card/60 border border-tm-border">
                  <span className="font-bold text-white block">Elasticsearch 8</span>
                  <span className="text-gray-400">Inverted index search & geo bounding</span>
                </div>
                <div className="p-3 rounded-xl bg-tm-card/60 border border-tm-border">
                  <span className="font-bold text-white block">Celery + Beat</span>
                  <span className="text-gray-400">Auto-expiration worker & batching</span>
                </div>
                <div className="p-3 rounded-xl bg-tm-card/60 border border-tm-border">
                  <span className="font-bold text-white block">Server-Sent Events</span>
                  <span className="text-gray-400">Persistent unidirectional seat push</span>
                </div>
                <div className="p-3 rounded-xl bg-tm-card/60 border border-tm-border">
                  <span className="font-bold text-white block">Stripe Service</span>
                  <span className="text-gray-400">Idempotent payment confirmation</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'two_phase' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/30 text-xs text-sky-200">
                <strong>Why Two-Phase Booking?</strong> To ensure customers have time to enter payment details without losing their selected seat, and without permanently locking seats if the user abandons their checkout cart.
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-tm-card border border-tm-border">
                  <div className="flex items-center space-x-2 text-sky-400 font-bold text-xs uppercase mb-2">
                    <span className="w-5 h-5 rounded-full bg-sky-500/20 flex items-center justify-center">1</span>
                    <span>Phase 1: Reserve (POST /api/booking/reserve/)</span>
                  </div>
                  <ul className="text-xs space-y-1.5 text-gray-300 list-disc list-inside">
                    <li>Acquires atomic Redis Distributed Lock: <code className="text-sky-300 font-mono">SET ticket:&#123;id&#125; &#123;userId&#125; NX EX 600</code>.</li>
                    <li>If lock fails, immediately returns <code className="text-amber-300 font-mono">409 Conflict</code>.</li>
                    <li>Sets ticket status to <code className="text-emerald-300 font-mono">reserved</code> in PostgreSQL with 10-minute expiry timestamp.</li>
                    <li>Broadcasts SSE update to all connected seat map viewers.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-tm-card border border-tm-border">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs uppercase mb-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">2</span>
                    <span>Phase 2: Confirm (POST /api/booking/confirm/)</span>
                  </div>
                  <ul className="text-xs space-y-1.5 text-gray-300 list-disc list-inside">
                    <li>Verifies Redis lock ownership and DB reservation expiration.</li>
                    <li>Opens PostgreSQL transaction with pessimistic row lock: <code className="text-emerald-300 font-mono">SELECT FOR UPDATE</code>.</li>
                    <li>Processes card payment via Stripe with unique idempotency key.</li>
                    <li>Creates finalized <code className="text-emerald-300 font-mono">Booking</code> record, marks ticket as <code className="text-emerald-300 font-mono">booked</code>.</li>
                    <li>Releases Redis reservation lock and broadcasts booked status via SSE.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'surge' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200">
                <strong>The "Taylor Swift" Surge Traffic Problem:</strong> When 5,000,000 concurrent fans compete for 70,000 seats, database lock contention and short-polling seat maps crash traditional architectures.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-tm-card border border-tm-border">
                  <h4 className="font-bold text-white text-sm mb-2">1. Virtual Waiting Room (Choke Point)</h4>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Surge traffic is intercepted before hitting PostgreSQL. Users join a Redis Sorted Set (<code className="text-sky-300 font-mono">ZSET</code>) priority queue.
                    When capacity allows, Celery Beat runs batch admission jobs releasing 200–500 users at a time with a signed admission token.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-tm-card border border-tm-border">
                  <h4 className="font-bold text-white text-sm mb-2">2. Server-Sent Events (SSE) Seat Maps</h4>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Instead of millions of short-polling GET requests that overwhelm servers, clients open a persistent unidirectional SSE connection.
                    When a seat is reserved or booked, Redis Pub/Sub broadcasts the delta update instantly to all connected browsers.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'search' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200">
                <strong>Low Latency Event Discovery:</strong> SQL <code className="text-purple-300 font-mono">LIKE '%term%'</code> full table scans fail at scale.
                Elasticsearch inverted indexes deliver sub-10ms keyword and geospatial discovery.
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-tm-card border border-tm-border">
                  <span className="font-bold text-white block mb-1">Inverted Indexing & Multi-Match:</span>
                  <span className="text-gray-400">
                    Custom standard analyzers with lowercase & asciifolding indexing event title, performer name, and venue descriptions with fuzzy typo tolerance.
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-tm-card border border-tm-border">
                  <span className="font-bold text-white block mb-1">Geospatial Radius Queries:</span>
                  <span className="text-gray-400">
                    <code className="text-sky-300 font-mono">geo_point</code> mappings on venue coordinates support bounding-box and radius queries (e.g. within 50km of user location).
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-tm-card border border-tm-border">
                  <span className="font-bold text-white block mb-1">Edge CDN Caching:</span>
                  <span className="text-gray-400">
                    Responses are marked with <code className="text-sky-300 font-mono">Cache-Control: public, max-age=30</code> to absorb repeated identical popular queries at the edge.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-tm-border bg-[#090d16] flex justify-between items-center text-xs">
          <span className="text-gray-400 font-medium">Ticketmaster System Architecture &bull; Phase 1</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-tm-card hover:bg-gray-800 text-white font-bold transition-colors border border-tm-border"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
};
