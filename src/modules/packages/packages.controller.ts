import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../../utils/apiResponse';
import { packagesService } from './packages.service';

export const packagesController = {
  // ---- Components ----
  listItems: asyncHandler(async (_req: Request, res: Response) => {
    return sendSuccess(res, await packagesService.listItems());
  }),
  createItem: asyncHandler(async (req: Request, res: Response) => {
    return sendCreated(res, await packagesService.createItem(req.body));
  }),
  updateItem: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await packagesService.updateItem(req.params.id, req.body));
  }),
  removeItem: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await packagesService.removeItem(req.params.id));
  }),

  // ---- Packages ----
  list: asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as Record<string, string | undefined>;
    return sendSuccess(
      res,
      await packagesService.list({
        status: q.status as 'ACTIVE' | 'INACTIVE' | undefined,
        search: q.search,
        productId: q.productId,
        isAdmin: req.user?.role === 'ADMIN',
      }),
    );
  }),
  getOne: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(
      res,
      await packagesService.getById(req.params.id, req.user?.role === 'ADMIN'),
    );
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    return sendCreated(res, await packagesService.create(req.body));
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await packagesService.update(req.params.id, req.body));
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await packagesService.remove(req.params.id));
  }),
};
