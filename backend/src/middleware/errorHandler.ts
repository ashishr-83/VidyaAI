import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger';

export interface ApiError {
  error: string;
  code: string;
}

export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    const fields = err.flatten().fieldErrors;
    res.status(400).json({ error: 'Validation failed', code: 'VALIDATION_ERROR', fields });
    return;
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error('AppError', { message: err.message, code: err.code, stack: err.stack });
    }
    res.status(err.statusCode).json({ error: err.message, code: err.code } satisfies ApiError);
    return;
  }

  const message = err instanceof Error ? err.message : 'Internal server error';
  logger.error('Unhandled error', { message, stack: err instanceof Error ? err.stack : undefined });
  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' } satisfies ApiError);
}
