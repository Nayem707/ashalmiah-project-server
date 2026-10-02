import { Router } from 'express';
import { ordersController } from './orders.controller';
import { validate } from '../../middleware/validate';
import { authenticate, authorize } from '../../middleware/auth';
import { trackOrderLimiter } from '../../middleware/rateLimiter';
import {
  checkoutSchema,
  idParamSchema,
  listOrdersSchema,
  trackOrderSchema,
  updateStatusSchema,
} from './orders.validation';

const router = Router();

// Public (no login): must stay above `router.use(authenticate)`.
router.get(
  '/track/:orderNumber',
  trackOrderLimiter,
  validate(trackOrderSchema),
  ordersController.track,
);

router.use(authenticate);

// Customer
router.post('/checkout', validate(checkoutSchema), ordersController.checkout);
router.get('/my-orders', validate(listOrdersSchema), ordersController.listMine);

// Admin
router.get('/', authorize('ADMIN'), validate(listOrdersSchema), ordersController.listAll);
router.patch(
  '/:id/status',
  authorize('ADMIN'),
  validate(updateStatusSchema),
  ordersController.updateStatus,
);

// Shared (ownership enforced in service)
router.get('/:id', validate(idParamSchema), ordersController.getById);

export default router;
