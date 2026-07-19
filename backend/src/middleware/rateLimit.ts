import rateLimit from 'express-rate-limit';

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts', code: 'AUTH_RATE_LIMIT_EXCEEDED' },
});

// Free tier: 3 voice + 5 text doubts/day. Enforced at route level via DB check,
// not here — this is just a burst guard.
export const doubtLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute burst guard
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Slow down — too many requests', code: 'DOUBT_RATE_LIMIT_EXCEEDED' },
});

// Lesson respond endpoint — students type quickly, allow up to 60 req/min per user.
export const lessonLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many lesson messages — slow down', code: 'LESSON_RATE_LIMIT_EXCEEDED' },
});
