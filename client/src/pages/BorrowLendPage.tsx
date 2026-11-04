import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  Plus,
  Sparkles,
  Copy,
  Check,
  Trash2,
  X,
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
        message: `Hi ${loan.partyName}, hope you're having a great week. Just a gentle reminder regarding the ₹${loan.remainingAmount.toLocaleString('en-IN')} repayment scheduled for ${formatDate(loan.dueDate)}. Please let me know when convenient to process. Thank you!`,
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
          <h1 className="text-xl font-bold text-[#171717] tracking-tight">Borrow &amp; Lend Ledger</h1>
          <p className="text-xs text-[#737373] mt-0.5">Track money lent to peers, borrowings, partial repayments, and AI-drafted follow-ups.</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setModalType('LENT');
              setShowAddModal(true);
            }}
            className="btn-primary flex items-center space-x-1.5"
          >
            <Plus size={14} />
            <span>Record Money Lent</span>
          </button>
          <button
            onClick={() => {
              setModalType('BORROWED');
              setShowAddModal(true);
            }}
            className="btn-secondary flex items-center space-x-1.5"
          >
            <Plus size={14} />
            <span>Record Borrowing</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="fintech-card p-5">
          <span className="text-[#737373] text-[10px] font-semibold uppercase tracking-wider">Money Lent (Receivables)</span>
          <p className="text-xl font-bold text-[#171717] mt-1 tabular-nums">
            {formatCurrency(summary.lentOutstanding || 0, currency)}
          </p>
          <p className="text-xs text-emerald-700 font-medium mt-1">
            {formatCurrency(summary.totalLentRecovered || 0, currency)} recovered
          </p>
        </div>

        <div className="fintech-card p-5">
          <span className="text-[#737373] text-[10px] font-semibold uppercase tracking-wider">Money Borrowed (Liabilities)</span>
          <p className="text-xl font-bold text-[#171717] mt-1 tabular-nums">
            {formatCurrency(summary.borrowedOutstanding || 0, currency)}
          </p>
          <p className="text-xs text-[#737373] mt-1">
            {formatCurrency(summary.totalBorrowedRepaid || 0, currency)} repaid by you
          </p>
        </div>

        <div className="fintech-card p-5">
          <span className="text-[#737373] text-[10px] font-semibold uppercase tracking-wider">Net Position</span>
          <p className={`text-xl font-bold mt-1 tabular-nums ${summary.netPosition >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {formatCurrency(summary.netPosition || 0, currency)}
          </p>
          <p className="text-xs text-[#737373] mt-1">
            {summary.netPosition >= 0 ? 'Net creditor (positive capital)' : 'Net debtor'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#F8F9FA] border border-[#E5E7EB] p-0.5 rounded-lg text-xs font-medium w-full sm:w-72">
        {(['ALL', 'LENT', 'BORROWED'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 rounded transition ${
              activeTab === tab
                ? 'bg-white text-[#171717] shadow-sm font-semibold'
                : 'text-[#737373] hover:text-[#171717]'
            }`}
          >
            {tab === 'LENT' ? 'Money Lent' : tab === 'BORROWED' ? 'Borrowed' : 'All Ledgers'}
          </button>
        ))}
      </div>

      {/* Loans Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-[#737373]">Loading ledgers...</div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((loan) => {
            const isLent = loan.type === 'LENT';
            const isCompleted = loan.status === 'FULLY_REPAID';
            return (
              <div key={loan.id} className="fintech-card p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span
                        className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded border ${
                          isLent
                            ? 'bg-teal-50 text-teal-800 border-teal-200'
                            : 'bg-[#F8F9FA] text-[#171717] border-[#E5E7EB]'
                        }`}
                      >
                        {isLent ? 'Money Lent' : 'Borrowed'}
                      </span>
                      <h3 className="text-sm font-semibold text-[#171717] mt-1">{loan.partyName}</h3>
                      {loan.contactInfo && (
                        <p className="text-[11px] text-[#737373] truncate mt-0.5">{loan.contactInfo}</p>
                      )}
                    </div>

                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
                        isCompleted
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {loan.status}
                    </span>
                  </div>

                  {/* Amounts */}
                  <div className="mt-4 pt-3 border-t border-[#E5E7EB] grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[#737373] text-[10px] uppercase font-semibold">Principal</span>
                      <p className="font-semibold text-[#171717] tabular-nums">{formatCurrency(loan.principalAmount, currency)}</p>
                    </div>
                    <div>
                      <span className="text-[#737373] text-[10px] uppercase font-semibold">Remaining</span>
                      <p className={`font-semibold tabular-nums ${loan.remainingAmount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {formatCurrency(loan.remainingAmount, currency)}
                      </p>
                    </div>
                  </div>

                  {/* Repayment Progress Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] text-[#737373] mb-1">
                      <span>Repaid: {formatCurrency(loan.amountRepaid, currency)}</span>
                      <span className="tabular-nums">
                        {loan.principalAmount > 0
                          ? Math.round((loan.amountRepaid / loan.principalAmount) * 100)
                          : 100}%
                      </span>
                    </div>
                    <div className="w-full bg-[#E5E7EB] rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isLent ? 'bg-teal-600' : 'bg-[#171717]'}`}
                        style={{
                          width: `${Math.min(
                            100,
                            loan.principalAmount > 0 ? (loan.amountRepaid / loan.principalAmount) * 100 : 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-[#737373] flex items-center justify-between">
                    <span>Due: {formatDate(loan.dueDate)}</span>
                    <span>Disbursed: {formatDate(loan.startDate)}</span>
                  </div>

                  {loan.notes && (
                    <p className="mt-2 text-[11px] text-[#737373] bg-[#F8F9FA] p-2 rounded border border-[#E5E7EB]">
                      "{loan.notes}"
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-[#E5E7EB] flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {!isCompleted && (
                      <button
                        onClick={() => setSelectedLoanForRepay(loan)}
                        className="btn-secondary text-xs"
                      >
                        + Repay
                      </button>
                    )}

                    {isLent && !isCompleted && (
                      <button
                        onClick={() => handleGeneratePoliteReminder(loan)}
                        className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded border border-teal-200 text-xs font-medium flex items-center gap-1 transition"
                        title="AI writes polite repayment follow-up"
                      >
                        <Sparkles size={12} className="text-teal-700" />
                        <span>AI Reminder</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteLoan(loan.id)}
                    className="p-1.5 text-[#737373] hover:text-rose-600 rounded"
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
          <ArrowLeftRight className="mx-auto text-[#737373] mb-2" size={28} />
          <p className="text-xs font-semibold text-[#171717]">No records found</p>
          <p className="text-xs text-[#737373] mt-0.5">Record money lent to contacts or professional borrowings.</p>
        </div>
      )}

      {/* Add Loan Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="fintech-card w-full max-w-md overflow-hidden bg-white">
            <div className="px-5 py-3.5 bg-[#F8F9FA] border-b border-[#E5E7EB] flex justify-between items-center">
              <h3 className="font-semibold text-xs text-[#171717]">
                {modalType === 'LENT' ? 'Record Money Lent' : 'Record Borrowed Money'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#737373] hover:text-[#171717]">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateLoan} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-[#171717] mb-1">
                  {modalType === 'LENT' ? "Borrower's Name *" : "Lender's Name *"}
                </label>
                <input
                  type="text"
                  required
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="fintech-input"
                />
              </div>

              <div>
                <label className="block font-medium text-[#171717] mb-1">Contact Info (Phone / Email)</label>
                <input
                  type="text"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder="+91 98450 11223"
                  className="fintech-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#171717] mb-1">Amount (INR) *</label>
                  <input
                    type="number"
                    required
                    value={principalAmount}
                    onChange={(e) => setPrincipalAmount(e.target.value)}
                    placeholder="15000"
                    className="fintech-input"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#171717] mb-1">Expected Repayment Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="fintech-input"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#171717] mb-1">Notes / Purpose</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Conditions or context..."
                  className="fintech-input"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="fintech-card w-full max-w-sm overflow-hidden bg-white">
            <div className="px-5 py-3.5 bg-[#F8F9FA] border-b border-[#E5E7EB] flex justify-between items-center">
              <h3 className="font-semibold text-xs text-[#171717]">Record Repayment</h3>
              <button onClick={() => setSelectedLoanForRepay(null)} className="text-[#737373] hover:text-[#171717]">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleRecordRepayment} className="p-5 space-y-3.5 text-xs">
              <div className="bg-[#F8F9FA] p-3 rounded border border-[#E5E7EB] text-[#737373]">
                <p>Party: <strong className="text-[#171717]">{selectedLoanForRepay.partyName}</strong></p>
                <p>Remaining: <strong className="text-amber-700 tabular-nums">{formatCurrency(selectedLoanForRepay.remainingAmount, currency)}</strong></p>
              </div>

              <div>
                <label className="block font-medium text-[#171717] mb-1">Repayment Amount (INR) *</label>
                <input
                  type="number"
                  required
                  max={selectedLoanForRepay.remainingAmount}
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  placeholder={`Max: ${selectedLoanForRepay.remainingAmount}`}
                  className="fintech-input"
                />
              </div>

              <div>
                <label className="block font-medium text-[#171717] mb-1">Notes (e.g. UPI Ref #)</label>
                <input
                  type="text"
                  value={repayNotes}
                  onChange={(e) => setRepayNotes(e.target.value)}
                  placeholder="Installment via UPI / Bank transfer"
                  className="fintech-input"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setSelectedLoanForRepay(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="fintech-card w-full max-w-md overflow-hidden bg-white">
            <div className="px-5 py-3.5 bg-[#F8F9FA] border-b border-[#E5E7EB] flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Sparkles size={15} className="text-teal-700" />
                <h3 className="font-semibold text-xs text-[#171717]">Polite Repayment Follow-Up</h3>
              </div>
              <button onClick={() => setReminderModal((prev) => ({ ...prev, isOpen: false }))} className="text-[#737373] hover:text-[#171717]">
                <X size={15} />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <p className="text-[#737373]">
                Drafted follow-up for <strong className="text-[#171717]">{reminderModal.loan?.partyName}</strong>. You have full review control:
              </p>

              {reminderModal.loading ? (
                <div className="py-6 text-center text-[#737373]">Drafting courteous reminder...</div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-[#F8F9FA] p-3.5 rounded border border-[#E5E7EB] text-[#171717] font-mono text-xs whitespace-pre-wrap leading-relaxed">
                    {reminderModal.message}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-[#737373]">Review before sending</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(reminderModal.message);
                        setReminderModal((prev) => ({ ...prev, copied: true }));
                        setTimeout(() => setReminderModal((prev) => ({ ...prev, copied: false })), 2000);
                      }}
                      className="btn-primary flex items-center gap-1.5"
                    >
                      {reminderModal.copied ? <Check size={13} /> : <Copy size={13} />}
                      <span>{reminderModal.copied ? 'Copied' : 'Copy Message'}</span>
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
