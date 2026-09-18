import crypto from 'crypto';
import { User } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import { comparePassword, hashPassword } from '../../utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { env } from '../../config/env';
import { isFirebaseAdminConfigured, verifyFirebaseIdToken } from '../../config/firebase';

function toPublicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    authProvider: user.authProvider,
    isGoogleVerified: user.authProvider === 'GOOGLE' || Boolean(user.firebaseUid),
    avatarUrl: user.avatarUrl,
    phone: user.phone,
    createdAt: user.createdAt,
  };
}

function parseDuration(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return amount * multipliers[unit];
}

async function issueTokens(user: User) {
  const tokenId = crypto.randomUUID();
  const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
  const refreshToken = signRefreshToken({ sub: user.id, tokenId });

  await prisma.refreshToken.create({
    data: {
      id: tokenId,
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + parseDuration(env.jwt.refreshExpiresIn)),
    },
  });

  return { accessToken, refreshToken };
}

export const authService = {
  async register(input: { name: string; email: string; password: string; phone?: string }) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw ApiError.conflict('Email is already registered');
    }
    const passwordHash = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        authProvider: 'LOCAL',
        phone: input.phone,
      },
    });
    const tokens = await issueTokens(user);
    return { user: toPublicUser(user), ...tokens };
  },

  async login(input: { email: string; password: string }) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }
    if (user.status === 'INACTIVE') {
      throw ApiError.forbidden('Account is inactive');
    }
    if (!user.passwordHash) {
      throw ApiError.unauthorized(
        'This account uses Google sign-in. Please continue with Google.',
      );
    }
    const valid = await comparePassword(input.password, user.passwordHash);
    if (!valid) {
      throw ApiError.unauthorized('Invalid email or password');
    }
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const tokens = await issueTokens(user);
    return { user: toPublicUser(user), ...tokens };
  },

  /**
   * Google Sign-In via Firebase:
   * verify ID token → find/link/create DB user → issue existing app JWTs.
   */
  async loginWithGoogle(idToken: string) {
    if (!isFirebaseAdminConfigured()) {
      throw ApiError.badRequest(
        'Google sign-in is not configured on the server. Set FIREBASE_SERVICE_ACCOUNT_PATH to a valid service-account JSON file, or set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.',
      );
    }

    let decoded;
    try {
      decoded = await verifyFirebaseIdToken(idToken);
    } catch {
      throw ApiError.unauthorized('Invalid Google credential');
    }

    const firebaseUid = decoded.uid;
    const email = decoded.email?.toLowerCase();
    if (!email) {
      throw ApiError.badRequest('Google account email is required');
    }

    const name =
      (typeof decoded.name === 'string' && decoded.name.trim()) ||
      email.split('@')[0] ||
      'Google User';
    const picture = typeof decoded.picture === 'string' ? decoded.picture : undefined;

    let user = await prisma.user.findUnique({ where: { firebaseUid } });

    if (!user) {
      user = await prisma.user.findUnique({ where: { email } });

      if (user) {
        // Link Google to the existing account; preserve role, password, orders, etc.
        if (user.firebaseUid && user.firebaseUid !== firebaseUid) {
          throw ApiError.conflict('This email is already linked to another Google account');
        }
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            firebaseUid,
            // Keep LOCAL if they already have a password; otherwise mark GOOGLE.
            authProvider: user.passwordHash ? user.authProvider : 'GOOGLE',
            avatarUrl: user.avatarUrl || picture || null,
            lastLoginAt: new Date(),
          },
        });
      } else {
        user = await prisma.user.create({
          data: {
            name,
            email,
            passwordHash: null,
            authProvider: 'GOOGLE',
            firebaseUid,
            avatarUrl: picture || null,
            role: 'USER',
            lastLoginAt: new Date(),
          },
        });
      }
    } else {
      if (user.status === 'INACTIVE') {
        throw ApiError.forbidden('Account is inactive');
      }
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          avatarUrl: user.avatarUrl || picture || null,
        },
      });
    }

    if (user.status === 'INACTIVE') {
      throw ApiError.forbidden('Account is inactive');
    }

    const tokens = await issueTokens(user);
    return { user: toPublicUser(user), ...tokens };
  },

  async refresh(refreshToken: string) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw ApiError.unauthorized('Invalid refresh token');
    }
    const stored = await prisma.refreshToken.findUnique({ where: { id: payload.tokenId } });
    if (
      !stored ||
      stored.token !== refreshToken ||
      stored.revokedAt ||
      stored.expiresAt < new Date()
    ) {
      throw ApiError.unauthorized('Refresh token is no longer valid');
    }
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw ApiError.unauthorized('User no longer exists');
    }
    // Rotate: revoke the used token and issue a fresh pair.
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    const tokens = await issueTokens(user);
    return { user: toPublicUser(user), ...tokens };
  },

  async logout(refreshToken: string) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      await prisma.refreshToken.updateMany({
        where: { id: payload.tokenId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // Ignore invalid tokens on logout.
    }
    return { message: 'Logged out' };
  },

  // Placeholder flows: in production these integrate with an email provider.
  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    // Always respond the same way to avoid user enumeration.
    if (user) {
      // A real implementation would generate a reset token and email it.
    }
    return { message: 'If an account exists, a reset link has been sent' };
  },

  async resetPassword(_token: string, _password: string) {
    // Placeholder: verify reset token, then update password.
    throw ApiError.badRequest('Password reset is not configured in this environment');
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');
    return toPublicUser(user);
  },
};
