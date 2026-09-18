import 'dotenv/config';
import path from 'path';

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/** Normalize a public URL path to `/uploads` form (no trailing slash). */
function normalizePublicPath(raw: string): string {
  const trimmed = String(raw || '/uploads').trim() || '/uploads';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.replace(/\/+$/, '') || '/uploads';
}

/**
 * Resolve the physical upload directory.
 * - Absolute paths (e.g. `/uploads`) are used as-is (Coolify volume).
 * - Relative paths (e.g. `uploads`) resolve against process.cwd() (local `server/uploads`).
 */
function resolveUploadDir(raw: string): string {
  const value = String(raw || 'uploads').trim() || 'uploads';
  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT ?? 5000),
  apiPrefix: process.env.API_PREFIX ?? '/api/v1',

  databaseUrl: required('DATABASE_URL'),

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev_access_secret'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev_refresh_secret'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },

  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  upload: {
    /** Physical disk directory for Multer (absolute or relative to cwd). */
    dir: resolveUploadDir(process.env.UPLOAD_DIR ?? 'uploads'),
    /** Public URL path prefix always served/stored as `/uploads/...`. */
    publicPath: normalizePublicPath(process.env.UPLOAD_PUBLIC_PATH ?? '/uploads'),
    maxSizeMb: Number(process.env.MAX_UPLOAD_SIZE_MB ?? 5),
  },

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_MAX ?? 300),
  },

  /** Firebase Admin (optional — required only for Google sign-in). */
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID?.trim() || undefined,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL?.trim() || undefined,
    /** Private key may be quoted and use `\n` escapes in .env files. */
    privateKey: process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/^"|"$/g, '')
      : undefined,
    /** Absolute or server-cwd-relative path to a service account JSON file. */
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() || undefined,
  },
};
