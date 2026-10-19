import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { searchEvents } from '../api/search';
import { EventItem } from '../api/types';
import { Search, MapPin, Calendar, Filter, ArrowRight, Database, Sparkles } from 'lucide-react';

export const SearchPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('all');
  const [date, setDate] = useState('');
  const [results, setResults] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [engine, setEngine] = useState<string>('database_index');
  const [totalCount, setTotalCount] = useState<number>(0);

  const executeSearch = async () => {
    setLoading(true);
    try {
      const data = await searchEvents({
        term: searchTerm,
        location,
        type: category,
        date,
      });
      setResults(data.results || []);
      setEngine(data.engine || 'database_index');
      setTotalCount(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      executeSearch();
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchTerm, location, category, date]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 min-h-screen">
      {/* Search Header */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-2">
              <Search className="w-7 h-7 text-sky-400" />
              Event Discovery & Geospatial Search
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Low-latency multi-field inverted index query powered by Elasticsearch with geospatial bounding.
            </p>
          </div>

          {/* Engine indicator pill */}
          <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-tm-card border border-tm-border text-xs">
            <Database className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-gray-300 font-medium">Engine:</span>
            <span className="font-bold text-sky-300 uppercase">{engine.replace('_', ' ')}</span>
            <span className="text-[10px] text-gray-500">&bull; 30s Edge Caching</span>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 rounded-2xl bg-tm-card border border-tm-border shadow-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Term Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Artist, event, team..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[#090d16] border border-tm-border text-white text-xs focus:border-sky-500 focus:outline-none"
            />
          </div>

          {/* Location Input */}
          <div className="relative">
            <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="City, State, or Venue..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[#090d16] border border-tm-border text-white text-xs focus:border-sky-500 focus:outline-none"
            />
          </div>

          {/* Category Select */}
          <div className="relative">
            <Filter className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[#090d16] border border-tm-border text-white text-xs focus:border-sky-500 focus:outline-none appearance-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="concert">Concert</option>
              <option value="sports">Sports</option>
              <option value="theater">Theater</option>
              <option value="comedy">Comedy</option>
            </select>
          </div>

          {/* Date Input */}
          <div className="relative">
            <Calendar className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[#090d16] border border-tm-border text-white text-xs focus:border-sky-500 focus:outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center text-xs text-gray-400">
          <span>Found {totalCount} matching event{totalCount === 1 ? '' : 's'}</span>
          {searchTerm && <span>Query: "{searchTerm}"</span>}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-72 rounded-3xl bg-tm-card/60 animate-pulse border border-tm-border" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-20 bg-tm-card/40 rounded-3xl border border-tm-border space-y-3">
            <p className="text-gray-300 font-bold">No events matched your search criteria.</p>
            <p className="text-xs text-gray-500">Try broadening your keywords or clearing filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((event) => (
              <div
                key={event.id}
                className="group rounded-3xl bg-tm-card border border-tm-border hover:border-sky-500/50 transition-all duration-300 overflow-hidden flex flex-col shadow-xl hover:shadow-2xl hover:shadow-blue-500/10"
              >
                {/* Banner Image */}
                <div className="relative h-44 overflow-hidden bg-gray-900">
                  <img
                    src={event.banner_image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80'}
                    alt={event.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#121826] via-transparent to-black/30" />

                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-black/60 backdrop-blur-md text-white border border-white/20">
                      {event.category}
                    </span>
                    {event.surge_mode_active && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-black">
                        Virtual Queue
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-3 right-3 px-3 py-1 rounded-xl bg-tm-card/90 backdrop-blur-md border border-white/10 text-xs font-black text-sky-400">
                    From ${event.min_price || 95}
                  </div>
                </div>

                {/* Details */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="text-xs text-sky-400 font-bold">{event.performer?.name}</div>
                    <h3 className="text-base font-extrabold text-white group-hover:text-sky-300 transition-colors line-clamp-2">
                      {event.name}
                    </h3>

                    <div className="space-y-1 pt-2 text-xs text-gray-400">
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

                  <div className="pt-3 border-t border-tm-border/60 flex items-center justify-between">
                    <span className="text-xs text-emerald-400 font-medium">
                      {event.available_tickets || 'Available'} seats
                    </span>

                    <Link
                      to={`/events/${event.id}`}
                      className="px-4 py-2 rounded-xl bg-tm-blue hover:bg-blue-600 text-white font-bold text-xs flex items-center space-x-1.5 transition-all shadow-md shadow-blue-500/20"
                    >
                      <span>Book Seats</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
