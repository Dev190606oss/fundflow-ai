import { Router, Response } from 'express';
import prisma from '../prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();

// Full reports summary
router.get('/summary', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    const [clients, invoices, loans, goals, transactions] = await Promise.all([
      prisma.client.findMany({
        where: { userId },
        include: { invoices: true },
      }),
      prisma.invoice.findMany({
        where: { userId },
        include: { client: true },
        orderBy: { issueDate: 'desc' },
      }),
      prisma.loan.findMany({
        where: { userId },
        include: { repayments: true },
      }),
      prisma.savingsGoal.findMany({
        where: { userId },
        include: { contributions: true },
      }),
      prisma.transaction.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
      }),
    ]);

    // Client-wise Revenue Breakdown
    const clientRevenue = clients.map((c) => {
      const billed = c.invoices.reduce((sum, i) => sum + i.totalAmount, 0);
      const paid = c.invoices.reduce((sum, i) => sum + i.paidAmount, 0);
      return {
        id: c.id,
        name: c.name,
        company: c.company || 'Direct Client',
        billed,
        paid,
        outstanding: billed - paid,
      };
    }).sort((a, b) => b.billed - a.billed);

    // Lending vs Borrowing recovery rates
    const lent = loans.filter((l) => l.type === 'LENT');
    const borrowed = loans.filter((l) => l.type === 'BORROWED');

    const totalLent = lent.reduce((sum, l) => sum + l.principalAmount, 0);
    const lentRecovered = lent.reduce((sum, l) => sum + l.amountRepaid, 0);
    const lentRecoveryRate = totalLent > 0 ? Math.round((lentRecovered / totalLent) * 100) : 100;

    const totalBorrowed = borrowed.reduce((sum, l) => sum + l.principalAmount, 0);
    const borrowedRepaid = borrowed.reduce((sum, l) => sum + l.amountRepaid, 0);
    const debtRepaidRate = totalBorrowed > 0 ? Math.round((borrowedRepaid / totalBorrowed) * 100) : 100;

    // Monthly aggregation
    const monthlyIncome = invoices
      .filter((i) => i.status === 'PAID')
      .reduce((sum, i) => sum + i.totalAmount, 0);

    const monthlyExpense = transactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    res.json({
      clientRevenue,
      loanMetrics: {
        totalLent,
        lentRecovered,
        lentOutstanding: totalLent - lentRecovered,
        lentRecoveryRate,
        totalBorrowed,
        borrowedRepaid,
        borrowedOutstanding: totalBorrowed - borrowedRepaid,
        debtRepaidRate,
      },
      savingsMetrics: {
        totalGoals: goals.length,
        totalTarget: goals.reduce((sum, g) => sum + g.targetAmount, 0),
        totalAccumulated: goals.reduce((sum, g) => sum + g.currentAmount, 0),
      },
      cashflow: {
        totalIncome: monthlyIncome,
        totalExpense: monthlyExpense,
        netMargin: monthlyIncome - monthlyExpense,
      },
      allTransactions: transactions.slice(0, 20),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate financial reports.' });
  }
});

// CSV Export for records
router.get('/export/csv', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { userId: req.userId },
      include: { client: true },
      orderBy: { issueDate: 'desc' },
    });

    // Generate CSV string
    const headers = ['Invoice Number', 'Client Name', 'Company', 'Issue Date', 'Due Date', 'Status', 'Total (INR)', 'Paid (INR)', 'Balance (INR)'];
    const rows = invoices.map((inv) => [
      inv.invoiceNumber,
      `"${inv.client.name.replace(/"/g, '""')}"`,
      `"${(inv.client.company || '').replace(/"/g, '""')}"`,
      new Date(inv.issueDate).toISOString().split('T')[0],
      new Date(inv.dueDate).toISOString().split('T')[0],
      inv.status,
      inv.totalAmount.toFixed(2),
      inv.paidAmount.toFixed(2),
      (inv.totalAmount - inv.paidAmount).toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=fundflow_invoices_${Date.now()}.csv`);
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export CSV.' });
  }
});

export default router;
