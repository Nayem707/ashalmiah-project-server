import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { wishlistService } from './wishlist.service';

export const wishlistController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await wishlistService.list(req.user!.sub));
  }),
  add: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await wishlistService.add(req.user!.sub, req.params.productId), 201);
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await wishlistService.remove(req.user!.sub, req.params.productId));
  }),
};
