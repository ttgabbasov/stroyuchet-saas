// ============================================
// Upload Routes
// ============================================

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import * as uploadsService from './uploads.service';
import { UploadError } from './uploads.service';
import { authenticate } from '../../middleware/auth.middleware';
import { ErrorCodes } from '../../types/api.types';

const router = Router();

// ============================================
// MULTER CONFIG
// ============================================

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
    files: 5, // Max 5 files per request
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
      'application/pdf',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Недопустимый тип файла: ${file.mimetype}`));
    }
  },
});

// ============================================
// ROUTES
// ============================================

router.use(authenticate);

/**
 * POST /api/uploads
 * Загрузка одного файла
 */
router.post(
  '/',
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: ErrorCodes.UNAUTHORIZED, message: 'Не авторизован' },
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          error: { code: ErrorCodes.INVALID_INPUT, message: 'Файл не загружен' },
        });
        return;
      }

      const result = await uploadsService.saveFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        req.user.companyId
      );

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      handleUploadError(error, res, next);
    }
  }
);

/**
 * POST /api/uploads/multiple
 * Загрузка нескольких файлов
 */
router.post(
  '/multiple',
  upload.array('files', 5),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: ErrorCodes.UNAUTHORIZED, message: 'Не авторизован' },
        });
        return;
      }

      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          error: { code: ErrorCodes.INVALID_INPUT, message: 'Файлы не загружены' },
        });
        return;
      }

      const results = await Promise.all(
        files.map((file) =>
          uploadsService.saveFile(
            file.buffer,
            file.originalname,
            file.mimetype,
            req.user!.companyId
          )
        )
      );

      res.status(201).json({
        success: true,
        data: results,
      });
    } catch (error) {
      handleUploadError(error, res, next);
    }
  }
);

/**
 * DELETE /api/uploads/:filename
 * Удаление файла
 */
router.delete(
  '/:filename(*)',
  async (req: Request<{ filename: string }>, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: ErrorCodes.UNAUTHORIZED, message: 'Не авторизован' },
        });
        return;
      }

      const { filename } = req.params;

      // Проверяем что файл принадлежит компании пользователя
      if (!filename.startsWith(req.user.companyId + '/')) {
        res.status(403).json({
          success: false,
          error: { code: ErrorCodes.FORBIDDEN, message: 'Нет доступа к этому файлу' },
        });
        return;
      }

      await uploadsService.deleteFile(filename);

      res.json({
        success: true,
        data: { message: 'Файл удалён' },
      });
    } catch (error) {
      handleUploadError(error, res, next);
    }
  }
);

// ============================================
// ERROR HANDLER
// ============================================

function handleUploadError(
  error: unknown,
  res: Response,
  next: NextFunction
): void {
  // Multer errors
  if (error instanceof multer.MulterError) {
    const messages: Record<string, string> = {
      LIMIT_FILE_SIZE: 'Файл слишком большой',
      LIMIT_FILE_COUNT: 'Слишком много файлов',
      LIMIT_UNEXPECTED_FILE: 'Неожиданное поле файла',
    };

    res.status(400).json({
      success: false,
      error: {
        code: ErrorCodes.INVALID_INPUT,
        message: messages[error.code] || error.message,
      },
    });
    return;
  }

  if (error instanceof UploadError) {
    res.status(400).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  if (error instanceof Error && error.message.includes('Недопустимый тип')) {
    res.status(400).json({
      success: false,
      error: {
        code: ErrorCodes.INVALID_INPUT,
        message: error.message,
      },
    });
    return;
  }

  next(error);
}

export default router;
