import { Router, Response } from 'express';
import prisma from '../prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { LoanType, LoanStatus, TransactionType } from '@prisma/client';
import { validateBody, createLoanSchema, repaymentSchema } from '../middleware/validate.middleware';

const router = Router();

// Get all loans for authenticated user
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const loans = await prisma.loan.findMany({
      where: { userId: req.userId },
      include: {
        repayments: {
          orderBy: { repaymentDate: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const lent = loans.filter((l) => l.type === LoanType.LENT);
    const borrowed = loans.filter((l) => l.type === LoanType.BORROWED);

    const totalLent = lent.reduce((sum, l) => sum + l.principalAmount, 0);
    const totalLentRecovered = lent.reduce((sum, l) => sum + l.amountRepaid, 0);
    const lentOutstanding = lent
      .filter((l) => l.status === LoanStatus.ACTIVE)
      .reduce((sum, l) => sum + l.remainingAmount, 0);

    const totalBorrowed = borrowed.reduce((sum, l) => sum + l.principalAmount, 0);
    const totalBorrowedRepaid = borrowed.reduce((sum, l) => sum + l.amountRepaid, 0);
    const borrowedOutstanding = borrowed
      .filter((l) => l.status === LoanStatus.ACTIVE)
      .reduce((sum, l) => sum + l.remainingAmount, 0);

    res.json({
      loans,
      lent,
      borrowed,
      summary: {
        totalLent,
        totalLentRecovered,
        lentOutstanding,
        totalBorrowed,
        totalBorrowedRepaid,
        borrowedOutstanding,
        netPosition: lentOutstanding - borrowedOutstanding,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch borrow and lend records.' });
  }
});

// Create loan record (Strict Zod validation)
router.post(
  '/',
  requireAuth,
  validateBody(createLoanSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { type, partyName, contactInfo, principalAmount, interestRate, startDate, dueDate, notes } = req.body;

      const principal = Math.round(Number(principalAmount) * 100) / 100;
      const loan = await prisma.$transaction(async (tx) => {
        const newLoan = await tx.loan.create({
          data: {
            userId: req.userId!,
            type: type as LoanType,
            partyName: partyName.trim(),
            contactInfo: contactInfo ? contactInfo.trim() : null,
            principalAmount: principal,
            interestRate: Number(interestRate) || 0,
            amountRepaid: 0,
            remainingAmount: principal,
            startDate: startDate ? new Date(startDate) : new Date(),
            dueDate: dueDate ? new Date(dueDate) : null,
            status: LoanStatus.ACTIVE,
            notes: notes ? notes.trim() : null,
          },
        });

        // Record transaction
        await tx.transaction.create({
          data: {
            userId: req.userId!,
            type: type === 'LENT' ? TransactionType.LOAN_DISBURSEMENT : TransactionType.INCOME,
            category: type === 'LENT' ? 'Personal Lending' : 'Borrowed Capital',
            description: type === 'LENT' ? `Lent money to ${partyName.trim()}` : `Borrowed funds from ${partyName.trim()}`,
            amount: principal,
            referenceId: newLoan.id,
          },
        });

        return newLoan;
      });

      res.status(201).json(loan);
    } catch (error) {
      console.error('Error creating loan:', error);
      res.status(500).json({ error: 'Failed to record loan.' });
    }
  }
);

// Record repayment with strict IDOR ownership check and overpayment limit
router.post(
  '/:id/repayments',
  requireAuth,
  validateBody(repaymentSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { amount, notes, repaymentDate } = req.body;
      const loanId = req.params.id;
      const repaymentAmount = Math.round(Number(amount) * 100) / 100;

      // Strict ownership check prevents IDOR
      const loan = await prisma.loan.findFirst({
        where: { id: loanId, userId: req.userId },
      });

      if (!loan) {
        res.status(404).json({ error: 'Loan record not found or unauthorized.' });
        return;
      }

      if (loan.status === LoanStatus.FULLY_REPAID || loan.remainingAmount <= 0) {
        res.status(400).json({ error: 'Loan has already been fully repaid.' });
        return;
      }

      if (repaymentAmount > loan.remainingAmount) {
        res.status(400).json({
          error: `Repayment amount (${repaymentAmount}) exceeds the remaining balance (${loan.remainingAmount}).`,
        });
        return;
      }

      const newAmountRepaid = Math.round((loan.amountRepaid + repaymentAmount) * 100) / 100;
      const newRemaining = Math.max(0, Math.round((loan.remainingAmount - repaymentAmount) * 100) / 100);
      const newStatus = newRemaining === 0 ? LoanStatus.FULLY_REPAID : LoanStatus.ACTIVE;

      const result = await prisma.$transaction(async (tx) => {
        const repayment = await tx.loanRepayment.create({
          data: {
            loanId: loan.id,
            amount: repaymentAmount,
            repaymentDate: repaymentDate ? new Date(repaymentDate) : new Date(),
            notes: notes ? String(notes).trim() : null,
          },
        });

        const updatedLoan = await tx.loan.update({
          where: { id: loan.id },
          data: {
            amountRepaid: newAmountRepaid,
            remainingAmount: newRemaining,
            status: newStatus,
          },
          include: { repayments: true },
        });

        // Create transaction record
        await tx.transaction.create({
          data: {
            userId: req.userId!,
            type: loan.type === 'LENT' ? TransactionType.LOAN_REPAYMENT : TransactionType.EXPENSE,
            category: loan.type === 'LENT' ? 'Loan Recovery' : 'Debt Repayment',
            description: loan.type === 'LENT' ? `Repayment received from ${loan.partyName}` : `Repayment sent to ${loan.partyName}`,
            amount: repaymentAmount,
            referenceId: loan.id,
          },
        });

        return { repayment, loan: updatedLoan };
      });

      res.json(result);
    } catch (error) {
      console.error('Repayment error:', error);
      res.status(500).json({ error: 'Failed to record repayment.' });
    }
  }
);

// Delete loan (Enforces ownership)
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.loan.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Loan record not found or unauthorized.' });
      return;
    }

    await prisma.loan.delete({ where: { id: existing.id } });
    res.json({ message: 'Loan record deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete loan.' });
  }
});

export default router;
