import { Router } from 'express';
import { usersController } from './users.controller';
import { validate } from '../../middleware/validate';
import { authenticate, authorize } from '../../middleware/auth';
import {
  addressSchema,
  changePasswordSchema,
  idParamSchema,
  listUsersSchema,
  updateProfileSchema,
  updateStatusSchema,
} from './users.validation';

const router = Router();

// Current user
router.get('/me', authenticate, usersController.getMe);
router.patch('/me', authenticate, validate(updateProfileSchema), usersController.updateMe);
router.patch(
  '/me/password',
  authenticate,
  validate(changePasswordSchema),
  usersController.changePassword,
);

// Addresses
router.get('/me/addresses', authenticate, usersController.listAddresses);
router.post('/me/addresses', authenticate, validate(addressSchema), usersController.createAddress);
router.patch(
  '/me/addresses/:id',
  authenticate,
  validate(idParamSchema),
  usersController.updateAddress,
);
router.delete(
  '/me/addresses/:id',
  authenticate,
  validate(idParamSchema),
  usersController.deleteAddress,
);

// Admin
router.get('/', authenticate, authorize('ADMIN'), validate(listUsersSchema), usersController.list);
router.get(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate(idParamSchema),
  usersController.getById,
);
router.patch(
  '/:id/status',
  authenticate,
  authorize('ADMIN'),
  validate(updateStatusSchema),
  usersController.updateStatus,
);

export default router;
