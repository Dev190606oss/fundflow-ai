import React, { useState } from 'react';
import { Search, Bell, Calendar, ChevronDown, Check, Bot, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Notification } from '../types';

interface NavbarProps {
  collapsed: boolean;
  onOpenNotifications: () => void;
  onOpenAIShortcut: () => void;
  onToggleMobileMenu?: () => void;
  notifications: Notification[];
  onSearch?: (term: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  collapsed,
  onOpenNotifications,
  onOpenAIShortcut,
  onToggleMobileMenu,
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
      className={`fixed top-0 right-0 z-30 h-14 bg-white border-b border-[#E5E7EB] transition-all duration-200 left-0 md:${
        collapsed ? 'left-16' : 'left-60'
      }`}
    >
      <div className="h-full px-4 sm:px-5 flex items-center justify-between">
        {/* Left Side: Mobile Menu Button + Search Bar */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-1.5 text-neutral-600 hover:text-neutral-900 rounded hover:bg-neutral-100 transition"
            aria-label="Toggle navigation menu"
          >
            <Menu size={18} />
          </button>

          <div className="relative w-44 sm:w-72 max-w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search invoices, clients..."
              className="w-full pl-8 sm:pl-9 pr-3 py-1.5 bg-[#F8F9FA] border border-[#E5E7EB] rounded-md text-xs text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-teal-600 focus:outline-none transition"
            />
          </div>
        </div>

        {/* Right Section Tools */}
        <div className="flex items-center space-x-3">
          {/* AI Quick Assistant Trigger */}
          <button
            onClick={onOpenAIShortcut}
            className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-xs font-semibold transition"
          >
            <Bot size={13} className="text-teal-400" />
            <span>Ask Assistant</span>
          </button>

          {/* Current Date Display */}
          <div className="hidden md:flex items-center space-x-1.5 text-xs text-neutral-500 bg-[#F8F9FA] px-2.5 py-1.5 rounded-md border border-[#E5E7EB]">
            <Calendar size={13} className="text-neutral-400" />
            <span>{todayStr}</span>
          </div>

          {/* Currency Selection Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowCurrencyMenu(!showCurrencyMenu)}
              className="flex items-center space-x-1 text-xs font-semibold text-neutral-700 bg-[#F8F9FA] hover:bg-neutral-100 px-2.5 py-1.5 rounded-md border border-[#E5E7EB] transition"
            >
              <span>{currency === 'INR' ? '₹ INR' : currency === 'USD' ? '$ USD' : '€ EUR'}</span>
              <ChevronDown size={13} className="text-neutral-400" />
            </button>

            {showCurrencyMenu && (
              <div className="absolute right-0 mt-1.5 w-32 bg-white rounded-md shadow-md border border-[#E5E7EB] py-1 z-50 text-xs">
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
                    className="w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-[#F8F9FA] text-neutral-700"
                  >
                    <span>{c.label}</span>
                    {currency === c.code && <Check size={13} className="text-teal-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notifications Trigger */}
          <button
            onClick={onOpenNotifications}
            className="relative p-1.5 text-neutral-600 hover:text-neutral-900 rounded-md hover:bg-neutral-100 transition"
            title="Notifications"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full"></span>
            )}
          </button>

          {/* User Profile */}
          <div className="flex items-center space-x-2 pl-2 border-l border-[#E5E7EB]">
            <div className="w-6 h-6 rounded bg-neutral-900 text-white flex items-center justify-center font-bold text-[10px]">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="hidden lg:inline text-xs font-semibold text-neutral-800">
              {user?.name?.split(' ')[0] || 'Account'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
