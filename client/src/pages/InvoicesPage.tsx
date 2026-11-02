import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  ArrowRight,
  Download,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  ShieldCheck,
  CreditCard,
  Building,
} from 'lucide-react';
import { invoiceApi, clientApi } from '../services/api';
import { Invoice, Client, InvoiceItem } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { PayPalPaymentModal } from '../components/PayPalPaymentModal';

export const InvoicesPage: React.FC = () => {
  const { currency, user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoiceForPay, setSelectedInvoiceForPay] = useState<Invoice | null>(null);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  // Form State
  const [clientId, setClientId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [taxRate, setTaxRate] = useState('18');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [notes, setNotes] = useState('Payment is due within 15 days of invoice date. Thank you for your partnership!');
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: 'Sprint Deliverables & Implementation', quantity: 1, unitPrice: 20000, amount: 20000 },
  ]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invRes, clientRes] = await Promise.all([
        invoiceApi.getAll(),
        clientApi.getAll(),
      ]);
      setInvoices(invRes);
      setClients(clientRes);
      if (clientRes.length > 0 && !clientId) {
        setClientId(clientRes[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, amount: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    if (field === 'quantity' || field === 'unitPrice') {
      updated[index].amount = (Number(updated[index].quantity) || 0) * (Number(updated[index].unitPrice) || 0);
    }
    setItems(updated);
  };

  const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const tax = (subtotal * (Number(taxRate) || 0)) / 100;
  const discount = Number(discountAmount) || 0;
  const grandTotal = Math.max(0, subtotal + tax - discount);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await invoiceApi.create({
        clientId,
        dueDate: dueDate || new Date(Date.now() + 14 * 86400000).toISOString(),
        taxRate: Number(taxRate) || 0,
        discountAmount: Number(discountAmount) || 0,
        notes,
        items,
      });
      setShowCreateModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create invoice');
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (confirm('Delete this invoice?')) {
      await invoiceApi.delete(id);
      fetchData();
    }
  };

  const filtered = invoices.filter((inv) => {
    const matchesStatus = filterStatus === 'ALL' || inv.status === filterStatus;
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.client.name.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Invoices & PayPal Payments</h1>
          <p className="text-xs text-slate-500 mt-1">Create invoices, manage balances, and verify payments via PayPal Sandbox.</p>
        </div>

        <button
          onClick={() => {
            const twoWeeks = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
            setDueDate(twoWeeks);
            setShowCreateModal(true);
          }}
          className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition self-start"
        >
          <Plus size={16} />
          <span>Create New Invoice</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by invoice # or client..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-bold overflow-x-auto w-full sm:w-auto">
          {['ALL', 'PENDING', 'OVERDUE', 'PAID'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterStatus === status ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Invoice Table Card */}
      <div className="fintech-card overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading invoices...</div>
        ) : filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Balance Due</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map((inv) => {
                  const balanceDue = inv.totalAmount - inv.paidAmount;
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{inv.client.name}</div>
                        <div className="text-[10px] text-slate-400">{inv.client.company || inv.client.email}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{formatDate(inv.dueDate)}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{formatCurrency(inv.totalAmount, currency)}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {balanceDue > 0 ? (
                          <span className="text-amber-600">{formatCurrency(balanceDue, currency)}</span>
                        ) : (
                          <span className="text-emerald-600 font-bold">Settled</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-700'
                              : inv.status === 'OVERDUE'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {balanceDue > 0 && (
                            <button
                              onClick={() => setSelectedInvoiceForPay(inv)}
                              className="px-2.5 py-1 bg-[#FFC439] hover:bg-[#F2BA36] text-slate-900 text-[11px] font-extrabold rounded-lg shadow-sm flex items-center gap-1 transition"
                              title="Pay instantly via PayPal Sandbox"
                            >
                              <span className="italic font-bold text-blue-900">P</span>
                              <span>PayPal Pay</span>
                            </button>
                          )}
                          <button
                            onClick={() => setViewInvoice(inv)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100"
                            title="View / Print PDF"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteInvoice(inv.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100"
                            title="Delete Invoice"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <FileText className="mx-auto text-slate-300 mb-2" size={32} />
            <p className="text-sm font-semibold text-slate-700">No invoices found</p>
            <p className="text-xs text-slate-400 mt-1">Create an invoice to bill clients with PayPal.</p>
          </div>
        )}
      </div>

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Create Professional Invoice</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Client *</label>
                  <select
                    required
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.company || c.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div>
                <label className="block font-bold text-slate-800 mb-2">Invoice Line Items</label>
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <input
                        type="text"
                        placeholder="Deliverable description..."
                        required
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="flex-1 px-2.5 py-1.5 border rounded-lg bg-white"
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="w-16 px-2 py-1.5 border rounded-lg bg-white text-center"
                      />
                      <input
                        type="number"
                        placeholder="Unit Price"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                        className="w-24 px-2 py-1.5 border rounded-lg bg-white text-right"
                      />
                      <span className="w-20 text-right font-bold text-slate-800">
                        {formatCurrency(item.amount, currency)}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="mt-2 text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                >
                  <Plus size={14} /> Add Another Line Item
                </button>
              </div>

              {/* Tax & Discount */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tax Rate (GST/VAT %)</label>
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Discount Amount (INR)</label>
                  <input
                    type="number"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>

              {/* Calculations Box */}
              <div className="bg-slate-100/80 p-3 rounded-xl space-y-1.5 text-right font-medium">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal, currency)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax ({taxRate}%):</span>
                  <span>{formatCurrency(tax, currency)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(discount, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-1">
                  <span>Grand Total:</span>
                  <span>{formatCurrency(grandTotal, currency)}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Terms</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20"
                >
                  Generate Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Printable Invoice Modal */}
      {viewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center print:hidden">
              <span className="font-bold text-sm">Invoice Preview</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <Download size={14} /> Print / PDF
                </button>
                <button onClick={() => setViewInvoice(null)} className="text-slate-400 hover:text-white">✕</button>
              </div>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto flex-1 text-slate-800" id="printable-invoice">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">FundFlow AI</h2>
                  <p className="text-xs text-slate-500 mt-1">{user?.businessName || 'Freelance Studio'}</p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-mono font-bold text-blue-600">{viewInvoice.invoiceNumber}</span>
                  <p className="text-xs text-slate-500 mt-1">Issue Date: {formatDate(viewInvoice.issueDate)}</p>
                  <p className="text-xs text-slate-500 font-semibold">Due Date: {formatDate(viewInvoice.dueDate)}</p>
                </div>
              </div>

              {/* Billed To */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Billed To:</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{viewInvoice.client.name}</p>
                  <p className="text-slate-600">{viewInvoice.client.company}</p>
                  <p className="text-slate-600">{viewInvoice.client.email}</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Payment Status:</span>
                  <p className="font-bold text-base mt-0.5 text-blue-600">{viewInvoice.status}</p>
                  <p className="text-slate-500">Verified PayPal Gateway</p>
                </div>
              </div>

              {/* Items List */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewInvoice.items?.map((item: any, i: number) => (
                      <tr key={i}>
                        <td className="p-3 font-medium">{item.description}</td>
                        <td className="p-3 text-center">{item.quantity}</td>
                        <td className="p-3 text-right">{formatCurrency(item.unitPrice, currency)}</td>
                        <td className="p-3 text-right font-bold">{formatCurrency(item.amount, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end text-xs">
                <div className="w-64 space-y-1.5 font-medium">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(viewInvoice.subtotal, currency)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tax ({viewInvoice.taxRate}%):</span>
                    <span>{formatCurrency(viewInvoice.taxAmount, currency)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-1.5">
                    <span>Total Amount:</span>
                    <span>{formatCurrency(viewInvoice.totalAmount, currency)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-emerald-600">
                    <span>Paid to Date:</span>
                    <span>{formatCurrency(viewInvoice.paidAmount, currency)}</span>
                  </div>
                </div>
              </div>

              {/* Footer Notes */}
              {viewInvoice.notes && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                  <p className="font-semibold text-slate-800">Payment Terms & Notes:</p>
                  <p className="mt-0.5">{viewInvoice.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PayPal Payment Modal */}
      {selectedInvoiceForPay && (
        <PayPalPaymentModal
          invoice={selectedInvoiceForPay}
          isOpen={Boolean(selectedInvoiceForPay)}
          onClose={() => setSelectedInvoiceForPay(null)}
          onPaymentSuccess={() => {
            setSelectedInvoiceForPay(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
};
