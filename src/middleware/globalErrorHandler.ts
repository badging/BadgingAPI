import { Request, Response, NextFunction } from 'express';
import { logger } from '../shared/logger';
import { AppError } from '../shared/errors';  

export function globalErrorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const statusCode = err?.statusCode || 500;

  const isAppError = err instanceof AppError;

  
  const cause =
    err?.cause instanceof Error
      ? {
          name: err.cause.name,
          message: err.cause.message,
          stack: err.cause.stack,
        }
      : err?.cause;

  logger.error(isAppError ? 'API Error' : 'System Error', {
    name: err?.name,
    message: err?.message,
    stack: err?.stack,
    path: req.path,
    method: req.method,
    statusCode,
    context: err?.context ?? null,
    cause: cause ?? null,
  });

  if (res.headersSent) {
    return next(err);
  }

  return res.status(statusCode).json({
    status: 'error',
    message:
      statusCode === 500
        ? 'Internal server error'
        : err?.message || 'Unknown error',
    context: err?.context ?? null,
  });
}