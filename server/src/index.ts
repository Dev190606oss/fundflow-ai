import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import prisma from './prisma';

import authRoutes from './routes/auth.routes';
import dashboardRoutes from './routes/dashboard.routes';
import clientRoutes from './routes/client.routes';
import invoiceRoutes from './routes/invoice.routes';
import paypalRoutes from './routes/paypal.routes';
import loanRoutes from './routes/loan.routes';
import investmentRoutes from './routes/investment.routes';
import aiRoutes from './routes/ai.routes';
import notificationRoutes from './routes/notification.routes';
import reportRoutes from './routes/report.routes';
import adminRoutes from './routes/admin.routes';

// ==========================================
// 1. Startup Environment & Security Validation
// ==========================================
const validateEnvironment = () => {
  const missing: string[] = [];
  if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
  if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');

  if (missing.length > 0) {
    console.error(`❌ FATAL: Missing critical environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'production') {
    if (process.env.JWT_SECRET === 'fundflow_jwt_secret_dev_key_2026_paypal_hack' || process.env.JWT_SECRET!.length < 24) {
      console.error('❌ FATAL: Production environment detected with insecure/default JWT_SECRET. Server refusing to start.');
      process.exit(1);
    }
  }
};
validateEnvironment();

const app = express();
const PORT = process.env.PORT || 5001;

// ==========================================
// 2. HTTP Security Headers (Helmet)
// ==========================================
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        connectSrc: ["'self'", 'https://api-m.sandbox.paypal.com', 'https://generativelanguage.googleapis.com'],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// ==========================================
// 3. Strict CORS Policy
// ==========================================
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('CORS blocked: Origin not allowed.'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// ==========================================
// 4. Rate Limiting Protection
// ==========================================
// Global limiter to prevent DoS (150 requests per 15 minutes per IP)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP. Please try again after 15 minutes.' },
});
app.use('/api/', globalLimiter);

// Stricter limiter for authentication endpoints (prevents credential stuffing & brute-force)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please wait 15 minutes before retrying.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Rate limiter for AI computation endpoints (prevents cost exhaustion & spam)
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI request limit reached for this session. Please wait a few moments.' },
});
app.use('/api/ai/', aiLimiter);

// ==========================================
// 5. Body Parsers with Controlled Limits (Anti-DoS)
// ==========================================
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Health Check Endpoint (Live Database Ping & Service Readiness)
app.get('/api/health', async (req: Request, res: Response) => {
  const startTime = Date.now();
  let dbStatus = 'disconnected';
  let dbLatency = -1;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
    dbLatency = Date.now() - startTime;
  } catch (err) {
    dbStatus = 'error';
  }

  const isHealthy = dbStatus === 'connected';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    app: 'FundFlow AI API',
    version: '1.0.0',
    hackathon: 'PayPal AI Hackathon 2026',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: {
      status: dbStatus,
      latencyMs: dbLatency,
    },
    services: {
      paypalSandbox: Boolean(process.env.PAYPAL_CLIENT_ID),
      geminiAI: Boolean(process.env.GEMINI_API_KEY),
    },
    security: {
      headers: 'helmet-active',
      rateLimiting: 'active',
      rbac: 'enforced',
    },
  });
});

// ==========================================
// 6. Mount Application Routes
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/paypal', paypalRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);

// 404 Route Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ==========================================
// 7. Secure Centralized Error Handler
// ==========================================
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.status || 500;

  // In production, suppress internal error details and stack traces
  const isProduction = process.env.NODE_ENV === 'production';
  const errorMessage = isProduction && statusCode === 500
    ? 'Internal Server Error'
    : err.message || 'An unexpected error occurred';

  if (!isProduction) {
    console.error('Unhandled Application Error:', err);
  }

  res.status(statusCode).json({
    error: errorMessage,
    ...(isProduction ? {} : { stack: err.stack }),
  });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 FundFlow AI Server running securely on http://localhost:${PORT}`);
  console.log(`🛡️ Security: Helmet, Rate-Limiting & RBAC Active`);
  console.log(`💳 PayPal Integration: Sandbox Mode Active`);
  console.log(`🤖 AI Engine: Active`);
});

// Graceful Shutdown Handler for Containers & Deployments
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    console.log('🔒 HTTP server closed.');
    try {
      await prisma.$disconnect();
      console.log('📦 Database connections cleanly closed.');
      process.exit(0);
    } catch (err) {
      console.error('Error during database disconnect:', err);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error('⚠️ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
