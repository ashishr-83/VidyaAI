import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import twilio from 'twilio';
import { prisma } from '../lib/prisma';
import { env } from '../lib/env';
import { logger } from '../lib/logger';
import { AppError } from '../middleware/errorHandler';
import { requireAuth, JwtPayload } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';

const router = Router();

// Lazily initialised so the server starts even without Twilio credentials
let _twilioClient: ReturnType<typeof twilio> | null = null;

function getTwilioClient(): ReturnType<typeof twilio> {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    throw new AppError(
      'Twilio is not configured — set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN',
      'SMS_NOT_CONFIGURED',
      503
    );
  }
  if (!_twilioClient) {
    _twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  }
  return _twilioClient;
}

// ── Schemas ────────────────────────────────────────────────────────────────

const sendOtpSchema = z.object({
  phone: z.string().regex(/^\d{10}$/, 'Phone must be a 10-digit Indian mobile number'),
});

const verifyOtpSchema = z.object({
  phone: z.string().regex(/^\d{10}$/),
  otp:   z.string().length(6).regex(/^\d{6}$/, 'OTP must be 6 digits'),
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

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ── Routes ─────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/send-otp
 * Generates a 6-digit OTP, persists a bcrypt hash with 10-min expiry, sends via Twilio SMS.
 */
router.post(
  '/send-otp',
  authLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { phone } = sendOtpSchema.parse(req.body);
      const fullPhone = `+91${phone}`;

      const otp = generateOtp();
      const otpHash = await bcrypt.hash(otp, 10);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Delete any existing OTP records for this phone to prevent replay
      await prisma.otpRecord.deleteMany({ where: { phone } });

      await prisma.otpRecord.create({
        data: { phone, otp: otpHash, expiresAt },
      });

      if (!env.TWILIO_SMS_FROM) {
        throw new AppError('SMS sender number not configured — set TWILIO_SMS_FROM', 'SMS_NOT_CONFIGURED', 503);
      }

      await getTwilioClient().messages.create({
        to:   fullPhone,
        from: env.TWILIO_SMS_FROM,
        body: `Your VidyaAI OTP is ${otp}. Valid for 10 minutes. Do not share this code.`,
      });

      logger.info('OTP sent', { phone });
      res.json({ message: 'OTP sent successfully' });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/auth/verify-otp
 * Validates { phone, otp } against the DB record, upserts user, returns JWT.
 */
router.post(
  '/verify-otp',
  authLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { phone, otp } = verifyOtpSchema.parse(req.body);

      const record = await prisma.otpRecord.findFirst({
        where: { phone, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      });

      if (!record) {
        throw new AppError('OTP expired or not found — request a new one', 'OTP_NOT_FOUND', 400);
      }

      const match = await bcrypt.compare(otp, record.otp);
      if (!match) {
        throw new AppError('Incorrect OTP', 'OTP_INVALID', 401);
      }

      // Consume OTP — delete after successful verification
      await prisma.otpRecord.delete({ where: { id: record.id } });

      // Upsert user — new users get placeholder values filled by /onboard
      const user = await prisma.user.upsert({
        where: { phone },
        update: {},
        create: {
          phone,
          name: '',
          class: 0,    // sentinel — onboarding sets real value
          board: '',
          language: 'hi',
          tier: 'free',
        },
        select: { id: true, phone: true, tier: true, class: true },
      });

      const isOnboarded = user.class > 0;
      const token = signJwt({ userId: user.id, phone: user.phone ?? undefined, tier: user.tier });

      logger.info('User authenticated via OTP', { userId: user.id, isOnboarded });
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
