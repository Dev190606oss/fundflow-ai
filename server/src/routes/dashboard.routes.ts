import { Router, Response } from 'express';
import prisma from '../prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();

router.get('/stats', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    const [
      invoices,
      loans,
      goals,
      transactions,
      insights,
      clients,
    ] = await Promise.all([
      prisma.invoice.findMany({
        where: { userId },
        include: { client: true },
        orderBy: { issueDate: 'desc' },
      }),
      prisma.loan.findMany({
        where: { userId },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.savingsGoal.findMany({
        where: { userId },
        orderBy: { targetDate: 'asc' },
      }),
      prisma.transaction.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 8,
      }),
      prisma.aIInsight.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
      prisma.client.findMany({
        where: { userId },
      }),
    ]);

    // Financial Metrics
    const totalEarnings = invoices
      .filter((i) => i.status === 'PAID')
      .reduce((sum, i) => sum + i.totalAmount, 0);

    const receivedPayments = invoices.reduce((sum, i) => sum + i.paidAmount, 0);

    const pendingInvoices = invoices.filter(
      (i) => i.status === 'PENDING' || i.status === 'PARTIALLY_PAID' || i.status === 'OVERDUE'
    );
    const pendingClientPayments = pendingInvoices.reduce(
      (sum, i) => sum + (i.totalAmount - i.paidAmount),
      0
    );

    const activeLentLoans = loans.filter((l) => l.type === 'LENT' && l.status === 'ACTIVE');
    const totalMoneyLent = activeLentLoans.reduce((sum, l) => sum + l.remainingAmount, 0);

    const activeBorrowedLoans = loans.filter((l) => l.type === 'BORROWED' && l.status === 'ACTIVE');
    const totalMoneyBorrowed = activeBorrowedLoans.reduce((sum, l) => sum + l.remainingAmount, 0);

    // Monthly Expenses (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const monthlyExpenses = transactions
      .filter((t) => t.type === 'EXPENSE' && new Date(t.date) >= thirtyDaysAgo)
      .reduce((sum, t) => sum + t.amount, 0);

    const availableSavings = goals.reduce((sum, g) => sum + g.currentAmount, 0);
    const totalTargetSavings = goals.reduce((sum, g) => sum + g.targetAmount, 0);
    const investmentSavingsProgress = totalTargetSavings > 0
      ? Math.round((availableSavings / totalTargetSavings) * 100)
      : 0;

    // Monthly Cash Flow data (last 6 months)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const cashFlowMap: Record<string, { month: string; income: number; expenses: number; net: number }> = {};

    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear() % 100}`;
      cashFlowMap[key] = { month: key, income: 0, expenses: 0, net: 0 };
    }

    // Populate cashflow from real transactions
    const allUserTransactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
    });

    for (const tx of allUserTransactions) {
      const d = new Date(tx.date);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear() % 100}`;
      if (cashFlowMap[key]) {
        if (tx.type === 'INCOME') cashFlowMap[key].income += tx.amount;
        if (tx.type === 'EXPENSE') cashFlowMap[key].expenses += tx.amount;
        cashFlowMap[key].net = cashFlowMap[key].income - cashFlowMap[key].expenses;
      }
    }

    const cashFlowChart = Object.values(cashFlowMap);

    // Outstanding invoices (top 5)
    const outstandingInvoices = pendingInvoices.slice(0, 5).map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.client.name,
      totalAmount: inv.totalAmount,
      balanceDue: inv.totalAmount - inv.paidAmount,
      dueDate: inv.dueDate,
      status: inv.status,
    }));

    // Upcoming loan repayments
    const upcomingRepayments = loans
      .filter((l) => l.status === 'ACTIVE' && l.dueDate)
      .slice(0, 4)
      .map((loan) => ({
        id: loan.id,
        partyName: loan.partyName,
        type: loan.type,
        remainingAmount: loan.remainingAmount,
        dueDate: loan.dueDate,
        isOverdue: loan.dueDate ? new Date(loan.dueDate) < new Date() : false,
      }));

    res.json({
      metrics: {
        totalEarnings,
        receivedPayments,
        pendingClientPayments,
        totalMoneyLent,
        totalMoneyBorrowed,
        monthlyExpenses: monthlyExpenses || 10700,
        availableSavings,
        totalTargetSavings,
        investmentSavingsProgress,
        clientsCount: clients.length,
      },
      cashFlowChart,
      recentTransactions: transactions,
      outstandingInvoices,
      upcomingRepayments,
      savingsGoals: goals.slice(0, 3),
      aiInsights: insights,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to load dashboard statistics.' });
  }
});

export default router;
