import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../../utils/apiResponse';
import { reviewsService } from './reviews.service';

export const reviewsController = {
  // Mounted at /products/:id/reviews
  listForProduct: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await reviewsService.listForProduct(req.params.id));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    return sendCreated(res, await reviewsService.create(req.params.id, req.user!.sub, req.body));
  }),

  // Mounted at /reviews/:id
  update: asyncHandler(async (req: Request, res: Response) => {
    const isAdmin = req.user!.role === 'ADMIN';
    return sendSuccess(
      res,
      await reviewsService.update(req.params.id, req.user!.sub, isAdmin, req.body),
    );
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const isAdmin = req.user!.role === 'ADMIN';
    return sendSuccess(res, await reviewsService.remove(req.params.id, req.user!.sub, isAdmin));
  }),
};
