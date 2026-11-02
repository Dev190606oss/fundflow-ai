import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Invoice } from '../types';
import { paypalApi } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

interface PayPalPaymentModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (updatedInvoice: Invoice) => void;
}

export const PayPalPaymentModal: React.FC<PayPalPaymentModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onPaymentSuccess,
}) => {
  const { currency } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'DETAILS' | 'AUTHORIZING' | 'CAPTURING' | 'SUCCESS' | 'ERROR'>('DETAILS');
  const [errorMessage, setErrorMessage] = useState('');
  const [orderId, setOrderId] = useState('');
  const [captureDetails, setCaptureDetails] = useState<{ captureId?: string; status?: string }>({});

  if (!isOpen) return null;

  const balanceDue = invoice.totalAmount - invoice.paidAmount;

  const handleStartCheckout = async () => {
    try {
      setLoading(true);
      setStep('AUTHORIZING');
      setErrorMessage('');

      // 1. Create order on backend with PayPal Orders v2 API
      const order = await paypalApi.createOrder(invoice.id);
      setOrderId(order.orderId);

      // 2. Simulate user authentication in PayPal Sandbox popup / approval flow
      setStep('CAPTURING');
      await new Promise((resolve) => setTimeout(resolve, 1400));

      // 3. Capture order on backend and verify status
      const captureResult = await paypalApi.captureOrder(order.orderId, invoice.id);

      if (captureResult.success) {
        setCaptureDetails({
          captureId: captureResult.captureId,
          status: captureResult.status,
        });
        setStep('SUCCESS');

        // Confetti burst
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });

        if (captureResult.invoice) {
          onPaymentSuccess(captureResult.invoice);
        }
      } else {
        throw new Error('Payment verification unsuccessful.');
      }
    } catch (err: any) {
      console.error('PayPal Checkout Error:', err);
      setStep('ERROR');
      setErrorMessage(err.message || 'An error occurred during payment processing.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden transition-all">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-navy-900 to-blue-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400">
              <span className="font-extrabold italic text-sm text-paypal-lightBlue">P</span>
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight flex items-center gap-2">
                PayPal Checkout
                <span className="text-[10px] bg-blue-500/20 border border-blue-400/30 text-blue-300 px-2 py-0.5 rounded-full font-mono">
                  Sandbox v2
                </span>
              </h3>
              <p className="text-xs text-slate-300">Secure Instant Invoice Settlement</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/80 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {step === 'DETAILS' && (
            <div className="space-y-5">
              {/* Invoice Summary Box */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span>Invoice Number:</span>
                  <span className="font-mono font-semibold text-slate-800">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span>Client / Buyer:</span>
                  <span className="font-semibold text-slate-800">{invoice.client.name}</span>
                </div>
                <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline">
                  <span className="text-sm font-semibold text-slate-700">Total Settlement Due:</span>
                  <span className="text-2xl font-black text-slate-900">
                    {formatCurrency(balanceDue, currency)}
                  </span>
                </div>
              </div>

              {/* Security Banner */}
              <div className="flex items-start space-x-3 p-3 bg-emerald-50 border border-emerald-200/60 rounded-xl text-emerald-800 text-xs">
                <ShieldCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">End-to-End Server Verification</p>
                  <p className="text-emerald-700 mt-0.5">
                    Payments are authorized via PayPal Orders API and captured on the backend with full audit trail storage.
                  </p>
                </div>
              </div>

              {/* PayPal Sandbox Direct Pay Action */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleStartCheckout}
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-[#FFC439] hover:bg-[#F2BA36] active:bg-[#E5B033] text-slate-900 rounded-xl font-bold flex items-center justify-center space-x-2.5 shadow-md shadow-amber-400/20 transition group"
                >
                  <span className="font-extrabold italic text-blue-900 text-base">Pay</span>
                  <span className="font-extrabold italic text-sky-600 text-base">Pal</span>
                  <span className="text-xs uppercase font-semibold text-slate-700 ml-1">Sandbox Pay Now</span>
                  <ArrowRight size={16} className="text-slate-700 group-hover:translate-x-0.5 transition" />
                </button>
                <p className="text-center text-[11px] text-slate-400">
                  Simulates full buyer approval & backend capture flow
                </p>
              </div>
            </div>
          )}

          {(step === 'AUTHORIZING' || step === 'CAPTURING') && (
            <div className="py-10 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 animate-spin">
                <Loader2 size={26} />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-800">
                  {step === 'AUTHORIZING' ? 'Connecting to PayPal Sandbox...' : 'Verifying & Capturing Funds...'}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  {step === 'AUTHORIZING'
                    ? 'Creating secure PayPal Order with intent CAPTURE'
                    : `Backend verifying PayPal Order ${orderId || ''}`}
                </p>
              </div>
            </div>
          )}

          {step === 'SUCCESS' && (
            <div className="py-6 text-center space-y-5">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 animate-bounce">
                <CheckCircle2 size={36} />
              </div>

              <div>
                <h4 className="text-xl font-bold text-slate-900">Payment Captured & Verified!</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Invoice <span className="font-mono font-bold text-slate-700">{invoice.invoiceNumber}</span> is now marked as <strong>PAID</strong>.
                </p>
              </div>

              {/* Receipt Details Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">PayPal Capture ID:</span>
                  <span className="font-mono font-semibold text-slate-800">{captureDetails.captureId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-bold text-emerald-600">{captureDetails.status || 'COMPLETED'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount Cleared:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(balanceDue, currency)}</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition"
              >
                Close & Return to Invoices
              </button>
            </div>
          )}

          {step === 'ERROR' && (
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-red-100 border border-red-200 flex items-center justify-center text-red-600">
                <AlertCircle size={30} />
              </div>

              <div>
                <h4 className="text-lg font-bold text-slate-900">Payment Verification Failed</h4>
                <p className="text-xs text-red-600 mt-1">{errorMessage}</p>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setStep('DETAILS')}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
