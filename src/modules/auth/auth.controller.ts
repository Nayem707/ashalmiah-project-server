import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../../utils/apiResponse';
import { authService } from './auth.service';

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.register(req.body);
    return sendCreated(res, result);
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login(req.body);
    return sendSuccess(res, result);
  }),

  google: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.loginWithGoogle(req.body.idToken);
    return sendSuccess(res, result);
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.refresh(req.body.refreshToken);
    return sendSuccess(res, result);
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.logout(req.body.refreshToken ?? '');
    return sendSuccess(res, result);
  }),

  forgotPassword: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.forgotPassword(req.body.email);
    return sendSuccess(res, result);
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.resetPassword(req.body.token, req.body.password);
    return sendSuccess(res, result);
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.me(req.user!.sub);
    return sendSuccess(res, result);
  }),
};
