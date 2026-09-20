import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { settingsService } from './settings.service';

export const settingsController = {
  get: asyncHandler(async (_req: Request, res: Response) => {
    return sendSuccess(res, await settingsService.get());
  }),

  updateStore: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await settingsService.updateStore(req.body));
  }),

  updateShipping: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await settingsService.updateShipping(req.body));
  }),
};
