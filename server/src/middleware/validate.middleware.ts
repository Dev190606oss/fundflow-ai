import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = (error as any).issues || (error as any).errors || [];
        const formatted = issues.map((i: any) => ({
          field: i.path ? i.path.join('.') : 'root',
          message: i.message,
        }));
        res.status(400).json({
          error: 'Validation failed. Please verify your input.',
          details: formatted,
        });
        return;
      }
      res.status(400).json({ error: 'Malformed request payload.' });
    }
  };
};

// 1. Auth Schemas
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address').max(255),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  businessName: z.string().max(120).optional().nullable(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  businessName: z.string().max(120).optional().nullable(),
  currency: z.enum(['INR', 'USD', 'EUR']).optional(),
}).strict(); // Prevents role injection or privilege escalation

// 2. Client Schemas
export const createClientSchema = z.object({
  name: z.string().min(2, 'Client name is required').max(100),
  email: z.string().email('Valid client email is required').max(255),
  phone: z.string().max(30).optional().nullable(),
  company: z.string().max(100).optional().nullable(),
  projectDetails: z.string().max(1000).optional().nullable(),
  contractAmount: z.coerce.number().min(0, 'Contract amount cannot be negative').default(0),
  startDate: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
  projectStatus: z.string().max(50).optional(),
  paymentStatus: z.string().max(50).optional(),
});

// 3. Invoice Schemas
export const invoiceItemSchema = z.object({
  description: z.string().min(1, 'Item description is required').max(255),
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  unitPrice: z.coerce.number().min(0, 'Unit price cannot be negative'),
});

export const createInvoiceSchema = z.object({
  clientId: z.string().uuid('Invalid client ID format'),
  dueDate: z.string().min(1, 'Due date is required'),
  items: z.array(invoiceItemSchema).min(1, 'At least one invoice item is required'),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  discountAmount: z.coerce.number().min(0).default(0),
  notes: z.string().max(1000).optional().nullable(),
  status: z.enum(['DRAFT', 'PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
});

export const manualPaymentSchema = z.object({
  amount: z.coerce.number().positive('Payment amount must be greater than zero'),
  paymentMethod: z.enum(['PAYPAL', 'BANK_TRANSFER', 'CASH', 'OTHER']).default('BANK_TRANSFER'),
  reference: z.string().max(100).optional().nullable(),
});

// 4. Loan Schemas
export const createLoanSchema = z.object({
  type: z.enum(['LENT', 'BORROWED']),
  partyName: z.string().min(2, 'Party name is required').max(100),
  contactInfo: z.string().max(150).optional().nullable(),
  principalAmount: z.coerce.number().positive('Principal amount must be greater than zero'),
  interestRate: z.coerce.number().min(0).max(100).default(0),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const repaymentSchema = z.object({
  amount: z.coerce.number().positive('Repayment amount must be greater than zero'),
  notes: z.string().max(500).optional().nullable(),
  repaymentDate: z.string().optional().nullable(),
});

// 5. Investment & Goal Schemas
export const createOpportunitySchema = z.object({
  companyName: z.string().min(2, 'Company name is required').max(100),
  category: z.enum(['IPO', 'STOCKS', 'MUTUAL_FUNDS', 'ETFS', 'BONDS', 'OTHER']).default('IPO'),
  status: z.enum(['CONFIRMED', 'ANNOUNCED', 'RUMOURED', 'UNVERIFIED', 'CLOSED']).default('UNVERIFIED'),
  expectedAmount: z.coerce.number().min(0).default(0),
  targetDate: z.string().optional().nullable(),
  priceBand: z.string().max(100).optional().nullable(),
  lotSize: z.coerce.number().min(1).optional().nullable(),
  infoUrl: z.string().url('Must be a valid URL').optional().nullable().or(z.literal('')),
  officialSource: z.string().max(255).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  isVerified: z.boolean().default(false),
});

export const createGoalSchema = z.object({
  title: z.string().min(2, 'Goal title is required').max(120),
  targetAmount: z.coerce.number().positive('Target amount must be greater than zero'),
  initialDeposit: z.coerce.number().min(0).default(0),
  targetDate: z.string().min(1, 'Target date is required'),
  category: z.string().max(80).optional(),
});

export const createContributionSchema = z.object({
  amount: z.coerce.number().positive('Contribution amount must be greater than zero'),
  sourceNotes: z.string().max(500).optional().nullable(),
});

// 6. AI Schemas
export const aiBriefSchema = z.object({
  prompt: z.string().trim().min(3, 'Prompt too short').max(2000, 'Prompt exceeds 2000 characters'),
  clientName: z.string().trim().max(100).optional(),
});

export const aiReminderSchema = z.object({
  partyName: z.string().trim().min(2).max(100),
  amount: z.coerce.number().positive(),
  dueDate: z.string().max(50).optional(),
  type: z.enum(['LENT', 'INVOICE']).default('INVOICE'),
  context: z.string().trim().max(500).optional(),
});

export const aiChatSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(2000, 'Message exceeds 2000 characters'),
  history: z.array(z.object({
    role: z.string(),
    content: z.string().max(3000),
  })).optional(),
});
