import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Sparkles, Building, Key, CheckCircle2, RefreshCw } from 'lucide-react';
import { authApi } from '../services/api';

export const SettingsPage: React.FC = () => {
  const { user, currency, setCurrency } = useAuth();
  const [businessName, setBusinessName] = useState(user?.businessName || '');
  const [userName, setUserName] = useState(user?.name || '');
  const [saved, setSaved] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authApi.updateProfile({
        name: userName,
        businessName,
        currency,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      alert('Failed to update profile');
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">System Settings</h1>
        <p className="text-xs text-slate-500 mt-1">Configure profile, currency, PayPal Sandbox, and AI services.</p>
      </div>

      {/* Profile & Business */}
      <div className="fintech-card p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900">Freelancer & Studio Profile</h3>
        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">User Display Name</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Studio / Business Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Apex Studio Labs"
                className="w-full px-3 py-2 border rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Account Email</label>
              <input
                type="text"
                disabled
                value={user?.email || ''}
                className="w-full px-3 py-2 border rounded-xl bg-slate-100 text-slate-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Primary Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl bg-white"
              >
                <option value="INR">INR (₹) - Indian Rupee [Default]</option>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 transition flex items-center gap-1.5"
          >
            {saved ? <CheckCircle2 size={14} className="text-emerald-300" /> : null}
            <span>{saved ? 'Settings Saved' : 'Save Changes'}</span>
          </button>
        </form>
      </div>

      {/* Integration Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
        {/* PayPal Sandbox Status */}
        <div className="fintech-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-blue-600" />
              <span>PayPal Sandbox Integration</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              Active v2
            </span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            PayPal Orders API v2 and server-side capture verification configured. Live sandbox simulation active for the hackathon showcase.
          </p>
          <div className="p-3 bg-slate-50 rounded-xl font-mono text-[11px] text-slate-600 space-y-1">
            <p>API Base: <span className="text-slate-900 font-bold">api-m.sandbox.paypal.com</span></p>
            <p>Capture Verification: <span className="text-emerald-600 font-bold">STRICT SERVER-SIDE</span></p>
          </div>
        </div>

        {/* AI Service Status */}
        <div className="fintech-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles size={16} className="text-amber-500" />
              <span>AI Financial Engine</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              Active
            </span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Directly connected to PostgreSQL financial ledgers. Supports Google Gemini 1.5 Flash SDK and deterministic heuristic reasoning fallback.
          </p>
          <div className="p-3 bg-slate-50 rounded-xl font-mono text-[11px] text-slate-600 space-y-1">
            <p>Context Access: <span className="text-slate-900 font-bold">Authorized User Data Only</span></p>
            <p>Heuristic Engine: <span className="text-emerald-600 font-bold">Online & Verified</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};
