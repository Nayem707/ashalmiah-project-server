import { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { verifyAccessToken } from '../utils/jwt';

// Requires a valid access token for an ACTIVE user. Attaches payload to req.user.
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Authentication token missing');
    }
    const token = header.slice(7).trim();

    let payload: { sub: string; role: Role; email: string };
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw ApiError.unauthorized('Invalid or expired token');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, status: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw ApiError.unauthorized('Account is inactive or not found');
    }

    req.user = {
      sub: user.id,
      role: user.role,
      email: user.email,
    };
    next();
  } catch (err) {
    next(err);
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

// Optional auth: attaches req.user when a valid token is present for an ACTIVE user.
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      try {
        const payload = verifyAccessToken(header.slice(7).trim());
        const user = await prisma.user.findUnique({
          where: { id: payload.sub },
          select: { id: true, email: true, role: true, status: true },
        });
        if (user?.status === 'ACTIVE') {
          req.user = {
            sub: user.id,
            role: user.role,
            email: user.email,
          };
        }
      } catch {
        // ignore invalid token for optional auth
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}
