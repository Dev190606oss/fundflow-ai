import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { PayPalService } from '../services/paypal.service';
import { validateBody, createPayPalOrderSchema, capturePayPalOrderSchema } from '../middleware/validate.middleware';
import prisma from '../prisma';

const router = Router();

// Create PayPal Sandbox Order
router.post(
  '/create-order',
  requireAuth,
  validateBody(createPayPalOrderSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { invoiceId } = req.body;

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

      const remainingToPay = Math.round((invoice.totalAmount - invoice.paidAmount) * 100) / 100;

      const order = await PayPalService.createOrder({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: remainingToPay,
        currency: 'INR',
        description: `FundFlow AI - Invoice ${invoice.invoiceNumber} for ${invoice.client.name}`,
      });

      // Record created order in database to establish pre-capture order-to-invoice association
      await prisma.payPalTransaction.create({
        data: {
          userId: req.userId!,
          orderId: order.orderId,
          amount: remainingToPay,
          currency: 'INR',
          status: 'CREATED',
          rawResponse: JSON.stringify({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            createdAt: new Date().toISOString(),
          }),
        },
      });

      res.json(order);
    } catch (error: any) {
      console.error('PayPal create order error:', error);
      res.status(500).json({ error: error.message || 'Failed to initiate PayPal order.' });
    }
  }
);

// Capture PayPal Sandbox Payment
router.post(
  '/capture-order',
  requireAuth,
  validateBody(capturePayPalOrderSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { orderId, invoiceId } = req.body;
      const simulateDbFailure = process.env.NODE_ENV !== 'production' && req.headers['x-simulate-db-failure'] === 'true';

      const result = await PayPalService.captureAndVerifyPayment({
        orderId,
        invoiceId,
        userId: req.userId!,
        simulateDbFailureAfterCapture: simulateDbFailure,
      });

      res.json(result);
    } catch (error: any) {
      console.error('PayPal capture order error:', error);
      res.status(500).json({ error: error.message || 'Payment capture failed.' });
    }
  }
);

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
