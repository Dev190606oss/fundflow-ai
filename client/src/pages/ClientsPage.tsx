import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Mail,
  Phone,
  Building,
  Calendar,
  Briefcase,
  Sparkles,
  Search,
  CheckCircle2,
  Trash2,
  Edit2,
  ArrowRight,
  Loader2,
  FolderPlus,
} from 'lucide-react';
import { clientApi, aiApi } from '../services/api';
import { Client, Project } from '../types';
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
      alert('Project brief attached to client successfully!');
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
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Freelance & Clients</h1>
          <p className="text-xs text-slate-500 mt-1">Manage client accounts, contracts, revenue, and AI project briefs.</p>
        </div>

        <button
          onClick={() => setShowAddClient(true)}
          className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition self-start"
        >
          <Plus size={16} />
          <span>Add New Client</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter clients by name, email, or company..."
          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
      </div>

      {/* Clients Grid */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs">Loading clients...</div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((client) => (
            <div key={client.id} className="fintech-card p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{client.name}</h3>
                    {client.company && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building size={12} className="text-slate-400" />
                        <span>{client.company}</span>
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      client.paymentStatus === 'Paid'
                        ? 'bg-emerald-100 text-emerald-700'
                        : client.paymentStatus === 'Partially Paid'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {client.paymentStatus}
                  </span>
                </div>

                {/* Contact info */}
                <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Mail size={13} className="text-slate-400" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-slate-400" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.deadline && (
                    <div className="flex items-center gap-2">
                      <Calendar size={13} className="text-slate-400" />
                      <span>Target: {formatDate(client.deadline)}</span>
                    </div>
                  )}
                </div>

                {/* Contract & Revenue Numbers */}
                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Contract</span>
                    <p className="font-bold text-slate-800">{formatCurrency(client.contractAmount, currency)}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Outstanding</span>
                    <p className="font-bold text-amber-600">
                      {formatCurrency(client.outstanding || 0, currency)}
                    </p>
                  </div>
                </div>

                {/* Project Details if any */}
                {client.projectDetails && (
                  <p className="mt-3 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg line-clamp-2">
                    {client.projectDetails}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    setSelectedClient(client);
                    setShowAIBriefModal(true);
                  }}
                  className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                  title="Generate structured project brief with AI"
                >
                  <Sparkles size={13} className="text-blue-500" />
                  <span>AI Brief</span>
                </button>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleDeleteClient(client.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition"
                    title="Delete Client"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center fintech-card">
          <Users className="mx-auto text-slate-300 mb-2" size={32} />
          <p className="text-sm font-semibold text-slate-700">No clients found</p>
          <p className="text-xs text-slate-400 mt-1">Add your first freelance client to get started.</p>
        </div>
      )}

      {/* Add Client Modal */}
      {showAddClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Add New Freelance Client</h3>
              <button onClick={() => setShowAddClient(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateClient} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Client Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Acme Tech"
                    className="w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company (Optional)</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="billing@acme.com"
                    className="w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contract Amount (INR)</label>
                  <input
                    type="number"
                    value={contractAmount}
                    onChange={(e) => setContractAmount(e.target.value)}
                    placeholder="50000"
                    className="w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Deadline</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Project Scope / Details</label>
                <textarea
                  rows={2}
                  value={projectDetails}
                  onChange={(e) => setProjectDetails(e.target.value)}
                  placeholder="Overview of project deliverables..."
                  className="w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddClient(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Sparkles size={18} className="text-amber-300" />
                <h3 className="font-bold text-sm">AI Project Brief Generator</h3>
              </div>
              <button onClick={() => setShowAIBriefModal(false)} className="text-slate-300 hover:text-white">✕</button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Describe the project in natural language:
                </label>
                <textarea
                  rows={3}
                  value={briefPrompt}
                  onChange={(e) => setBriefPrompt(e.target.value)}
                  placeholder="e.g. Build a portfolio website for a client for ₹15,000 with delivery in 15 days."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handleGenerateAIBrief}
                disabled={generatingBrief}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-md shadow-blue-500/20 disabled:opacity-50"
              >
                {generatingBrief ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>AI Synthesizing Scope & Milestones...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} className="text-amber-300" />
                    <span>Generate Structured Proposal</span>
                  </>
                )}
              </button>

              {generatedBrief && (
                <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-fadeIn">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">Generated Title</span>
                      <h4 className="font-bold text-slate-900 text-sm">{generatedBrief.title}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Estimated Budget</span>
                      <p className="font-bold text-slate-900">{formatCurrency(generatedBrief.budget, currency)}</p>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Description</span>
                    <p className="text-xs text-slate-600 mt-0.5">{generatedBrief.description}</p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Deliverables</span>
                    <ul className="mt-1 space-y-1">
                      {generatedBrief.deliverables?.map((d: string, i: number) => (
                        <li key={i} className="text-xs text-slate-700 flex items-center gap-1.5">
                          <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Payment Milestones</span>
                    <div className="mt-1 space-y-1">
                      {generatedBrief.milestones?.map((m: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-xs bg-white p-2 rounded-lg border border-slate-200">
                          <span className="font-medium text-slate-700">{m.title}</span>
                          <span className="font-bold text-slate-900">{formatCurrency(m.amount, currency)} ({m.percentage}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {generatedBrief && (
              <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  onClick={() => setShowAIBriefModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50"
                >
                  Discard
                </button>
                <button
                  onClick={handleSaveAIBriefToClient}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20"
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
