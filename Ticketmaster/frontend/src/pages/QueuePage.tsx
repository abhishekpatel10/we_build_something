import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQueue } from '../hooks/useQueue';
import { getEventDetail } from '../api/events';
import { EventItem } from '../api/types';
import { ShieldAlert, Clock, Sparkles, ArrowRight, Zap, RefreshCw } from 'lucide-react';

export const QueuePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('event_id') || '';
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventItem | null>(null);

  useEffect(() => {
    if (eventId) {
      getEventDetail(eventId).then(setEvent).catch(console.error);
    }
  }, [eventId]);

  const {
    position,
    totalQueued,
    estimatedWaitSeconds,
    isAdmitted,
    admitDemoBatch,
    refreshStatus,
  } = useQueue({
    eventId,
    enabled: Boolean(eventId),
    onAdmitted: () => {
      navigate(`/events/${eventId}`);
    },
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-8 min-h-screen">
      <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold uppercase tracking-wider">
        <ShieldAlert className="w-3.5 h-3.5" />
        <span>Surge Protection Active</span>
      </div>

      <div>
        <h1 className="text-3xl font-black text-white">Virtual Waiting Room</h1>
        <p className="text-sm text-gray-400 mt-2">
          High surge event: <span className="text-sky-400 font-bold">{event?.name || 'Taylor Swift: The Eras Tour'}</span>
        </p>
      </div>

      {/* Position Badge Card */}
      <div className="p-8 rounded-3xl bg-tm-card border border-tm-border shadow-2xl space-y-6">
        <div className="flex items-center justify-around">
          <div>
            <div className="text-xs uppercase font-bold text-gray-400">Position in Line</div>
            <div className="text-5xl font-black text-sky-400 tracking-tight mt-1">#{position}</div>
          </div>
          <div className="w-px h-16 bg-tm-border" />
          <div>
            <div className="text-xs uppercase font-bold text-gray-400">Est. Wait Time</div>
            <div className="text-3xl font-black text-white flex items-center justify-center gap-1.5 mt-2">
              <Clock className="w-5 h-5 text-sky-400" />
              <span>{Math.ceil(estimatedWaitSeconds / 60)} min</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Total Waiting Fans: {totalQueued || 1}</span>
            <span className="text-sky-400 font-semibold">Priority Redis ZSET</span>
          </div>
          <div className="w-full bg-black/60 h-3 rounded-full overflow-hidden p-0.5 border border-tm-border">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-sky-400 rounded-full animate-pulse"
              style={{ width: `${Math.max(10, 100 - (position / Math.max(1, totalQueued)) * 100)}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200 text-left space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-indigo-300">
            <Zap className="w-3.5 h-3.5 text-sky-400" />
            <span>How This Prevents Seat Staling:</span>
          </div>
          <p className="text-[11px] text-gray-400">
            When high traffic is detected, users are queued rather than flooding PostgreSQL transactions. Batches of fans are granted time-limited admission tokens, keeping seat maps snappy and preventing race lock pile-ups.
          </p>
        </div>

        {isAdmitted ? (
          <button
            onClick={() => navigate(`/events/${eventId}`)}
            className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold text-sm shadow-xl shadow-emerald-500/30 transition-all flex items-center justify-center space-x-2"
          >
            <span>You Are Admitted! Proceed to Seat Map</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="space-y-3">
            <button
              onClick={admitDemoBatch}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center space-x-2"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Admit Next Batch (Admin Demo Trigger)</span>
            </button>
            <button
              onClick={refreshStatus}
              className="flex items-center justify-center space-x-1.5 text-xs text-gray-400 hover:text-white mx-auto"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh Status</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
