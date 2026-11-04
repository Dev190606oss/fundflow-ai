import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Download,
  Trash2,
  Eye,
  X,
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
          <h1 className="text-xl font-bold text-[#171717] tracking-tight">Invoices &amp; Payments</h1>
          <p className="text-xs text-[#737373] mt-0.5">Generate invoices, track settlements, and process payments via PayPal Sandbox.</p>
        </div>

        <button
          onClick={() => {
            const twoWeeks = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
            setDueDate(twoWeeks);
            setShowCreateModal(true);
          }}
          className="btn-primary flex items-center space-x-1.5 self-start"
        >
          <Plus size={14} />
          <span>Create Invoice</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" size={14} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice # or client..."
            className="fintech-input pl-9 text-xs"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex bg-[#F8F9FA] border border-[#E5E7EB] p-0.5 rounded-lg text-xs font-medium w-full sm:w-auto">
          {['ALL', 'PENDING', 'OVERDUE', 'PAID'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded transition ${
                filterStatus === status
                  ? 'bg-white text-[#171717] shadow-sm font-semibold'
                  : 'text-[#737373] hover:text-[#171717]'
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
          <div className="py-12 text-center text-xs text-[#737373]">Loading invoices...</div>
        ) : filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FA] border-b border-[#E5E7EB] text-[#737373] uppercase tracking-wider text-[10px] font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Invoice #</th>
                  <th className="py-2.5 px-4">Client</th>
                  <th className="py-2.5 px-4">Due Date</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                  <th className="py-2.5 px-4 text-right">Balance Due</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {filtered.map((inv) => {
                  const balanceDue = inv.totalAmount - inv.paidAmount;
                  return (
                    <tr key={inv.id} className="hover:bg-[#F8F9FA] transition">
                      <td className="py-3 px-4 font-mono font-medium text-[#171717]">{inv.invoiceNumber}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#171717]">{inv.client.name}</div>
                        <div className="text-[10px] text-[#737373]">{inv.client.company || inv.client.email}</div>
                      </td>
                      <td className="py-3 px-4 text-[#737373]">{formatDate(inv.dueDate)}</td>
                      <td className="py-3 px-4 text-right font-medium text-[#171717] tabular-nums">
                        {formatCurrency(inv.totalAmount, currency)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium tabular-nums">
                        {balanceDue > 0 ? (
                          <span className="text-amber-700">{formatCurrency(balanceDue, currency)}</span>
                        ) : (
                          <span className="text-emerald-700">Settled</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : inv.status === 'OVERDUE'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {balanceDue > 0 && (
                            <button
                              onClick={() => setSelectedInvoiceForPay(inv)}
                              className="px-2.5 py-1 bg-[#FFC439] hover:bg-[#F2BA36] text-[#171717] text-[11px] font-semibold rounded flex items-center gap-1 transition shadow-sm"
                              title="Pay instantly via PayPal Sandbox"
                            >
                              <span className="italic font-bold text-blue-900">P</span>
                              <span>PayPal</span>
                            </button>
                          )}
                          <button
                            onClick={() => setViewInvoice(inv)}
                            className="p-1.5 text-[#737373] hover:text-[#171717] rounded hover:bg-[#F8F9FA]"
                            title="View / Print PDF"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteInvoice(inv.id)}
                            className="p-1.5 text-[#737373] hover:text-rose-600 rounded hover:bg-[#F8F9FA]"
                            title="Delete Invoice"
                          >
                            <Trash2 size={14} />
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
            <FileText className="mx-auto text-[#737373] mb-2" size={28} />
            <p className="text-xs font-semibold text-[#171717]">No invoices found</p>
            <p className="text-xs text-[#737373] mt-0.5">Create an invoice to bill clients with PayPal.</p>
          </div>
        )}
      </div>

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="fintech-card w-full max-w-2xl overflow-hidden max-h-[92vh] flex flex-col bg-white">
            <div className="px-5 py-3.5 bg-[#F8F9FA] border-b border-[#E5E7EB] flex justify-between items-center">
              <h3 className="font-semibold text-xs text-[#171717]">Create Professional Invoice</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-[#737373] hover:text-[#171717]">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-5 space-y-3.5 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#171717] mb-1">Select Client *</label>
                  <select
                    required
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="fintech-input bg-white"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.company || c.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[#171717] mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="fintech-input"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div>
                <label className="block font-semibold text-[#171717] mb-1.5">Line Items</label>
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center bg-[#F8F9FA] p-2 rounded border border-[#E5E7EB]">
                      <input
                        type="text"
                        placeholder="Description of deliverables..."
                        required
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="flex-1 px-2.5 py-1.5 border border-[#E5E7EB] rounded bg-white text-xs focus:outline-none focus:border-[#171717]"
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="w-16 px-2 py-1.5 border border-[#E5E7EB] rounded bg-white text-center text-xs focus:outline-none focus:border-[#171717]"
                      />
                      <input
                        type="number"
                        placeholder="Unit Price"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                        className="w-24 px-2 py-1.5 border border-[#E5E7EB] rounded bg-white text-right text-xs focus:outline-none focus:border-[#171717]"
                      />
                      <span className="w-20 text-right font-semibold text-[#171717] tabular-nums">
                        {formatCurrency(item.amount, currency)}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="text-[#737373] hover:text-rose-600 p-1"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="mt-2 text-teal-700 hover:text-teal-900 font-medium flex items-center gap-1 text-xs"
                >
                  <Plus size={13} /> Add Line Item
                </button>
              </div>

              {/* Tax & Discount */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E5E7EB]">
                <div>
                  <label className="block font-medium text-[#171717] mb-1">Tax Rate (GST/VAT %)</label>
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="fintech-input"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#171717] mb-1">Discount Amount (INR)</label>
                  <input
                    type="number"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    className="fintech-input"
                  />
                </div>
              </div>

              {/* Calculations Box */}
              <div className="bg-[#F8F9FA] p-3 rounded border border-[#E5E7EB] space-y-1 text-right text-xs">
                <div className="flex justify-between text-[#737373]">
                  <span>Subtotal:</span>
                  <span className="tabular-nums">{formatCurrency(subtotal, currency)}</span>
                </div>
                <div className="flex justify-between text-[#737373]">
                  <span>Tax ({taxRate}%):</span>
                  <span className="tabular-nums">{formatCurrency(tax, currency)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount:</span>
                    <span className="tabular-nums">-{formatCurrency(discount, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-bold text-[#171717] border-t border-[#E5E7EB] pt-1">
                  <span>Grand Total:</span>
                  <span className="tabular-nums">{formatCurrency(grandTotal, currency)}</span>
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#171717] mb-1">Payment Terms &amp; Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="fintech-input"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="fintech-card w-full max-w-2xl overflow-hidden max-h-[92vh] flex flex-col bg-white">
            <div className="px-5 py-3.5 bg-[#F8F9FA] border-b border-[#E5E7EB] flex justify-between items-center print:hidden">
              <span className="font-semibold text-xs text-[#171717]">Invoice Preview</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="btn-secondary flex items-center gap-1.5"
                >
                  <Download size={13} /> Print / PDF
                </button>
                <button onClick={() => setViewInvoice(null)} className="text-[#737373] hover:text-[#171717]">
                  <X size={15} />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto flex-1 text-[#171717]" id="printable-invoice">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-[#E5E7EB] pb-5">
                <div>
                  <h2 className="text-xl font-bold text-[#171717] tracking-tight">FundFlow AI</h2>
                  <p className="text-xs text-[#737373] mt-0.5">{user?.businessName || 'Freelance Studio'}</p>
                  <p className="text-xs text-[#737373]">{user?.email}</p>
                </div>
                <div className="text-right">
                  <span className="text-base font-mono font-bold text-[#171717]">{viewInvoice.invoiceNumber}</span>
                  <p className="text-xs text-[#737373] mt-0.5">Issue: {formatDate(viewInvoice.issueDate)}</p>
                  <p className="text-xs text-[#737373]">Due: {formatDate(viewInvoice.dueDate)}</p>
                </div>
              </div>

              {/* Billed To */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[#737373] font-semibold uppercase tracking-wider text-[10px]">Billed To</span>
                  <p className="font-semibold text-[#171717] text-sm mt-0.5">{viewInvoice.client.name}</p>
                  <p className="text-[#737373]">{viewInvoice.client.company}</p>
                  <p className="text-[#737373]">{viewInvoice.client.email}</p>
                </div>
                <div className="text-right">
                  <span className="text-[#737373] font-semibold uppercase tracking-wider text-[10px]">Payment Status</span>
                  <p className="font-semibold text-sm mt-0.5 text-teal-800">{viewInvoice.status}</p>
                  <p className="text-[#737373]">PayPal Gateway Verified</p>
                </div>
              </div>

              {/* Items List */}
              <div className="border border-[#E5E7EB] rounded overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-[#F8F9FA] font-semibold text-[#737373] border-b border-[#E5E7EB]">
                    <tr>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Unit Price</th>
                      <th className="p-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {viewInvoice.items?.map((item: any, i: number) => (
                      <tr key={i}>
                        <td className="p-2.5 font-medium">{item.description}</td>
                        <td className="p-2.5 text-center tabular-nums">{item.quantity}</td>
                        <td className="p-2.5 text-right tabular-nums">{formatCurrency(item.unitPrice, currency)}</td>
                        <td className="p-2.5 text-right font-semibold tabular-nums">{formatCurrency(item.amount, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end text-xs">
                <div className="w-60 space-y-1 font-medium">
                  <div className="flex justify-between text-[#737373]">
                    <span>Subtotal:</span>
                    <span className="tabular-nums">{formatCurrency(viewInvoice.subtotal, currency)}</span>
                  </div>
                  <div className="flex justify-between text-[#737373]">
                    <span>Tax ({viewInvoice.taxRate}%):</span>
                    <span className="tabular-nums">{formatCurrency(viewInvoice.taxAmount, currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-[#171717] border-t border-[#E5E7EB] pt-1">
                    <span>Total:</span>
                    <span className="tabular-nums">{formatCurrency(viewInvoice.totalAmount, currency)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold text-emerald-700">
                    <span>Paid to Date:</span>
                    <span className="tabular-nums">{formatCurrency(viewInvoice.paidAmount, currency)}</span>
                  </div>
                </div>
              </div>

              {/* Footer Notes */}
              {viewInvoice.notes && (
                <div className="p-3 bg-[#F8F9FA] rounded border border-[#E5E7EB] text-xs text-[#737373]">
                  <p className="font-semibold text-[#171717]">Payment Terms &amp; Notes</p>
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
