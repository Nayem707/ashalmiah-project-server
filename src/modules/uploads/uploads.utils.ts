import fs from 'fs';
import path from 'path';
import { Request } from 'express';
import { env } from '../../config/env';
import { uploadRoot } from './uploads.middleware';

/**
 * Public path stored in the DB and returned by upload APIs.
 * Always relative: `/uploads/<filename>` (independent of absolute UPLOAD_DIR).
 */
export function publicUploadPath(filename: string): string {
  const key = path.basename(filename);
  return `${env.upload.publicPath}/${key}`;
}

/**
 * Backward-compatible alias used by controllers/services.
 * Ignores request host/protocol so URLs are not bound to localhost or a deploy domain.
 */
export function publicUploadUrl(_req: Request, filename: string): string {
  return publicUploadPath(filename);
}

/**
 * Extract a bare upload filename from:
 * - `/uploads/file.jpg`
 * - `https://any-host/uploads/file.jpg`
 * - legacy absolute URLs pointing at the same public path
 */
export function extractUploadKey(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  try {
    const pathname = /^https?:\/\//i.test(imageUrl)
      ? new URL(imageUrl).pathname
      : imageUrl;

    const publicPath = env.upload.publicPath; // e.g. /uploads
    const prefix = `${publicPath}/`;

    let remainder: string | null = null;
    if (pathname.startsWith(prefix)) {
      remainder = pathname.slice(prefix.length);
    } else {
      // Fallback: any path segment `.../uploads/<file>`
      const match = pathname.match(/(?:^|\/)uploads\/([^/?#]+)$/i);
      remainder = match?.[1] ?? null;
    }

    if (!remainder) return null;
    const key = decodeURIComponent(remainder.split('/')[0] || '');
    if (!key || key.includes('..') || key.includes('\\')) return null;
    return key;
  } catch {
    return null;
  }
}

export function deleteLocalUpload(key: string | null | undefined): void {
  if (!key) return;
  const safeKey = path.basename(String(key));
  if (!safeKey || safeKey.includes('..')) return;
  const filePath = path.join(uploadRoot, safeKey);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/** True when a stored image value refers to a locally managed upload. */
export function isLocalUploadUrl(imageUrl: string | null | undefined): boolean {
  return Boolean(extractUploadKey(imageUrl));
}
