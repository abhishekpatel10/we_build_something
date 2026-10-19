import React from 'react';
import { Users, Clock, ShieldAlert, Sparkles, RefreshCw, Zap } from 'lucide-react';

interface WaitingRoomModalProps {
  isOpen: boolean;
  eventName: string;
  position: number;
  totalQueued: number;
  estimatedWaitSeconds: number;
  onAdmitDemoBatch: () => void;
  onLeave: () => void;
}

export const WaitingRoomModal: React.FC<WaitingRoomModalProps> = ({
  isOpen,
  eventName,
  position,
  totalQueued,
  estimatedWaitSeconds,
  onAdmitDemoBatch,
  onLeave,
}) => {
  if (!isOpen) return null;

  const waitMinutes = Math.ceil(estimatedWaitSeconds / 60);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <div className="w-full max-w-lg bg-[#0c111d] rounded-3xl border border-indigo-500/40 p-8 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95">
        {/* Glow ambient background */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center space-y-6 relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Virtual Waiting Room Active</span>
          </div>

          <div>
            <h2 className="text-2xl font-black text-white">You are in line!</h2>
            <p className="text-sm text-gray-300 mt-1 max-w-sm mx-auto">
              High-demand ticket release for <span className="text-sky-400 font-bold">{eventName}</span>.
            </p>
          </div>

          {/* Position Card */}
          <div className="p-6 rounded-2xl bg-tm-card border border-tm-border/80 shadow-xl space-y-4">
            <div className="flex items-center justify-around">
              <div>
                <div className="text-xs uppercase font-bold text-gray-400">Your Number</div>
                <div className="text-4xl font-black text-sky-400 tracking-tight">#{position}</div>
              </div>
              <div className="w-px h-12 bg-tm-border" />
              <div>
                <div className="text-xs uppercase font-bold text-gray-400">Est. Wait Time</div>
                <div className="text-2xl font-black text-white flex items-center justify-center gap-1">
                  <Clock className="w-4 h-4 text-sky-400" />
                  <span>{waitMinutes > 0 ? `~${waitMinutes} min` : '< 1 min'}</span>
                </div>
              </div>
            </div>

            {/* Queue Bar */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-[11px] text-gray-400">
                <span>Total Fans Queued: {totalQueued || 1}</span>
                <span className="text-sky-400 font-medium">Auto-Refreshing...</span>
              </div>
              <div className="w-full bg-black/60 h-2.5 rounded-full overflow-hidden p-0.5 border border-tm-border">
                <div className="h-full bg-gradient-to-r from-blue-500 to-sky-400 rounded-full animate-pulse" style={{ width: `${Math.max(8, 100 - (position / Math.max(1, totalQueued)) * 100)}%` }} />
              </div>
            </div>
          </div>

          {/* Architecture Concept Explainer */}
          <div className="text-left bg-indigo-950/30 rounded-xl p-3.5 border border-indigo-500/20 text-xs text-indigo-200 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-indigo-300">
              <Zap className="w-3.5 h-3.5 text-sky-400" />
              <span>System Design: Redis ZSET Choke Point</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Users are queued in a Redis Sorted Set sorted by timestamp. The backend admits batches (e.g. 500-1000 users) at controlled intervals to protect the database and seat map from crash surges.
            </p>
          </div>

          {/* Admin Simulation Button for Live Demo */}
          <div className="space-y-2 pt-2">
            <button
              onClick={onAdmitDemoBatch}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center space-x-2"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Simulate Batch Admission (Admin Demo)</span>
            </button>

            <button
              onClick={onLeave}
              className="w-full py-2 text-xs text-gray-400 hover:text-gray-200 transition-colors"
            >
              Leave Queue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
