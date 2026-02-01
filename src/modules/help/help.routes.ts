import { Router } from 'express';
import { prisma } from '../../lib/prisma';

const router = Router();

// GET /api/help - Получить все элементы справки
router.get('/', async (_req, res) => {
    try {
        const items = await prisma.helpItem.findMany({
            orderBy: { sortOrder: 'asc' },
        });
        res.json({ success: true, data: items });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: { message: 'Ошибка сервера' }
        });
    }
});

export { router as helpRoutes };
