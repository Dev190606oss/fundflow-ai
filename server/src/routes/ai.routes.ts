import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { AIService } from '../services/ai.service';

const router = Router();

// 1. Generate Structured Project Brief from Natural Language
router.post('/project-brief', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { prompt, clientName } = req.body;

    if (!prompt) {
      res.status(400).json({ error: 'Project description prompt is required.' });
      return;
    }

    const brief = await AIService.generateProjectBrief({ prompt, clientName });
    res.json(brief);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate project brief.' });
  }
});

// 2. Generate Polite Reminder Message
router.post('/polite-reminder', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { partyName, amount, dueDate, type, context } = req.body;

    if (!partyName || !amount) {
      res.status(400).json({ error: 'Party name and amount are required.' });
      return;
    }

    const reminder = await AIService.generatePoliteReminder({
      partyName,
      amount: Number(amount),
      dueDate: dueDate || 'in upcoming days',
      type: type || 'INVOICE',
      context,
    });

    res.json(reminder);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate polite reminder.' });
  }
});

// 3. Investment Readiness Analysis
router.post('/readiness-analysis', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { goalId, targetAmount, targetWeeks } = req.body;
    const analysis = await AIService.analyzeInvestmentReadiness(
      req.userId!,
      goalId,
      targetAmount ? Number(targetAmount) : undefined,
      targetWeeks ? Number(targetWeeks) : undefined
    );
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: 'Failed to execute investment readiness analysis.' });
  }
});

// 4. Conversational Financial Assistant Chat
router.post('/chat', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { message, history } = req.body;

    if (!message) {
      res.status(400).json({ error: 'Message content is required.' });
      return;
    }

    const reply = await AIService.chat(req.userId!, message, history || []);
    res.json({ reply });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: 'AI Assistant failed to generate response.' });
  }
});

export default router;
