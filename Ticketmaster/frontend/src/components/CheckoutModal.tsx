import React, { useState } from 'react';
import { TicketSeat, BookingConfirmation } from '../api/types';
import { confirmBooking } from '../api/bookings';
import { CreditCard, ShieldCheck, CheckCircle2, Lock, ArrowRight, X, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  seat: TicketSeat;
  eventName: string;
  venueName: string;
  onBookingSuccess: (booking: BookingConfirmation) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  seat,
  eventName,
  venueName,
  onBookingSuccess,
}) => {
  const [cardName, setCardName] = useState('Alex Mercer');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvc, setCvc] = useState('923');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingConfirmation | null>(null);

  if (!isOpen) return null;

  const serviceFee = 15.50;
  const totalPrice = seat.price + serviceFee;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const idempotencyKey = 'idemp_' + Math.random().toString(36).substring(2, 15);
      const res = await confirmBooking(seat.id, {
        cardholderName: cardName,
        last4: '4242',
        idempotencyKey,
      });

      setConfirmedBooking(res.booking);
      onBookingSuccess(res.booking);
    } catch (err: any) {
      setError(err?.message || 'Payment or confirmation failed. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-[#0e1422] rounded-3xl border border-tm-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-tm-border flex items-center justify-between bg-gradient-to-r from-tm-card to-[#151d30]">
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
              Phase 2: Payment & Finalize
            </span>
            <h2 className="text-xl font-extrabold text-white mt-1">Complete Purchase</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {confirmedBooking ? (
          /* Confirmation Success Screen */
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-2xl font-black text-white">Booking Confirmed!</h3>
              <p className="text-xs text-gray-400 mt-1">
                Your ticket has been written to PostgreSQL with strict ACID guarantees.
              </p>
            </div>

            <div className="bg-tm-card rounded-2xl p-5 border border-tm-border text-left space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-tm-border/60">
                <span className="text-xs text-gray-400">Order Reference</span>
                <span className="text-sm font-mono font-bold text-sky-400">{confirmedBooking.booking_reference}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Event</span>
                <span className="font-semibold text-white">{eventName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Seat</span>
                <span className="font-semibold text-emerald-400">{seat.seat_label}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Total Paid</span>
                <span className="font-bold text-white">${totalPrice.toFixed(2)} USD</span>
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <Link
                to="/my-bookings"
                className="flex-1 py-3 rounded-xl bg-tm-blue hover:bg-blue-600 text-white font-bold text-sm text-center shadow-lg shadow-blue-500/25 transition-all"
              >
                View My Tickets
              </Link>
              <button
                onClick={onClose}
                className="px-5 py-3 rounded-xl bg-tm-card hover:bg-gray-800 text-gray-300 font-medium text-sm transition-colors border border-tm-border"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Payment Form */
          <form onSubmit={handleConfirm} className="p-6 space-y-5">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs">
                {error}
              </div>
            )}

            {/* Order Summary */}
            <div className="bg-tm-card/70 rounded-2xl p-4 border border-tm-border/70 space-y-2">
              <div className="text-xs text-gray-400">{eventName}</div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-white">{seat.seat_label} ({seat.section})</span>
                <span className="text-sm font-bold text-white">${seat.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-400">
                <span>Facility & Processing Fee</span>
                <span>${serviceFee.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-tm-border/60 flex justify-between items-center">
                <span className="text-sm font-extrabold text-gray-200">Total Due</span>
                <span className="text-lg font-black text-sky-400">${totalPrice.toFixed(2)} USD</span>
              </div>
            </div>

            {/* Card Inputs */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">Name on Card</label>
                <input
                  type="text"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-tm-card border border-tm-border text-white text-sm focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1 flex items-center justify-between">
                  <span>Card Details (Stripe Protected)</span>
                  <span className="text-sky-400 text-[10px] flex items-center gap-1">
                    <Lock className="w-3 h-3" /> 256-bit SSL
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-tm-card border border-tm-border text-white text-sm focus:border-sky-500 focus:outline-none font-mono"
                    required
                  />
                  <CreditCard className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">Expires</label>
                  <input
                    type="text"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-tm-card border border-tm-border text-white text-sm focus:border-sky-500 focus:outline-none font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">CVC</label>
                  <input
                    type="text"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-tm-card border border-tm-border text-white text-sm focus:border-sky-500 focus:outline-none font-mono"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Architecture guarantee callout */}
            <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 text-sky-200 text-xs">
              <ShieldCheck className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>ACID Consistency:</strong> Primary PostgreSQL transaction with <code className="text-sky-300">SELECT FOR UPDATE</code> eliminates double booking before releasing the Redis distributed lock.
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-extrabold text-sm shadow-xl shadow-blue-500/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Finalizing PostgreSQL Order...' : `Pay $${totalPrice.toFixed(2)} USD`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
