import { Router } from 'express';
import { dashboardController } from './dashboard.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();
router.use(authenticate, authorize('ADMIN'));

router.get('/overview', dashboardController.overview);
router.get('/stats', dashboardController.stats);

export default router;
