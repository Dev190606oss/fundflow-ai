import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
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
        <h1 className="text-xl font-bold text-[#171717] tracking-tight">System Settings</h1>
        <p className="text-xs text-[#737373] mt-0.5">Configure profile, currency, PayPal Sandbox, and AI services.</p>
      </div>

      {/* Profile & Business */}
      <div className="fintech-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-[#171717]">Freelancer &amp; Studio Profile</h3>
        <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#171717] mb-1">User Display Name</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="fintech-input"
              />
            </div>
            <div>
              <label className="block font-medium text-[#171717] mb-1">Studio / Business Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Apex Studio Labs"
                className="fintech-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#171717] mb-1">Account Email</label>
              <input
                type="text"
                disabled
                value={user?.email || ''}
                className="fintech-input bg-[#F8F9FA] text-[#737373] cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block font-medium text-[#171717] mb-1">Primary Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="fintech-input bg-white"
              >
                <option value="INR">INR (₹) - Indian Rupee [Default]</option>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary flex items-center gap-1.5"
          >
            {saved ? <CheckCircle2 size={13} className="text-emerald-300" /> : null}
            <span>{saved ? 'Settings Saved' : 'Save Changes'}</span>
          </button>
        </form>
      </div>

      {/* Integration Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* PayPal Sandbox Status */}
        <div className="fintech-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#171717] flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-teal-700" />
              <span>PayPal Sandbox Integration</span>
            </span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
              Active v2
            </span>
          </div>
          <p className="text-[#737373] leading-relaxed">
            PayPal Orders API v2 and server-side capture verification configured. Sandbox simulation active for the hackathon showcase.
          </p>
          <div className="p-3 bg-[#F8F9FA] rounded border border-[#E5E7EB] font-mono text-[11px] text-[#737373] space-y-1">
            <p>API Base: <span className="text-[#171717] font-semibold">api-m.sandbox.paypal.com</span></p>
            <p>Verification: <span className="text-emerald-700 font-semibold">STRICT SERVER-SIDE</span></p>
          </div>
        </div>

        {/* AI Service Status */}
        <div className="fintech-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#171717] flex items-center gap-1.5">
              <Sparkles size={15} className="text-teal-700" />
              <span>AI Financial Engine</span>
            </span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded border bg-teal-50 text-teal-800 border-teal-200">
              Active
            </span>
          </div>
          <p className="text-[#737373] leading-relaxed">
            Directly connected to PostgreSQL financial ledgers. Supports Google Gemini 1.5 Flash SDK and deterministic heuristic reasoning fallback.
          </p>
          <div className="p-3 bg-[#F8F9FA] rounded border border-[#E5E7EB] font-mono text-[11px] text-[#737373] space-y-1">
            <p>Context Access: <span className="text-[#171717] font-semibold">Authorized User Data Only</span></p>
            <p>Heuristic Engine: <span className="text-emerald-700 font-semibold">Online &amp; Verified</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};
