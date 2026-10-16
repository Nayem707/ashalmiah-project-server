import { NextFunction, Request, Response, Router } from 'express';
import { ordersController } from './orders.controller';
import { validate } from '../../middleware/validate';
import { authenticate, authorize } from '../../middleware/auth';
import { guestCheckoutLimiter, trackOrderLimiter } from '../../middleware/rateLimiter';
import {
  cancelOrderSchema,
  checkoutSchema,
  guestCancelOrderSchema,
  idParamSchema,
  listOrdersSchema,
  trackOrderDetailsSchema,
  trackOrderSchema,
  updateStatusSchema,
} from './orders.validation';

const router = Router();

// Guests send no token. A sent token must be valid (401 lets the client refresh)
// so a signed-in customer's order is never silently stored as a guest order.
const authenticateIfTokenSent = (req: Request, res: Response, next: NextFunction) =>
  req.headers.authorization ? authenticate(req, res, next) : next();

// Public (no login): must stay above `router.use(authenticate)`.
router.post(
  '/checkout',
  authenticateIfTokenSent,
  guestCheckoutLimiter,
  validate(checkoutSchema),
  ordersController.checkout,
);
router.post('/track', trackOrderLimiter, validate(trackOrderSchema), ordersController.track);
router.post(
  '/track/details',
  trackOrderLimiter,
  validate(trackOrderDetailsSchema),
  ordersController.trackDetails,
);
router.post(
  '/track/cancel',
  trackOrderLimiter,
  validate(guestCancelOrderSchema),
  ordersController.cancelAsGuest,
);

router.use(authenticate);

// Customer
router.get('/my-orders', validate(listOrdersSchema), ordersController.listMine);
router.post('/:id/cancel', validate(cancelOrderSchema), ordersController.cancelMine);

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
