import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Mail,
  Phone,
  Building,
  Calendar,
  Sparkles,
  Search,
  CheckCircle2,
  Trash2,
  Loader2,
  X,
} from 'lucide-react';
import { clientApi, aiApi } from '../services/api';
import { Client } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

export const ClientsPage: React.FC = () => {
  const { currency } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal states
  const [showAddClient, setShowAddClient] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showAIBriefModal, setShowAIBriefModal] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [projectDetails, setProjectDetails] = useState('');
  const [contractAmount, setContractAmount] = useState('');
  const [deadline, setDeadline] = useState('');

  // AI Brief generator state
  const [briefPrompt, setBriefPrompt] = useState('Build a modern Next.js portfolio website for a corporate client for ₹15,000 with delivery in 15 days.');
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [generatedBrief, setGeneratedBrief] = useState<any | null>(null);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await clientApi.getAll();
      setClients(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await clientApi.create({
        name,
        email,
        phone,
        company,
        projectDetails,
        contractAmount: Number(contractAmount) || 0,
        deadline: deadline || null,
      });
      setShowAddClient(false);
      resetForm();
      fetchClients();
    } catch (err: any) {
      alert(err.message || 'Failed to save client');
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (confirm('Are you sure you want to delete this client and all associated data?')) {
      await clientApi.delete(id);
      fetchClients();
    }
  };

  const handleGenerateAIBrief = async () => {
    if (!briefPrompt.trim()) return;
    try {
      setGeneratingBrief(true);
      const res = await aiApi.generateProjectBrief({
        prompt: briefPrompt,
        clientName: selectedClient?.name || 'Valued Client',
      });
      setGeneratedBrief(res);
    } catch (err: any) {
      alert(err.message || 'Failed to generate brief');
    } finally {
      setGeneratingBrief(false);
    }
  };

  const handleSaveAIBriefToClient = async () => {
    if (!generatedBrief || !selectedClient) return;
    try {
      await clientApi.createProject(selectedClient.id, {
        title: generatedBrief.title,
        description: generatedBrief.description,
        budget: generatedBrief.budget,
        deadline: new Date(Date.now() + (generatedBrief.deadlineDays || 14) * 86400000).toISOString(),
        deliverables: generatedBrief.deliverables,
        milestones: generatedBrief.milestones,
      });
      setShowAIBriefModal(false);
      setGeneratedBrief(null);
      fetchClients();
      alert('Project brief attached to client successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to attach project');
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setCompany('');
    setProjectDetails('');
    setContractAmount('');
    setDeadline('');
  };

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.company && c.company.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#171717] tracking-tight">Clients &amp; Accounts</h1>
          <p className="text-xs text-[#737373] mt-0.5">Manage client profiles, contracts, outstanding dues, and project specifications.</p>
        </div>

        <button
          onClick={() => setShowAddClient(true)}
          className="btn-primary flex items-center space-x-1.5 self-start"
        >
          <Plus size={14} />
          <span>Add Client</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" size={14} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by name, email, or company..."
          className="fintech-input pl-9 text-xs"
        />
      </div>

      {/* Clients Grid */}
      {loading ? (
        <div className="py-12 text-center text-[#737373] text-xs">Loading clients...</div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((client) => (
            <div key={client.id} className="fintech-card p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-[#171717] text-sm">{client.name}</h3>
                    {client.company && (
                      <p className="text-xs text-[#737373] flex items-center gap-1 mt-0.5">
                        <Building size={12} className="text-[#737373]" />
                        <span>{client.company}</span>
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
                      client.paymentStatus === 'Paid'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : client.paymentStatus === 'Partially Paid'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {client.paymentStatus}
                  </span>
                </div>

                {/* Contact info */}
                <div className="mt-4 space-y-1.5 text-xs text-[#737373]">
                  <div className="flex items-center gap-2">
                    <Mail size={12} className="text-[#737373]" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={12} className="text-[#737373]" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.deadline && (
                    <div className="flex items-center gap-2">
                      <Calendar size={12} className="text-[#737373]" />
                      <span>Target: {formatDate(client.deadline)}</span>
                    </div>
                  )}
                </div>

                {/* Contract & Revenue Numbers */}
                <div className="mt-4 pt-3 border-t border-[#E5E7EB] grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[#737373] text-[10px] uppercase font-semibold">Contract</span>
                    <p className="font-semibold text-[#171717] tabular-nums">{formatCurrency(client.contractAmount, currency)}</p>
                  </div>
                  <div>
                    <span className="text-[#737373] text-[10px] uppercase font-semibold">Outstanding</span>
                    <p className="font-semibold text-amber-700 tabular-nums">
                      {formatCurrency(client.outstanding || 0, currency)}
                    </p>
                  </div>
                </div>

                {/* Project Details if any */}
                {client.projectDetails && (
                  <p className="mt-3 text-[11px] text-[#737373] bg-[#F8F9FA] p-2 rounded border border-[#E5E7EB] line-clamp-2">
                    {client.projectDetails}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-[#E5E7EB] flex items-center justify-between">
                <button
                  onClick={() => {
                    setSelectedClient(client);
                    setShowAIBriefModal(true);
                  }}
                  className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded border border-teal-200 text-xs font-medium flex items-center gap-1.5 transition"
                  title="Generate structured project brief with AI"
                >
                  <Sparkles size={12} className="text-teal-700" />
                  <span>AI Brief</span>
                </button>

                <button
                  onClick={() => handleDeleteClient(client.id)}
                  className="p-1.5 text-[#737373] hover:text-rose-600 rounded transition"
                  title="Delete Client"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center fintech-card">
          <Users className="mx-auto text-[#737373] mb-2" size={28} />
          <p className="text-xs font-semibold text-[#171717]">No clients found</p>
          <p className="text-xs text-[#737373] mt-0.5">Add your first freelance client to get started.</p>
        </div>
      )}

      {/* Add Client Modal */}
      {showAddClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="fintech-card w-full max-w-lg overflow-hidden bg-white">
            <div className="px-5 py-3.5 bg-[#F8F9FA] border-b border-[#E5E7EB] flex justify-between items-center">
              <h3 className="font-semibold text-xs text-[#171717]">Add New Freelance Client</h3>
              <button onClick={() => setShowAddClient(false)} className="text-[#737373] hover:text-[#171717]">
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleCreateClient} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">Client Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Acme Tech"
                    className="fintech-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">Company (Optional)</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="fintech-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="billing@acme.com"
                    className="fintech-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="fintech-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">Contract Amount (INR)</label>
                  <input
                    type="number"
                    value={contractAmount}
                    onChange={(e) => setContractAmount(e.target.value)}
                    placeholder="50000"
                    className="fintech-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">Deadline</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="fintech-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#171717] mb-1">Project Scope / Details</label>
                <textarea
                  rows={2}
                  value={projectDetails}
                  onChange={(e) => setProjectDetails(e.target.value)}
                  placeholder="Overview of project deliverables..."
                  className="fintech-input"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setShowAddClient(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Save Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Project Brief Generator Modal */}
      {showAIBriefModal && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="fintech-card w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col bg-white">
            <div className="px-5 py-3.5 bg-[#F8F9FA] border-b border-[#E5E7EB] flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Sparkles size={15} className="text-teal-700" />
                <h3 className="font-semibold text-xs text-[#171717]">AI Project Brief Generator</h3>
              </div>
              <button onClick={() => setShowAIBriefModal(false)} className="text-[#737373] hover:text-[#171717]">
                <X size={15} />
              </button>
            </div>

            <div className="p-5 space-y-3.5 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-medium text-[#171717] mb-1">
                  Describe project scope in natural language:
                </label>
                <textarea
                  rows={3}
                  value={briefPrompt}
                  onChange={(e) => setBriefPrompt(e.target.value)}
                  placeholder="e.g. Build a portfolio website for a client for ₹15,000 with delivery in 15 days."
                  className="fintech-input"
                />
              </div>

              <button
                onClick={handleGenerateAIBrief}
                disabled={generatingBrief}
                className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {generatingBrief ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Synthesizing Scope &amp; Milestones...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    <span>Generate Structured Proposal</span>
                  </>
                )}
              </button>

              {generatedBrief && (
                <div className="mt-3 p-4 bg-[#F8F9FA] border border-[#E5E7EB] rounded-lg space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-teal-800">Proposal Title</span>
                      <h4 className="font-semibold text-[#171717] text-xs">{generatedBrief.title}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-semibold text-[#737373]">Estimated Budget</span>
                      <p className="font-semibold text-[#171717] text-xs tabular-nums">{formatCurrency(generatedBrief.budget, currency)}</p>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-[#737373]">Description</span>
                    <p className="text-xs text-[#737373] mt-0.5">{generatedBrief.description}</p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-[#737373]">Deliverables</span>
                    <ul className="mt-1 space-y-1">
                      {generatedBrief.deliverables?.map((d: string, i: number) => (
                        <li key={i} className="text-xs text-[#171717] flex items-center gap-1.5">
                          <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-[#737373]">Payment Milestones</span>
                    <div className="mt-1 space-y-1">
                      {generatedBrief.milestones?.map((m: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-xs bg-white p-2 rounded border border-[#E5E7EB]">
                          <span className="font-medium text-[#171717]">{m.title}</span>
                          <span className="font-semibold text-[#171717] tabular-nums">{formatCurrency(m.amount, currency)} ({m.percentage}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {generatedBrief && (
              <div className="p-4 bg-[#F8F9FA] border-t border-[#E5E7EB] flex justify-end space-x-2">
                <button
                  onClick={() => setShowAIBriefModal(false)}
                  className="btn-secondary"
                >
                  Discard
                </button>
                <button
                  onClick={handleSaveAIBriefToClient}
                  className="btn-primary"
                >
                  Attach to {selectedClient.name}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
