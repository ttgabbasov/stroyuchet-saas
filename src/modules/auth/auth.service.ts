// ============================================
// Auth Service
// ============================================
// Бизнес-логика: регистрация, логин, токены
// ============================================

import bcrypt from 'bcryptjs';
import { Role, Plan } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import {
  generateTokens,
  verifyRefreshToken,
  generateCode,
  hashToken,
} from '../../lib/jwt';
import {
  RegisterInput,
  LoginInput,
  JoinCompanyInput,
  CreateInviteInput,
} from './auth.schema';
import {
  AuthTokens,
  JWTPayload,
  UserResponse,
  CompanyResponse,
  ErrorCodes,
} from '../../types/api.types';
import { getCompanyLimits, checkLimit } from '../../config/plan-limits';

// ============================================
// TYPES
// ============================================

export interface AuthResult {
  user: UserResponse;
  company: CompanyResponse;
  tokens: AuthTokens;
}

export class AuthError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// ============================================
// REGISTRATION
// ============================================

/**
 * Регистрация новой компании + владельца
 */
export async function register(input: RegisterInput): Promise<AuthResult> {
  // Проверяем, что email не занят
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    throw new AuthError(
      ErrorCodes.ALREADY_EXISTS,
      'Пользователь с таким email уже существует'
    );
  }

  // Хешируем пароль
  const passwordHash = await bcrypt.hash(input.password, 12);

  // Создаём компанию и пользователя в транзакции
  const result = await prisma.$transaction(async (tx) => {
    // Создаём компанию
    const company = await tx.company.create({
      data: {
        name: input.companyName,
        plan: Plan.FREE,
      },
    });

    // Создаём пользователя (owner)
    const user = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
        phone: input.phone,
        role: Role.OWNER,
        companyId: company.id,
      },
    });

    return { user, company };
  });

  // Генерируем токены
  const payload: JWTPayload = {
    userId: result.user.id,
    companyId: result.company.id,
    email: result.user.email,
    role: result.user.role,
    plan: result.company.plan,
  };

  const tokens = generateTokens(payload);

  // Сохраняем хеш refresh token
  await prisma.user.update({
    where: { id: result.user.id },
    data: { refreshToken: hashToken(tokens.refreshToken) },
  });

  return {
    user: mapUserToResponse(result.user),
    company: await mapCompanyToResponse(result.company),
    tokens,
  };
}

// ============================================
// LOGIN
// ============================================

/**
 * Вход по email + password
 */
export async function login(input: LoginInput): Promise<AuthResult> {
  // Ищем пользователя
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { company: true },
  });

  if (!user) {
    throw new AuthError(
      ErrorCodes.INVALID_CREDENTIALS,
      'Неверный email или пароль'
    );
  }

  // Проверяем пароль
  const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);

  if (!isValidPassword) {
    throw new AuthError(
      ErrorCodes.INVALID_CREDENTIALS,
      'Неверный email или пароль'
    );
  }

  // Генерируем токены
  const payload: JWTPayload = {
    userId: user.id,
    companyId: user.companyId,
    email: user.email,
    role: user.role,
    plan: user.company.plan,
  };

  const tokens = generateTokens(payload);

  // Обновляем refresh token в БД
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: hashToken(tokens.refreshToken) },
  });

  return {
    user: mapUserToResponse(user),
    company: await mapCompanyToResponse(user.company),
    tokens,
  };
}

/**
 * Получение информации о приглашении по коду (публично)
 */
export async function getInviteInfo(code: string) {
  const invite = await prisma.invite.findUnique({
    where: { code },
    include: {
      company: {
        select: { name: true }
      }
    },
  });

  if (!invite) {
    throw new AuthError(ErrorCodes.NOT_FOUND, 'Приглашение не найдено');
  }

  if (invite.usedAt) {
    throw new AuthError(ErrorCodes.INVALID_INPUT, 'Приглашение уже использовано');
  }

  if (invite.expiresAt < new Date()) {
    throw new AuthError(ErrorCodes.INVALID_INPUT, 'Приглашение истекло');
  }

  return {
    code: invite.code,
    role: invite.role,
    companyName: invite.company.name,
    expiresAt: invite.expiresAt,
  };
}

/**
 * Присоединение к компании по invite code
 */
export async function joinCompany(input: JoinCompanyInput): Promise<AuthResult> {
  // Проверяем email
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    throw new AuthError(
      ErrorCodes.ALREADY_EXISTS,
      'Пользователь с таким email уже существует'
    );
  }

  // Ищем invite
  const invite = await prisma.invite.findUnique({
    where: { code: input.inviteCode },
    include: { company: true },
  });

  if (!invite) {
    throw new AuthError(ErrorCodes.NOT_FOUND, 'Приглашение не найдено');
  }

  if (invite.usedAt) {
    throw new AuthError(ErrorCodes.INVALID_INPUT, 'Приглашение уже использовано');
  }

  if (invite.expiresAt < new Date()) {
    throw new AuthError(ErrorCodes.INVALID_INPUT, 'Приглашение истекло');
  }

  // Проверяем лимит пользователей
  const limits = getCompanyLimits(invite.company.plan, {
    maxUsers: invite.company.maxUsers,
  });

  const currentUsers = await prisma.user.count({
    where: { companyId: invite.companyId },
  });

  const limitCheck = checkLimit(currentUsers, limits.maxUsers, 'пользователей');
  if (!limitCheck.allowed) {
    throw new AuthError(ErrorCodes.PLAN_LIMIT_EXCEEDED, limitCheck.message!);
  }

  // Хешируем пароль
  const passwordHash = await bcrypt.hash(input.password, 12);

  // Создаём пользователя и помечаем invite как использованный
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
        phone: input.phone,
        role: invite.role,
        companyId: invite.companyId,
      },
    });

    await tx.invite.update({
      where: { id: invite.id },
      data: {
        usedAt: new Date(),
        usedById: user.id,
      },
    });

    return user;
  });

  // Генерируем токены
  const payload: JWTPayload = {
    userId: result.id,
    companyId: invite.companyId,
    email: result.email,
    role: result.role,
    plan: invite.company.plan,
  };

  const tokens = generateTokens(payload);

  await prisma.user.update({
    where: { id: result.id },
    data: { refreshToken: hashToken(tokens.refreshToken) },
  });

  return {
    user: mapUserToResponse(result),
    company: await mapCompanyToResponse(invite.company),
    tokens,
  };
}

// ============================================
// REFRESH TOKENS
// ============================================

/**
 * Обновление access token по refresh token
 */
export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  // Верифицируем refresh token
  const payload = verifyRefreshToken(refreshToken);

  if (!payload) {
    throw new AuthError(ErrorCodes.UNAUTHORIZED, 'Недействительный refresh token');
  }

  // Ищем пользователя и проверяем хеш токена
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { company: true },
  });

  if (!user || user.refreshToken !== hashToken(refreshToken)) {
    throw new AuthError(ErrorCodes.UNAUTHORIZED, 'Refresh token отозван');
  }

  // Генерируем новые токены
  const newPayload: JWTPayload = {
    userId: user.id,
    companyId: user.companyId,
    email: user.email,
    role: user.role,
    plan: user.company.plan,
  };

  const tokens = generateTokens(newPayload);

  // Обновляем refresh token в БД (rotation)
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: hashToken(tokens.refreshToken) },
  });

  return tokens;
}

/**
 * Выход (отзыв refresh token)
 */
export async function logout(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null },
  });
}

// ============================================
// INVITES
// ============================================

/**
 * Создание приглашения
 */
export async function createInvite(
  companyId: string,
  input: CreateInviteInput
): Promise<{ code: string; expiresAt: Date }> {
  const code = generateCode(8);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

  await prisma.invite.create({
    data: {
      code,
      companyId,
      role: input.role as Role,
      expiresAt,
    },
  });

  return { code, expiresAt };
}

/**
 * Список активных приглашений компании
 */
export async function getCompanyInvites(companyId: string) {
  return prisma.invite.findMany({
    where: {
      companyId,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      code: true,
      role: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Отзыв приглашения
 */
export async function revokeInvite(inviteId: string, companyId: string): Promise<void> {
  await prisma.invite.deleteMany({
    where: { id: inviteId, companyId },
  });
}

// ============================================
// PASSWORD
// ============================================

/**
 * Смена пароля
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AuthError(ErrorCodes.NOT_FOUND, 'Пользователь не найден');
  }

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);

  if (!isValid) {
    throw new AuthError(ErrorCodes.INVALID_CREDENTIALS, 'Неверный текущий пароль');
  }

  const newHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: newHash,
      refreshToken: null, // Разлогиниваем все сессии
    },
  });
}

// ============================================
// CURRENT USER
// ============================================

/**
 * Получение текущего пользователя
 */
export async function getCurrentUser(userId: string): Promise<{
  user: UserResponse;
  company: CompanyResponse;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { company: true },
  });

  if (!user) {
    throw new AuthError(ErrorCodes.NOT_FOUND, 'Пользователь не найден');
  }

  return {
    user: mapUserToResponse(user),
    company: await mapCompanyToResponse(user.company),
  };
}

// ============================================
// MAPPERS
// ============================================

function mapUserToResponse(user: {
  id: string;
  email: string;
  name: string;
  role: Role;
  companyId: string;
}): UserResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    companyId: user.companyId,
  };
}

async function mapCompanyToResponse(company: {
  id: string;
  name: string;
  plan: Plan;
  maxProjects?: number | null;
  maxUsers?: number | null;
}): Promise<CompanyResponse> {
  const limits = getCompanyLimits(company.plan, {
    maxProjects: company.maxProjects,
    maxUsers: company.maxUsers,
  });

  const [currentProjects, currentUsers] = await Promise.all([
    prisma.project.count({ where: { companyId: company.id } }),
    prisma.user.count({ where: { companyId: company.id } }),
  ]);

  return {
    id: company.id,
    name: company.name,
    plan: company.plan,
    limits: {
      maxProjects: limits.maxProjects,
      maxUsers: limits.maxUsers,
      currentProjects,
      currentUsers,
    },
  };
}

// ============================================
// PASSWORD RESET
// ============================================

/**
 * Начать процесс восстановления пароля
 */
export async function forgotPassword(email: string): Promise<void> {
  // Ищем пользователя
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  // Даже если пользователь не найден, возвращаем успех (security best practice)
  if (!user) {
    console.log(`[FORGOT PASSWORD] User not found: ${email}`);
    return;
  }

  // Генерируем код восстановления (6 цифр)
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 минут

  // Сохраняем код в БД
  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      code: resetCode,
      expiresAt,
    },
  });

  // TODO: Отправить email с кодом
  // Пока просто логируем
  console.log(`[FORGOT PASSWORD] Reset code for ${email}: ${resetCode}`);
  console.log(`[FORGOT PASSWORD] Code expires at: ${expiresAt.toISOString()}`);
}

/**
 * Сброс пароля по коду
 */
export async function resetPassword(code: string, newPassword: string): Promise<void> {
  // Ищем код восстановления
  const resetRecord = await prisma.passwordReset.findUnique({
    where: { code },
    include: { user: true },
  });

  if (!resetRecord) {
    throw new AuthError(ErrorCodes.NOT_FOUND, 'Неверный код восстановления');
  }

  if (resetRecord.usedAt) {
    throw new AuthError(ErrorCodes.INVALID_INPUT, 'Код уже использован');
  }

  if (resetRecord.expiresAt < new Date()) {
    throw new AuthError(ErrorCodes.INVALID_INPUT, 'Код истек. Запросите новый');
  }

  // Хешируем новый пароль
  const passwordHash = await bcrypt.hash(newPassword, 12);

  // Обновляем пароль и помечаем код как использованный
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash },
    }),
    prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    }),
  ]);

  console.log(`[RESET PASSWORD] Password reset for user ID: ${resetRecord.userId}`);
}
