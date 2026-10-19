import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navbar } from './components/Navbar';
import { SystemDesignModal } from './components/SystemDesignModal';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { QueuePage } from './pages/QueuePage';
import { Layers, ShieldCheck, Zap, Database } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      retry: 1,
    },
  },
});

export function App() {
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-[#080c14] text-gray-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
          <Navbar onOpenArchitecture={() => setIsArchitectureOpen(true)} />

          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage onOpenArchitecture={() => setIsArchitectureOpen(true)} />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/events/:eventId" element={<EventDetailPage />} />
              <Route path="/my-bookings" element={<MyBookingsPage />} />
              <Route path="/queue" element={<QueuePage />} />
            </Routes>
          </main>

          {/* System Design Modal */}
          <SystemDesignModal
            isOpen={isArchitectureOpen}
            onClose={() => setIsArchitectureOpen(false)}
          />

          {/* Footer */}
          <footer className="border-t border-tm-border bg-[#05080e] py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center sm:text-left">
                <span className="font-extrabold text-white text-base">
                  Ticketmaster Architecture &bull; Phase 1
                </span>
                <p className="text-xs text-gray-400">
                  Built with Django 5, DRF, PostgreSQL, Redis, Elasticsearch, Celery, and React + Vite.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-gray-400">
                <button
                  onClick={() => setIsArchitectureOpen(true)}
                  className="hover:text-sky-400 transition-colors flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  System Blueprint
                </button>
                <span>&bull;</span>
                <Link to="/search" className="hover:text-sky-400 transition-colors">
                  Elasticsearch Engine
                </Link>
                <span>&bull;</span>
                <Link to="/my-bookings" className="hover:text-sky-400 transition-colors">
                  ACID Receipts
                </Link>
              </div>
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
