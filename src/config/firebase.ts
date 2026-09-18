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

function normalizePrivateKey(raw: string): string {
  let key = raw.trim();
  // Coolify/Docker often wraps values in quotes.
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  // Env files usually store newlines as literal \n.
  return key.replace(/\\n/g, '\n');
}

function loadServiceAccountFromEnv(): ServiceAccountCreds | null {
  const projectId = env.firebase.projectId;
  const clientEmail = env.firebase.clientEmail;
  const privateKey = env.firebase.privateKey
    ? normalizePrivateKey(env.firebase.privateKey)
    : undefined;

  if (!projectId || !clientEmail || !privateKey) return null;

  return { projectId, clientEmail, privateKey };
}

function loadServiceAccountFromFile(): ServiceAccountCreds | null {
  const rawPath = env.firebase.serviceAccountPath;
  if (!rawPath) return null;

  const resolved = path.isAbsolute(rawPath)
    ? rawPath
    : path.resolve(process.cwd(), rawPath);

  if (!fs.existsSync(resolved)) {
    console.warn(`[firebase] Service account file not found: ${resolved}`);
    return null;
  }

  const json = JSON.parse(fs.readFileSync(resolved, 'utf8')) as {
    project_id?: string;
    client_email?: string;
    private_key?: string;
  };

  if (!json.project_id || !json.client_email || !json.private_key) {
    console.warn('[firebase] Service account JSON is missing required fields');
    return null;
  }

  return {
    projectId: json.project_id,
    clientEmail: json.client_email,
    privateKey: normalizePrivateKey(json.private_key),
  };
}

function resolveServiceAccount(): ServiceAccountCreds | null {
  // Prefer env vars in production (Coolify/Docker); fall back to local JSON file.
  return loadServiceAccountFromEnv() || loadServiceAccountFromFile();
}

export function isFirebaseAdminConfigured(): boolean {
  return Boolean(resolveServiceAccount());
}

function getFirebaseApp(): App {
  const credentials = resolveServiceAccount();
  if (!credentials) {
    throw new Error(
      'Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY on the server.',
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
