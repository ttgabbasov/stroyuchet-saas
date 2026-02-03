// ============================================
// Auth Validation Schemas (Zod)
// ============================================

import { z } from 'zod';

// ============================================
// COMMON VALIDATORS
// ============================================

const emailSchema = z
  .string()
  .email('Некорректный email')
  .toLowerCase()
  .trim();

const passwordSchema = z
  .string()
  .min(6, 'Минимум 6 символов')
  .max(100, 'Максимум 100 символов');

const nameSchema = z
  .string()
  .min(2, 'Минимум 2 символа')
  .max(100, 'Максимум 100 символов')
  .trim();

const phoneSchema = z
  .string()
  .regex(/^\+?[0-9\s\-()]*$/, 'Некорректный номер телефона')
  .optional();

const inviteCodeSchema = z
  .string()
  .regex(/^[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{2}$/, 'Некорректный код приглашения')
  .toUpperCase();

// ============================================
// REQUEST SCHEMAS
// ============================================

/**
 * Регистрация новой компании + owner
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  phone: phoneSchema,
  companyName: z
    .string()
    .min(2, 'Минимум 2 символа')
    .max(200, 'Максимум 200 символов')
    .trim(),
  rememberMe: z.boolean().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Вход по email + password
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Пароль обязателен'),
  rememberMe: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Присоединение к компании по invite code
 */
export const joinCompanySchema = z.object({
  inviteCode: inviteCodeSchema,
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  phone: phoneSchema.optional(),
});

export type JoinCompanyInput = z.infer<typeof joinCompanySchema>;

/**
 * Обновление токенов
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token обязателен'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

/**
 * Смена пароля
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Текущий пароль обязателен'),
  newPassword: passwordSchema,
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * Запрос сброса пароля
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/**
 * Сброс пароля по коду
 */
export const resetPasswordSchema = z.object({
  code: z.string().min(1, 'Код обязателен'),
  newPassword: passwordSchema,
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * Создание приглашения
 */
export const createInviteSchema = z.object({
  role: z.enum(['FOREMAN', 'ACCOUNTANT', 'VIEWER']).default('FOREMAN'),
  expiresInDays: z.number().min(1).max(30).default(7),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;

// ============================================
// VALIDATION HELPER
// ============================================

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ErrorCodes } from '../../types/api.types';

/**
 * Middleware для валидации request body
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string[]> = {};

        for (const issue of error.issues) {
          const path = issue.path.join('.');
          if (!details[path]) {
            details[path] = [];
          }
          details[path].push(issue.message);
        }

        res.status(400).json({
          success: false,
          error: {
            code: ErrorCodes.VALIDATION_ERROR,
            message: 'Ошибка валидации',
            details,
          },
        });
        return;
      }

      next(error);
    }
  };
}

/**
 * Middleware для валидации query params
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCodes.VALIDATION_ERROR,
            message: 'Ошибка параметров запроса',
            details: error.flatten().fieldErrors,
          },
        });
        return;
      }

      next(error);
    }
  };
}
