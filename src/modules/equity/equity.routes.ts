import { Router } from 'express';
import { EquityController } from './equity.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', EquityController.getReport);

export default router;
