import React, { useState, useMemo } from 'react';
import { TicketSeat } from '../api/types';
import { Radio, Lock, Check, Zap, Sparkles } from 'lucide-react';

interface SeatMapProps {
  seats: TicketSeat[];
  selectedSeat: TicketSeat | null;
  onSelectSeat: (seat: TicketSeat) => void;
  onReserveSeat: (seat: TicketSeat) => void;
  isReserving: boolean;
  isConnectedSSE: boolean;
}

export const SeatMap: React.FC<SeatMapProps> = ({
  seats,
  selectedSeat,
  onSelectSeat,
  onReserveSeat,
  isReserving,
  isConnectedSSE,
}) => {
  const [activeSectionFilter, setActiveSectionFilter] = useState<string>('all');

  // Unique sections
  const sections = useMemo(() => {
    const set = new Set<string>();
    seats.forEach((s) => set.add(s.section));
    return Array.from(set);
  }, [seats]);

  // Filtered seats
  const filteredSeats = useMemo(() => {
    if (activeSectionFilter === 'all') return seats;
    return seats.filter((s) => s.section === activeSectionFilter);
  }, [seats, activeSectionFilter]);

  // Group by Section then Row
  const groupedSeats = useMemo(() => {
    const groups: Record<string, Record<string, TicketSeat[]>> = {};

    filteredSeats.forEach((seat) => {
      if (!groups[seat.section]) groups[seat.section] = {};
      if (!groups[seat.section][seat.row]) groups[seat.section][seat.row] = [];
      groups[seat.section][seat.row].push(seat);
    });

    // Sort seat numbers
    Object.keys(groups).forEach((sec) => {
      Object.keys(groups[sec]).forEach((r) => {
        groups[sec][r].sort((a, b) => Number(a.seat_number) - Number(b.seat_number));
      });
    });

    return groups;
  }, [filteredSeats]);

  // Summary counts
  const stats = useMemo(() => {
    let available = 0;
    let reserved = 0;
    let booked = 0;

    seats.forEach((s) => {
      if (s.status === 'available') available++;
      else if (s.status === 'reserved') reserved++;
      else if (s.status === 'booked') booked++;
    });

    return { available, reserved, booked, total: seats.length };
  }, [seats]);

  return (
    <div className="w-full bg-[#0d131f] rounded-2xl border border-tm-border p-6 shadow-2xl relative overflow-hidden">
      {/* Real-time SSE status banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-tm-border">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            Interactive Venue Seat Map
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-sky-400 border border-blue-500/30">
              Live Redis Mutex
            </span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Select an available seat to trigger Phase 1 two-phase booking lock.
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-tm-card border border-tm-border text-xs">
            <span className={`w-2 h-2 rounded-full ${isConnectedSSE ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-gray-300 font-medium">{isConnectedSSE ? 'SSE Stream Live' : 'Reconnecting...'}</span>
          </div>
        </div>
      </div>

      {/* Legend & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-4 text-xs">
        <div className="flex items-center space-x-5">
          <div className="flex items-center space-x-2">
            <div className="w-3.5 h-3.5 rounded bg-emerald-500/30 border border-emerald-500" />
            <span className="text-gray-300">Available ({stats.available})</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3.5 h-3.5 rounded bg-amber-500/40 border border-amber-500 animate-pulse" />
            <span className="text-gray-300">Reserved (10m Lock) ({stats.reserved})</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3.5 h-3.5 rounded bg-gray-700/60 border border-gray-600" />
            <span className="text-gray-400">Booked ({stats.booked})</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3.5 h-3.5 rounded bg-sky-500 border border-sky-300 ring-2 ring-sky-400/40" />
            <span className="text-sky-300 font-medium">Selected Seat</span>
          </div>
        </div>

        {/* Section Filters */}
        <div className="flex items-center space-x-1 overflow-x-auto py-1">
          <button
            onClick={() => setActiveSectionFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              activeSectionFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-tm-card text-gray-400 hover:text-white border border-tm-border'
            }`}
          >
            All Sections
          </button>
          {sections.map((sec) => (
            <button
              key={sec}
              onClick={() => setActiveSectionFilter(sec)}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                activeSectionFilter === sec
                  ? 'bg-blue-600 text-white'
                  : 'bg-tm-card text-gray-400 hover:text-white border border-tm-border'
              }`}
            >
              {sec}
            </button>
          ))}
        </div>
      </div>

      {/* Stage Layout Visualizer */}
      <div className="my-6">
        <div className="w-3/4 mx-auto py-3 rounded-xl stage-glow text-center flex items-center justify-center space-x-2">
          <Sparkles className="w-4 h-4 text-sky-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-widest text-sky-300">STAGE / PERFORMANCE PLATFORM</span>
          <Sparkles className="w-4 h-4 text-sky-400 animate-pulse" />
        </div>
      </div>

      {/* Seat Rows Matrix */}
      <div className="space-y-8 max-h-[500px] overflow-y-auto pr-2 py-2">
        {Object.entries(groupedSeats).map(([sectionName, rows]) => (
          <div key={sectionName} className="bg-tm-card/40 rounded-xl p-4 border border-tm-border/50">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-tm-border/40">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">{sectionName}</span>
              <span className="text-[11px] text-gray-400">
                ${Object.values(rows)[0]?.[0]?.price || '---'} per ticket
              </span>
            </div>

            <div className="space-y-2">
              {Object.entries(rows).map(([rowLetter, rowSeats]) => (
                <div key={rowLetter} className="flex items-center justify-center space-x-2">
                  <span className="w-5 text-right text-[11px] font-mono text-gray-400 font-bold">{rowLetter}</span>

                  <div className="flex items-center space-x-1.5 flex-wrap justify-center">
                    {rowSeats.map((seat) => {
                      const isSelected = selectedSeat?.id === seat.id;
                      const isAvailable = seat.status === 'available';
                      const isReserved = seat.status === 'reserved';
                      const isBooked = seat.status === 'booked';

                      let btnStyle = 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500 hover:text-white hover:scale-110';

                      if (isBooked) {
                        btnStyle = 'bg-gray-800/70 border-gray-700/60 text-gray-600 cursor-not-allowed opacity-40';
                      } else if (isReserved) {
                        btnStyle = 'bg-amber-500/25 border-amber-500/50 text-amber-300 animate-pulse cursor-not-allowed';
                      }

                      if (isSelected) {
                        btnStyle = 'bg-sky-500 border-sky-200 text-white ring-2 ring-sky-300/80 shadow-lg shadow-sky-500/50 scale-125 z-10';
                      }

                      return (
                        <button
                          key={seat.id}
                          disabled={isBooked || (isReserved && !seat.is_reserved_by_current_user && !isSelected)}
                          onClick={() => onSelectSeat(seat)}
                          title={`${seat.seat_label} - $${seat.price} (${seat.status})`}
                          className={`w-7 h-7 rounded-md text-[10px] font-bold border transition-all flex items-center justify-center relative ${btnStyle}`}
                        >
                          {isSelected ? (
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          ) : isBooked ? (
                            <Lock className="w-2.5 h-2.5 opacity-60" />
                          ) : (
                            seat.seat_number
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <span className="w-5 text-left text-[11px] font-mono text-gray-400 font-bold">{rowLetter}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Selected Seat Action Bar */}
      {selectedSeat && (
        <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-500/40 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
              <Zap className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-white text-base">{selectedSeat.seat_label}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {selectedSeat.section}
                </span>
              </div>
              <p className="text-xs text-gray-300">
                Row {selectedSeat.row}, Seat {selectedSeat.seat_number} &bull; 100% Guaranteed Seat
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-xs text-gray-400">Total Price</div>
              <div className="text-xl font-black text-white">${selectedSeat.price}</div>
            </div>

            <button
              onClick={() => onReserveSeat(selectedSeat)}
              disabled={isReserving || selectedSeat.status === 'booked'}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-bold text-sm shadow-lg shadow-blue-500/30 transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              <span>{isReserving ? 'Acquiring Redis Lock...' : 'Lock & Reserve Seat (10m)'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
