// ============================================
// Auth Controller
// ============================================
// HTTP handlers для auth endpoints
// ============================================

import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { AuthError } from './auth.service';
import {
  RegisterInput,
  LoginInput,
  JoinCompanyInput,
  RefreshTokenInput,
  ChangePasswordInput,
  CreateInviteInput,
} from './auth.schema';
import { ErrorCodes } from '../../types/api.types';
import { REFRESH_TOKEN_COOKIE_OPTIONS } from '../../lib/jwt';

// ============================================
// REGISTRATION
// ============================================

/**
 * POST /api/auth/register
 * Регистрация новой компании + owner
 */
export async function register(
  req: Request<{}, {}, RegisterInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await authService.register(req.body);

    // Устанавливаем refresh token в httpOnly cookie (опционально)
    res.cookie('refreshToken', result.tokens.refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

    res.status(201).json({
      success: true,
      data: {
        user: result.user,
        company: result.company,
        tokens: {
          accessToken: result.tokens.accessToken,
          expiresIn: result.tokens.expiresIn,
          // refreshToken отдаём только если не используем cookies
          refreshToken: result.tokens.refreshToken,
        },
      },
    });
  } catch (error) {
    handleAuthError(error, res, next);
  }
}

// ============================================
// LOGIN
// ============================================

/**
 * POST /api/auth/login
 * Вход по email + password
 */
export async function login(
  req: Request<{}, {}, LoginInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await authService.login(req.body);

    res.cookie('refreshToken', result.tokens.refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

    res.json({
      success: true,
      data: {
        user: result.user,
        company: result.company,
        tokens: {
          accessToken: result.tokens.accessToken,
          expiresIn: result.tokens.expiresIn,
          refreshToken: result.tokens.refreshToken,
        },
      },
    });
  } catch (error) {
    handleAuthError(error, res, next);
  }
}

// ============================================
// JOIN COMPANY
// ============================================

/**
 * POST /api/auth/join
 * Присоединение к компании по invite code
 */
export async function joinCompany(
  req: Request<{}, {}, JoinCompanyInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await authService.joinCompany(req.body);

    res.cookie('refreshToken', result.tokens.refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

    res.status(201).json({
      success: true,
      data: {
        user: result.user,
        company: result.company,
        tokens: {
          accessToken: result.tokens.accessToken,
          expiresIn: result.tokens.expiresIn,
          refreshToken: result.tokens.refreshToken,
        },
      },
    });
  } catch (error) {
    handleAuthError(error, res, next);
  }
}

// ============================================
// REFRESH TOKENS
// ============================================

/**
 * POST /api/auth/refresh
 * Обновление access token
 */
export async function refresh(
  req: Request<{}, {}, RefreshTokenInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Берём refresh token из body или cookie
    const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: {
          code: ErrorCodes.INVALID_INPUT,
          message: 'Refresh token обязателен',
        },
      });
      return;
    }

    const tokens = await authService.refreshTokens(refreshToken);

    res.cookie('refreshToken', tokens.refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (error) {
    handleAuthError(error, res, next);
  }
}

// ============================================
// LOGOUT
// ============================================

/**
 * POST /api/auth/logout
 * Выход (отзыв refresh token)
 */
export async function logout(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (req.user) {
      await authService.logout(req.user.userId);
    }

    // Очищаем cookie
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });

    res.json({
      success: true,
      data: { message: 'Выход выполнен' },
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// CURRENT USER
// ============================================

/**
 * GET /api/auth/me
 * Получение текущего пользователя
 */
export async function me(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: ErrorCodes.UNAUTHORIZED, message: 'Не авторизован' },
      });
      return;
    }

    const result = await authService.getCurrentUser(req.user.userId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    handleAuthError(error, res, next);
  }
}

// ============================================
// PASSWORD
// ============================================

/**
 * POST /api/auth/password/change
 * Смена пароля
 */
export async function changePassword(
  req: Request<{}, {}, ChangePasswordInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: ErrorCodes.UNAUTHORIZED, message: 'Не авторизован' },
      });
      return;
    }

    await authService.changePassword(
      req.user.userId,
      req.body.currentPassword,
      req.body.newPassword
    );

    // Очищаем cookie т.к. все сессии разлогинены
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });

    res.json({
      success: true,
      data: { message: 'Пароль изменён. Войдите заново.' },
    });
  } catch (error) {
    handleAuthError(error, res, next);
  }
}

// ============================================
// INVITES
// ============================================

/**
 * POST /api/auth/invites
 * Создание приглашения (только OWNER)
 */
export async function createInvite(
  req: Request<{}, {}, CreateInviteInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: ErrorCodes.UNAUTHORIZED, message: 'Не авторизован' },
      });
      return;
    }

    const result = await authService.createInvite(req.user.companyId, req.body);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    handleAuthError(error, res, next);
  }
}

/**
 * GET /api/auth/invites
 * Список активных приглашений (только OWNER)
 */
export async function getInvites(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: ErrorCodes.UNAUTHORIZED, message: 'Не авторизован' },
      });
      return;
    }

    const invites = await authService.getCompanyInvites(req.user.companyId);

    res.json({
      success: true,
      data: invites,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/auth/invites/:id
 * Отзыв приглашения (только OWNER)
 */
export async function revokeInvite(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: ErrorCodes.UNAUTHORIZED, message: 'Не авторизован' },
      });
      return;
    }

    await authService.revokeInvite(req.params.id, req.user.companyId);

    res.json({
      success: true,
      data: { message: 'Приглашение отозвано' },
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// ERROR HANDLER
// ============================================

function handleAuthError(
  error: unknown,
  res: Response,
  next: NextFunction
): void {
  if (error instanceof AuthError) {
    const statusMap: Record<string, number> = {
      [ErrorCodes.INVALID_CREDENTIALS]: 401,
      [ErrorCodes.UNAUTHORIZED]: 401,
      [ErrorCodes.FORBIDDEN]: 403,
      [ErrorCodes.NOT_FOUND]: 404,
      [ErrorCodes.ALREADY_EXISTS]: 409,
      [ErrorCodes.PLAN_LIMIT_EXCEEDED]: 403,
      [ErrorCodes.INVALID_INPUT]: 400,
    };

    const status = statusMap[error.code] || 400;

    res.status(status).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  next(error);
}
