import rateLimit from 'express-rate-limit';
import { RequestHandler } from 'express';
import { env } from '../config/env';

const passthrough: RequestHandler = (_req, _res, next) => next();

// In development, skip the global limiter so local UI work / hot reload
// does not trip 429s. Production keeps the configured window/max.
export const apiLimiter: RequestHandler = env.isProduction
  ? rateLimit({
      windowMs: env.rateLimit.windowMs,
      max: env.rateLimit.max,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: { message: 'Too many requests, please try again later.' },
      },
    })
  : passthrough;

// Public order tracking is unauthenticated, so slow down order-number guessing.
export const trackOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isProduction ? 30 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many tracking attempts, please try again later.' },
  },
});

// Guest checkout is unauthenticated, so cap order spam per IP. Signed-in checkouts are not limited.
export const guestCheckoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isProduction ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => Boolean(req.user),
  message: {
    success: false,
    error: { message: 'Too many orders from this device, please try again later.' },
  },
});

// Stricter limiter for authentication endpoints to slow brute-force attempts.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isProduction ? 20 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many attempts, please try again later.' },
  },
});
