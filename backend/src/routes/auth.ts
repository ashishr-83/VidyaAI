import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import admin from 'firebase-admin';
import { prisma } from '../lib/prisma';
import { env } from '../lib/env';
import { logger } from '../lib/logger';
import { AppError } from '../middleware/errorHandler';
import { requireAuth, JwtPayload } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';

const router = Router();

// ── Schemas ────────────────────────────────────────────────────────────────

const verifyOtpSchema = z.object({
  idToken: z.string().min(1, 'Firebase ID token is required'),
});

const registerSchema = z.object({
  name:     z.string().min(1).max(100),
  email:    z.string().email(),
  password: z.string().min(8),
});

const emailLoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

const onboardSchema = z.object({
  name: z.string().min(1).max(100),
  class: z.number().int().min(6).max(13), // 13 = JEE/NEET repeater year
  board: z.enum(['CBSE', 'ICSE', 'STATE', 'JEE', 'NEET']),
  language: z.enum(['hi', 'en', 'ta', 'te', 'kn', 'mr']).default('hi'),
  examDate: z.string().datetime().optional(),
  studyHoursPerDay: z.number().int().min(1).max(18).default(4),
});

// ── Helpers ────────────────────────────────────────────────────────────────

function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '30d' });
}

// ── Routes ─────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/verify-otp
 * Verifies a Firebase phone OTP ID token, upserts the user, returns JWT.
 */
router.post(
  '/verify-otp',
  authLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { idToken } = verifyOtpSchema.parse(req.body);

      let decodedToken: admin.auth.DecodedIdToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(idToken);
      } catch (err) {
        logger.warn('Firebase token verification failed', { error: String(err) });
        throw new AppError('Invalid Firebase ID token', 'INVALID_FIREBASE_TOKEN', 401);
      }

      const phone = decodedToken.phone_number;
      if (!phone) {
        throw new AppError('Phone number not present in Firebase token', 'NO_PHONE_IN_TOKEN', 400);
      }

      // Upsert: if new user, create with placeholder name — onboarding fills the rest
      const user = await prisma.user.upsert({
        where: { phone },
        update: { }, // existing users: just touch nothing — profile updates go to /onboard
        create: {
          phone,
          name: '',
          class: 0,    // sentinel — onboarding will set real values
          board: '',
          language: 'hi',
          tier: 'free',
        },
        select: { id: true, phone: true, tier: true, name: true, class: true },
      });

      const isOnboarded = user.class > 0;
      const token = signJwt({ userId: user.id, phone: user.phone, tier: user.tier });

      logger.info('User authenticated', { userId: user.id, isOnboarded });

      res.json({ token, isOnboarded, userId: user.id });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/auth/onboard
 * Saves class, board, exam date, language after first login.
 */
router.post(
  '/onboard',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = onboardSchema.parse(req.body);
      const userId = req.user!.userId;

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          name: data.name,
          class: data.class,
          board: data.board,
          language: data.language,
          examDate: data.examDate ? new Date(data.examDate) : null,
          studyHoursPerDay: data.studyHoursPerDay,
        },
        select: {
          id: true, phone: true, name: true, class: true, board: true,
          language: true, tier: true, examDate: true, studyHoursPerDay: true, createdAt: true,
        },
      });

      logger.info('User onboarded', { userId });

      res.json({ user });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/auth/register
 * Creates a new user with email + password, returns JWT.
 */
router.post(
  '/register',
  authLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password } = registerSchema.parse(req.body);

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        throw new AppError('Email already registered', 'EMAIL_EXISTS', 409);
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: { name, email, passwordHash, class: 0, board: '', language: 'en', tier: 'free' },
        select: { id: true, tier: true },
      });

      const token = signJwt({ userId: user.id, tier: user.tier });
      logger.info('User registered via email', { userId: user.id });
      res.status(201).json({ token, isOnboarded: false, userId: user.id });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/auth/login
 * Authenticates a user with email + password, returns JWT.
 */
router.post(
  '/login',
  authLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = emailLoginSchema.parse(req.body);

      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, phone: true, tier: true, class: true, passwordHash: true },
      });

      const INVALID = new AppError('Invalid email or password', 'INVALID_CREDENTIALS', 401);
      if (!user || !user.passwordHash) throw INVALID;

      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) throw INVALID;

      const payload: JwtPayload = {
        userId: user.id,
        tier: user.tier,
        ...(user.phone ? { phone: user.phone } : {}),
      };
      const token = signJwt(payload);
      const isOnboarded = user.class > 0;

      logger.info('User logged in via email', { userId: user.id, isOnboarded });
      res.json({ token, isOnboarded, userId: user.id });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/auth/profile
 * Returns the authenticated user's profile.
 */
router.get(
  '/profile',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: {
          id: true,
          phone: true,
          name: true,
          class: true,
          board: true,
          language: true,
          tier: true,
          examDate: true,
          studyHoursPerDay: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new AppError('User not found', 'USER_NOT_FOUND', 404);
      }

      res.json({ user });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
