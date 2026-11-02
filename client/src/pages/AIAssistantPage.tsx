import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  User,
  ShieldCheck,
  TrendingUp,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { aiApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const AIAssistantPage: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I am your **FundFlow AI Financial Assistant**.\n\nI have direct, authorized access to your live database:\n• Invoices & PayPal settlements\n• Freelance clients & contracts\n• Money lent and borrowed ledgers\n• Investment watchlist & IPO savings goals\n\nHow can I help optimize your money today?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await aiApi.chat({ message: text, history });

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I encountered an issue analyzing your financial records. Please try again in a moment.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const samplePrompts = [
    'How much did I earn this month?',
    'How much do my clients owe me?',
    'Who has not repaid their loans?',
    'Can I reach my ₹25,000 IPO savings goal?',
    'Which invoices are overdue?',
  ];

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto h-[calc(100vh-5rem)] flex flex-col animate-fadeIn">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
            <Bot size={22} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              AI Financial Command Assistant
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                Live Data Connected
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Query cash balances, overdue receivables, lending recovery, and savings targets.
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
          <ShieldCheck size={14} className="text-blue-600" />
          <span>Strict DB Isolation</span>
        </div>
      </div>

      {/* Suggested Query Pills */}
      <div className="py-3 flex flex-wrap gap-2">
        {samplePrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            className="text-xs bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-600 px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm transition font-medium text-left"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 py-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start space-x-3 ${m.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white font-bold text-xs ring-2 ring-blue-500/20'
                  : 'bg-slate-900 text-blue-400 border border-slate-800'
              }`}
            >
              {m.role === 'user' ? user?.name?.[0]?.toUpperCase() || 'U' : <Bot size={17} />}
            </div>

            <div
              className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed shadow-sm ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white font-medium rounded-tr-none'
                  : 'bg-white border border-slate-200/80 text-slate-800 rounded-tl-none whitespace-pre-wrap'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-blue-400 flex items-center justify-center">
              <Bot size={17} />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-3.5 rounded-tl-none shadow-sm flex items-center space-x-2 text-xs text-slate-500">
              <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
              <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse delay-75"></div>
              <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse delay-150"></div>
              <span>Querying database balance sheet...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="pt-3 border-t border-slate-200 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about earnings, invoices, loans, or savings readiness..."
          className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="p-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl shadow-md shadow-blue-500/20 transition"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};
