import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../../utils/apiResponse';
import { getPagination } from '../../utils/pagination';
import { usersService } from './users.service';

export const usersController = {
  getMe: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await usersService.getProfile(req.user!.sub));
  }),

  updateMe: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await usersService.updateProfile(req.user!.sub, req.body));
  }),

  uploadAvatar: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(
      res,
      await usersService.updateAvatar(
        req.user!.sub,
        req,
        req.file as Express.Multer.File | undefined,
      ),
    );
  }),

  removeAvatar: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await usersService.removeAvatar(req.user!.sub));
  }),

  changePassword: asyncHandler(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    return sendSuccess(
      res,
      await usersService.changePassword(req.user!.sub, currentPassword, newPassword),
    );
  }),

  listAddresses: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await usersService.listAddresses(req.user!.sub));
  }),

  createAddress: asyncHandler(async (req: Request, res: Response) => {
    return sendCreated(res, await usersService.createAddress(req.user!.sub, req.body));
  }),

  updateAddress: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(
      res,
      await usersService.updateAddress(req.user!.sub, req.params.id, req.body),
    );
  }),

  deleteAddress: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await usersService.deleteAddress(req.user!.sub, req.params.id));
  }),

  // Admin
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, skip } = getPagination(req);
    const { search, role, status } = req.query as Record<string, string | undefined>;
    const result = await usersService.listUsers({
      page,
      limit,
      skip,
      search,
      role: role as 'USER' | 'ADMIN' | undefined,
      status: status as 'ACTIVE' | 'INACTIVE' | undefined,
    });
    return sendSuccess(res, result.items, 200, result.meta);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await usersService.getUserById(req.params.id));
  }),

  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await usersService.updateStatus(req.params.id, req.body.status));
  }),
};
