import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../../utils/apiResponse';
import { homepageService } from './homepage.service';

export const homepageController = {
  getPublic: asyncHandler(async (_req: Request, res: Response) => {
    return sendSuccess(res, await homepageService.getPublic());
  }),
  listSections: asyncHandler(async (_req: Request, res: Response) => {
    return sendSuccess(res, await homepageService.listSections());
  }),
  updateSection: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await homepageService.updateSection(req.params.key, req.body));
  }),
  listSlides: asyncHandler(async (_req: Request, res: Response) => {
    return sendSuccess(res, await homepageService.listSlides());
  }),
  createSlide: asyncHandler(async (req: Request, res: Response) => {
    return sendCreated(res, await homepageService.createSlide(req.body));
  }),
  updateSlide: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await homepageService.updateSlide(req.params.id, req.body));
  }),
  removeSlide: asyncHandler(async (req: Request, res: Response) => {
    return sendSuccess(res, await homepageService.removeSlide(req.params.id));
  }),
};
