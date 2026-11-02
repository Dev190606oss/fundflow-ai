import { Router, Response } from 'express';
import prisma from '../prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { InvestmentCategory, OpportunityStatus } from '@prisma/client';
import { AIService } from '../services/ai.service';

const router = Router();

// 1. Get Investment Watchlist & IPOs
router.get('/watchlist', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const opportunities = await prisma.investmentOpportunity.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });

    const ipos = opportunities.filter((o) => o.category === InvestmentCategory.IPO);
    const others = opportunities.filter((o) => o.category !== InvestmentCategory.IPO);

    res.json({
      all: opportunities,
      ipos,
      others,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch investment watchlist.' });
  }
});

// Create investment watchlist opportunity
router.post('/watchlist', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      companyName,
      logoUrl,
      category,
      description,
      expectedAmount,
      targetDate,
      priceBand,
      lotSize,
      infoUrl,
      status,
      isVerified,
      officialSource,
      notes,
    } = req.body;

    if (!companyName) {
      res.status(400).json({ error: 'Company name is required.' });
      return;
    }

    const opportunity = await prisma.investmentOpportunity.create({
      data: {
        userId: req.userId!,
        companyName,
        logoUrl: logoUrl || null,
        category: (category as InvestmentCategory) || InvestmentCategory.IPO,
        description: description || null,
        expectedAmount: Number(expectedAmount) || 0,
        targetDate: targetDate ? new Date(targetDate) : null,
        priceBand: priceBand || null,
        lotSize: lotSize ? Number(lotSize) : null,
        infoUrl: infoUrl || null,
        status: (status as OpportunityStatus) || OpportunityStatus.UNVERIFIED,
        isVerified: Boolean(isVerified),
        officialSource: officialSource || null,
        lastVerifiedAt: new Date(),
        notes: notes || null,
      },
    });

    res.status(201).json(opportunity);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create opportunity.' });
  }
});

// Update investment opportunity
router.put('/watchlist/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.investmentOpportunity.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Opportunity not found.' });
      return;
    }

    const updated = await prisma.investmentOpportunity.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update opportunity.' });
  }
});

// Delete opportunity
router.delete('/watchlist/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.investmentOpportunity.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Opportunity not found.' });
      return;
    }

    await prisma.investmentOpportunity.delete({ where: { id: req.params.id } });
    res.json({ message: 'Opportunity removed.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete opportunity.' });
  }
});

// 2. Savings Goals & Contributions
router.get('/goals', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const goals = await prisma.savingsGoal.findMany({
      where: { userId: req.userId },
      include: {
        contributions: {
          orderBy: { contributionDate: 'desc' },
        },
      },
      orderBy: { targetDate: 'asc' },
    });

    const goalsWithCalculations = goals.map((goal) => {
      const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
      const percentage = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));

      const now = new Date();
      const target = new Date(goal.targetDate);
      const diffMs = target.getTime() - now.getTime();
      const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      const diffWeeks = Math.max(1, Math.ceil(diffDays / 7));
      const diffMonths = Math.max(1, Math.ceil(diffDays / 30));

      return {
        ...goal,
        remainingAmount,
        percentage,
        daysRemaining: diffDays,
        dailyRequired: Math.ceil(remainingAmount / diffDays),
        weeklyRequired: Math.ceil(remainingAmount / diffWeeks),
        monthlyRequired: Math.ceil(remainingAmount / diffMonths),
      };
    });

    res.json(goalsWithCalculations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch savings goals.' });
  }
});

// Create savings goal
router.post('/goals', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, targetAmount, initialDeposit, targetDate, category } = req.body;

    if (!title || !targetAmount || !targetDate) {
      res.status(400).json({ error: 'Title, target amount, and target date are required.' });
      return;
    }

    const initial = Number(initialDeposit) || 0;

    const goal = await prisma.$transaction(async (tx) => {
      const newGoal = await tx.savingsGoal.create({
        data: {
          userId: req.userId!,
          title,
          targetAmount: Number(targetAmount),
          currentAmount: initial,
          targetDate: new Date(targetDate),
          category: category || 'Investment Readiness',
        },
      });

      if (initial > 0) {
        await tx.savingsContribution.create({
          data: {
            goalId: newGoal.id,
            amount: initial,
            contributionDate: new Date(),
            sourceNotes: 'Initial seed allocation',
          },
        });
      }

      return newGoal;
    });

    res.status(201).json(goal);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create savings goal.' });
  }
});

// Add contribution to savings goal (ONLY confirmed funds)
router.post('/goals/:id/contributions', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { amount, sourceNotes } = req.body;
    const goalId = req.params.id;
    const contributionAmount = Number(amount);

    if (!contributionAmount || contributionAmount <= 0) {
      res.status(400).json({ error: 'Valid contribution amount is required.' });
      return;
    }

    const goal = await prisma.savingsGoal.findFirst({
      where: { id: goalId, userId: req.userId },
    });

    if (!goal) {
      res.status(404).json({ error: 'Savings goal not found.' });
      return;
    }

    const newCurrent = goal.currentAmount + contributionAmount;
    const isCompleted = newCurrent >= goal.targetAmount;

    const result = await prisma.$transaction(async (tx) => {
      const contribution = await tx.savingsContribution.create({
        data: {
          goalId,
          amount: contributionAmount,
          contributionDate: new Date(),
          sourceNotes: sourceNotes || 'Confirmed received earnings allocation',
        },
      });

      const updatedGoal = await tx.savingsGoal.update({
        where: { id: goalId },
        data: {
          currentAmount: newCurrent,
          isCompleted,
        },
        include: { contributions: true },
      });

      return { contribution, goal: updatedGoal };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to record savings contribution.' });
  }
});

// 3. AI Investment Readiness Assessment
router.get('/readiness', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const goalId = req.query.goalId as string | undefined;
    const targetAmount = req.query.targetAmount ? Number(req.query.targetAmount) : undefined;
    const weeks = req.query.weeks ? Number(req.query.weeks) : undefined;

    const analysis = await AIService.analyzeInvestmentReadiness(
      req.userId!,
      goalId,
      targetAmount,
      weeks
    );

    res.json(analysis);
  } catch (error) {
    console.error('Readiness analysis error:', error);
    res.status(500).json({ error: 'Failed to run investment readiness analysis.' });
  }
});

export default router;
