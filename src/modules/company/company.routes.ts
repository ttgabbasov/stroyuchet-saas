
import { Router } from 'express';
import { z } from 'zod';
import * as companyController from './company.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validateBody } from '../auth/auth.schema';

const router = Router();

// Все routes требуют авторизации
router.use(authenticate);

const updateCompanySchema = z.object({
    name: z.string().min(1).optional(),
});

router.patch(
    '/current',
    validateBody(updateCompanySchema),
    companyController.updateCurrentCompany
);

router.get(
    '/current',
    companyController.getCurrentCompany
);

export default router;
