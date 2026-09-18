import fs from 'fs';
import path from 'path';
import { Request } from 'express';
import { env } from '../../config/env';
import { uploadRoot } from './uploads.middleware';

export function publicUploadUrl(req: Request, filename: string) {
  return `${req.protocol}://${req.get('host')}/${env.upload.dir}/${filename}`;
}

/** Extract a local upload filename from an absolute or relative upload URL. */
export function extractUploadKey(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl) return null;
  try {
    const pathname = /^https?:\/\//i.test(avatarUrl)
      ? new URL(avatarUrl).pathname
      : avatarUrl;
    const prefix = `/${env.upload.dir}/`;
    if (!pathname.startsWith(prefix)) return null;
    const key = decodeURIComponent(pathname.slice(prefix.length));
    if (!key || key.includes('/') || key.includes('\\') || key.includes('..')) {
      return null;
    }
    return key;
  } catch {
    return null;
  }
}

export function deleteLocalUpload(key: string | null | undefined): void {
  if (!key) return;
  if (key.includes('/') || key.includes('\\') || key.includes('..')) return;
  const filePath = path.join(uploadRoot, key);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
