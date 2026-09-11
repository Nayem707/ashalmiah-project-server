import { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { ApiError } from '../utils/apiError';
import { verifyAccessToken } from '../utils/jwt';

// Requires a valid access token. Attaches the decoded payload to req.user.
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Authentication token missing');
  }
  const token = header.slice(7).trim();
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }
}

// Restricts access to the given roles. Must run after authenticate.
export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw ApiError.unauthorized();
    }
    if (roles.length && !roles.includes(req.user.role)) {
      throw ApiError.forbidden('Insufficient permissions');
    }
    next();
  };
}

// Optional auth: attaches req.user when a valid token is present, otherwise continues.
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = verifyAccessToken(header.slice(7).trim());
    } catch {
      // ignore invalid token for optional auth
    }
  }
  next();
}
