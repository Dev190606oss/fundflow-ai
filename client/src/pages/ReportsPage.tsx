import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  Building,
  ArrowUpRight,
  ArrowDownLeft,
  PieChart,
  TrendingUp,
  Percent,
} from 'lucide-react';
import { reportApi } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

export const ReportsPage: React.FC = () => {
  const { currency } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const res = await reportApi.getSummary();
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const handleExportCSV = () => {
    window.location.href = reportApi.getExportUrl();
  };

  if (loading || !data) {
    return <div className="p-8 text-center text-xs text-slate-400">Compiling financial analytics...</div>;
  }

  const { clientRevenue, loanMetrics, savingsMetrics, cashflow, allTransactions } = data;

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Reports & Financial Analytics</h1>
          <p className="text-xs text-slate-500 mt-1">Audit receivables, client revenue shares, debt recovery rates, and cash margin.</p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition self-start"
        >
          <Download size={15} />
          <span>Export Invoices CSV</span>
        </button>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="fintech-card p-5">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Gross Cleared Inflows</span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {formatCurrency(cashflow.totalIncome, currency)}
          </p>
          <span className="text-[11px] text-emerald-600 font-semibold">100% Verified payments</span>
        </div>

        <div className="fintech-card p-5">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Outflows</span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {formatCurrency(cashflow.totalExpense, currency)}
          </p>
          <span className="text-[11px] text-slate-500 font-semibold">Tools, utilities & lending</span>
        </div>

        <div className="fintech-card p-5">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Lending Recovery Rate</span>
          <p className="text-2xl font-black text-blue-600 mt-1">
            {loanMetrics.lentRecoveryRate}%
          </p>
          <span className="text-[11px] text-slate-500 font-semibold">
            {formatCurrency(loanMetrics.lentRecovered, currency)} recovered of {formatCurrency(loanMetrics.totalLent, currency)}
          </span>
        </div>

        <div className="fintech-card p-5">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Net Operating Margin</span>
          <p className={`text-2xl font-black mt-1 ${cashflow.netMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(cashflow.netMargin, currency)}
          </p>
          <span className="text-[11px] text-slate-500 font-semibold">Available working capital</span>
        </div>
      </div>

      {/* Client-wise Revenue Breakdown */}
      <div className="fintech-card p-6">
        <h3 className="text-base font-bold text-slate-900 mb-1">Client Revenue Contribution</h3>
        <p className="text-xs text-slate-500 mb-4">Total billed amount vs realized revenue per client</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Client</th>
                <th className="p-3">Company</th>
                <th className="p-3 text-right">Total Invoiced</th>
                <th className="p-3 text-right">Collected (Paid)</th>
                <th className="p-3 text-right">Outstanding Due</th>
                <th className="p-3 text-right">Collection Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {clientRevenue.map((c: any) => {
                const rate = c.billed > 0 ? Math.round((c.paid / c.billed) * 100) : 0;
                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{c.name}</td>
                    <td className="p-3 text-slate-600">{c.company}</td>
                    <td className="p-3 text-right font-semibold">{formatCurrency(c.billed, currency)}</td>
                    <td className="p-3 text-right font-bold text-emerald-600">{formatCurrency(c.paid, currency)}</td>
                    <td className="p-3 text-right font-bold text-amber-600">{formatCurrency(c.outstanding, currency)}</td>
                    <td className="p-3 text-right">
                      <span className="font-bold text-slate-800">{rate}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transactions Audit Ledger */}
      <div className="fintech-card p-6">
        <h3 className="text-base font-bold text-slate-900 mb-1">Financial Audit Ledger</h3>
        <p className="text-xs text-slate-500 mb-4">Complete transaction history recorded in PostgreSQL</p>

        <div className="divide-y divide-slate-100 text-xs">
          {allTransactions.map((tx: any) => (
            <div key={tx.id} className="py-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                    tx.type === 'INCOME' || tx.type === 'LOAN_REPAYMENT'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {tx.type === 'INCOME' || tx.type === 'LOAN_REPAYMENT' ? (
                    <ArrowDownLeft size={14} />
                  ) : (
                    <ArrowUpRight size={14} />
                  )}
                </div>
                <div>
                  <p className="font-bold text-slate-800">{tx.description}</p>
                  <p className="text-[11px] text-slate-400">
                    {tx.category} • {formatDate(tx.date)}
                  </p>
                </div>
              </div>

              <span
                className={`font-black text-sm ${
                  tx.type === 'INCOME' || tx.type === 'LOAN_REPAYMENT'
                    ? 'text-emerald-600'
                    : 'text-slate-900'
                }`}
              >
                {tx.type === 'INCOME' || tx.type === 'LOAN_REPAYMENT' ? '+' : '-'}
                {formatCurrency(tx.amount, currency)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
