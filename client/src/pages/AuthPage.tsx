import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        if (!name.trim()) throw new Error('Please enter your full name.');
        await register(name, email, password, businessName);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await login('demo@fundflow.ai', 'Password123!');
    } catch (err: any) {
      setError('Demo login failed. Please ensure the database is seeded.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-teal-700 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Logo & Title */}
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-[#171717] text-white font-mono font-bold text-lg mb-3">
          F
        </div>
        <h2 className="text-2xl font-bold text-[#171717] tracking-tight">
          FundFlow AI
        </h2>
        <p className="mt-1 text-xs text-[#737373]">
          Your finances. One intelligent platform.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="fintech-card p-6 sm:p-8">
          {/* Demo Account Quick Pill */}
          <div className="mb-5 p-3 bg-[#F8F9FA] border border-[#E5E7EB] rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 bg-[#171717] text-white rounded">
                <Zap size={13} />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-[#171717]">Hackathon Demo Mode</p>
                <p className="text-[11px] text-[#737373]">Preloaded clients, invoices &amp; IPO watch</p>
              </div>
            </div>
            <button
              onClick={handleDemoLogin}
              disabled={loading}
              className="px-2.5 py-1.5 bg-[#171717] hover:bg-[#262626] text-white text-xs font-semibold rounded transition disabled:opacity-50"
            >
              1-Click Demo
            </button>
          </div>

          {/* Toggle Tab */}
          <div className="flex bg-[#F8F9FA] border border-[#E5E7EB] p-1 rounded-lg mb-5">
            <button
              onClick={() => {
                setIsLogin(true);
                setError('');
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded transition ${
                isLogin
                  ? 'bg-white text-[#171717] shadow-sm'
                  : 'text-[#737373] hover:text-[#171717]'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setError('');
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded transition ${
                !isLogin
                  ? 'bg-white text-[#171717] shadow-sm'
                  : 'text-[#737373] hover:text-[#171717]'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Mercer"
                    className="fintech-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">
                    Business / Studio Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Apex Creative Works"
                    className="fintech-input"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-[#171717] mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="freelancer@example.com"
                className="fintech-input"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#171717] mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="fintech-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 btn-primary flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{isLogin ? 'Sign In to Command Center' : 'Create Free Account'}</span>
              <ArrowRight size={14} />
            </button>
          </form>

          {/* Security Assurance */}
          <div className="mt-5 pt-4 border-t border-[#E5E7EB] flex items-center justify-center space-x-1.5 text-[#737373] text-[11px]">
            <ShieldCheck size={14} className="text-teal-600" />
            <span>Argon2id password encryption &amp; PayPal verification</span>
          </div>
        </div>
      </div>
    </div>
  );
};
