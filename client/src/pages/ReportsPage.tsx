import React, { useState, useEffect } from 'react';
import {
  Download,
  ArrowUpRight,
  ArrowDownLeft,
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
    return <div className="p-8 text-center text-xs text-[#737373]">Compiling financial analytics...</div>;
  }

  const { clientRevenue, loanMetrics, cashflow, allTransactions } = data;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#171717] tracking-tight">Reports &amp; Financial Analytics</h1>
          <p className="text-xs text-[#737373] mt-0.5">Audit receivables, client revenue shares, debt recovery rates, and net margin.</p>
        </div>

        <button
          onClick={handleExportCSV}
          className="btn-secondary flex items-center space-x-1.5 self-start"
        >
          <Download size={14} />
          <span>Export Invoices CSV</span>
        </button>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="fintech-card p-5">
          <span className="text-[#737373] text-[10px] font-semibold uppercase tracking-wider">Gross Cleared Inflows</span>
          <p className="text-xl font-bold text-[#171717] mt-1 tabular-nums">
            {formatCurrency(cashflow.totalIncome, currency)}
          </p>
          <span className="text-[11px] text-emerald-700 font-medium mt-1 inline-block">100% Verified settlements</span>
        </div>

        <div className="fintech-card p-5">
          <span className="text-[#737373] text-[10px] font-semibold uppercase tracking-wider">Total Outflows</span>
          <p className="text-xl font-bold text-[#171717] mt-1 tabular-nums">
            {formatCurrency(cashflow.totalExpense, currency)}
          </p>
          <span className="text-[11px] text-[#737373] mt-1 inline-block">Tools, expenses &amp; lending</span>
        </div>

        <div className="fintech-card p-5">
          <span className="text-[#737373] text-[10px] font-semibold uppercase tracking-wider">Lending Recovery Rate</span>
          <p className="text-xl font-bold text-teal-800 mt-1 tabular-nums">
            {loanMetrics.lentRecoveryRate}%
          </p>
          <span className="text-[11px] text-[#737373] mt-1 inline-block">
            {formatCurrency(loanMetrics.lentRecovered, currency)} recovered of {formatCurrency(loanMetrics.totalLent, currency)}
          </span>
        </div>

        <div className="fintech-card p-5">
          <span className="text-[#737373] text-[10px] font-semibold uppercase tracking-wider">Net Operating Margin</span>
          <p className={`text-xl font-bold mt-1 tabular-nums ${cashflow.netMargin >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {formatCurrency(cashflow.netMargin, currency)}
          </p>
          <span className="text-[11px] text-[#737373] mt-1 inline-block">Available working capital</span>
        </div>
      </div>

      {/* Client-wise Revenue Breakdown */}
      <div className="fintech-card p-5">
        <h3 className="text-sm font-bold text-[#171717]">Client Revenue Contribution</h3>
        <p className="text-xs text-[#737373] mt-0.5 mb-4">Total billed amount vs realized revenue per client</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F9FA] text-[#737373] uppercase tracking-wider text-[10px] font-semibold border-b border-[#E5E7EB]">
              <tr>
                <th className="py-2.5 px-3">Client</th>
                <th className="py-2.5 px-3">Company</th>
                <th className="py-2.5 px-3 text-right">Total Invoiced</th>
                <th className="py-2.5 px-3 text-right">Collected (Paid)</th>
                <th className="py-2.5 px-3 text-right">Outstanding Due</th>
                <th className="py-2.5 px-3 text-right">Collection Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] font-medium">
              {clientRevenue.map((c: any) => {
                const rate = c.billed > 0 ? Math.round((c.paid / c.billed) * 100) : 0;
                return (
                  <tr key={c.id} className="hover:bg-[#F8F9FA] transition">
                    <td className="py-2.5 px-3 font-semibold text-[#171717]">{c.name}</td>
                    <td className="py-2.5 px-3 text-[#737373]">{c.company}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-[#171717] tabular-nums">{formatCurrency(c.billed, currency)}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-emerald-700 tabular-nums">{formatCurrency(c.paid, currency)}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-amber-700 tabular-nums">{formatCurrency(c.outstanding, currency)}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="font-semibold text-[#171717] tabular-nums">{rate}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transactions Audit Ledger */}
      <div className="fintech-card p-5">
        <h3 className="text-sm font-bold text-[#171717]">Financial Audit Ledger</h3>
        <p className="text-xs text-[#737373] mt-0.5 mb-4">Complete transaction history recorded in PostgreSQL</p>

        <div className="divide-y divide-[#E5E7EB] text-xs">
          {allTransactions.map((tx: any) => (
            <div key={tx.id} className="py-2.5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs border ${
                    tx.type === 'INCOME' || tx.type === 'LOAN_REPAYMENT'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {tx.type === 'INCOME' || tx.type === 'LOAN_REPAYMENT' ? (
                    <ArrowDownLeft size={13} />
                  ) : (
                    <ArrowUpRight size={13} />
                  )}
                </div>
                <div>
                  <p className="font-medium text-[#171717]">{tx.description}</p>
                  <p className="text-[11px] text-[#737373]">
                    {tx.category} • {formatDate(tx.date)}
                  </p>
                </div>
              </div>

              <span
                className={`font-semibold tabular-nums text-xs ${
                  tx.type === 'INCOME' || tx.type === 'LOAN_REPAYMENT'
                    ? 'text-emerald-700'
                    : 'text-[#171717]'
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
