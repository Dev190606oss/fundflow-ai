import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Info,
  Loader2,
  X,
} from 'lucide-react';
import { investmentApi } from '../services/api';
import { InvestmentOpportunity, SavingsGoal } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const InvestmentsPage: React.FC = () => {
  const { currency } = useAuth();
  const { toast } = useToast();
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

  const [submittingOpp, setSubmittingOpp] = useState(false);
  const [submittingGoal, setSubmittingGoal] = useState(false);
  const [submittingDeposit, setSubmittingDeposit] = useState(false);

  const handleAddOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingOpp(true);
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
      toast.success('Investment opportunity created successfully.');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create opportunity');
    } finally {
      setSubmittingOpp(false);
    }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingGoal(true);
      await investmentApi.createGoal({
        title: goalTitle,
        targetAmount: Number(goalTargetAmount),
        initialDeposit: Number(goalInitial) || 0,
        targetDate: goalTargetDate,
      });
      setShowAddGoalModal(false);
      toast.success('Savings goal created successfully.');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create savings goal');
    } finally {
      setSubmittingGoal(false);
    }
  };

  const handleContributeSavings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalForDeposit) return;
    try {
      setSubmittingDeposit(true);
      await investmentApi.addContribution(selectedGoalForDeposit.id, {
        amount: Number(depositAmount),
        sourceNotes: depositNotes || 'Received client revenue allocation',
      });
      setSelectedGoalForDeposit(null);
      setDepositAmount('');
      setDepositNotes('');
      toast.success('Savings contribution recorded successfully.');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add savings');
    } finally {
      setSubmittingDeposit(false);
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
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#171717] tracking-tight">
            Investment Opportunities &amp; Readiness
          </h1>
          <p className="text-xs text-[#737373] mt-0.5">
            Track upcoming IPOs, design dedicated savings plans, and analyze capital readiness with AI.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowAddOppModal(true)}
            className="btn-primary flex items-center space-x-1.5"
          >
            <Plus size={14} />
            <span>Track Opportunity</span>
          </button>
          <button
            onClick={() => {
              const fourWeeks = new Date(Date.now() + 28 * 86400000).toISOString().split('T')[0];
              setGoalTargetDate(fourWeeks);
              setShowAddGoalModal(true);
            }}
            className="btn-secondary flex items-center space-x-1.5"
          >
            <Plus size={14} />
            <span>New Savings Goal</span>
          </button>
        </div>
      </div>

      {/* AI Investment Readiness Command Box */}
      {readiness && (
        <div className="fintech-card p-6 space-y-5 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E5E7EB] pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-teal-50 border border-teal-200 rounded text-teal-800">
                <Sparkles size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-[#171717] tracking-tight">
                    AI Investment Readiness Assessment
                  </h3>
                  <span className="text-[10px] font-medium bg-teal-50 text-teal-800 px-2 py-0.5 rounded border border-teal-200">
                    Live Heuristic Engine
                  </span>
                </div>
                <p className="text-xs text-[#737373] mt-0.5">
                  Target requirement: {formatCurrency(readiness.targetAmount, currency)} over {readiness.weeksRemaining} weeks
                </p>
              </div>
            </div>

            <button
              onClick={() => handleRefreshReadiness()}
              disabled={analyzingReadiness}
              className="btn-secondary flex items-center gap-1.5 text-xs self-start disabled:opacity-50"
            >
              {analyzingReadiness ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              <span>Recalculate Strategy</span>
            </button>
          </div>

          {/* Readiness Numbers Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-[#F8F9FA] p-4 rounded border border-[#E5E7EB]">
              <span className="text-[#737373] uppercase font-semibold text-[10px]">Target Requirement</span>
              <p className="text-lg font-bold text-[#171717] mt-1 tabular-nums">
                {formatCurrency(readiness.targetAmount, currency)}
              </p>
              <p className="text-[10px] text-[#737373] mt-0.5">Full capital target</p>
            </div>

            <div className="bg-[#F8F9FA] p-4 rounded border border-[#E5E7EB]">
              <span className="text-[#737373] uppercase font-semibold text-[10px]">Confirmed Savings</span>
              <p className="text-lg font-bold text-emerald-700 mt-1 tabular-nums">
                {formatCurrency(readiness.currentSavings, currency)}
              </p>
              <p className="text-[10px] text-[#737373] mt-0.5">Available liquid cash</p>
            </div>

            <div className="bg-[#F8F9FA] p-4 rounded border border-[#E5E7EB]">
              <span className="text-[#737373] uppercase font-semibold text-[10px]">Current Savings Gap</span>
              <p className="text-lg font-bold text-amber-700 mt-1 tabular-nums">
                {formatCurrency(readiness.savingsGap, currency)}
              </p>
              <p className="text-[10px] text-[#737373] mt-0.5">Capital to accumulate</p>
            </div>

            <div className="bg-[#F8F9FA] p-4 rounded border border-[#E5E7EB]">
              <span className="text-[#737373] uppercase font-semibold text-[10px]">Required / Week</span>
              <p className="text-lg font-bold text-teal-800 mt-1 tabular-nums">
                {formatCurrency(readiness.weeklySavingsRequired, currency)}
              </p>
              <p className="text-[10px] text-[#737373] mt-0.5">Paced over {readiness.weeksRemaining} weeks</p>
            </div>
          </div>

          {/* Capital Sources Breakdown: Confirmed vs Pending Receivables vs Expected Repayments */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* Column 1: Pending Invoices */}
            <div className="bg-[#F8F9FA] p-3.5 rounded border border-[#E5E7EB] space-y-2">
              <div className="flex items-center justify-between text-[#171717] font-semibold text-xs">
                <span>Pending Client Invoices</span>
                <span className="text-amber-700 text-[10px] font-medium">Potential Inflow</span>
              </div>
              <div className="space-y-1 mt-2">
                {readiness.pendingReceivables?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between p-2 bg-white rounded border border-[#E5E7EB]">
                    <span className="text-[#737373] truncate max-w-[140px]">{item.source}</span>
                    <span className="font-semibold text-[#171717] tabular-nums">{formatCurrency(item.amount, currency)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: Peer Loan Repayments Expected */}
            <div className="bg-[#F8F9FA] p-3.5 rounded border border-[#E5E7EB] space-y-2">
              <div className="flex items-center justify-between text-[#171717] font-semibold text-xs">
                <span>Expected Loan Repayments</span>
                <span className="text-teal-800 text-[10px] font-medium">Receivable</span>
              </div>
              <div className="space-y-1 mt-2">
                {readiness.expectedRepayments?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between p-2 bg-white rounded border border-[#E5E7EB]">
                    <span className="text-[#737373]">{item.person}</span>
                    <span className="font-semibold text-[#171717] tabular-nums">{formatCurrency(item.amount, currency)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 3: Protected Reserves */}
            <div className="bg-[#F8F9FA] p-3.5 rounded border border-[#E5E7EB] space-y-2">
              <div className="flex items-center justify-between text-[#171717] font-semibold text-xs">
                <span>Protected Obligations</span>
                <span className="text-rose-700 text-[10px] font-medium">Do Not Touch</span>
              </div>
              <div className="space-y-1 mt-2">
                {readiness.liabilitiesToProtect?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between p-2 bg-white rounded border border-[#E5E7EB]">
                    <span className="text-[#737373] truncate max-w-[140px]">{item.obligation}</span>
                    <span className="font-semibold text-rose-700 tabular-nums">{formatCurrency(item.amount, currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Strategy */}
          <div className="p-3.5 bg-[#F8F9FA] rounded border border-[#E5E7EB] space-y-2">
            <span className="text-[10px] font-semibold text-[#171717] uppercase tracking-wider">
              Strategic Action Plan
            </span>
            <ul className="space-y-1.5 text-xs text-[#171717]">
              {readiness.recommendedStrategy?.map((strat: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 size={13} className="text-teal-700 shrink-0 mt-0.5" />
                  <span>{strat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Financial Disclaimer */}
          <div className="flex items-start space-x-2 text-[11px] text-[#737373] bg-[#F8F9FA] p-3 rounded border border-[#E5E7EB]">
            <Info size={14} className="text-[#737373] shrink-0 mt-0.5" />
            <p>{readiness.disclaimer}</p>
          </div>
        </div>
      )}

      {/* Savings Goals Tracker */}
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-bold text-[#171717]">Savings Plans &amp; Dedicated Allocations</h2>
          <p className="text-xs text-[#737373]">Allocations funded from realized client earnings and debt recovery.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => (
            <div key={goal.id} className="fintech-card p-5 space-y-3.5">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-medium uppercase text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                    {goal.category || 'Goal'}
                  </span>
                  <h3 className="text-sm font-semibold text-[#171717] mt-1">{goal.title}</h3>
                  <p className="text-xs text-[#737373]">Target Date: {formatDate(goal.targetDate)}</p>
                </div>
                <button
                  onClick={() => setSelectedGoalForDeposit(goal)}
                  className="btn-secondary text-xs flex items-center gap-1"
                >
                  <Plus size={13} /> Add Savings
                </button>
              </div>

              {/* Progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-[#171717] tabular-nums">{formatCurrency(goal.currentAmount, currency)} saved</span>
                  <span className="text-[#737373] tabular-nums">{formatCurrency(goal.targetAmount, currency)} target</span>
                </div>
                <div className="w-full bg-[#E5E7EB] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-teal-600 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, goal.percentage || 0)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-[#737373]">
                  <span>{goal.percentage}% completed</span>
                  <span className="tabular-nums">Remaining: {formatCurrency(goal.remainingAmount || 0, currency)}</span>
                </div>
              </div>

              {/* Weekly/Daily pace */}
              <div className="p-2.5 bg-[#F8F9FA] rounded border border-[#E5E7EB] grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="text-[10px] text-[#737373] uppercase font-semibold">Daily Pace</span>
                  <p className="font-semibold text-[#171717] tabular-nums">{formatCurrency(goal.dailyRequired || 0, currency)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-[#737373] uppercase font-semibold">Weekly Pace</span>
                  <p className="font-semibold text-teal-800 tabular-nums">{formatCurrency(goal.weeklyRequired || 0, currency)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-[#737373] uppercase font-semibold">Days Left</span>
                  <p className="font-semibold text-[#171717]">{goal.daysRemaining}d</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Investment Watchlist & IPO Tracker */}
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-bold text-[#171717]">Investment Watchlist &amp; IPO Tracker</h2>
          <p className="text-xs text-[#737373]">
            Track opportunities with verified filings vs rumoured assets.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {opportunities.map((opp) => (
            <div key={opp.id} className="fintech-card p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    {opp.logoUrl ? (
                      <img src={opp.logoUrl} alt={opp.companyName} className="w-8 h-8 rounded object-cover border border-[#E5E7EB]" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-[#F8F9FA] border border-[#E5E7EB] flex items-center justify-center font-bold text-xs text-[#171717]">
                        {opp.companyName[0]}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-[#171717] text-xs leading-tight">{opp.companyName}</h3>
                      <span className="text-[10px] text-[#737373]">{opp.category}</span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
                      opp.status === 'CONFIRMED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : opp.status === 'UNVERIFIED'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {opp.status}
                  </span>
                </div>

                {/* Unverified Callout Banner if applicable */}
                {!opp.isVerified && (
                  <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded flex items-start gap-1.5 text-[11px] text-amber-800">
                    <AlertTriangle size={12} className="text-amber-700 shrink-0 mt-0.5" />
                    <span>Unconfirmed filing. Do not treat dates as final.</span>
                  </div>
                )}

                <p className="mt-3 text-xs text-[#737373] leading-relaxed">{opp.description}</p>

                <div className="mt-4 pt-3 border-t border-[#E5E7EB] space-y-1 text-xs">
                  {opp.priceBand && (
                    <div className="flex justify-between">
                      <span className="text-[#737373]">Price Band:</span>
                      <span className="font-medium text-[#171717]">{opp.priceBand}</span>
                    </div>
                  )}
                  {opp.expectedAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#737373]">Target Capital:</span>
                      <span className="font-semibold text-[#171717] tabular-nums">{formatCurrency(opp.expectedAmount, currency)}</span>
                    </div>
                  )}
                  {opp.officialSource && (
                    <div className="flex justify-between text-[11px] text-[#737373]">
                      <span>Source:</span>
                      <span className="truncate max-w-[150px] text-[#171717]">{opp.officialSource}</span>
                    </div>
                  )}
                </div>
              </div>

              {opp.infoUrl && (
                <div className="mt-4 pt-3 border-t border-[#E5E7EB]">
                  <a
                    href={opp.infoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-teal-800 hover:text-teal-950 font-medium flex items-center gap-1"
                  >
                    Official Portal <ExternalLink size={11} />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add Contribution Modal */}
      {selectedGoalForDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="fintech-card w-full max-w-sm overflow-hidden bg-white">
            <div className="px-5 py-3.5 bg-[#F8F9FA] border-b border-[#E5E7EB] flex justify-between items-center">
              <h3 className="font-semibold text-xs text-[#171717]">Add Confirmed Savings</h3>
              <button onClick={() => setSelectedGoalForDeposit(null)} className="text-[#737373] hover:text-[#171717]">
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleContributeSavings} className="p-5 space-y-3.5 text-xs">
              <div className="bg-[#F8F9FA] p-3 rounded border border-[#E5E7EB]">
                <p className="font-semibold text-[#171717]">{selectedGoalForDeposit.title}</p>
                <p className="text-[#737373] text-[11px] mt-0.5">
                  Target: {formatCurrency(selectedGoalForDeposit.targetAmount, currency)} | Current: {formatCurrency(selectedGoalForDeposit.currentAmount, currency)}
                </p>
              </div>

              <div>
                <label className="block font-medium text-[#171717] mb-1">Confirmed Amount to Allocate (INR) *</label>
                <input
                  type="number"
                  required
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="fintech-input"
                />
              </div>

              <div>
                <label className="block font-medium text-[#171717] mb-1">Funding Source / Notes</label>
                <input
                  type="text"
                  value={depositNotes}
                  onChange={(e) => setDepositNotes(e.target.value)}
                  placeholder="e.g. Cleared PayPal invoice INV-2026-001"
                  className="fintech-input"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setSelectedGoalForDeposit(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="fintech-card w-full max-w-md overflow-hidden bg-white">
            <div className="px-5 py-3.5 bg-[#F8F9FA] border-b border-[#E5E7EB] flex justify-between items-center">
              <h3 className="font-semibold text-xs text-[#171717]">Track Investment Opportunity</h3>
              <button onClick={() => setShowAddOppModal(false)} className="text-[#737373] hover:text-[#171717]">
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleAddOpportunity} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-[#171717] mb-1">Company / Asset Name *</label>
                <input
                  type="text"
                  required
                  value={oppName}
                  onChange={(e) => setOppName(e.target.value)}
                  placeholder="e.g. OpenAI Secondary / Reliance Retail IPO"
                  className="fintech-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#171717] mb-1">Category</label>
                  <select
                    value={oppCategory}
                    onChange={(e) => setOppCategory(e.target.value)}
                    className="fintech-input bg-white"
                  >
                    <option value="IPO">IPO</option>
                    <option value="STOCKS">Stocks</option>
                    <option value="ETFS">ETFs</option>
                    <option value="MUTUAL_FUNDS">Mutual Funds</option>
                    <option value="OTHER">Other Secondary</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[#171717] mb-1">Status</label>
                  <select
                    value={oppStatus}
                    onChange={(e) => setOppStatus(e.target.value)}
                    className="fintech-input bg-white"
                  >
                    <option value="UNVERIFIED">Unverified / Rumoured</option>
                    <option value="ANNOUNCED">Announced</option>
                    <option value="CONFIRMED">Confirmed DRHP</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#171717] mb-1">Target Capital (INR)</label>
                  <input
                    type="number"
                    value={oppExpectedAmount}
                    onChange={(e) => setOppExpectedAmount(e.target.value)}
                    className="fintech-input"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#171717] mb-1">Indicative Price Band</label>
                  <input
                    type="text"
                    value={oppPriceBand}
                    onChange={(e) => setOppPriceBand(e.target.value)}
                    placeholder="e.g. ₹500 - ₹550"
                    className="fintech-input"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#171717] mb-1">Official Information Source</label>
                <input
                  type="text"
                  value={oppOfficialSource}
                  onChange={(e) => setOppOfficialSource(e.target.value)}
                  placeholder="e.g. SEBI draft filing or company press release"
                  className="fintech-input"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setShowAddOppModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="fintech-card w-full max-w-md overflow-hidden bg-white">
            <div className="px-5 py-3.5 bg-[#F8F9FA] border-b border-[#E5E7EB] flex justify-between items-center">
              <h3 className="font-semibold text-xs text-[#171717]">Create Financial Goal</h3>
              <button onClick={() => setShowAddGoalModal(false)} className="text-[#737373] hover:text-[#171717]">
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleAddGoal} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-[#171717] mb-1">Goal Title *</label>
                <input
                  type="text"
                  required
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  placeholder="e.g. Prepare for Anthropic IPO Watch"
                  className="fintech-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#171717] mb-1">Target Amount (INR) *</label>
                  <input
                    type="number"
                    required
                    value={goalTargetAmount}
                    onChange={(e) => setGoalTargetAmount(e.target.value)}
                    placeholder="25000"
                    className="fintech-input"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#171717] mb-1">Initial Deposit (INR)</label>
                  <input
                    type="number"
                    value={goalInitial}
                    onChange={(e) => setGoalInitial(e.target.value)}
                    placeholder="8000"
                    className="fintech-input"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#171717] mb-1">Target Date *</label>
                <input
                  type="date"
                  required
                  value={goalTargetDate}
                  onChange={(e) => setGoalTargetDate(e.target.value)}
                  className="fintech-input"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setShowAddGoalModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
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
