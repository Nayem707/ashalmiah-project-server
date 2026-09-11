import { Router } from 'express';
import { categoriesController } from './categories.controller';
import { validate } from '../../middleware/validate';
import { authenticate, authorize, optionalAuth } from '../../middleware/auth';
import { createCategorySchema, idParamSchema, updateCategorySchema } from './categories.validation';

const router = Router();

router.get('/', optionalAuth, categoriesController.list);
router.get('/:id', validate(idParamSchema), categoriesController.getById);

router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validate(createCategorySchema),
  categoriesController.create,
);
router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate(updateCategorySchema),
  categoriesController.update,
);
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate(idParamSchema),
  categoriesController.remove,
);

export default router;
