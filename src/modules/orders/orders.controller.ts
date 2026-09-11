import { Request, Response } from 'express';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../../utils/apiResponse';
import { getPagination } from '../../utils/pagination';
import { ordersService } from './orders.service';

export const ordersController = {
  checkout: asyncHandler(async (req: Request, res: Response) => {
    return sendCreated(res, await ordersService.checkout(req.user!.sub, req.body));
  }),

  listMine: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, skip } = getPagination(req);
    const result = await ordersService.listMine(req.user!.sub, {
      page,
      limit,
      skip,
      status: req.query.status as OrderStatus | undefined,
    });
    return sendSuccess(res, result.items, 200, result.meta);
  }),

  listAll: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, skip } = getPagination(req);
    const result = await ordersService.listAll({
      page,
      limit,
      skip,
      status: req.query.status as OrderStatus | undefined,
      search: req.query.search as string | undefined,
    });
    return sendSuccess(res, result.items, 200, result.meta);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const isAdmin = req.user!.role === 'ADMIN';
    return sendSuccess(res, await ordersService.getById(req.params.id, req.user!.sub, isAdmin));
  }),

  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    const { status, paymentStatus } = req.body as {
      status: OrderStatus;
      paymentStatus?: PaymentStatus;
    };
    return sendSuccess(res, await ordersService.updateStatus(req.params.id, status, paymentStatus));
  }),
};
