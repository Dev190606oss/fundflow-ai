import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { validateBody, loginSchema, registerSchema, updateProfileSchema } from '../middleware/validate.middleware';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fundflow_jwt_secret_dev_key_2026_paypal_hack';

// Register (Strictly validates email, password min length, and name)
router.post(
  '/register',
  validateBody(registerSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { email, password, name, businessName } = req.body;

      const normalizedEmail = email.toLowerCase().trim();
      const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existing) {
        res.status(400).json({ error: 'An account with this email already exists.' });
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          name: name.trim(),
          businessName: businessName ? businessName.trim() : `${name.trim()}'s Studio`,
          currency: 'INR',
          role: 'USER', // Always defaults to USER - no self-escalation
        },
        select: {
          id: true,
          email: true,
          name: true,
          businessName: true,
          role: true,
          currency: true,
        },
      });

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      res.status(201).json({ user, token });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed. Internal server error.' });
    }
  }
);

// Login (Strictly validates payload)
router.post(
  '/login',
  validateBody(loginSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;
      const normalizedEmail = email.toLowerCase().trim();

      const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (!user) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          businessName: user.businessName,
          role: user.role,
          currency: user.currency,
        },
        token,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed. Internal server error.' });
    }
  }
);

// Get Current User Profile
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.json({ user: req.user });
});

// Update User Profile (Strict schema prevents role escalation or email changes)
router.put(
  '/me',
  requireAuth,
  validateBody(updateProfileSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { name, businessName, currency } = req.body;

      const updated = await prisma.user.update({
        where: { id: req.userId },
        data: {
          ...(name && { name: name.trim() }),
          ...(businessName !== undefined && { businessName: businessName ? businessName.trim() : null }),
          ...(currency && { currency }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          businessName: true,
          role: true,
          currency: true,
        },
      });
      res.json({ user: updated });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update user profile.' });
    }
  }
);

export default router;
