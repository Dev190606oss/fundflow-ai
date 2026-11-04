import React from 'react';
import {
  LayoutDashboard,
  Users,
  FileText,
  ArrowLeftRight,
  TrendingUp,
  Target,
  Bot,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type ActiveTab =
  | 'dashboard'
  | 'clients'
  | 'invoices'
  | 'borrow-lend'
  | 'investments'
  | 'savings'
  | 'ai-assistant'
  | 'reports'
  | 'notifications'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  unreadCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  unreadCount = 0,
}) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clients', label: 'Clients & Projects', icon: Users },
    { id: 'invoices', label: 'Invoices & Payments', icon: FileText },
    { id: 'borrow-lend', label: 'Borrow & Lend', icon: ArrowLeftRight },
    { id: 'investments', label: 'Investment Opps', icon: TrendingUp },
    { id: 'savings', label: 'Savings Goals', icon: Target },
    { id: 'ai-assistant', label: 'Financial AI', icon: Bot },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-200 ease-in-out bg-[#171717] border-r border-[#262626] flex flex-col justify-between ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Top Header / Branding */}
      <div>
        <div className="h-14 flex items-center justify-between px-3.5 border-b border-[#262626]">
          {!collapsed ? (
            <div
              className="flex items-center space-x-2.5 cursor-pointer select-none"
              onClick={() => setActiveTab('dashboard')}
            >
              <div className="w-7 h-7 rounded bg-teal-600 flex items-center justify-center text-white font-bold text-sm tracking-wider">
                F
              </div>
              <div className="leading-tight">
                <span className="text-white font-bold text-sm tracking-tight flex items-center gap-1.5">
                  FundFlow
                  <span className="text-[10px] text-teal-400 font-mono font-medium">AI</span>
                </span>
              </div>
            </div>
          ) : (
            <div
              className="w-full flex justify-center cursor-pointer select-none"
              onClick={() => setActiveTab('dashboard')}
            >
              <div className="w-7 h-7 rounded bg-teal-600 flex items-center justify-center text-white font-bold text-sm">
                F
              </div>
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-neutral-400 hover:text-white p-1 rounded hover:bg-[#262626] transition"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-2 space-y-0.5 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as ActiveTab)}
                className={`w-full flex items-center rounded-md px-2.5 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[#262626] text-white font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#1F1F1F]'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  size={17}
                  className={`${isActive ? 'text-teal-400' : 'text-neutral-400'} ${
                    collapsed ? 'mx-auto' : 'mr-2.5'
                  }`}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}

                {/* Badge if any */}
                {item.badge && item.badge > 0 ? (
                  <span
                    className={`ml-auto text-[10px] px-1.5 py-0.2 rounded font-bold ${
                      isActive ? 'bg-neutral-100 text-neutral-900' : 'bg-red-500 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / PayPal Sandbox Badge & User */}
      <div className="p-2.5 border-t border-[#262626] space-y-2">
        {!collapsed && (
          <div className="px-2 py-1.5 rounded bg-[#1F1F1F] border border-[#2D2D2D] flex items-center space-x-2 text-[11px] text-neutral-300">
            <ShieldCheck size={14} className="text-teal-400 shrink-0" />
            <div className="truncate">
              <span className="font-semibold text-neutral-200">PayPal Sandbox</span>
              <span className="text-[10px] text-neutral-400 block font-mono">v2 Connected</span>
            </div>
          </div>
        )}

        {/* User Card */}
        <div className="flex items-center justify-between px-1.5 py-1">
          {!collapsed ? (
            <div className="flex items-center space-x-2 truncate">
              <div className="w-6 h-6 rounded bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white text-[11px] font-bold">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="truncate text-left leading-none">
                <p className="text-xs font-semibold text-white truncate">{user?.name || 'User'}</p>
                <p className="text-[10px] text-neutral-400 truncate mt-0.5">{user?.email}</p>
              </div>
            </div>
          ) : (
            <div className="w-6 h-6 mx-auto rounded bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white text-[11px] font-bold">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          )}

          {!collapsed && (
            <button
              onClick={logout}
              className="text-neutral-400 hover:text-red-400 p-1 rounded hover:bg-[#262626] transition"
              title="Sign Out"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
