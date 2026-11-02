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
    { id: 'clients', label: 'Freelance & Clients', icon: Users },
    { id: 'invoices', label: 'Invoices & Payments', icon: FileText },
    { id: 'borrow-lend', label: 'Borrow & Lend', icon: ArrowLeftRight },
    { id: 'investments', label: 'Investment Opps', icon: TrendingUp },
    { id: 'savings', label: 'Savings Goals', icon: Target },
    { id: 'ai-assistant', label: 'AI Assistant', icon: Bot, highlight: true },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out bg-navy-900 border-r border-slate-800 flex flex-col justify-between ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Header / Branding */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
          {!collapsed ? (
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-black text-xl">
                F
              </div>
              <div>
                <span className="text-white font-bold tracking-tight text-lg leading-none flex items-center gap-1.5">
                  FundFlow <span className="text-blue-400 text-xs px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30">AI</span>
                </span>
                <p className="text-[10px] text-slate-400 font-medium">FINANCIAL COMMAND</p>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center cursor-pointer" onClick={() => setActiveTab('dashboard')}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black text-xl">
                F
              </div>
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as ActiveTab)}
                className={`w-full flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all group relative ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                } ${item.highlight && !isActive ? 'border border-blue-500/30 bg-blue-500/5 text-blue-300' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  size={20}
                  className={`${isActive ? 'text-white' : item.highlight ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'} ${
                    collapsed ? 'mx-auto' : 'mr-3'
                  }`}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}

                {/* Badge if any */}
                {item.badge && item.badge > 0 ? (
                  <span
                    className={`ml-auto text-xs px-2 py-0.5 rounded-full font-bold ${
                      isActive
                        ? 'bg-white text-blue-700'
                        : 'bg-red-500 text-white'
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

      {/* Footer / PayPal Badge & User */}
      <div className="p-3 border-t border-slate-800/80 space-y-3">
        {/* PayPal Verified Sandbox Badge */}
        {!collapsed ? (
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-2.5 flex items-center space-x-2.5 text-xs text-slate-300">
            <div className="w-6 h-6 rounded-md bg-blue-500/10 border border-blue-400/20 flex items-center justify-center text-blue-400">
              <ShieldCheck size={14} />
            </div>
            <div className="flex-1 truncate">
              <p className="font-semibold text-slate-200 leading-tight">PayPal Sandbox</p>
              <p className="text-[10px] text-emerald-400 font-mono">Connected & Ready</p>
            </div>
          </div>
        ) : null}

        {/* User Card */}
        <div className="flex items-center justify-between px-2 py-1">
          {!collapsed ? (
            <div className="flex items-center space-x-2.5 truncate">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-bold ring-2 ring-blue-500/30">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="truncate text-left">
                <p className="text-xs font-semibold text-white truncate">{user?.name || 'User'}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.businessName || user?.email}</p>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 mx-auto rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          )}

          {!collapsed && (
            <button
              onClick={logout}
              className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800 transition"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
