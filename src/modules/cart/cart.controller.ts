import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { cartService } from './cart.service';

export const cartController = {
  get: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await cartService.get(req.user!.sub));
  }),
  addItem: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await cartService.addItem(req.user!.sub, req.body), 201);
  }),
  updateItem: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(
      res,
      await cartService.updateItem(req.user!.sub, req.params.id, req.body.quantity),
    );
  }),
  removeItem: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await cartService.removeItem(req.user!.sub, req.params.id));
  }),
  clear: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await cartService.clear(req.user!.sub));
  }),
};
