import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Clock,
  HandCoins,
  PiggyBank,
  Plus,
  ArrowRight,
  Sparkles,
  AlertCircle,
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

interface DashboardProps {
  onNavigate: (tab: ActiveTab) => void;
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
      <div className="p-8 flex flex-col items-center justify-center min-h-[50vh] space-y-2">
        <div className="w-6 h-6 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-neutral-500 font-medium">Loading command center...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-red-600 space-y-2">
        <AlertCircle className="mx-auto" size={24} />
        <p className="text-xs font-semibold">{error || 'Could not load data'}</p>
        <button
          onClick={fetchDashboardData}
          className="btn-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  const { metrics, cashFlowChart, outstandingInvoices, upcomingRepayments, aiInsights } = data;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
            Financial Command Center
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Real-time balance sheet, active client receivables, peer ledgers, and wealth planning.
          </p>
        </div>

        {/* Quick Actions Strip */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('invoices')}
            className="btn-primary"
          >
            <Plus size={14} className="mr-1.5" />
            <span>Create Invoice</span>
          </button>
          <button
            onClick={() => onNavigate('clients')}
            className="btn-secondary"
          >
            <Plus size={14} className="mr-1.5" />
            <span>Add Client</span>
          </button>
          <button
            onClick={() => onNavigate('borrow-lend')}
            className="btn-secondary"
          >
            <Plus size={14} className="mr-1.5" />
            <span>Record Loan</span>
          </button>
          <button
            onClick={() => onNavigate('investments')}
            className="btn-secondary"
          >
            <Plus size={14} className="mr-1.5" />
            <span>Savings Plan</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="fintech-card p-4">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Verified Inflows</span>
            <Wallet size={15} className="text-neutral-400" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 mt-2 tabular-nums">
            {formatCurrency(metrics.receivedPayments, currency)}
          </p>
          <p className="mt-1 text-[11px] text-teal-700 font-medium">
            100% verified settlements
          </p>
        </div>

        {/* Metric 2 */}
        <div className="fintech-card p-4">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Pending Receivables</span>
            <Clock size={15} className="text-neutral-400" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 mt-2 tabular-nums">
            {formatCurrency(metrics.pendingClientPayments, currency)}
          </p>
          <p className="mt-1 text-[11px] text-neutral-500">
            Across {metrics.clientsCount} freelance accounts
          </p>
        </div>

        {/* Metric 3 */}
        <div className="fintech-card p-4">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Money Lent (Outstanding)</span>
            <HandCoins size={15} className="text-neutral-400" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 mt-2 tabular-nums">
            {formatCurrency(metrics.totalMoneyLent, currency)}
          </p>
          <p className="mt-1 text-[11px] text-neutral-500">
            Personal bridge loans
          </p>
        </div>

        {/* Metric 4 */}
        <div className="fintech-card p-4">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Allocated Savings</span>
            <PiggyBank size={15} className="text-neutral-400" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 mt-2 tabular-nums">
            {formatCurrency(metrics.availableSavings, currency)}
          </p>
          <div className="mt-2 flex items-center space-x-2">
            <div className="flex-1 bg-neutral-100 rounded-full h-1 overflow-hidden">
              <div
                className="bg-neutral-900 h-full rounded-full"
                style={{ width: `${Math.min(100, metrics.investmentSavingsProgress)}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-neutral-700 tabular-nums">
              {metrics.investmentSavingsProgress}%
            </span>
          </div>
        </div>
      </div>

      {/* AI Financial Synthesis Callout */}
      {aiInsights && aiInsights.length > 0 && (
        <div className="fintech-card p-4 bg-[#F8F9FA] border border-[#E5E7EB] flex items-start space-x-3.5">
          <div className="w-7 h-7 rounded bg-neutral-900 text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles size={14} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
                AI Financial Insight
              </span>
              <button
                onClick={() => onNavigate('ai-assistant')}
                className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 transition"
              >
                Discuss with AI <ArrowRight size={12} />
              </button>
            </div>
            <h3 className="text-xs font-bold text-neutral-900 mt-0.5">
              {aiInsights[0].title}
            </h3>
            <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
              {aiInsights[0].summary}
            </p>
          </div>
        </div>
      )}

      {/* Charts Section: Inflows vs Outflows */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Monthly Cash Flow Area Chart */}
        <div className="fintech-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                Monthly Inflows and Outflows
              </h3>
              <p className="text-[11px] text-neutral-500">Live transaction trends</p>
            </div>
            <span className="text-[11px] font-mono text-neutral-500 bg-[#F8F9FA] px-2 py-0.5 rounded border border-[#E5E7EB]">
              6 Months
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlowChart} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#737373' }} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#737373' }} axisLine={false} />
                <Tooltip
                  formatter={(value: any) => formatCurrency(Number(value) || 0, currency)}
                  contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '4px', color: '#fff', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="income" name="Inflow" stroke="#0D9488" strokeWidth={1.5} fill="#CCFBF1" fillOpacity={0.4} />
                <Area type="monotone" dataKey="expenses" name="Outflow" stroke="#737373" strokeWidth={1.5} fill="#F1F3F5" fillOpacity={0.4} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Capital Bar Comparison */}
        <div className="fintech-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                Capital Ratio
              </h3>
              <p className="text-[11px] text-neutral-500">Inflows vs Outflows</p>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlowChart.slice(-4)} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#737373' }} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#737373' }} axisLine={false} />
                <Tooltip
                  formatter={(value: any) => formatCurrency(Number(value) || 0, currency)}
                  contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '4px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="income" name="Earnings" fill="#0D9488" radius={[2, 2, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#D1D5DB" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Actionable Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Outstanding Invoices */}
        <div className="fintech-card p-5">
          <div className="flex items-center justify-between mb-3 border-b border-[#E5E7EB] pb-3">
            <div>
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                Outstanding Invoices
              </h3>
              <p className="text-[11px] text-neutral-500">Unsettled accounts receivable</p>
            </div>
            <button
              onClick={() => onNavigate('invoices')}
              className="text-xs font-semibold text-neutral-700 hover:text-neutral-900 flex items-center gap-1"
            >
              All Invoices <ChevronRight size={13} />
            </button>
          </div>

          <div className="space-y-2">
            {outstandingInvoices.length > 0 ? (
              outstandingInvoices.map((inv: any) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-2.5 rounded-md border border-[#E5E7EB] hover:bg-[#F8F9FA] transition"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-semibold text-neutral-900">{inv.invoiceNumber}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          inv.status === 'OVERDUE'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600 mt-0.5">{inv.clientName}</p>
                    <p className="text-[10px] text-neutral-400">Due {formatDate(inv.dueDate)}</p>
                  </div>

                  <div className="text-right space-y-1">
                    <p className="text-xs font-bold text-neutral-900 tabular-nums">
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
                      className="px-2 py-0.5 bg-[#FFC439] hover:bg-[#F4B933] text-neutral-900 text-[10px] font-bold rounded flex items-center gap-1 transition"
                    >
                      <span className="italic font-bold text-blue-900">P</span>
                      <span>Pay Now</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-neutral-400 py-3 text-center">No outstanding invoices.</p>
            )}
          </div>
        </div>

        {/* Upcoming Loan Repayments */}
        <div className="fintech-card p-5">
          <div className="flex items-center justify-between mb-3 border-b border-[#E5E7EB] pb-3">
            <div>
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                Upcoming Peer Repayments
              </h3>
              <p className="text-[11px] text-neutral-500">Scheduled lending and borrowing</p>
            </div>
            <button
              onClick={() => onNavigate('borrow-lend')}
              className="text-xs font-semibold text-neutral-700 hover:text-neutral-900 flex items-center gap-1"
            >
              Open Ledger <ChevronRight size={13} />
            </button>
          </div>

          <div className="space-y-2">
            {upcomingRepayments.length > 0 ? (
              upcomingRepayments.map((loan: any) => (
                <div
                  key={loan.id}
                  className="flex items-center justify-between p-2.5 rounded-md border border-[#E5E7EB]"
                >
                  <div className="flex items-center space-x-2.5">
                    <div
                      className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] ${
                        loan.type === 'LENT'
                          ? 'bg-teal-50 text-teal-800 border border-teal-200'
                          : 'bg-neutral-100 text-neutral-800 border border-neutral-200'
                      }`}
                    >
                      {loan.type === 'LENT' ? 'L' : 'B'}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-neutral-900">{loan.partyName}</p>
                      <p className="text-[10px] text-neutral-500">
                        {loan.type === 'LENT' ? 'Money Lent' : 'Money Borrowed'} • Due {formatDate(loan.dueDate)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-bold text-neutral-900 tabular-nums">
                      {formatCurrency(loan.remainingAmount, currency)}
                    </p>
                    <span
                      className={`text-[9px] font-semibold ${
                        loan.isOverdue ? 'text-red-600 font-bold' : 'text-neutral-400'
                      }`}
                    >
                      {loan.isOverdue ? 'Overdue' : 'Active'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-neutral-400 py-3 text-center">No active loans due.</p>
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
