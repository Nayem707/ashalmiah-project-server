import { Router } from 'express';
import { packagesController } from './packages.controller';
import { validate } from '../../middleware/validate';
import { authenticate, authorize, optionalAuth } from '../../middleware/auth';
import {
  createPackageItemSchema,
  createPackageSchema,
  idParamSchema,
  listPackagesSchema,
  updatePackageItemSchema,
  updatePackageSchema,
} from './packages.validation';

const router = Router();
const admin = [authenticate, authorize('ADMIN')];

// Package components (reusable catalogue) — admin only. Declared before `/:id`.
router.get('/items', ...admin, packagesController.listItems);
router.post('/items', ...admin, validate(createPackageItemSchema), packagesController.createItem);
router.patch(
  '/items/:id',
  ...admin,
  validate(updatePackageItemSchema),
  packagesController.updateItem,
);
router.delete('/items/:id', ...admin, validate(idParamSchema), packagesController.removeItem);

// Packages — list/read are public (active only); writes are admin.
router.get('/', optionalAuth, validate(listPackagesSchema), packagesController.list);
router.get('/:id', optionalAuth, validate(idParamSchema), packagesController.getOne);
router.post('/', ...admin, validate(createPackageSchema), packagesController.create);
router.patch('/:id', ...admin, validate(updatePackageSchema), packagesController.update);
router.delete('/:id', ...admin, validate(idParamSchema), packagesController.remove);

export default router;
