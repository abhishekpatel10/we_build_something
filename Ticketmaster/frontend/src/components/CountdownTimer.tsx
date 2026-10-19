import React from 'react';
import { Clock, AlertTriangle, ArrowRight, X } from 'lucide-react';

interface CountdownTimerProps {
  formattedTime: string;
  progressPercent: number;
  isWarning: boolean;
  seatLabel: string;
  price: number;
  onProceedCheckout: () => void;
  onRelease: () => void;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  formattedTime,
  progressPercent,
  isWarning,
  seatLabel,
  price,
  onProceedCheckout,
  onRelease,
}) => {
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 animate-bounce-subtle`}>
      <div
        className={`rounded-2xl p-4 shadow-2xl backdrop-blur-xl border transition-all ${
          isWarning
            ? 'bg-amber-950/90 border-amber-500/80 shadow-amber-500/20'
            : 'bg-tm-card/95 border-tm-blue/60 shadow-blue-500/20'
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-mono font-bold text-lg shadow-inner ${
                isWarning
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                  : 'bg-blue-500/20 text-sky-300 border border-blue-500/40'
              }`}
            >
              <Clock className="w-5 h-5 mr-1 text-sky-400" />
              <span>{formattedTime}</span>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-white text-sm">Seat {seatLabel} Reserved</span>
                {isWarning && (
                  <span className="flex items-center text-[10px] text-amber-300 font-semibold bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                    <AlertTriangle className="w-3 h-3 mr-1" /> Expiring soon!
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-300">
                Locked exclusively in Redis. 10m TTL protects your cart.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={onRelease}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Release seat lock"
            >
              <X className="w-5 h-5" />
            </button>

            <button
              onClick={onProceedCheckout}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center space-x-1.5"
            >
              <span>Pay ${price}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-black/40 h-1.5 rounded-full mt-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              isWarning ? 'bg-amber-400' : 'bg-gradient-to-r from-sky-400 to-blue-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
