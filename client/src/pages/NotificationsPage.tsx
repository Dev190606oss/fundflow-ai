import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  Clock,
  HandCoins,
  TrendingUp,
  FileText,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { notificationApi } from '../services/api';
import { Notification } from '../types';
import { formatDate, formatRelativeTime } from '../utils/formatters';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      setLoading(true);
      const res = await notificationApi.getAll();
      setNotifications(res.notifications);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    await notificationApi.markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    await notificationApi.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'INVOICE_OVERDUE':
        return <AlertTriangle size={16} className="text-red-500" />;
      case 'PAYMENT_RECEIVED':
        return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'LENT_MONEY_RECOVERY':
        return <HandCoins size={16} className="text-blue-500" />;
      case 'SAVINGS_GOAL_ALERT':
        return <TrendingUp size={16} className="text-indigo-500" />;
      default:
        return <Bell size={16} className="text-slate-400" />;
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Notification Center</h1>
          <p className="text-xs text-slate-500 mt-1">Alerts on invoice maturities, loan repayments, and savings milestones.</p>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-sm transition"
        >
          <CheckCheck size={14} />
          <span>Mark All as Read</span>
        </button>
      </div>

      <div className="fintech-card overflow-hidden divide-y divide-slate-100">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading alerts...</div>
        ) : notifications.length > 0 ? (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.isRead && handleMarkAsRead(n.id)}
              className={`p-4 flex items-start justify-between cursor-pointer transition ${
                !n.isRead ? 'bg-blue-50/50 hover:bg-blue-50/80' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-200 shrink-0 mt-0.5">
                  {getIcon(n.type)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-slate-900 text-xs">{n.title}</h4>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {formatRelativeTime(n.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center text-slate-400 text-xs">No notifications right now.</div>
        )}
      </div>
    </div>
  );
};
