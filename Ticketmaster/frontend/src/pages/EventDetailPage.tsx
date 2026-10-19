import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEventDetail, getEventSeats } from '../api/events';
import { reserveTicket, releaseReservation } from '../api/bookings';
import { EventItem, TicketSeat, ReservationResult, BookingConfirmation } from '../api/types';
import { useSSE, SeatUpdateMessage } from '../hooks/useSSE';
import { useBookingTimer } from '../hooks/useBookingTimer';
import { useQueue } from '../hooks/useQueue';
import { SeatMap } from '../components/SeatMap';
import { CountdownTimer } from '../components/CountdownTimer';
import { CheckoutModal } from '../components/CheckoutModal';
import { WaitingRoomModal } from '../components/WaitingRoomModal';
import { Calendar, MapPin, Sparkles, AlertCircle, ArrowLeft, ShieldCheck, Zap } from 'lucide-react';

export const EventDetailPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [seats, setSeats] = useState<TicketSeat[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<TicketSeat | null>(null);
  const [activeReservation, setActiveReservation] = useState<ReservationResult | null>(null);
  const [isReserving, setIsReserving] = useState(false);
  const [reservationError, setReservationError] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load Event and Seat Matrix
  const loadData = useCallback(async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      const [eventData, seatsData] = await Promise.all([
        getEventDetail(eventId),
        getEventSeats(eventId),
      ]);
      setEvent(eventData);
      setSeats(seatsData.seats || []);
    } catch (err) {
      console.error('Failed to load event details', err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Virtual Queue Hook
  const {
    isAdmitted,
    position,
    totalQueued,
    estimatedWaitSeconds,
    admitDemoBatch,
    exitQueue,
  } = useQueue({
    eventId,
    enabled: Boolean(event?.surge_mode_active),
    onAdmitted: () => {
      // User entered waiting room and just got admitted
    },
  });

  // Server-Sent Events (SSE) Listener for Real-Time Seat Status Changes
  const handleSeatUpdate = useCallback((update: SeatUpdateMessage) => {
    setSeats((prev) =>
      prev.map((seat) => {
        if (seat.id === update.ticket_id) {
          return {
            ...seat,
            status: update.status,
          };
        }
        return seat;
      })
    );
  }, []);

  const { isConnected: isConnectedSSE } = useSSE(eventId, handleSeatUpdate);

  // Reservation Expiration Timer Hook
  const { formattedTime, progressPercent, isWarning } = useBookingTimer({
    expiresAt: activeReservation?.expiresAt,
    onExpire: () => {
      setActiveReservation(null);
      setSelectedSeat(null);
      setReservationError('Your 10-minute reservation has expired and the lock was released.');
      loadData();
    },
  });

  // Phase 1: Reserve Ticket (Distributed Redis Lock)
  const handleReserveSeat = async (seat: TicketSeat) => {
    setIsReserving(true);
    setReservationError(null);

    try {
      const res = await reserveTicket(seat.id);
      setActiveReservation(res);
      // Update local seat status to reflect lock
      setSeats((prev) =>
        prev.map((s) => (s.id === seat.id ? { ...s, status: 'reserved', is_reserved_by_current_user: true } : s))
      );
    } catch (err: any) {
      const msg = err?.data?.error || err?.message || 'Failed to reserve seat lock.';
      setReservationError(msg);
      // Reload seats to catch any race conditions
      loadData();
    } finally {
      setIsReserving(false);
    }
  };

  // Release Active Reservation
  const handleReleaseReservation = async () => {
    if (!selectedSeat) return;
    try {
      await releaseReservation(selectedSeat.id);
      setActiveReservation(null);
      setSelectedSeat(null);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBookingSuccess = (_booking: BookingConfirmation) => {
    setActiveReservation(null);
    setSelectedSeat(null);
    loadData();
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-sky-400 border-t-transparent animate-spin mx-auto" />
        <p className="text-gray-400 text-sm">Loading stadium seat inventory & checking Redis locks...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-red-400 text-sm">Event not found.</p>
        <button onClick={() => navigate('/search')} className="text-sky-400 underline text-xs">
          Return to search
        </button>
      </div>
    );
  }

  // Virtual Waiting Room Barrier
  const isBlockedByQueue = event.surge_mode_active && !isAdmitted;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 min-h-screen pb-32">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Events</span>
      </button>

      {/* Event Header Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-tm-card border border-tm-border shadow-2xl">
        <div className="h-64 sm:h-80 w-full relative">
          <img
            src={event.banner_image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80'}
            alt={event.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d131f] via-[#0d131f]/70 to-transparent" />

          {/* Banner Badges */}
          <div className="absolute top-6 left-6 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-black/60 backdrop-blur-md text-sky-300 border border-sky-400/30">
              {event.category}
            </span>
            {event.surge_mode_active && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/90 text-black backdrop-blur-md flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" /> Surge Traffic Virtual Queue
              </span>
            )}
          </div>
        </div>

        {/* Info row */}
        <div className="p-6 sm:p-8 -mt-20 relative z-10 flex flex-wrap items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <span className="text-sky-400 text-sm font-bold tracking-wide uppercase">
              {event.performer?.name}
            </span>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              {event.name}
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 line-clamp-2 leading-relaxed">
              {event.description}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-gray-300">
              <div className="flex items-center space-x-1.5">
                <Calendar className="w-4 h-4 text-sky-400" />
                <span>
                  {new Date(event.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="flex items-center space-x-1.5">
                <MapPin className="w-4 h-4 text-sky-400" />
                <span>
                  {event.venue?.name} &bull; {event.venue?.city}, {event.venue?.country}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#090d16]/90 backdrop-blur-md border border-tm-border text-right space-y-1">
            <div className="text-[11px] text-gray-400 uppercase font-bold">Starting Price</div>
            <div className="text-2xl font-black text-sky-400">${event.min_price || 95}</div>
            <div className="text-[11px] text-emerald-400 font-medium">Available Inventory: {seats.filter(s => s.status === 'available').length} Seats</div>
          </div>
        </div>
      </div>

      {/* Reservation Error Alert */}
      {reservationError && (
        <div className="p-4 rounded-2xl bg-red-950/70 border border-red-500/60 text-red-200 text-xs flex items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span>{reservationError}</span>
          </div>
          <button
            onClick={() => setReservationError(null)}
            className="text-red-400 hover:text-white font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Interactive Seat Map */}
      <SeatMap
        seats={seats}
        selectedSeat={selectedSeat}
        onSelectSeat={(seat) => {
          setSelectedSeat(seat);
          setReservationError(null);
        }}
        onReserveSeat={handleReserveSeat}
        isReserving={isReserving}
        isConnectedSSE={isConnectedSSE}
      />

      {/* Active Reservation Countdown Floating Bar */}
      {activeReservation && selectedSeat && (
        <CountdownTimer
          formattedTime={formattedTime}
          progressPercent={progressPercent}
          isWarning={isWarning}
          seatLabel={selectedSeat.seat_label}
          price={selectedSeat.price}
          onProceedCheckout={() => setIsCheckoutOpen(true)}
          onRelease={handleReleaseReservation}
        />
      )}

      {/* Phase 2 Checkout Modal */}
      {selectedSeat && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          seat={selectedSeat}
          eventName={event.name}
          venueName={event.venue?.name}
          onBookingSuccess={handleBookingSuccess}
        />
      )}

      {/* Virtual Waiting Room Queue Barrier Modal */}
      <WaitingRoomModal
        isOpen={isBlockedByQueue}
        eventName={event.name}
        position={position}
        totalQueued={totalQueued}
        estimatedWaitSeconds={estimatedWaitSeconds}
        onAdmitDemoBatch={admitDemoBatch}
        onLeave={() => {
          exitQueue();
          navigate('/search');
        }}
      />
    </div>
  );
};
