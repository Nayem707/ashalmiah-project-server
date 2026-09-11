import { Router } from 'express';
import { cartController } from './cart.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { addItemSchema, idParamSchema, updateItemSchema } from './cart.validation';

const router = Router();
router.use(authenticate);

router.get('/', cartController.get);
router.post('/items', validate(addItemSchema), cartController.addItem);
router.patch('/items/:id', validate(updateItemSchema), cartController.updateItem);
router.delete('/items/:id', validate(idParamSchema), cartController.removeItem);
router.delete('/', cartController.clear);

export default router;
