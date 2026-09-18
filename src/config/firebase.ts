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

function loadServiceAccountFromFile(): ServiceAccountCreds | null {
  const rawPath = env.firebase.serviceAccountPath;
  if (!rawPath) return null;

  const resolved = path.isAbsolute(rawPath)
    ? rawPath
    : path.resolve(process.cwd(), rawPath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`Firebase service account file not found: ${resolved}`);
  }

  const json = JSON.parse(fs.readFileSync(resolved, 'utf8')) as {
    project_id?: string;
    client_email?: string;
    private_key?: string;
  };

  if (!json.project_id || !json.client_email || !json.private_key) {
    throw new Error('Firebase service account JSON is missing required fields');
  }

  return {
    projectId: json.project_id,
    clientEmail: json.client_email,
    privateKey: json.private_key,
  };
}

function resolveServiceAccount(): ServiceAccountCreds | null {
  try {
    const fromFile = loadServiceAccountFromFile();
    if (fromFile) return fromFile;
  } catch (error) {
    console.error('[firebase]', error instanceof Error ? error.message : error);
    return null;
  }

  if (env.firebase.projectId && env.firebase.clientEmail && env.firebase.privateKey) {
    return {
      projectId: env.firebase.projectId,
      clientEmail: env.firebase.clientEmail,
      privateKey: env.firebase.privateKey,
    };
  }

  return null;
}

export function isFirebaseAdminConfigured(): boolean {
  return Boolean(resolveServiceAccount());
}

function getFirebaseApp(): App {
  const credentials = resolveServiceAccount();
  if (!credentials) {
    throw new Error('Firebase Admin is not configured');
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
