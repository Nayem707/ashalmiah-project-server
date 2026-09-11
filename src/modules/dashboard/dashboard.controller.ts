import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { dashboardService } from './dashboard.service';

export const dashboardController = {
  overview: asyncHandler(async (_req: Request, res: Response) => {
    return sendSuccess(res, await dashboardService.overview());
  }),
  stats: asyncHandler(async (_req: Request, res: Response) => {
    return sendSuccess(res, await dashboardService.stats());
  }),
};
