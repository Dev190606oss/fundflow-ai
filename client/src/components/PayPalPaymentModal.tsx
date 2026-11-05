import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
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

      // 2. Simulate user authorization in PayPal Sandbox approval flow
      setStep('CAPTURING');
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 3. Capture order on backend and verify status
      const captureResult = await paypalApi.captureOrder(order.orderId, invoice.id);

      if (captureResult.success) {
        setCaptureDetails({
          captureId: captureResult.captureId,
          status: captureResult.status,
        });
        setStep('SUCCESS');

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
      <div className="bg-white rounded-lg border border-[#E5E7EB] w-full max-w-md overflow-hidden shadow-xl">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-[#171717] text-white flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold italic text-sm text-[#0079C1]">P</span>
            <span className="font-semibold text-xs tracking-tight">PayPal Checkout Sandbox</span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-0.5 rounded transition"
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5">
          {step === 'DETAILS' && (
            <div className="space-y-4">
              {/* Invoice Summary Box */}
              <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-md p-3.5 space-y-2 text-xs">
                <div className="flex justify-between items-center text-neutral-500">
                  <span>Invoice:</span>
                  <span className="font-mono font-medium text-neutral-900">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between items-center text-neutral-500">
                  <span>Client:</span>
                  <span className="font-medium text-neutral-900">{invoice.client.name}</span>
                </div>
                <div className="border-t border-[#E5E7EB] pt-2 flex justify-between items-baseline">
                  <span className="text-xs font-semibold text-neutral-700">Amount Due:</span>
                  <span className="text-xl font-bold text-neutral-900 tabular-nums">
                    {formatCurrency(balanceDue, currency)}
                  </span>
                </div>
              </div>

              {/* Security Banner */}
              <div className="flex items-start space-x-2 p-2.5 bg-[#F0FDFA] border border-[#CCFBF1] rounded-md text-[11px] text-teal-800">
                <ShieldCheck size={15} className="text-teal-600 shrink-0 mt-0.5" />
                <p>Server-side capture verification via PayPal Orders v2 API.</p>
              </div>

              {/* PayPal Sandbox Direct Pay Action */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={handleStartCheckout}
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-[#FFC439] hover:bg-[#F4B933] text-neutral-900 rounded-md font-bold text-xs flex items-center justify-center space-x-1.5 transition disabled:opacity-50"
                >
                  <span className="font-extrabold italic text-blue-900">Pay</span>
                  <span className="font-extrabold italic text-sky-700">Pal</span>
                  <span className="text-[11px] font-semibold text-neutral-800 ml-1">Sandbox Pay Now</span>
                  <ArrowRight size={14} className="text-neutral-700 ml-1" />
                </button>
                <p className="text-center text-[10px] text-neutral-400">
                  Simulates full buyer approval and backend capture verification
                </p>
              </div>
            </div>
          )}

          {(step === 'AUTHORIZING' || step === 'CAPTURING') && (
            <div className="py-8 text-center space-y-3">
              <div className="w-8 h-8 mx-auto border-2 border-neutral-900 border-t-transparent rounded-full animate-spin"></div>
              <div>
                <h4 className="text-xs font-semibold text-neutral-900">
                  {step === 'AUTHORIZING' ? 'Connecting to PayPal Sandbox...' : 'Verifying & Capturing Payment...'}
                </h4>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  {step === 'AUTHORIZING'
                    ? 'Creating secure PayPal Order v2'
                    : `Verifying Order ${orderId || ''}`}
                </p>
              </div>
            </div>
          )}

          {step === 'SUCCESS' && (
            <div className="py-4 text-center space-y-4">
              <div className="w-10 h-10 mx-auto rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-green-600">
                <CheckCircle2 size={22} />
              </div>

              <div>
                <h4 className="text-sm font-bold text-neutral-900">Payment Captured and Verified</h4>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Invoice <span className="font-mono font-medium text-neutral-700">{invoice.invoiceNumber}</span> is now marked as <strong>PAID</strong>.
                </p>
              </div>

              <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-md p-3 text-left text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Capture ID:</span>
                  <span className="font-mono text-neutral-800">{captureDetails.captureId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Status:</span>
                  <span className="font-semibold text-green-700">{captureDetails.status || 'COMPLETED'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Settled Amount:</span>
                  <span className="font-bold text-neutral-900 tabular-nums">{formatCurrency(balanceDue, currency)}</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-xs font-semibold transition"
              >
                Close and Return
              </button>
            </div>
          )}

          {step === 'ERROR' && (
            <div className="py-4 text-center space-y-3">
              <div className="w-10 h-10 mx-auto rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                <AlertCircle size={22} />
              </div>

              <div>
                <h4 className="text-xs font-bold text-neutral-900">Payment Verification Failed</h4>
                <p className="text-xs text-red-600 mt-1">{errorMessage}</p>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setStep('DETAILS')}
                  className="flex-1 py-1.5 bg-neutral-900 text-white rounded-md text-xs font-semibold hover:bg-neutral-800 transition"
                >
                  Retry
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-1.5 bg-white border border-[#E5E7EB] text-neutral-700 rounded-md text-xs font-semibold hover:bg-[#F8F9FA] transition"
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
