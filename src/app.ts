// ============================================
// Express App Setup (v1.0.1)
// ============================================
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { authRoutes } from './modules/auth';
import { projectsRoutes } from './modules/projects';
import { env } from './config/env';
import { usersRoutes } from './modules/users';
import { transactionsRoutes } from './modules/transactions';
import { categoriesRoutes } from './modules/categories';
import { moneySourcesRoutes } from './modules/money-sources';
import { analyticsRoutes } from './modules/analytics';
import { helpRoutes } from './modules/help';
import { uploadsRoutes } from './modules/uploads';
import { exportRoutes } from './modules/export';
import { advanceRoutes } from './modules/advance';
import { notificationsRoutes } from './modules/notifications';
import { quickActionsRoutes } from './modules/quick-actions';
import { equityRoutes } from './modules/equity';
import { ErrorCodes } from './types/api.types';
import { errorHandler } from './middleware/error.middleware';
import { logger } from './lib/logger';
import { apiLimiter } from './middleware/rate-limit.middleware';

const app = express();

// ============================================
// GLOBAL MIDDLEWARE
// ============================================

// Security logic
app.set('trust proxy', 1); // Trust first proxy (useful for Nginx/Cloudflare)
app.use(helmet());

// CORS
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [env.CORS_ORIGIN, 'https://tgabbasov.store', 'http://localhost:3000'];
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Cookies
app.use(cookieParser());

// Rate limiting (before routes)
app.use('/api', apiLimiter.middleware());

// Request logging
app.use((req, _res, next) => {
  logger.request({
    method: req.method,
    path: req.path,
    ip: req.ip,
    headers: req.headers,
  } as any);
  next();
});

// ============================================
// STATIC FILES (Uploads)
// ============================================
const UPLOAD_DIR = env.UPLOAD_DIR;
app.use('/uploads', express.static(path.resolve(UPLOAD_DIR)));

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// API ROUTES
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/money-sources', moneySourcesRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/advance', advanceRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/help', helpRoutes);
app.use('/api/quick-actions', quickActionsRoutes);
app.use('/api/equity', equityRoutes);

// ============================================
// 404 HANDLER
// ============================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: ErrorCodes.NOT_FOUND,
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

// ============================================
// ERROR HANDLER (must be last)
// ============================================
app.use(errorHandler);

export default app;