import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { AIService } from '../services/ai.service';
import { validateBody, aiBriefSchema, aiReminderSchema, aiChatSchema } from '../middleware/validate.middleware';

const router = Router();

// 1. Generate Structured Project Brief from Natural Language (Strict validation)
router.post(
  '/project-brief',
  requireAuth,
  validateBody(aiBriefSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { prompt, clientName } = req.body;
      const brief = await AIService.generateProjectBrief({ prompt, clientName });
      res.json(brief);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate project brief.' });
    }
  }
);

// 2. Generate Polite Reminder Message (Strict validation)
router.post(
  '/polite-reminder',
  requireAuth,
  validateBody(aiReminderSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { partyName, amount, dueDate, type, context } = req.body;

      const reminder = await AIService.generatePoliteReminder({
        partyName: partyName.trim(),
        amount: Number(amount),
        dueDate: dueDate || 'in upcoming days',
        type: type || 'INVOICE',
        context: context ? String(context).trim() : undefined,
      });

      res.json(reminder);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate polite reminder.' });
    }
  }
);

// 3. Investment Readiness Analysis
router.post('/readiness-analysis', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { goalId, targetAmount, targetWeeks } = req.body;
    const analysis = await AIService.analyzeInvestmentReadiness(
      req.userId!,
      goalId,
      targetAmount ? Math.max(0, Number(targetAmount)) : undefined,
      targetWeeks ? Math.min(52, Math.max(1, Number(targetWeeks))) : undefined
    );
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: 'Failed to execute investment readiness analysis.' });
  }
});

// 4. Conversational Financial Assistant Chat (Strict validation)
router.post(
  '/chat',
  requireAuth,
  validateBody(aiChatSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { message, history } = req.body;
      const reply = await AIService.chat(req.userId!, message, history || []);
      res.json({ reply });
    } catch (error) {
      console.error('AI chat error:', error);
      res.status(500).json({ error: 'AI Assistant failed to generate response.' });
    }
  }
);

export default router;
