import { Router } from 'express';
import { attributesController } from './attributes.controller';
import { validate } from '../../middleware/validate';
import { authenticate, authorize } from '../../middleware/auth';
import {
  createColorSchema,
  createSizeSchema,
  idParamSchema,
  updateColorSchema,
  updateSizeSchema,
} from './attributes.validation';

const router = Router();
const admin = [authenticate, authorize('ADMIN')];

// Colors
router.get('/colors', attributesController.listColors);
router.post('/colors', ...admin, validate(createColorSchema), attributesController.createColor);
router.patch(
  '/colors/:id',
  ...admin,
  validate(updateColorSchema),
  attributesController.updateColor,
);
router.delete('/colors/:id', ...admin, validate(idParamSchema), attributesController.removeColor);

// Sizes
router.get('/sizes', attributesController.listSizes);
router.post('/sizes', ...admin, validate(createSizeSchema), attributesController.createSize);
router.patch('/sizes/:id', ...admin, validate(updateSizeSchema), attributesController.updateSize);
router.delete('/sizes/:id', ...admin, validate(idParamSchema), attributesController.removeSize);

export default router;
