import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../../utils/apiResponse';
import { subcategoriesService } from './subcategories.service';

export const subcategoriesController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const includeInactive = req.query.all === 'true' && req.user?.role === 'ADMIN';
    const q = req.query as Record<string, string | undefined>;
    return sendSuccess(
      res,
      await subcategoriesService.list({
        categoryId: q.categoryId,
        status: q.status as 'ACTIVE' | 'INACTIVE' | undefined,
        includeInactive,
      }),
    );
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await subcategoriesService.getById(req.params.id));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    return sendCreated(res, await subcategoriesService.create(req.body));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await subcategoriesService.update(req.params.id, req.body));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await subcategoriesService.remove(req.params.id));
  }),
};
