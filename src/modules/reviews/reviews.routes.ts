import { Router } from 'express';
import { reviewsController } from './reviews.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { idParamSchema, updateReviewSchema } from './reviews.validation';

const router = Router();

router.patch('/:id', authenticate, validate(updateReviewSchema), reviewsController.update);
router.delete('/:id', authenticate, validate(idParamSchema), reviewsController.remove);

export default router;
