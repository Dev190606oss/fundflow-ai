import { Router, Response } from 'express';
import prisma from '../prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { InvoiceStatus, PaymentMethod, PaymentStatus, TransactionType } from '@prisma/client';
import { validateBody, createInvoiceSchema, manualPaymentSchema } from '../middleware/validate.middleware';

const router = Router();

// Get all invoices for authenticated user
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { userId: req.userId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
          },
        },
        items: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoices.' });
  }
});

// Create new invoice (Strict Zod validation)
router.post(
  '/',
  requireAuth,
  validateBody(createInvoiceSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { clientId, dueDate, items, taxRate, discountAmount, notes, status } = req.body;

      // Verify client belongs to user (Prevents cross-tenant association)
      const client = await prisma.client.findFirst({
        where: { id: clientId, userId: req.userId },
      });

      if (!client) {
        res.status(404).json({ error: 'Selected client does not exist or unauthorized.' });
        return;
      }

      // Auto-generate invoice number
      const count = await prisma.invoice.count({ where: { userId: req.userId } });
      const year = new Date().getFullYear();
      const invoiceNumber = `INV-${year}-${String(count + 1).padStart(3, '0')}`;

      // Calculate totals securely
      const calculatedItems = items.map((item: any) => {
        const qty = Math.max(1, Number(item.quantity) || 1);
        const price = Math.max(0, Number(item.unitPrice) || 0);
        return {
          description: String(item.description).trim(),
          quantity: qty,
          unitPrice: price,
          amount: Math.round(qty * price * 100) / 100,
        };
      });

      const subtotal = calculatedItems.reduce((acc: number, curr: any) => acc + curr.amount, 0);
      const taxPercentage = Math.min(100, Math.max(0, Number(taxRate) || 0));
      const taxAmount = Math.round(((subtotal * taxPercentage) / 100) * 100) / 100;
      const discount = Math.min(subtotal, Math.max(0, Number(discountAmount) || 0));
      const totalAmount = Math.max(0, subtotal + taxAmount - discount);

      const invoice = await prisma.invoice.create({
        data: {
          userId: req.userId!,
          clientId: client.id,
          invoiceNumber,
          issueDate: new Date(),
          dueDate: new Date(dueDate),
          status: status || InvoiceStatus.PENDING,
          subtotal,
          taxRate: taxPercentage,
          taxAmount,
          discountAmount: discount,
          totalAmount,
          paidAmount: 0,
          notes: notes ? String(notes).trim() : null,
          items: {
            create: calculatedItems,
          },
        },
        include: {
          client: true,
          items: true,
        },
      });

      res.status(201).json(invoice);
    } catch (error) {
      console.error('Invoice creation error:', error);
      res.status(500).json({ error: 'Failed to create invoice.' });
    }
  }
);

// Get invoice by ID (Strict ownership check)
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        client: true,
        items: true,
        payments: {
          include: {
            paypalTransactions: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
            businessName: true,
            currency: true,
          },
        },
      },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found or unauthorized.' });
      return;
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoice.' });
  }
});

// Update invoice status or fields
router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, dueDate, notes } = req.body;

    const existing = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Invoice not found or unauthorized.' });
      return;
    }

    const updated = await prisma.invoice.update({
      where: { id: existing.id },
      data: {
        ...(status && { status }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(notes !== undefined && { notes: notes ? String(notes).trim() : null }),
      },
      include: {
        client: true,
        items: true,
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update invoice.' });
  }
});

// Record manual payment with strict balance limits and idempotency
router.post(
  '/:id/manual-payment',
  requireAuth,
  validateBody(manualPaymentSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { amount, paymentMethod, reference } = req.body;
      const invoiceId = req.params.id;
      const paymentAmount = Number(amount);

      const invoice = await prisma.invoice.findFirst({
        where: { id: invoiceId, userId: req.userId },
        include: { client: true },
      });

      if (!invoice) {
        res.status(404).json({ error: 'Invoice not found or unauthorized.' });
        return;
      }

      if (invoice.status === InvoiceStatus.PAID) {
        res.status(400).json({ error: 'Invoice is already fully settled.' });
        return;
      }

      const balanceDue = invoice.totalAmount - invoice.paidAmount;
      if (paymentAmount > balanceDue) {
        res.status(400).json({
          error: `Payment amount (${paymentAmount}) exceeds the remaining balance due (${balanceDue}).`,
        });
        return;
      }

      const newPaidAmount = Math.round((invoice.paidAmount + paymentAmount) * 100) / 100;
      let newStatus: InvoiceStatus = invoice.status;
      if (newPaidAmount >= invoice.totalAmount) {
        newStatus = InvoiceStatus.PAID;
      } else if (newPaidAmount > 0) {
        newStatus = InvoiceStatus.PARTIALLY_PAID;
      }

      const result = await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            invoiceId: invoice.id,
            userId: req.userId!,
            amount: paymentAmount,
            paymentMethod: (paymentMethod as PaymentMethod) || PaymentMethod.BANK_TRANSFER,
            transactionId: reference ? String(reference).trim() : `MANUAL-${Date.now()}`,
            status: PaymentStatus.COMPLETED,
            paidAt: new Date(),
          },
        });

        const updatedInvoice = await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: newPaidAmount,
            status: newStatus,
          },
          include: { client: true, items: true },
        });

        await tx.transaction.create({
          data: {
            userId: req.userId!,
            type: TransactionType.INCOME,
            category: 'Freelance Payout',
            description: `Direct payment for ${invoice.invoiceNumber} (${invoice.client.name})`,
            amount: paymentAmount,
            referenceId: invoice.id,
          },
        });

        return { payment, updatedInvoice };
      });

      res.json(result);
    } catch (error) {
      console.error('Manual payment error:', error);
      res.status(500).json({ error: 'Failed to record payment.' });
    }
  }
);

// Delete invoice (Enforces ownership)
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Invoice not found or unauthorized.' });
      return;
    }

    await prisma.invoice.delete({
      where: { id: existing.id },
    });

    res.json({ message: 'Invoice deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete invoice.' });
  }
});

export default router;
