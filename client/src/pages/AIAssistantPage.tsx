import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  ShieldCheck,
  Loader2,
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
      content: `Hello! I am your **FundFlow AI Financial Assistant**.\n\nI have direct, authorized access to your live financial records:\n• Invoices & PayPal settlements\n• Freelance clients & contracts\n• Money lent and borrowed ledgers\n• Investment watchlist & IPO savings goals\n\nHow can I help optimize your money today?`,
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
    <div className="p-6 lg:p-8 max-w-5xl mx-auto h-[calc(100vh-4.5rem)] flex flex-col">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB]">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-[#171717] flex items-center justify-center text-white">
            <Bot size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-[#171717] tracking-tight">
                AI Financial Assistant
              </h1>
              <span className="text-[10px] bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded font-medium">
                Live Data Connected
              </span>
            </div>
            <p className="text-xs text-[#737373]">
              Query cash balances, overdue receivables, peer lending recovery, and savings plans.
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-1.5 text-xs text-[#737373] bg-[#F8F9FA] px-2.5 py-1 rounded border border-[#E5E7EB]">
          <ShieldCheck size={13} className="text-teal-700" />
          <span>Strict DB Isolation</span>
        </div>
      </div>

      {/* Suggested Query Pills */}
      <div className="py-3 flex flex-wrap gap-2">
        {samplePrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            className="text-xs bg-[#F8F9FA] hover:bg-white hover:text-[#171717] text-[#737373] px-2.5 py-1 rounded border border-[#E5E7EB] transition text-left"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 py-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start space-x-2.5 ${m.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
          >
            <div
              className={`w-7 h-7 rounded flex items-center justify-center shrink-0 text-xs font-mono font-bold ${
                m.role === 'user'
                  ? 'bg-teal-700 text-white'
                  : 'bg-[#171717] text-white'
              }`}
            >
              {m.role === 'user' ? user?.name?.[0]?.toUpperCase() || 'U' : <Bot size={14} />}
            </div>

            <div
              className={`max-w-[85%] rounded-lg p-3.5 text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-[#171717] text-white font-medium'
                  : 'fintech-card text-[#171717] whitespace-pre-wrap'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center space-x-2 text-xs text-[#737373] pl-9">
            <Loader2 size={13} className="animate-spin text-teal-700" />
            <span>Analyzing ledger data...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="pt-3 border-t border-[#E5E7EB]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your finances, invoices, borrowers, or savings goals..."
            className="fintech-input flex-1 text-xs"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="btn-primary flex items-center gap-1.5 disabled:opacity-50"
          >
            <Send size={13} />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
