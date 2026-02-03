// ============================================
// JWT Helpers
// ============================================
// Access token: короткий срок (15 мин)
// Refresh token: длинный срок (7 дней)
// ============================================

import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { JWTPayload, AuthTokens } from '../types/api.types';

// Environment variables (с дефолтами для dev)
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
const ACCESS_TOKEN_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || '15m';
const REFRESH_TOKEN_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES || '7d';

// ============================================
// TOKEN GENERATION
// ============================================

/**
 * Генерация пары токенов (access + refresh)
 */
export function generateTokens(payload: JWTPayload): AuthTokens {
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES,
  } as SignOptions);

  const refreshToken = jwt.sign(
    { userId: payload.userId, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES } as SignOptions
  );

  // Парсим время жизни для ответа клиенту
  const expiresIn = parseExpiresIn(ACCESS_TOKEN_EXPIRES);

  return {
    accessToken,
    refreshToken,
    expiresIn,
  };
}

/**
 * Генерация только access token (при refresh)
 */
export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES,
  } as SignOptions);
}

// ============================================
// TOKEN VERIFICATION
// ============================================

/**
 * Верификация access token
 */
export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Верификация refresh token
 */
export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    const payload = jwt.verify(token, JWT_REFRESH_SECRET) as {
      userId: string;
      type: string;
    };

    if (payload.type !== 'refresh') {
      return null;
    }

    return { userId: payload.userId };
  } catch {
    return null;
  }
}

/**
 * Декодирование токена без верификации (для debug)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}

// ============================================
// HELPERS
// ============================================

/**
 * Генерация случайного кода (для invite, reset password)
 */
export function generateCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Без похожих символов
  let code = '';

  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    code += chars[randomBytes[i] % chars.length];
  }

  // Форматируем как XXX-XXX-XX
  if (length === 8) {
    return `${code.slice(0, 3)}-${code.slice(3, 6)}-${code.slice(6)}`;
  }

  return code;
}

/**
 * Генерация хеша для refresh token (для хранения в БД)
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Парсинг строки expires в секунды
 */
function parseExpiresIn(expires: string): number {
  const match = expires.match(/^(\d+)([smhd])$/);
  if (!match) return 900; // default 15 min

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 60 * 60 * 24;
    default: return 900;
  }
}

// ============================================
// COOKIE OPTIONS (если используем httpOnly cookies)
// ============================================

export const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true, // Всегда true, так как используется HTTPS
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/', // Разрешаем доступ со всех путей API
  domain: process.env.NODE_ENV === 'production' || process.env.ADMIN_EMAILS ? '.tgabbasov.store' : undefined,
};

/**
 * Получение опций куки для refresh token с учетом "Запомнить меня"
 */
export function getRefreshTokenCookieOptions(rememberMe: boolean) {
  return {
    ...REFRESH_TOKEN_COOKIE_OPTIONS,
    maxAge: rememberMe
      ? 30 * 24 * 60 * 60 * 1000 // 30 days
      : 7 * 24 * 60 * 60 * 1000,  // 7 days
  };
}
