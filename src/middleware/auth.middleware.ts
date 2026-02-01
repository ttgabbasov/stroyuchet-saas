// ============================================
// СтройУчёт - Auth & Authorization Middleware
// ============================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { JWTPayload, ErrorCodes } from '../types/api.types';
import { getCompanyLimits, checkLimit, PlanLimits } from '../config/plan-limits';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      companyLimits?: PlanLimits;
    }
  }
}

const JWT_SECRET = env.JWT_SECRET;

// ============================================
// AUTHENTICATION
// ============================================

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Требуется авторизация',
      },
    });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    req.user = payload;
    next();
  } catch (error) {
    const isExpired = error instanceof jwt.TokenExpiredError;

    res.status(401).json({
      success: false,
      error: {
        code: isExpired ? ErrorCodes.TOKEN_EXPIRED : ErrorCodes.UNAUTHORIZED,
        message: isExpired ? 'Токен истёк' : 'Недействительный токен',
      },
    });
  }
}

// ============================================
// ROLE-BASED ACCESS CONTROL
// ============================================

// Иерархия ролей (reserved for future use)
// const ROLE_HIERARCHY: Record<Role, number> = {
//   OWNER: 100,
//   ACCOUNTANT: 75,
//   FOREMAN: 50,
//   VIEWER: 25,
// };

// Какие роли могут выполнять какие действия
const ROLE_PERMISSIONS: Record<string, Role[]> = {
  // Компания
  'company:update': ['OWNER'],
  'company:delete': ['OWNER'],
  'company:invite': ['OWNER'],

  // Пользователи
  'users:list': ['OWNER', 'ACCOUNTANT'],
  'users:update': ['OWNER'],
  'users:delete': ['OWNER'],

  // Объекты
  'projects:create': ['OWNER'],
  'projects:update': ['OWNER'],
  'projects:delete': ['OWNER'],
  'projects:read': ['OWNER', 'ACCOUNTANT', 'FOREMAN', 'VIEWER'],

  // Транзакции
  'transactions:create': ['OWNER', 'FOREMAN'],
  'transactions:update': ['OWNER'],
  'transactions:delete': ['OWNER'],
  'transactions:read': ['OWNER', 'ACCOUNTANT', 'FOREMAN', 'VIEWER'],

  // Экспорт
  'export:csv': ['OWNER', 'ACCOUNTANT'],
  'export:pdf': ['OWNER', 'ACCOUNTANT'],

  // Аналитика
  'analytics:read': ['OWNER', 'ACCOUNTANT'],
};

/**
 * Проверка минимальной роли
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Требуется авторизация',
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: ErrorCodes.FORBIDDEN,
          message: 'Недостаточно прав для этого действия',
        },
      });
      return;
    }

    next();
  };
}

/**
 * Проверка конкретного permission
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Требуется авторизация',
        },
      });
      return;
    }

    const allowedRoles = ROLE_PERMISSIONS[permission];

    if (!allowedRoles || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: ErrorCodes.FORBIDDEN,
          message: `Нет доступа: ${permission}`,
        },
      });
      return;
    }

    next();
  };
}

// ============================================
// PROJECT ACCESS (для Foreman)
// ============================================

/**
 * Проверка доступа к конкретному объекту
 * OWNER и ACCOUNTANT видят все объекты
 * FOREMAN видит только назначенные
 */
export function requireProjectAccess(projectIdParam = 'projectId') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: ErrorCodes.UNAUTHORIZED, message: 'Требуется авторизация' },
      });
      return;
    }

    const projectId = req.params[projectIdParam] || req.body.projectId;

    if (!projectId) {
      res.status(400).json({
        success: false,
        error: { code: ErrorCodes.INVALID_INPUT, message: 'projectId обязателен' },
      });
      return;
    }

    // Owner и Accountant видят всё
    if (['OWNER', 'ACCOUNTANT'].includes(req.user.role)) {
      // Но проверяем, что объект принадлежит компании
      const project = await prisma.project.findFirst({
        where: { id: projectId, companyId: req.user.companyId },
      });

      if (!project) {
        res.status(404).json({
          success: false,
          error: { code: ErrorCodes.NOT_FOUND, message: 'Объект не найден' },
        });
        return;
      }

      next();
      return;
    }

    // Foreman и Viewer — проверяем ProjectAccess
    const access = await prisma.projectAccess.findUnique({
      where: {
        userId_projectId: {
          userId: req.user.userId,
          projectId,
        },
      },
    });

    if (!access) {
      res.status(403).json({
        success: false,
        error: { code: ErrorCodes.FORBIDDEN, message: 'Нет доступа к этому объекту' },
      });
      return;
    }

    next();
  };
}

// ============================================
// PLAN LIMITS
// ============================================

/**
 * Загрузка лимитов компании в request
 */
export async function loadCompanyLimits(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    next();
    return;
  }

  const company = await prisma.company.findUnique({
    where: { id: req.user.companyId },
    select: { plan: true, maxProjects: true, maxUsers: true },
  });

  if (company) {
    req.companyLimits = getCompanyLimits(company.plan, {
      maxProjects: company.maxProjects,
      maxUsers: company.maxUsers,
    });
  }

  next();
}

/**
 * Проверка лимита объектов перед созданием
 */
export async function checkProjectLimit(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user || !req.companyLimits) {
    next();
    return;
  }

  const currentCount = await prisma.project.count({
    where: { companyId: req.user.companyId },
  });

  const result = checkLimit(
    currentCount,
    req.companyLimits.maxProjects,
    'объектов'
  );

  if (!result.allowed) {
    res.status(403).json({
      success: false,
      error: {
        code: ErrorCodes.PLAN_LIMIT_EXCEEDED,
        message: result.message,
      },
    });
    return;
  }

  next();
}

/**
 * Проверка лимита пользователей перед приглашением
 */
export async function checkUserLimit(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user || !req.companyLimits) {
    next();
    return;
  }

  const currentCount = await prisma.user.count({
    where: { companyId: req.user.companyId },
  });

  const result = checkLimit(
    currentCount,
    req.companyLimits.maxUsers,
    'пользователей'
  );

  if (!result.allowed) {
    res.status(403).json({
      success: false,
      error: {
        code: ErrorCodes.PLAN_LIMIT_EXCEEDED,
        message: result.message,
      },
    });
    return;
  }

  next();
}

/**
 * Проверка доступности фичи по тарифу
 */
export function requireFeature(feature: keyof PlanLimits) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.companyLimits) {
      res.status(500).json({
        success: false,
        error: { code: ErrorCodes.INTERNAL_ERROR, message: 'Лимиты не загружены' },
      });
      return;
    }

    const featureEnabled = req.companyLimits[feature];

    if (!featureEnabled) {
      res.status(403).json({
        success: false,
        error: {
          code: ErrorCodes.FEATURE_NOT_AVAILABLE,
          message: `Функция "${feature}" недоступна на вашем тарифе`,
        },
      });
      return;
    }

    next();
  };
}
