import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Target,
  Sparkles,
  ShieldAlert,
  Plus,
  ExternalLink,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Info,
  DollarSign,
  ArrowRight,
  Loader2,
  PiggyBank,
  Percent,
} from 'lucide-react';
import { investmentApi } from '../services/api';
import { InvestmentOpportunity, SavingsGoal } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

export const InvestmentsPage: React.FC = () => {
  const { currency } = useAuth();
  const [opportunities, setOpportunities] = useState<InvestmentOpportunity[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [readiness, setReadiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyzingReadiness, setAnalyzingReadiness] = useState(false);

  // Modals
  const [showAddOppModal, setShowAddOppModal] = useState(false);
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [selectedGoalForDeposit, setSelectedGoalForDeposit] = useState<SavingsGoal | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositNotes, setDepositNotes] = useState('');

  // New Opp Form
  const [oppName, setOppName] = useState('');
  const [oppCategory, setOppCategory] = useState('IPO');
  const [oppStatus, setOppStatus] = useState('UNVERIFIED');
  const [oppExpectedAmount, setOppExpectedAmount] = useState('25000');
  const [oppPriceBand, setOppPriceBand] = useState('');
  const [oppOfficialSource, setOppOfficialSource] = useState('');
  const [oppDescription, setOppDescription] = useState('');

  // New Goal Form
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTargetAmount, setGoalTargetAmount] = useState('');
  const [goalInitial, setGoalInitial] = useState('');
  const [goalTargetDate, setGoalTargetDate] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [oppRes, goalRes, readyRes] = await Promise.all([
        investmentApi.getWatchlist(),
        investmentApi.getGoals(),
        investmentApi.getReadiness(),
      ]);
      setOpportunities(oppRes.all || []);
      setGoals(goalRes || []);
      setReadiness(readyRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await investmentApi.createOpportunity({
        companyName: oppName,
        category: oppCategory,
        status: oppStatus,
        expectedAmount: Number(oppExpectedAmount) || 0,
        priceBand: oppPriceBand,
        officialSource: oppOfficialSource,
        description: oppDescription,
        isVerified: oppStatus === 'CONFIRMED',
      });
      setShowAddOppModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create opportunity');
    }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await investmentApi.createGoal({
        title: goalTitle,
        targetAmount: Number(goalTargetAmount),
        initialDeposit: Number(goalInitial) || 0,
        targetDate: goalTargetDate,
      });
      setShowAddGoalModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create savings goal');
    }
  };

  const handleContributeSavings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalForDeposit) return;
    try {
      await investmentApi.addContribution(selectedGoalForDeposit.id, {
        amount: Number(depositAmount),
        sourceNotes: depositNotes || 'Received client revenue allocation',
      });
      setSelectedGoalForDeposit(null);
      setDepositAmount('');
      setDepositNotes('');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to add savings');
    }
  };

  const handleRefreshReadiness = async (goalId?: string) => {
    try {
      setAnalyzingReadiness(true);
      const res = await investmentApi.getReadiness({ goalId });
      setReadiness(res);
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzingReadiness(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Investment Opportunities & Readiness
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track upcoming IPOs, design dedicated savings plans, and analyze capital readiness with AI.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowAddOppModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition"
          >
            <Plus size={15} />
            <span>Track Opportunity</span>
          </button>
          <button
            onClick={() => {
              const fourWeeks = new Date(Date.now() + 28 * 86400000).toISOString().split('T')[0];
              setGoalTargetDate(fourWeeks);
              setShowAddGoalModal(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md transition"
          >
            <Plus size={15} />
            <span>New Savings Goal</span>
          </button>
        </div>
      </div>

      {/* AI Investment Readiness Command Box (CENTRAL DIFFERENTIATING FEATURE) */}
      {readiness && (
        <div className="bg-gradient-to-br from-slate-900 via-navy-900 to-blue-950 rounded-2xl p-6 text-white border border-slate-700/80 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-500/20 border border-blue-400/30 rounded-xl text-blue-300">
                <Sparkles size={22} className="text-amber-300" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-white tracking-tight flex items-center gap-2">
                  AI Investment Readiness Assistant
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/40">
                    Live Synthesis
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Target: {formatCurrency(readiness.targetAmount, currency)} over {readiness.weeksRemaining} weeks
                </p>
              </div>
            </div>

            <button
              onClick={() => handleRefreshReadiness()}
              disabled={analyzingReadiness}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 disabled:opacity-50 self-start"
            >
              {analyzingReadiness ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              <span>Recalculate Strategy</span>
            </button>
          </div>

          {/* Readiness Numbers Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
              <span className="text-slate-400 uppercase font-bold text-[10px]">Target Requirement</span>
              <p className="text-xl font-black text-white mt-1">
                {formatCurrency(readiness.targetAmount, currency)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Full allocation budget</p>
            </div>

            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
              <span className="text-slate-400 uppercase font-bold text-[10px]">Confirmed Savings</span>
              <p className="text-xl font-black text-emerald-400 mt-1">
                {formatCurrency(readiness.currentSavings, currency)}
              </p>
              <p className="text-[10px] text-emerald-400/80 mt-0.5">100% available cash</p>
            </div>

            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
              <span className="text-slate-400 uppercase font-bold text-[10px]">Current Savings Gap</span>
              <p className="text-xl font-black text-amber-400 mt-1">
                {formatCurrency(readiness.savingsGap, currency)}
              </p>
              <p className="text-[10px] text-amber-400/80 mt-0.5">To accumulate</p>
            </div>

            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
              <span className="text-slate-400 uppercase font-bold text-[10px]">Required / Week</span>
              <p className="text-xl font-black text-blue-400 mt-1">
                {formatCurrency(readiness.weeklySavingsRequired, currency)}
              </p>
              <p className="text-[10px] text-blue-300 mt-0.5">Paced over {readiness.weeksRemaining} weeks</p>
            </div>
          </div>

          {/* Capital Sources Breakdown: Confirmed vs Pending Receivables vs Expected Repayments */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Column 1: Pending Invoices that can fund it */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/40 space-y-2">
              <div className="flex items-center justify-between text-slate-300 font-bold">
                <span>Pending Client Invoices</span>
                <span className="text-amber-400">Potential Inflow</span>
              </div>
              <div className="space-y-1.5 mt-2">
                {readiness.pendingReceivables?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between p-2 bg-slate-900/60 rounded-lg">
                    <span className="text-slate-300 truncate max-w-[140px]">{item.source}</span>
                    <span className="font-bold text-white">{formatCurrency(item.amount, currency)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: Peer Loan Repayments Expected */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/40 space-y-2">
              <div className="flex items-center justify-between text-slate-300 font-bold">
                <span>Expected Loan Repayments</span>
                <span className="text-blue-400">Receivable</span>
              </div>
              <div className="space-y-1.5 mt-2">
                {readiness.expectedRepayments?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between p-2 bg-slate-900/60 rounded-lg">
                    <span className="text-slate-300">{item.person}</span>
                    <span className="font-bold text-white">{formatCurrency(item.amount, currency)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 3: Protected Reserves (Do Not Touch) */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/40 space-y-2">
              <div className="flex items-center justify-between text-slate-300 font-bold">
                <span>Protected Obligations</span>
                <span className="text-red-400">Do Not Touch</span>
              </div>
              <div className="space-y-1.5 mt-2">
                {readiness.liabilitiesToProtect?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between p-2 bg-slate-900/60 rounded-lg">
                    <span className="text-slate-300 truncate max-w-[140px]">{item.obligation}</span>
                    <span className="font-bold text-red-300">{formatCurrency(item.amount, currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Strategy & Risk Warnings */}
          <div className="p-4 bg-blue-950/40 rounded-xl border border-blue-900/60 space-y-3">
            <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">
              AI Action Strategy
            </span>
            <ul className="space-y-1.5 text-xs text-slate-200">
              {readiness.recommendedStrategy?.map((strat: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>{strat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Financial Disclaimer */}
          <div className="flex items-start space-x-2 text-[11px] text-slate-400 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            <Info size={15} className="text-slate-500 shrink-0 mt-0.5" />
            <p>{readiness.disclaimer}</p>
          </div>
        </div>
      )}

      {/* Savings Goals Tracker */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Savings Planner & Dedicated Allocations</h2>
            <p className="text-xs text-slate-500">Only confirmed received earnings are allocated here.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {goals.map((goal) => (
            <div key={goal.id} className="fintech-card p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    {goal.category || 'Goal'}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{goal.title}</h3>
                  <p className="text-xs text-slate-500">Target Date: {formatDate(goal.targetDate)}</p>
                </div>
                <button
                  onClick={() => setSelectedGoalForDeposit(goal)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition"
                >
                  <Plus size={14} /> Add Savings
                </button>
              </div>

              {/* Progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-700">{formatCurrency(goal.currentAmount, currency)} saved</span>
                  <span className="text-slate-500">{formatCurrency(goal.targetAmount, currency)} target</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, goal.percentage || 0)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>{goal.percentage}% completed</span>
                  <span>Remaining: {formatCurrency(goal.remainingAmount || 0, currency)}</span>
                </div>
              </div>

              {/* Weekly/Daily pace */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Daily Pace</span>
                  <p className="font-bold text-slate-800">{formatCurrency(goal.dailyRequired || 0, currency)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Weekly Pace</span>
                  <p className="font-bold text-blue-600">{formatCurrency(goal.weeklyRequired || 0, currency)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Days Left</span>
                  <p className="font-bold text-slate-800">{goal.daysRemaining} days</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Investment Watchlist & IPO Tracker */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Investment Watchlist & IPO Tracker</h2>
          <p className="text-xs text-slate-500">
            Track unverified and confirmed opportunities. Clearly distinguishes rumoured vs confirmed filings.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {opportunities.map((opp) => (
            <div key={opp.id} className="fintech-card p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    {opp.logoUrl ? (
                      <img src={opp.logoUrl} alt={opp.companyName} className="w-9 h-9 rounded-xl object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                        {opp.companyName[0]}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm leading-tight">{opp.companyName}</h3>
                      <span className="text-[10px] text-slate-500 font-semibold">{opp.category}</span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      opp.status === 'CONFIRMED'
                        ? 'bg-emerald-100 text-emerald-700'
                        : opp.status === 'UNVERIFIED'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {opp.status}
                  </span>
                </div>

                {/* Unverified Callout Banner if applicable */}
                {!opp.isVerified && (
                  <div className="mt-3 p-2 bg-amber-50 border border-amber-200/80 rounded-lg flex items-start gap-1.5 text-[11px] text-amber-800">
                    <AlertTriangle size={13} className="text-amber-600 shrink-0 mt-0.5" />
                    <span>Unconfirmed / Unverified opportunity. Do not treat as confirmed date.</span>
                  </div>
                )}

                <p className="mt-3 text-xs text-slate-600 leading-relaxed">{opp.description}</p>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                  {opp.priceBand && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Price Band:</span>
                      <span className="font-semibold text-slate-800">{opp.priceBand}</span>
                    </div>
                  )}
                  {opp.expectedAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Target Capital:</span>
                      <span className="font-bold text-slate-900">{formatCurrency(opp.expectedAmount, currency)}</span>
                    </div>
                  )}
                  {opp.officialSource && (
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Source:</span>
                      <span className="truncate max-w-[160px] text-slate-600">{opp.officialSource}</span>
                    </div>
                  )}
                </div>
              </div>

              {opp.infoUrl && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <a
                    href={opp.infoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                  >
                    Official Portal <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add Contribution Modal */}
      {selectedGoalForDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Add Confirmed Savings</h3>
              <button onClick={() => setSelectedGoalForDeposit(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleContributeSavings} className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-800">{selectedGoalForDeposit.title}</p>
                <p className="text-slate-500">
                  Target: {formatCurrency(selectedGoalForDeposit.targetAmount, currency)} | Current: {formatCurrency(selectedGoalForDeposit.currentAmount, currency)}
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Confirmed Amount to Allocate (INR) *</label>
                <input
                  type="number"
                  required
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Funding Source / Notes</label>
                <input
                  type="text"
                  value={depositNotes}
                  onChange={(e) => setDepositNotes(e.target.value)}
                  placeholder="e.g. Cleared PayPal invoice INV-2026-001"
                  className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedGoalForDeposit(null)}
                  className="px-4 py-2 border rounded-xl font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20"
                >
                  Confirm Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Opportunity Modal */}
      {showAddOppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Track New Investment Opportunity</h3>
              <button onClick={() => setShowAddOppModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleAddOpportunity} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company / Asset Name *</label>
                <input
                  type="text"
                  required
                  value={oppName}
                  onChange={(e) => setOppName(e.target.value)}
                  placeholder="e.g. OpenAI Secondary / Reliance Retail IPO"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={oppCategory}
                    onChange={(e) => setOppCategory(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-white"
                  >
                    <option value="IPO">IPO</option>
                    <option value="STOCKS">Stocks</option>
                    <option value="ETFS">ETFs</option>
                    <option value="MUTUAL_FUNDS">Mutual Funds</option>
                    <option value="OTHER">Other Secondary</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={oppStatus}
                    onChange={(e) => setOppStatus(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-white"
                  >
                    <option value="UNVERIFIED">Unverified / Rumoured</option>
                    <option value="ANNOUNCED">Announced</option>
                    <option value="CONFIRMED">Confirmed DRHP</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Capital (INR)</label>
                  <input
                    type="number"
                    value={oppExpectedAmount}
                    onChange={(e) => setOppExpectedAmount(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Indicative Price Band</label>
                  <input
                    type="text"
                    value={oppPriceBand}
                    onChange={(e) => setOppPriceBand(e.target.value)}
                    placeholder="e.g. ₹500 - ₹550"
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Information Source</label>
                <input
                  type="text"
                  value={oppOfficialSource}
                  onChange={(e) => setOppOfficialSource(e.target.value)}
                  placeholder="e.g. SEBI draft filing or company press release"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddOppModal(false)}
                  className="px-4 py-2 border rounded-xl font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
                >
                  Track Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Create New Financial Goal</h3>
              <button onClick={() => setShowAddGoalModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleAddGoal} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Goal Title *</label>
                <input
                  type="text"
                  required
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  placeholder="e.g. Prepare for Anthropic IPO Watch"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Amount (INR) *</label>
                  <input
                    type="number"
                    required
                    value={goalTargetAmount}
                    onChange={(e) => setGoalTargetAmount(e.target.value)}
                    placeholder="25000"
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Deposit (INR)</label>
                  <input
                    type="number"
                    value={goalInitial}
                    onChange={(e) => setGoalInitial(e.target.value)}
                    placeholder="8000"
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Date *</label>
                <input
                  type="date"
                  required
                  value={goalTargetDate}
                  onChange={(e) => setGoalTargetDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddGoalModal(false)}
                  className="px-4 py-2 border rounded-xl font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
