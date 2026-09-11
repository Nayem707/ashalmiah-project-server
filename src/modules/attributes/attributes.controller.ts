import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../../utils/apiResponse';
import { attributesService } from './attributes.service';

export const attributesController = {
  listColors: asyncHandler(async (_req: Request, res: Response) => {
    return sendSuccess(res, await attributesService.listColors());
  }),
  createColor: asyncHandler(async (req: Request, res: Response) => {
    return sendCreated(res, await attributesService.createColor(req.body));
  }),
  updateColor: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await attributesService.updateColor(req.params.id, req.body));
  }),
  removeColor: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await attributesService.removeColor(req.params.id));
  }),

  listSizes: asyncHandler(async (_req: Request, res: Response) => {
    return sendSuccess(res, await attributesService.listSizes());
  }),
  createSize: asyncHandler(async (req: Request, res: Response) => {
    return sendCreated(res, await attributesService.createSize(req.body));
  }),
  updateSize: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await attributesService.updateSize(req.params.id, req.body));
  }),
  removeSize: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await attributesService.removeSize(req.params.id));
  }),
};
