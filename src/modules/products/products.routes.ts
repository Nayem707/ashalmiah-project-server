import { Router } from 'express';
import { productsController } from './products.controller';
import { reviewsController } from '../reviews/reviews.controller';
import { validate } from '../../middleware/validate';
import { authenticate, authorize, optionalAuth } from '../../middleware/auth';
import { createReviewSchema } from '../reviews/reviews.validation';
import {
  createProductSchema,
  idOrSlugParamSchema,
  idParamSchema,
  listProductsSchema,
  updateProductSchema,
} from './products.validation';

const router = Router();

router.get('/', optionalAuth, validate(listProductsSchema), productsController.list);
router.get('/featured', productsController.featured);
router.get('/popular', productsController.popular);
router.get('/new-arrivals', productsController.newArrivals);

// Product reviews (nested)
router.get('/:id/reviews', reviewsController.listForProduct);
router.post('/:id/reviews', authenticate, validate(createReviewSchema), reviewsController.create);

router.get('/:idOrSlug', validate(idOrSlugParamSchema), productsController.getOne);

router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validate(createProductSchema),
  productsController.create,
);
router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate(updateProductSchema),
  productsController.update,
);
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate(idParamSchema),
  productsController.remove,
);

export default router;
