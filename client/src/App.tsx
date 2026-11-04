import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { ClientsPage } from './pages/ClientsPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { BorrowLendPage } from './pages/BorrowLendPage';
import { InvestmentsPage } from './pages/InvestmentsPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { ReportsPage } from './pages/ReportsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SettingsPage } from './pages/SettingsPage';
import { notificationApi } from './services/api';
import { Notification } from './types';

export const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      notificationApi.getAll().then((res) => {
        setNotifications(res.notifications || []);
      }).catch(() => {});
    }
  }, [isAuthenticated, activeTab]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 rounded-lg bg-[#171717] flex items-center justify-center text-white font-mono font-bold text-base">
          F
        </div>
        <p className="text-xs text-[#737373]">Loading FundFlow AI...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#171717]">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        unreadCount={unreadCount}
      />

      {/* Top Navbar */}
      <Navbar
        collapsed={sidebarCollapsed}
        onOpenNotifications={() => setActiveTab('notifications')}
        onOpenAIShortcut={() => setActiveTab('ai-assistant')}
        notifications={notifications}
      />

      {/* Main Content Area */}
      <main
        className={`pt-14 min-h-screen transition-all duration-200 ${
          sidebarCollapsed ? 'ml-16' : 'ml-60'
        }`}
      >
        {activeTab === 'dashboard' && <DashboardPage onNavigate={setActiveTab} />}
        {activeTab === 'clients' && <ClientsPage />}
        {activeTab === 'invoices' && <InvoicesPage />}
        {activeTab === 'borrow-lend' && <BorrowLendPage />}
        {activeTab === 'investments' && <InvestmentsPage />}
        {activeTab === 'savings' && <InvestmentsPage />}
        {activeTab === 'ai-assistant' && <AIAssistantPage />}
        {activeTab === 'reports' && <ReportsPage />}
        {activeTab === 'notifications' && <NotificationsPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
};
