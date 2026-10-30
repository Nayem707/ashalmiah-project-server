import { Router } from 'express';
import { subcategoriesController } from './subcategories.controller';
import { validate } from '../../middleware/validate';
import { authenticate, authorize, optionalAuth } from '../../middleware/auth';
import {
  createSubcategorySchema,
  idParamSchema,
  listSubcategoriesSchema,
  updateSubcategorySchema,
} from './subcategories.validation';

const router = Router();

router.get('/', optionalAuth, validate(listSubcategoriesSchema), subcategoriesController.list);
router.get('/:id', validate(idParamSchema), subcategoriesController.getById);

router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validate(createSubcategorySchema),
  subcategoriesController.create,
);
router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate(updateSubcategorySchema),
  subcategoriesController.update,
);
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate(idParamSchema),
  subcategoriesController.remove,
);

export default router;
