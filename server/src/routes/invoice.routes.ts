import { Router, Response } from 'express';
import prisma from '../prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { InvoiceStatus, PaymentMethod, PaymentStatus, TransactionType } from '@prisma/client';

const router = Router();

// Get all invoices
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

// Create new invoice
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { clientId, dueDate, items, taxRate, discountAmount, notes, status } = req.body;

    if (!clientId || !dueDate || !items || !items.length) {
      res.status(400).json({ error: 'Client, due date, and at least one item are required.' });
      return;
    }

    // Verify client belongs to user
    const client = await prisma.client.findFirst({
      where: { id: clientId, userId: req.userId },
    });

    if (!client) {
      res.status(404).json({ error: 'Selected client does not exist.' });
      return;
    }

    // Auto-generate invoice number
    const count = await prisma.invoice.count({ where: { userId: req.userId } });
    const year = new Date().getFullYear();
    const invoiceNumber = `INV-${year}-${String(count + 1).padStart(3, '0')}`;

    // Calculate totals
    const calculatedItems = items.map((item: any) => ({
      description: item.description,
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      amount: (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
    }));

    const subtotal = calculatedItems.reduce((acc: number, curr: any) => acc + curr.amount, 0);
    const taxPercentage = Number(taxRate) || 0;
    const taxAmount = (subtotal * taxPercentage) / 100;
    const discount = Number(discountAmount) || 0;
    const totalAmount = Math.max(0, subtotal + taxAmount - discount);

    const invoice = await prisma.invoice.create({
      data: {
        userId: req.userId!,
        clientId,
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
        notes: notes || null,
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
});

// Get invoice by ID
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
      res.status(404).json({ error: 'Invoice not found.' });
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
      res.status(404).json({ error: 'Invoice not found.' });
      return;
    }

    const updated = await prisma.invoice.update({
      where: { id: req.params.id },
      data: {
        ...(status && { status }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(notes !== undefined && { notes }),
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

// Record manual payment for an invoice (Cash / Bank Transfer)
router.post('/:id/manual-payment', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { amount, paymentMethod, reference } = req.body;
    const invoiceId = req.params.id;
    const paymentAmount = Number(amount);

    if (!paymentAmount || paymentAmount <= 0) {
      res.status(400).json({ error: 'Valid payment amount is required.' });
      return;
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId: req.userId },
      include: { client: true },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found.' });
      return;
    }

    const newPaidAmount = invoice.paidAmount + paymentAmount;
    let newStatus = invoice.status;
    if (newPaidAmount >= invoice.totalAmount) {
      newStatus = InvoiceStatus.PAID;
    } else if (newPaidAmount > 0) {
      newStatus = InvoiceStatus.PARTIALLY_PAID;
    }

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          invoiceId,
          userId: req.userId!,
          amount: paymentAmount,
          paymentMethod: (paymentMethod as PaymentMethod) || PaymentMethod.BANK_TRANSFER,
          transactionId: reference || `MANUAL-${Date.now()}`,
          status: PaymentStatus.COMPLETED,
          paidAt: new Date(),
        },
      });

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
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
          referenceId: invoiceId,
        },
      });

      return { payment, updatedInvoice };
    });

    res.json(result);
  } catch (error) {
    console.error('Manual payment error:', error);
    res.status(500).json({ error: 'Failed to record payment.' });
  }
});

// Delete invoice
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Invoice not found.' });
      return;
    }

    await prisma.invoice.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Invoice deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete invoice.' });
  }
});

export default router;
