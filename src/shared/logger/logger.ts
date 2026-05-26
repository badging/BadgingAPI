import { createLogger, format, transports } from 'winston';
import { isDevelopment } from '../../shared/config/environment';

const devFormat = format.printf(
  ({ timestamp, level, message, stack, ...meta }) => {
    const metaString =
      Object.keys(meta).length > 0
        ? `\n${JSON.stringify(meta, null, 2)}`
        : '';

    return `${timestamp} ${level}: ${stack || message}${metaString}`;
  }
);


export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',

  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),

    format.errors({ stack: true }),

    isDevelopment()
      ? format.combine(format.colorize(), devFormat)
      : format.json()
  ),

  transports: [new transports.Console()],
});
