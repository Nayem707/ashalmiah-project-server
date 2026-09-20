import { Router } from 'express';
import { settingsController } from './settings.controller';
import { validate } from '../../middleware/validate';
import { authenticate, authorize } from '../../middleware/auth';
import {
  updateShippingSettingsSchema,
  updateStoreSettingsSchema,
} from './settings.validation';

const router = Router();
const admin = [authenticate, authorize('ADMIN')];

/** Public — storefront needs currency + rate for price conversion. */
router.get('/', settingsController.get);

router.patch('/store', ...admin, validate(updateStoreSettingsSchema), settingsController.updateStore);
router.patch(
  '/shipping',
  ...admin,
  validate(updateShippingSettingsSchema),
  settingsController.updateShipping,
);

export default router;
