import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/apiError';
import { uploadRoot } from './uploads.middleware';
import { publicUploadUrl } from './uploads.utils';

export const uploadsController = {
  uploadImages: asyncHandler(async (req: Request, res: Response) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) throw ApiError.badRequest('No files uploaded');
    const data = files.map((f) => ({
      key: f.filename,
      url: publicUploadUrl(req, f.filename),
    }));
    return sendCreated(res, data);
  }),

  deleteImage: asyncHandler(async (req: Request, res: Response) => {
    const key = req.params.key;
    // Guard against path traversal: only allow a bare filename.
    if (key.includes('/') || key.includes('\\') || key.includes('..')) {
      throw ApiError.badRequest('Invalid file key');
    }
    const filePath = path.join(uploadRoot, key);
    if (!fs.existsSync(filePath)) throw ApiError.notFound('File not found');
    fs.unlinkSync(filePath);
    return sendSuccess(res, { message: 'File deleted' });
  }),
};
