import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getEvents } from '../api/events';
import { EventItem } from '../api/types';
import { Compass, Calendar, MapPin, Sparkles, ArrowRight, ShieldCheck, Zap, Layers, Ticket } from 'lucide-react';

interface HomePageProps {
  onOpenArchitecture: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenArchitecture }) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await getEvents(selectedCategory);
        setEvents(res.results || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedCategory]);

  const categories = [
    { id: 'all', label: 'All Live Events' },
    { id: 'concert', label: 'Concerts & Tours' },
    { id: 'sports', label: 'Sports & Finals' },
    { id: 'theater', label: 'Broadway & Theater' },
  ];

  return (
    <div className="min-h-screen pb-24 space-y-12">
      {/* Hero Section */}
      <section className="relative pt-12 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-blue-600/20 via-sky-500/10 to-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-sky-400 text-xs font-bold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next-Gen High-Concurrency Ticketing Engine</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.1]">
            Experience Live Events with <span className="gradient-heading">Zero Double-Booking</span>
          </h1>

          <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Engineered with Redis distributed locks, real-time Server-Sent Events seat maps, and PostgreSQL ACID transactional guarantees.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to="/search"
              className="px-7 py-3.5 rounded-xl bg-tm-blue hover:bg-blue-600 text-white font-extrabold text-sm shadow-xl shadow-blue-500/25 transition-all flex items-center space-x-2"
            >
              <span>Explore Live Events</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={onOpenArchitecture}
              className="px-6 py-3.5 rounded-xl bg-tm-card hover:bg-gray-800 text-gray-200 font-bold text-sm border border-tm-border transition-all flex items-center space-x-2"
            >
              <Layers className="w-4 h-4 text-sky-400" />
              <span>Inspect Architecture</span>
            </button>
          </div>
        </div>
      </section>

      {/* Architecture Highlights Pill Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-tm-card border border-tm-border flex items-start space-x-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Redis Mutex Lock</h4>
              <p className="text-xs text-gray-400 mt-1">10-minute TTL lock pattern eliminates contention during ticket selection.</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-tm-card border border-tm-border flex items-start space-x-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">PostgreSQL ACID</h4>
              <p className="text-xs text-gray-400 mt-1">Pessimistic row locking (SELECT FOR UPDATE) guarantees single ticket ownership.</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-tm-card border border-tm-border flex items-start space-x-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
              <Layers className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Virtual Waiting Room</h4>
              <p className="text-xs text-gray-400 mt-1">Redis ZSET throttles surge traffic during high-profile stadium ticket drops.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Events Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <Compass className="w-6 h-6 text-sky-400" />
              Featured Stadium Events
            </h2>
            <p className="text-xs text-gray-400 mt-1">Browse open events with real-time seat inventory</p>
          </div>

          {/* Category Chips */}
          <div className="flex items-center space-x-2 overflow-x-auto py-1">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedCategory === c.id
                    ? 'bg-tm-blue text-white shadow-md shadow-blue-500/20'
                    : 'bg-tm-card text-gray-400 hover:text-white border border-tm-border'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-80 rounded-2xl bg-tm-card/60 animate-pulse border border-tm-border" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 bg-tm-card/40 rounded-3xl border border-tm-border">
            <p className="text-gray-400 text-sm">No events found in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div
                key={event.id}
                className="group rounded-3xl bg-tm-card border border-tm-border hover:border-sky-500/50 transition-all duration-300 overflow-hidden flex flex-col shadow-xl hover:shadow-2xl hover:shadow-blue-500/10"
              >
                {/* Banner Image */}
                <div className="relative h-48 overflow-hidden bg-gray-900">
                  <img
                    src={event.banner_image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80'}
                    alt={event.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#121826] via-transparent to-black/30" />

                  {/* Category Pill */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-white/20">
                      {event.category}
                    </span>
                    {event.surge_mode_active && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/80 text-black backdrop-blur-md">
                        Surge Queue
                      </span>
                    )}
                  </div>

                  {/* Starting Price */}
                  <div className="absolute bottom-3 right-3 px-3 py-1 rounded-xl bg-tm-card/90 backdrop-blur-md border border-white/10 text-xs font-black text-sky-400">
                    From ${event.min_price || 95}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-xs text-sky-400 font-semibold">
                      <span>{event.performer?.name}</span>
                    </div>

                    <h3 className="text-lg font-extrabold text-white group-hover:text-sky-300 transition-colors line-clamp-2 leading-snug">
                      {event.name}
                    </h3>

                    <div className="space-y-1.5 pt-1 text-xs text-gray-400">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-3.5 h-3.5 text-gray-500" />
                        <span>{new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-3.5 h-3.5 text-gray-500" />
                        <span className="line-clamp-1">{event.venue?.name}, {event.venue?.city}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="pt-4 border-t border-tm-border/60 flex items-center justify-between">
                    <span className="text-xs text-emerald-400 font-medium">
                      {event.available_tickets_count || '120+'} seats open
                    </span>

                    <Link
                      to={`/events/${event.id}`}
                      className="px-4 py-2 rounded-xl bg-tm-blue hover:bg-blue-600 text-white font-bold text-xs flex items-center space-x-1.5 transition-all shadow-md shadow-blue-500/20"
                    >
                      <span>Select Seats</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
