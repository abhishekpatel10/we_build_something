import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyBookings } from '../api/bookings';
import { BookingConfirmation } from '../api/types';
import { ShoppingBag, Ticket, Calendar, MapPin, QrCode, CheckCircle2, ArrowRight } from 'lucide-react';

export const MyBookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<BookingConfirmation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBookings() {
      try {
        setLoading(true);
        const data = await getMyBookings();
        const list = Array.isArray(data) ? data : data.results || [];
        setBookings(list);
      } catch (err) {
        console.error('Failed to fetch user bookings', err);
      } finally {
        setLoading(false);
      }
    }
    fetchBookings();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 min-h-screen">
      <div>
        <h1 className="text-3xl font-black text-white flex items-center gap-2">
          <ShoppingBag className="w-7 h-7 text-sky-400" />
          My Orders & Digital Tickets
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Confirmed purchases stored with PostgreSQL ACID transactional guarantees.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="h-44 rounded-3xl bg-tm-card/60 animate-pulse border border-tm-border" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-24 bg-tm-card/40 rounded-3xl border border-tm-border space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto text-sky-400">
            <Ticket className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">No tickets purchased yet</h3>
            <p className="text-xs text-gray-400 mt-1">Explore upcoming events to experience the 2-phase reservation system.</p>
          </div>
          <Link
            to="/search"
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-tm-blue hover:bg-blue-600 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all"
          >
            <span>Browse Events</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="p-6 rounded-3xl bg-tm-card border border-tm-border hover:border-sky-500/40 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl"
            >
              {/* Left Details */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-mono font-black text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-lg border border-sky-500/25">
                    {booking.booking_reference}
                  </span>
                  <span className="flex items-center text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/25 gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-extrabold text-white">{booking.event_name}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 mt-1">
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-500" />
                      <span>{new Date(booking.event_date || booking.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-500" />
                      <span>{booking.venue_name || 'Main Stadium'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-1">
                  <div className="px-3 py-1.5 rounded-xl bg-[#090d16] border border-tm-border text-xs">
                    <span className="text-gray-400">Seat: </span>
                    <span className="font-extrabold text-emerald-400">{booking.ticket?.seat_label || 'VIP-1'}</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-[#090d16] border border-tm-border text-xs">
                    <span className="text-gray-400">Card: </span>
                    <span className="font-mono text-gray-200">•••• {booking.payment_method_last4 || '4242'}</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-[#090d16] border border-tm-border text-xs">
                    <span className="text-gray-400">Paid: </span>
                    <span className="font-black text-white">${Number(booking.amount).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Right Ticket Barcode / QR Simulator */}
              <div className="w-full md:w-auto p-4 rounded-2xl bg-[#090d16] border border-tm-border flex items-center justify-between md:flex-col md:justify-center text-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-white p-2 flex items-center justify-center shadow-md">
                  <QrCode className="w-12 h-12 text-black" />
                </div>
                <div className="text-right md:text-center">
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">Entry Pass</span>
                  <span className="text-xs font-bold text-sky-400 font-mono">SCAN AT GATE</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
