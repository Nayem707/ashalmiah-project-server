import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../../utils/apiResponse';
import { categoriesService } from './categories.service';

export const categoriesController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const includeInactive = req.query.all === 'true' && req.user?.role === 'ADMIN';
    return sendSuccess(res, await categoriesService.list(includeInactive));
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await categoriesService.getById(req.params.id));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    return sendCreated(res, await categoriesService.create(req.body));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await categoriesService.update(req.params.id, req.body));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await categoriesService.remove(req.params.id));
  }),
};
