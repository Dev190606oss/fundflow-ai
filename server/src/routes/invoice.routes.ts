import { Router, Response } from 'express';
import prisma from '../prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { InvoiceStatus, PaymentMethod, PaymentStatus, TransactionType } from '@prisma/client';
import { validateBody, createInvoiceSchema, updateInvoiceSchema, manualPaymentSchema } from '../middleware/validate.middleware';

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

      // Auto-generate unique invoice number without collisions across tenants
      const count = await prisma.invoice.count();
      const year = new Date().getFullYear();
      let invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, '0')}`;
      let attempts = 0;
      while (await prisma.invoice.findUnique({ where: { invoiceNumber } })) {
        attempts++;
        invoiceNumber = `INV-${year}-${String(count + 1 + attempts).padStart(4, '0')}`;
      }

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
          status: status === InvoiceStatus.DRAFT ? InvoiceStatus.DRAFT : InvoiceStatus.PENDING,
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

// Update invoice status or fields (Guarded against unauthorized status manipulation)
router.put(
  '/:id',
  requireAuth,
  validateBody(updateInvoiceSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { status, dueDate, notes } = req.body;

      const existing = await prisma.invoice.findFirst({
        where: { id: req.params.id, userId: req.userId },
      });

      if (!existing) {
        res.status(404).json({ error: 'Invoice not found or unauthorized.' });
        return;
      }

      // Invoices that have received any payment cannot be cancelled
      if (status === InvoiceStatus.CANCELLED && existing.paidAmount > 0) {
        res.status(400).json({ error: 'Invoices with recorded payments cannot be cancelled.' });
        return;
      }

      // Partially paid invoices cannot have their payment-derived status altered
      if (existing.status === InvoiceStatus.PARTIALLY_PAID && status && status !== InvoiceStatus.PARTIALLY_PAID) {
        res.status(400).json({ error: 'Partially paid invoices cannot have their payment status altered.' });
        return;
      }

      // Settled invoices cannot have their status reversed or altered
      if (existing.status === InvoiceStatus.PAID && status && status !== InvoiceStatus.PAID) {
        res.status(400).json({ error: 'Settled invoices cannot have their status altered.' });
        return;
      }

      // If cancelling, execute atomic conditional update where paidAmount === 0 (Protects against concurrent payment race)
      if (status === InvoiceStatus.CANCELLED) {
        const updateResult = await prisma.invoice.updateMany({
          where: {
            id: existing.id,
            userId: req.userId,
            paidAmount: 0,
            status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.CANCELLED] },
          },
          data: {
            status: InvoiceStatus.CANCELLED,
            ...(dueDate && { dueDate: new Date(dueDate) }),
            ...(notes !== undefined && { notes: notes ? String(notes).trim() : null }),
          },
        });

        if (updateResult.count === 0) {
          res.status(400).json({
            error: 'Invoice cannot be cancelled: a payment was recorded concurrently or invoice is already settled.',
          });
          return;
        }

        const updated = await prisma.invoice.findUnique({
          where: { id: existing.id },
          include: { client: true, items: true },
        });
        res.json(updated);
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
  }
);

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

      const result = await prisma.$transaction(async (tx) => {
        // Acquire exclusive row-level lock on invoice to serialize concurrent payments
        await tx.$queryRaw`SELECT id FROM invoices WHERE id = ${invoice.id} FOR UPDATE`;

        // Fetch fresh state inside transaction boundary to avoid race conditions
        const freshInvoice = await tx.invoice.findUnique({
          where: { id: invoice.id },
          include: { client: true },
        });

        if (!freshInvoice || freshInvoice.status === InvoiceStatus.PAID || freshInvoice.status === InvoiceStatus.CANCELLED) {
          throw new Error('Invoice cannot accept payments: already settled or cancelled.');
        }

        const freshBalanceDue = Math.round((freshInvoice.totalAmount - freshInvoice.paidAmount) * 100) / 100;
        if (paymentAmount > freshBalanceDue) {
          throw new Error(`Payment amount (${paymentAmount}) exceeds fresh remaining balance due (${freshBalanceDue}).`);
        }

        const newPaidAmount = Math.round((freshInvoice.paidAmount + paymentAmount) * 100) / 100;
        let newStatus: InvoiceStatus = freshInvoice.status;
        if (newPaidAmount >= freshInvoice.totalAmount) {
          newStatus = InvoiceStatus.PAID;
        } else if (newPaidAmount > 0) {
          newStatus = InvoiceStatus.PARTIALLY_PAID;
        }

        const payment = await tx.payment.create({
          data: {
            invoiceId: freshInvoice.id,
            userId: req.userId!,
            amount: paymentAmount,
            paymentMethod: (paymentMethod as PaymentMethod) || PaymentMethod.BANK_TRANSFER,
            transactionId: reference ? String(reference).trim() : `MANUAL-${Date.now()}`,
            status: PaymentStatus.COMPLETED,
            paidAt: new Date(),
          },
        });

        const updatedInvoice = await tx.invoice.update({
          where: { id: freshInvoice.id },
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
            description: `Direct payment for ${freshInvoice.invoiceNumber} (${freshInvoice.client.name})`,
            amount: paymentAmount,
            referenceId: freshInvoice.id,
          },
        });

        return { payment, updatedInvoice };
      });

      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to record manual payment.' });
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
