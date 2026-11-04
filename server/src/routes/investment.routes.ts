import { Router, Response } from 'express';
import prisma from '../prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { InvestmentCategory, OpportunityStatus } from '@prisma/client';
import { AIService } from '../services/ai.service';
import {
  validateBody,
  createOpportunitySchema,
  createGoalSchema,
  createContributionSchema,
} from '../middleware/validate.middleware';

const router = Router();

// 1. Get Investment Watchlist & IPOs for authenticated user
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

// Create investment watchlist opportunity (Strict Zod validation)
router.post(
  '/watchlist',
  requireAuth,
  validateBody(createOpportunitySchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

      const opportunity = await prisma.investmentOpportunity.create({
        data: {
          userId: req.userId!,
          companyName: companyName.trim(),
          logoUrl: logoUrl ? logoUrl.trim() : null,
          category: category as InvestmentCategory,
          description: description ? description.trim() : null,
          expectedAmount: Math.max(0, Number(expectedAmount) || 0),
          targetDate: targetDate ? new Date(targetDate) : null,
          priceBand: priceBand ? priceBand.trim() : null,
          lotSize: lotSize ? Math.max(1, Number(lotSize)) : null,
          infoUrl: infoUrl ? infoUrl.trim() : null,
          status: status as OpportunityStatus,
          isVerified: Boolean(isVerified),
          officialSource: officialSource ? officialSource.trim() : null,
          lastVerifiedAt: new Date(),
          notes: notes ? notes.trim() : null,
        },
      });

      res.status(201).json(opportunity);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create opportunity.' });
    }
  }
);

// Update investment opportunity (Prevents mass assignment and IDOR)
router.put('/watchlist/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.investmentOpportunity.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Opportunity not found or unauthorized.' });
      return;
    }

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

    const updated = await prisma.investmentOpportunity.update({
      where: { id: existing.id },
      data: {
        ...(companyName && { companyName: String(companyName).trim() }),
        ...(logoUrl !== undefined && { logoUrl: logoUrl ? String(logoUrl).trim() : null }),
        ...(category && { category: category as InvestmentCategory }),
        ...(description !== undefined && { description: description ? String(description).trim() : null }),
        ...(expectedAmount !== undefined && { expectedAmount: Math.max(0, Number(expectedAmount)) }),
        ...(targetDate !== undefined && { targetDate: targetDate ? new Date(targetDate) : null }),
        ...(priceBand !== undefined && { priceBand: priceBand ? String(priceBand).trim() : null }),
        ...(lotSize !== undefined && { lotSize: lotSize ? Number(lotSize) : null }),
        ...(infoUrl !== undefined && { infoUrl: infoUrl ? String(infoUrl).trim() : null }),
        ...(status && { status: status as OpportunityStatus }),
        ...(isVerified !== undefined && { isVerified: Boolean(isVerified) }),
        ...(officialSource !== undefined && { officialSource: officialSource ? String(officialSource).trim() : null }),
        ...(notes !== undefined && { notes: notes ? String(notes).trim() : null }),
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update opportunity.' });
  }
});

// Delete opportunity (Enforces ownership)
router.delete('/watchlist/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.investmentOpportunity.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Opportunity not found or unauthorized.' });
      return;
    }

    await prisma.investmentOpportunity.delete({ where: { id: existing.id } });
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

// Create savings goal (Strict validation)
router.post(
  '/goals',
  requireAuth,
  validateBody(createGoalSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { title, targetAmount, initialDeposit, targetDate, category } = req.body;

      const target = Math.max(1, Number(targetAmount));
      const initial = Math.max(0, Number(initialDeposit) || 0);

      const goal = await prisma.$transaction(async (tx) => {
        const newGoal = await tx.savingsGoal.create({
          data: {
            userId: req.userId!,
            title: title.trim(),
            targetAmount: target,
            currentAmount: initial,
            targetDate: new Date(targetDate),
            category: category ? category.trim() : 'Investment Readiness',
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
  }
);

// Add contribution to savings goal (ONLY confirmed funds, strict ownership check)
router.post(
  '/goals/:id/contributions',
  requireAuth,
  validateBody(createContributionSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { amount, sourceNotes } = req.body;
      const goalId = req.params.id;
      const contributionAmount = Math.round(Number(amount) * 100) / 100;

      // Ownership check protects against cross-user contributions
      const goal = await prisma.savingsGoal.findFirst({
        where: { id: goalId, userId: req.userId },
      });

      if (!goal) {
        res.status(404).json({ error: 'Savings goal not found or unauthorized.' });
        return;
      }

      const newCurrent = Math.round((goal.currentAmount + contributionAmount) * 100) / 100;
      const isCompleted = newCurrent >= goal.targetAmount;

      const result = await prisma.$transaction(async (tx) => {
        const contribution = await tx.savingsContribution.create({
          data: {
            goalId: goal.id,
            amount: contributionAmount,
            contributionDate: new Date(),
            sourceNotes: sourceNotes ? String(sourceNotes).trim() : 'Confirmed received earnings allocation',
          },
        });

        const updatedGoal = await tx.savingsGoal.update({
          where: { id: goal.id },
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
  }
);

// 3. AI Investment Readiness Assessment
router.get('/readiness', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const goalId = req.query.goalId as string | undefined;
    const targetAmount = req.query.targetAmount ? Math.max(0, Number(req.query.targetAmount)) : undefined;
    const weeks = req.query.weeks ? Math.min(52, Math.max(1, Number(req.query.weeks))) : undefined;

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
