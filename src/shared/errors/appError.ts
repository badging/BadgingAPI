export class AppError extends Error {
  public statusCode: number;
  public context?: Record<string, any>;

  constructor(
    message: string,
    statusCode = 500,
    cause?: unknown,
    context?: Record<string, any>
  ) {
    super(message, { cause });

    this.statusCode = statusCode;
    this.context = context;

    // fixes prototype chain (important for instanceof checks)
    Object.setPrototypeOf(this, new.target.prototype);

    // ensures proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}