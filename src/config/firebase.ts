import fs from 'fs';
import path from 'path';
import { cert, getApps, initializeApp, type App, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { env } from './env';

type ServiceAccountCreds = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function normalizePrivateKey(raw: string): string {
  return stripWrappingQuotes(raw).replace(/\\n/g, '\n');
}

function loadServiceAccountFromEnv(): ServiceAccountCreds | null {
  const projectId = env.firebase.projectId;
  const clientEmail = env.firebase.clientEmail;
  const privateKey = env.firebase.privateKey
    ? normalizePrivateKey(env.firebase.privateKey)
    : undefined;

  // Env-credential method requires all three values. Missing private key is OK
  // when a service-account JSON file is configured instead.
  if (!projectId || !clientEmail || !privateKey) return null;

  return { projectId, clientEmail, privateKey };
}

/**
 * Resolve FIREBASE_SERVICE_ACCOUNT_PATH to an existing file.
 * Relative paths are resolved from process.cwd() (Coolify/Docker app root).
 */
function resolveServiceAccountFilePath(rawPath: string): string | null {
  const cleaned = stripWrappingQuotes(rawPath);
  if (!cleaned) return null;

  const candidates = new Set<string>();

  if (path.isAbsolute(cleaned)) {
    candidates.add(cleaned);
  } else {
    candidates.add(path.resolve(process.cwd(), cleaned));
    // Common Coolify layouts: repo root vs server/ subdirectory as cwd.
    candidates.add(path.resolve(process.cwd(), 'server', cleaned));
    candidates.add(path.resolve(process.cwd(), path.basename(cleaned)));
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  console.warn(
    `[firebase] Service account file not found for FIREBASE_SERVICE_ACCOUNT_PATH="${cleaned}". Tried: ${[
      ...candidates,
    ].join(', ')}`,
  );
  return null;
}

function loadServiceAccountFromFile(): ServiceAccountCreds | null {
  const rawPath = env.firebase.serviceAccountPath;
  if (!rawPath) return null;

  const resolved = resolveServiceAccountFilePath(rawPath);
  if (!resolved) return null;

  try {
    const json = JSON.parse(fs.readFileSync(resolved, 'utf8')) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };

    if (!json.project_id || !json.client_email || !json.private_key) {
      console.warn(
        '[firebase] Service account JSON is missing project_id, client_email, or private_key',
      );
      return null;
    }

    return {
      projectId: json.project_id,
      clientEmail: json.client_email,
      privateKey: normalizePrivateKey(json.private_key),
    };
  } catch (error) {
    console.warn(
      '[firebase] Failed to read service account JSON:',
      error instanceof Error ? error.message : 'unknown error',
    );
    return null;
  }
}

function resolveServiceAccount(): ServiceAccountCreds | null {
  // Prefer JSON file when FIREBASE_SERVICE_ACCOUNT_PATH is set (production method).
  // Env vars (including FIREBASE_PRIVATE_KEY) remain an optional fallback.
  return loadServiceAccountFromFile() || loadServiceAccountFromEnv();
}

export function isFirebaseAdminConfigured(): boolean {
  return Boolean(resolveServiceAccount());
}

function getFirebaseApp(): App {
  const credentials = resolveServiceAccount();
  if (!credentials) {
    throw new Error(
      'Firebase Admin is not configured. Provide either FIREBASE_SERVICE_ACCOUNT_PATH to a valid service-account JSON file, or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.',
    );
  }

  const existing = getApps();
  if (existing.length > 0) {
    return existing[0]!;
  }

  const serviceAccount: ServiceAccount = {
    projectId: credentials.projectId,
    clientEmail: credentials.clientEmail,
    privateKey: credentials.privateKey,
  };

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

export async function verifyFirebaseIdToken(idToken: string) {
  return getAuth(getFirebaseApp()).verifyIdToken(idToken);
}
