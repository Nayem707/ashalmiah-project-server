import { Router } from 'express';
import { homepageController } from './homepage.controller';
import { validate } from '../../middleware/validate';
import { authenticate, authorize } from '../../middleware/auth';
import {
  createSlideSchema,
  idParamSchema,
  updateSectionSchema,
  updateSlideSchema,
} from './homepage.validation';

const router = Router();
const admin = [authenticate, authorize('ADMIN')];

// Public
router.get('/', homepageController.getPublic);
router.get('/sections', homepageController.listSections);
router.get('/hero/slides', homepageController.listSlides);

// Admin
router.patch(
  '/sections/:key',
  ...admin,
  validate(updateSectionSchema),
  homepageController.updateSection,
);
router.post('/hero/slides', ...admin, validate(createSlideSchema), homepageController.createSlide);
router.patch(
  '/hero/slides/:id',
  ...admin,
  validate(updateSlideSchema),
  homepageController.updateSlide,
);
router.delete(
  '/hero/slides/:id',
  ...admin,
  validate(idParamSchema),
  homepageController.removeSlide,
);

export default router;
