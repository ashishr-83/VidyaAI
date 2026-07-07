import './lib/env'; // validates env vars at startup — must be first
import './lib/firebase'; // initialise Firebase Admin early
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './lib/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { errorHandler } from './middleware/errorHandler';
import { globalLimiter } from './middleware/rateLimit';
import authRoutes from './routes/auth';
import doubtRoutes from './routes/doubt';

const app = express();

// Security
app.use(helmet());
app.use(
  cors({
    origin: env.NODE_ENV === 'production' ? ['https://vidyaai.in'] : true,
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Global rate limit
app.use(globalLimiter);

// Request logger
app.use((req, _res, next) => {
  logger.info('HTTP request', { method: req.method, path: req.path, ip: req.ip });
  next();
});

// Health check — no auth required
app.get('/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', service: 'vidyaai-backend', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'degraded', service: 'vidyaai-backend', db: 'unreachable' });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/doubt', doubtRoutes);
// app.use('/api/plan', planRoutes);     // Session 6
// app.use('/api/progress', progressRoutes); // Session 7
// app.use('/api/payment', paymentRoutes);   // Session 8

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found', code: 'NOT_FOUND' });
});

// Central error handler — must be last
app.use(errorHandler);

// Graceful shutdown
async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received — shutting down gracefully`);
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

// Only bind the port when running as the main entry point, not when imported by tests.
if (require.main === module) {
  app.listen(env.PORT, () => {
    logger.info('VidyaAI backend started', {
      port: env.PORT,
      env: env.NODE_ENV,
    });
  });
}

export default app;
