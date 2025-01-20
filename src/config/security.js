import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import appConfig from './appConfig.js';

export const securityMiddleware = helmet({
  contentSecurityPolicy: appConfig.app.environment === 'production',
  crossOriginEmbedderPolicy: appConfig.app.environment === 'production',
  crossOriginOpenerPolicy: appConfig.app.environment === 'production',
  crossOriginResourcePolicy: appConfig.app.environment === 'production'
});

export const rateLimiter = rateLimit({
  windowMs: appConfig.rateLimit.windowMs,
  max: appConfig.rateLimit.max,
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});