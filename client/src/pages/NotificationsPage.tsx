import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  HandCoins,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import { notificationApi } from '../services/api';
import { Notification } from '../types';
import { formatRelativeTime } from '../utils/formatters';

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
        return <AlertTriangle size={15} className="text-rose-600" />;
      case 'PAYMENT_RECEIVED':
        return <CheckCircle2 size={15} className="text-emerald-600" />;
      case 'LENT_MONEY_RECOVERY':
        return <HandCoins size={15} className="text-teal-700" />;
      case 'SAVINGS_GOAL_ALERT':
        return <TrendingUp size={15} className="text-[#171717]" />;
      default:
        return <Bell size={15} className="text-[#737373]" />;
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#171717] tracking-tight">Notification Center</h1>
          <p className="text-xs text-[#737373] mt-0.5">Alerts on invoice maturities, loan repayments, and savings milestones.</p>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="btn-secondary flex items-center space-x-1.5"
        >
          <CheckCheck size={14} />
          <span>Mark All Read</span>
        </button>
      </div>

      <div className="fintech-card overflow-hidden divide-y divide-[#E5E7EB]">
        {loading ? (
          <div className="py-12 text-center text-xs text-[#737373]">Loading alerts...</div>
        ) : notifications.length > 0 ? (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.isRead && handleMarkAsRead(n.id)}
              className={`p-4 flex items-start justify-between cursor-pointer transition ${
                !n.isRead ? 'bg-[#F8F9FA] hover:bg-white' : 'hover:bg-[#F8F9FA]'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-white rounded border border-[#E5E7EB] shrink-0 mt-0.5">
                  {getIcon(n.type)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-[#171717] text-xs">{n.title}</h4>
                    {!n.isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-700"></span>
                    )}
                  </div>
                  <p className="text-xs text-[#737373] mt-0.5 leading-relaxed">{n.message}</p>
                  <span className="text-[10px] text-[#737373] mt-1 block">
                    {formatRelativeTime(n.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center text-[#737373] text-xs">No notifications right now.</div>
        )}
      </div>
    </div>
  );
};
