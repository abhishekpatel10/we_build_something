import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Ticket, Search, Compass, ShoppingBag, Layers, User as UserIcon, LogIn, LogOut, CheckCircle2 } from 'lucide-react';
import { getCurrentUser, loginUser, logoutUser } from '../api/auth';
import { UserProfile } from '../api/types';

interface NavbarProps {
  onOpenArchitecture: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenArchitecture }) => {
  const location = useLocation();
  const [user, setUser] = useState<UserProfile | null>(getCurrentUser());
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleQuickLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await loginUser('demo_user', 'demopassword123');
      setUser(res.user);
    } catch (e) {
      console.error(e);
      // Fallback demo user
      const demo: UserProfile = {
        id: '00000000-0000-0000-0000-000000000001',
        username: 'demo_user',
        email: 'demo@ticketmaster.dev',
        first_name: 'Demo',
        last_name: 'User'
      };
      localStorage.setItem('tm_user', JSON.stringify(demo));
      setUser(demo);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-tm-border bg-[#080c14]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-6">
          <Link to="/" className="flex items-center space-x-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <Ticket className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
                ticketmaster <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-sky-400 font-semibold border border-blue-500/30">PRO</span>
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link
              to="/search"
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                location.pathname === '/search' ? 'bg-tm-card text-sky-400 border border-tm-border' : 'text-gray-400 hover:text-white hover:bg-tm-card/50'
              }`}
            >
              <Search className="w-4 h-4" />
              Search & Explore
            </Link>
            <Link
              to="/"
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                location.pathname === '/' ? 'bg-tm-card text-sky-400 border border-tm-border' : 'text-gray-400 hover:text-white hover:bg-tm-card/50'
              }`}
            >
              <Compass className="w-4 h-4" />
              Hot Events
            </Link>
            <Link
              to="/my-bookings"
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                location.pathname === '/my-bookings' ? 'bg-tm-card text-sky-400 border border-tm-border' : 'text-gray-400 hover:text-white hover:bg-tm-card/50'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              My Orders
            </Link>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          {/* Architecture Drawer Trigger */}
          <button
            onClick={onOpenArchitecture}
            className="flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/20 transition-all shadow-sm"
            title="System Design Architecture Breakdown"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">System Architecture</span>
          </button>

          {/* User Auth */}
          {user ? (
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-tm-card border border-tm-border text-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <UserIcon className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-medium text-gray-200">{user.username}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-tm-card transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleQuickLogin}
              disabled={isLoggingIn}
              className="flex items-center space-x-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-tm-blue hover:bg-blue-600 text-white transition-all shadow-md shadow-blue-500/20"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{isLoggingIn ? 'Connecting...' : 'Quick Demo Login'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
