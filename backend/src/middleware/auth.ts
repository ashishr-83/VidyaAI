import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../lib/env';
import { AppError } from './errorHandler';

export interface JwtPayload {
  userId: string;
  phone: string;
  tier: string;
}

// Extends Express Request so downstream handlers have typed req.user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('Missing or malformed Authorization header', 'UNAUTHORIZED', 401));
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    next(new AppError('Invalid or expired token', 'INVALID_TOKEN', 401));
  }
}

export function requireTier(...tiers: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Unauthorized', 'UNAUTHORIZED', 401));
    }
    if (!tiers.includes(req.user.tier)) {
      return next(new AppError('Upgrade your plan to access this feature', 'TIER_REQUIRED', 403));
    }
    next();
  };
}
