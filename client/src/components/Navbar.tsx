import React, { useState } from 'react';
import { Search, Bell, Calendar, ChevronDown, Check, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Notification } from '../types';

interface NavbarProps {
  collapsed: boolean;
  onOpenNotifications: () => void;
  onOpenAIShortcut: () => void;
  notifications: Notification[];
  onSearch?: (term: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  collapsed,
  onOpenNotifications,
  onOpenAIShortcut,
  notifications,
  onSearch,
}) => {
  const { user, currency, setCurrency } = useAuth();
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const todayStr = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (onSearch) onSearch(e.target.value);
  };

  return (
    <header
      className={`fixed top-0 right-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 transition-all duration-300 ${
        collapsed ? 'left-20' : 'left-64'
      }`}
    >
      <div className="h-full px-6 flex items-center justify-between">
        {/* Global Search Bar */}
        <div className="relative w-80 max-w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search clients, invoices, loans..."
            className="w-full pl-10 pr-4 py-2 bg-slate-100/80 border border-transparent rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
          />
        </div>

        {/* Right Section Tools */}
        <div className="flex items-center space-x-4">
          {/* AI Quick Assistant Trigger */}
          <button
            onClick={onOpenAIShortcut}
            className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition shadow-blue-500/20"
          >
            <Sparkles size={14} className="text-amber-300" />
            <span>AI Assistant</span>
          </button>

          {/* Current Date Display */}
          <div className="hidden md:flex items-center space-x-1.5 text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/60">
            <Calendar size={14} className="text-slate-400" />
            <span>{todayStr}</span>
          </div>

          {/* Currency Selection Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowCurrencyMenu(!showCurrencyMenu)}
              className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200/70 px-3 py-1.5 rounded-xl border border-slate-200 transition"
            >
              <span>{currency === 'INR' ? '₹ INR' : currency === 'USD' ? '$ USD' : '€ EUR'}</span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {showCurrencyMenu && (
              <div className="absolute right-0 mt-2 w-32 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50 text-xs">
                {[
                  { code: 'INR', label: '₹ INR (India)' },
                  { code: 'USD', label: '$ USD (US)' },
                  { code: 'EUR', label: '€ EUR (Euro)' },
                ].map((c) => (
                  <button
                    key={c.code}
                    onClick={() => {
                      setCurrency(c.code);
                      setShowCurrencyMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 text-slate-700 font-medium"
                  >
                    <span>{c.label}</span>
                    {currency === c.code && <Check size={14} className="text-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notifications Trigger */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition"
            title="Notifications"
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                {unreadCount}
              </span>
            )}
          </button>

          {/* User Profile Thumbnail */}
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-blue-500/20">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="hidden lg:block text-left leading-tight">
              <p className="text-xs font-semibold text-slate-800">{user?.name || 'Freelancer'}</p>
              <p className="text-[10px] text-slate-400">Freelancer Pro</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
