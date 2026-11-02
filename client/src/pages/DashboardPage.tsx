import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowUpRight,
  Clock,
  HandCoins,
  Receipt,
  PiggyBank,
  TrendingUp,
  Plus,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import { dashboardApi } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { ActiveTab } from '../components/Sidebar';
import { PayPalPaymentModal } from '../components/PayPalPaymentModal';
import { Invoice } from '../types';

interface DashboardProps {
  onNavigate: (tab: ActiveTab) => void;
  onOpenCreateInvoice?: () => void;
}

export const DashboardPage: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { currency } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedInvoiceForPay, setSelectedInvoiceForPay] = useState<any | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await dashboardApi.getStats();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500 font-medium">Loading Financial Command Center...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-red-600">
        <AlertCircle className="mx-auto mb-2" size={32} />
        <p className="font-semibold">{error || 'Could not load data'}</p>
        <button
          onClick={fetchDashboardData}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  const { metrics, cashFlowChart, recentTransactions, outstandingInvoices, upcomingRepayments, savingsGoals, aiInsights } = data;

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fadeIn max-w-7xl mx-auto">
      {/* Welcome & Quick Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
            Financial Command Center
          </h1>
          <p className="text-xs lg:text-sm text-slate-500 mt-1">
            Real-time balance sheet, client dues, lending ledger, and IPO readiness.
          </p>
        </div>

        {/* Quick Actions Strip */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('invoices')}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition"
          >
            <Plus size={15} />
            <span>Create Invoice</span>
          </button>
          <button
            onClick={() => onNavigate('clients')}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition"
          >
            <Plus size={15} />
            <span>Add Client</span>
          </button>
          <button
            onClick={() => onNavigate('borrow-lend')}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition"
          >
            <Plus size={15} />
            <span>Lend / Borrow</span>
          </button>
          <button
            onClick={() => onNavigate('investments')}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition"
          >
            <Plus size={15} />
            <span>Savings Goal</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Received Payments */}
        <div className="fintech-card p-5 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Received</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <Wallet size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {formatCurrency(metrics.receivedPayments, currency)}
          </p>
          <div className="mt-2 flex items-center text-xs text-emerald-700 font-semibold space-x-1">
            <ArrowUpRight size={14} />
            <span>100% verified settlement</span>
          </div>
        </div>

        {/* Card 2: Pending Client Dues */}
        <div className="fintech-card p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Invoices</span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Clock size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {formatCurrency(metrics.pendingClientPayments, currency)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Across {metrics.clientsCount} freelance clients
          </p>
        </div>

        {/* Card 3: Money Lent Outstanding */}
        <div className="fintech-card p-5 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Money Lent (Receivable)</span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <HandCoins size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {formatCurrency(metrics.totalMoneyLent, currency)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Personal loans awaiting recovery
          </p>
        </div>

        {/* Card 4: Investment Savings Progress */}
        <div className="fintech-card p-5 border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Available Savings</span>
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <PiggyBank size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {formatCurrency(metrics.availableSavings, currency)}
          </p>
          <div className="mt-2 flex items-center space-x-2">
            <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, metrics.investmentSavingsProgress)}%` }}
              />
            </div>
            <span className="text-xs font-bold text-indigo-600">
              {metrics.investmentSavingsProgress}%
            </span>
          </div>
        </div>
      </div>

      {/* AI Financial Insights Highlight */}
      {aiInsights && aiInsights.length > 0 && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden border border-blue-800/60">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 bg-blue-500/20 border border-blue-400/30 rounded-xl text-blue-300">
              <Sparkles size={20} className="text-amber-300" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-wider text-blue-300 uppercase">
                  AI Financial Synthesis
                </span>
                <button
                  onClick={() => onNavigate('ai-assistant')}
                  className="text-xs font-semibold text-blue-200 hover:text-white flex items-center gap-1 transition"
                >
                  Ask Assistant <ArrowRight size={13} />
                </button>
              </div>
              <h3 className="text-base font-bold text-white mt-1">
                {aiInsights[0].title}
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-4xl">
                {aiInsights[0].summary}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section: Cashflow & Income vs Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Cash Flow Area Chart */}
        <div className="fintech-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Monthly Cash Flow Trend</h3>
              <p className="text-xs text-slate-500">Live transaction inflows vs outflows</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg">
              Last 6 Months
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlowChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0066cc" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0066cc" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                <Tooltip
                  formatter={(value: any) => formatCurrency(Number(value) || 0, currency)}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="income" name="Inflow" stroke="#0066cc" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="expenses" name="Outflow" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Income vs Expenses Bar Comparison */}
        <div className="fintech-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Capital Ratio</h3>
              <p className="text-xs text-slate-500">Inflows vs Outflows</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlowChart.slice(-4)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                <Tooltip
                  formatter={(value: any) => formatCurrency(Number(value) || 0, currency)}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="income" name="Earnings" fill="#0066cc" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Actionable Tables: Outstanding Invoices & Upcoming Loan Repayments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outstanding Invoices with direct PayPal Settlement */}
        <div className="fintech-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Outstanding Invoices</h3>
              <p className="text-xs text-slate-500">Unsettled client billings</p>
            </div>
            <button
              onClick={() => onNavigate('invoices')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              View All <ChevronRight size={14} />
            </button>
          </div>

          <div className="space-y-3">
            {outstandingInvoices.length > 0 ? (
              outstandingInvoices.map((inv: any) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/60 transition"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-slate-800">{inv.invoiceNumber}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          inv.status === 'OVERDUE'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 font-medium">{inv.clientName}</p>
                    <p className="text-[11px] text-slate-400">Due {formatDate(inv.dueDate)}</p>
                  </div>

                  <div className="text-right space-y-1.5">
                    <p className="text-sm font-bold text-slate-900">
                      {formatCurrency(inv.balanceDue, currency)}
                    </p>
                    <button
                      onClick={() =>
                        setSelectedInvoiceForPay({
                          id: inv.id,
                          invoiceNumber: inv.invoiceNumber,
                          totalAmount: inv.totalAmount,
                          paidAmount: 0,
                          client: { name: inv.clientName },
                        })
                      }
                      className="px-2.5 py-1 bg-amber-400 hover:bg-amber-500 text-slate-900 text-[11px] font-extrabold rounded-lg shadow-sm flex items-center gap-1 transition"
                    >
                      <span className="italic">PayPal</span> Pay
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">No outstanding invoices!</p>
            )}
          </div>
        </div>

        {/* Upcoming Loan Repayments */}
        <div className="fintech-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Upcoming Loan Repayments</h3>
              <p className="text-xs text-slate-500">Peer lending & borrowing schedule</p>
            </div>
            <button
              onClick={() => onNavigate('borrow-lend')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Open Ledger <ChevronRight size={14} />
            </button>
          </div>

          <div className="space-y-3">
            {upcomingRepayments.length > 0 ? (
              upcomingRepayments.map((loan: any) => (
                <div
                  key={loan.id}
                  className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/60"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                        loan.type === 'LENT'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {loan.type === 'LENT' ? 'L' : 'B'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{loan.partyName}</p>
                      <p className="text-[11px] text-slate-500">
                        {loan.type === 'LENT' ? 'Lent to person' : 'Borrowed from person'} • Due {formatDate(loan.dueDate)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">
                      {formatCurrency(loan.remainingAmount, currency)}
                    </p>
                    <span
                      className={`text-[10px] font-semibold ${
                        loan.isOverdue ? 'text-red-600 font-bold' : 'text-slate-500'
                      }`}
                    >
                      {loan.isOverdue ? 'Overdue' : 'Scheduled'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">No active loans due soon.</p>
            )}
          </div>
        </div>
      </div>

      {/* PayPal Payment Modal */}
      {selectedInvoiceForPay && (
        <PayPalPaymentModal
          invoice={selectedInvoiceForPay}
          isOpen={Boolean(selectedInvoiceForPay)}
          onClose={() => setSelectedInvoiceForPay(null)}
          onPaymentSuccess={() => {
            setSelectedInvoiceForPay(null);
            fetchDashboardData();
          }}
        />
      )}
    </div>
  );
};
