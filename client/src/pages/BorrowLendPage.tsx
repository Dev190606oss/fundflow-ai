import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  Plus,
  HandCoins,
  Receipt,
  UserCheck,
  Calendar,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  MessageSquare,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { loanApi, aiApi } from '../services/api';
import { Loan, LoanType } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

export const BorrowLendPage: React.FC = () => {
  const { currency } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'LENT' | 'BORROWED'>('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState<LoanType>('LENT');
  const [selectedLoanForRepay, setSelectedLoanForRepay] = useState<Loan | null>(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayNotes, setRepayNotes] = useState('');

  // AI Reminder Modal
  const [reminderModal, setReminderModal] = useState<{
    isOpen: boolean;
    loan: Loan | null;
    subject: string;
    message: string;
    channel: string;
    loading: boolean;
    copied: boolean;
  }>({
    isOpen: false,
    loan: null,
    subject: '',
    message: '',
    channel: 'WHATSAPP',
    loading: false,
    copied: false,
  });

  // Form State
  const [partyName, setPartyName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const res = await loanApi.getAll();
      setLoans(res.loans);
      setSummary(res.summary);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loanApi.create({
        type: modalType,
        partyName,
        contactInfo,
        principalAmount: Number(principalAmount),
        dueDate: dueDate || null,
        notes,
      });
      setShowAddModal(false);
      resetForm();
      fetchLoans();
    } catch (err: any) {
      alert(err.message || 'Failed to save loan');
    }
  };

  const handleRecordRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanForRepay) return;
    try {
      await loanApi.addRepayment(selectedLoanForRepay.id, {
        amount: Number(repayAmount),
        notes: repayNotes,
      });
      setSelectedLoanForRepay(null);
      setRepayAmount('');
      setRepayNotes('');
      fetchLoans();
    } catch (err: any) {
      alert(err.message || 'Failed to record repayment');
    }
  };

  const handleDeleteLoan = async (id: string) => {
    if (confirm('Delete this record?')) {
      await loanApi.delete(id);
      fetchLoans();
    }
  };

  const handleGeneratePoliteReminder = async (loan: Loan) => {
    setReminderModal({
      isOpen: true,
      loan,
      subject: '',
      message: '',
      channel: 'WHATSAPP',
      loading: true,
      copied: false,
    });

    try {
      const res = await aiApi.generatePoliteReminder({
        partyName: loan.partyName,
        amount: loan.remainingAmount,
        dueDate: formatDate(loan.dueDate),
        type: 'LENT',
        context: loan.notes,
      });

      setReminderModal((prev) => ({
        ...prev,
        subject: res.subject,
        message: res.message,
        channel: res.channel,
        loading: false,
      }));
    } catch {
      setReminderModal((prev) => ({
        ...prev,
        message: `Hi ${loan.partyName}, hope you're having a great week! Just a gentle reminder regarding the ₹${loan.remainingAmount.toLocaleString('en-IN')} repayment balance scheduled for ${formatDate(loan.dueDate)}. Let me know when you can process it. Thank you!`,
        loading: false,
      }));
    }
  };

  const resetForm = () => {
    setPartyName('');
    setContactInfo('');
    setPrincipalAmount('');
    setDueDate('');
    setNotes('');
  };

  const filtered = loans.filter((l) => {
    if (activeTab === 'LENT') return l.type === 'LENT';
    if (activeTab === 'BORROWED') return l.type === 'BORROWED';
    return true;
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Borrow & Lend Ledger</h1>
          <p className="text-xs text-slate-500 mt-1">Track money lent to peers, borrowings, partial repayments, and AI reminders.</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setModalType('LENT');
              setShowAddModal(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition"
          >
            <Plus size={15} />
            <span>Record Money Lent</span>
          </button>
          <button
            onClick={() => {
              setModalType('BORROWED');
              setShowAddModal(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md transition"
          >
            <Plus size={15} />
            <span>Record Borrowing</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="fintech-card p-5 border-l-4 border-l-blue-500">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Money Lent (Receivables)</span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {formatCurrency(summary.lentOutstanding || 0, currency)}
          </p>
          <p className="text-xs text-emerald-600 font-semibold mt-1">
            {formatCurrency(summary.totalLentRecovered || 0, currency)} already recovered
          </p>
        </div>

        <div className="fintech-card p-5 border-l-4 border-l-purple-500">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Money Borrowed (Liabilities)</span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {formatCurrency(summary.borrowedOutstanding || 0, currency)}
          </p>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            {formatCurrency(summary.totalBorrowedRepaid || 0, currency)} repaid by you
          </p>
        </div>

        <div className="fintech-card p-5 border-l-4 border-l-emerald-500">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Net Position</span>
          <p className={`text-2xl font-black mt-1 ${summary.netPosition >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(summary.netPosition || 0, currency)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {summary.netPosition >= 0 ? 'Net creditor (positive cash)' : 'Net debtor'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-bold w-full sm:w-80">
        {(['ALL', 'LENT', 'BORROWED'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 rounded-lg transition ${
              activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab === 'LENT' ? 'Money Lent' : tab === 'BORROWED' ? 'Borrowed' : 'All Ledgers'}
          </button>
        ))}
      </div>

      {/* Loans Grid / Cards */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading ledgers...</div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((loan) => {
            const isLent = loan.type === 'LENT';
            const isCompleted = loan.status === 'FULLY_REPAID';
            return (
              <div key={loan.id} className="fintech-card p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                          isLent ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {isLent ? 'Money Lent' : 'Money Borrowed'}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-1">{loan.partyName}</h3>
                      {loan.contactInfo && (
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{loan.contactInfo}</p>
                      )}
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {loan.status}
                    </span>
                  </div>

                  {/* Amounts */}
                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold">Principal</span>
                      <p className="font-bold text-slate-900">{formatCurrency(loan.principalAmount, currency)}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold">Remaining Balance</span>
                      <p className={`font-black text-sm ${loan.remainingAmount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {formatCurrency(loan.remainingAmount, currency)}
                      </p>
                    </div>
                  </div>

                  {/* Repayment Progress Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                      <span>Repaid: {formatCurrency(loan.amountRepaid, currency)}</span>
                      <span>
                        {loan.principalAmount > 0
                          ? Math.round((loan.amountRepaid / loan.principalAmount) * 100)
                          : 100}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isLent ? 'bg-blue-600' : 'bg-purple-600'}`}
                        style={{
                          width: `${Math.min(
                            100,
                            loan.principalAmount > 0 ? (loan.amountRepaid / loan.principalAmount) * 100 : 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Due Date: {formatDate(loan.dueDate)}</span>
                    <span>Disbursed: {formatDate(loan.startDate)}</span>
                  </div>

                  {loan.notes && (
                    <p className="mt-2 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg italic">
                      "{loan.notes}"
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {!isCompleted && (
                      <button
                        onClick={() => setSelectedLoanForRepay(loan)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition"
                      >
                        + Repay
                      </button>
                    )}

                    {isLent && !isCompleted && (
                      <button
                        onClick={() => handleGeneratePoliteReminder(loan)}
                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                        title="AI writes polite repayment follow-up"
                      >
                        <Sparkles size={12} className="text-amber-500" />
                        <span>AI Reminder</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteLoan(loan.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                    title="Delete record"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center fintech-card">
          <ArrowLeftRight className="mx-auto text-slate-300 mb-2" size={32} />
          <p className="text-sm font-semibold text-slate-700">No records found</p>
          <p className="text-xs text-slate-400 mt-1">Record money lent to friends or professional borrowings.</p>
        </div>
      )}

      {/* Add Loan Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">
                {modalType === 'LENT' ? 'Record Money Lent' : 'Record Borrowed Money'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateLoan} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {modalType === 'LENT' ? "Borrower's Name *" : "Lender's Name *"}
                </label>
                <input
                  type="text"
                  required
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Info (Phone / Email)</label>
                <input
                  type="text"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder="+91 98450 11223"
                  className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount (INR) *</label>
                  <input
                    type="number"
                    required
                    value={principalAmount}
                    onChange={(e) => setPrincipalAmount(e.target.value)}
                    placeholder="15000"
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expected Repayment Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Purpose</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason or conditions of loan..."
                  className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Repayment Modal */}
      {selectedLoanForRepay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Record Repayment</h3>
              <button onClick={() => setSelectedLoanForRepay(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleRecordRepayment} className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-600">
                <p>Party: <strong className="text-slate-900">{selectedLoanForRepay.partyName}</strong></p>
                <p>Remaining: <strong className="text-amber-600">{formatCurrency(selectedLoanForRepay.remainingAmount, currency)}</strong></p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Repayment Amount (INR) *</label>
                <input
                  type="number"
                  required
                  max={selectedLoanForRepay.remainingAmount}
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  placeholder={`Max: ${selectedLoanForRepay.remainingAmount}`}
                  className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes (e.g. UPI Ref #)</label>
                <input
                  type="text"
                  value={repayNotes}
                  onChange={(e) => setRepayNotes(e.target.value)}
                  placeholder="Installment paid via Google Pay"
                  className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedLoanForRepay(null)}
                  className="px-4 py-2 border rounded-xl font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-500/20"
                >
                  Confirm Repayment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Polite Follow-Up Reminder Modal */}
      {reminderModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Sparkles size={16} className="text-amber-300" />
                <h3 className="font-bold text-sm">Polite AI Repayment Reminder</h3>
              </div>
              <button onClick={() => setReminderModal((prev) => ({ ...prev, isOpen: false }))} className="text-slate-300 hover:text-white">✕</button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-500">
                AI drafted a respectful check-in for <strong>{reminderModal.loan?.partyName}</strong>. You have full approval control before sending:
              </p>

              {reminderModal.loading ? (
                <div className="py-8 text-center text-slate-400">AI is drafting a courteous reminder...</div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-800 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                    {reminderModal.message}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-slate-400">Review before copying</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(reminderModal.message);
                        setReminderModal((prev) => ({ ...prev, copied: true }));
                        setTimeout(() => setReminderModal((prev) => ({ ...prev, copied: false })), 2000);
                      }}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition"
                    >
                      {reminderModal.copied ? <Check size={14} /> : <Copy size={14} />}
                      <span>{reminderModal.copied ? 'Copied to Clipboard!' : 'Copy Message'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
