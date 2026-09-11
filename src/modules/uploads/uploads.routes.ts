import { Router } from 'express';
import { uploadsController } from './uploads.controller';
import { uploadMiddleware } from './uploads.middleware';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();
router.use(authenticate, authorize('ADMIN'));

router.post('/images', uploadMiddleware.array('images', 8), uploadsController.uploadImages);
router.delete('/images/:key', uploadsController.deleteImage);

export default router;
