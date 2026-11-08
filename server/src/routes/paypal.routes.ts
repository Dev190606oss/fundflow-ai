import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { PayPalService } from '../services/paypal.service';
import prisma from '../prisma';

const router = Router();

// Create PayPal Sandbox Order
router.post('/create-order', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { invoiceId } = req.body;

    if (!invoiceId) {
      res.status(400).json({ error: 'Invoice ID is required to initiate PayPal order.' });
      return;
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId: req.userId },
      include: { client: true },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found or unauthorized.' });
      return;
    }

    if (invoice.status === 'PAID') {
      res.status(400).json({ error: 'This invoice has already been fully paid.' });
      return;
    }

    const remainingToPay = invoice.totalAmount - invoice.paidAmount;

    const order = await PayPalService.createOrder({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: remainingToPay,
      currency: 'INR',
      description: `FundFlow AI - Invoice ${invoice.invoiceNumber} for ${invoice.client.name}`,
    });

    res.json(order);
  } catch (error: any) {
    console.error('PayPal create order error:', error);
    res.status(500).json({ error: error.message || 'Failed to initiate PayPal order.' });
  }
});

// Capture PayPal Sandbox Payment
router.post('/capture-order', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { orderId, invoiceId } = req.body;

    if (!orderId || !invoiceId) {
      res.status(400).json({ error: 'Order ID and Invoice ID are required.' });
      return;
    }

    const result = await PayPalService.captureAndVerifyPayment({
      orderId,
      invoiceId,
      userId: req.userId!,
    });

    res.json(result);
  } catch (error: any) {
    console.error('PayPal capture order error:', error);
    res.status(500).json({ error: error.message || 'Payment capture failed.' });
  }
});

// PayPal Audit History for User
router.get('/history', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const transactions = await prisma.payPalTransaction.findMany({
      where: { userId: req.userId },
      include: {
        payment: {
          include: {
            invoice: {
              include: { client: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch PayPal transaction history.' });
  }
});

// Webhook listener with signature verification & replay protection
router.post('/webhook', async (req, res): Promise<void> => {
  try {
    const signatureCheck = await PayPalService.verifyWebhookSignature({
      headers: req.headers,
      body: req.body,
    });

    if (!signatureCheck.verified) {
      res.status(400).json({
        error: 'Invalid PayPal webhook signature.',
        details: signatureCheck.error,
      });
      return;
    }

    const result = await PayPalService.processWebhookEvent(req.body, {
      simulateCrashDuringSettlement:
        process.env.NODE_ENV !== 'production' && req.headers['x-mock-crash-during-settlement'] === 'true',
    });
    res.status(200).json(result);
  } catch (error: any) {
    console.error('PayPal webhook processing error:', error);
    res.status(500).json({ error: error.message || 'Webhook processing error.' });
  }
});

export default router;
