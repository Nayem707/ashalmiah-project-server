import { Request, Response } from 'express';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../../utils/apiResponse';
import { getPagination } from '../../utils/pagination';
import { ordersService } from './orders.service';

export const ordersController = {
  checkout: asyncHandler(async (req: Request, res: Response) => {
    return sendCreated(res, await ordersService.checkout(req.user?.sub ?? null, req.body));
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
      customerType: req.query.customerType as 'USER' | 'GUEST' | undefined,
    });
    return sendSuccess(res, result.items, 200, result.meta);
  }),

  track: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await ordersService.trackByPhone(req.body.phone));
  }),

  trackDetails: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(
      res,
      await ordersService.trackOrderDetails(req.body.phone, req.body.orderNumber),
    );
  }),

  cancelMine: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(
      res,
      await ordersService.cancelMine(req.params.id, req.user!.sub, req.body.reason),
    );
  }),

  cancelAsGuest: asyncHandler(async (req: Request, res: Response) => {
    const { phone, orderNumber, code, reason } = req.body;
    return sendSuccess(
      res,
      await ordersService.cancelAsGuest({ phone, orderNumber, code, reason }),
    );
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
