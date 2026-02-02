// ============================================
// Users Service
// ============================================
// Управление пользователями компании
// ============================================

import { Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ErrorCodes } from '../../types/api.types';

export class UserError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'UserError';
  }
}

export interface CompanyUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: Role;
  projectCount: number;
  createdAt: string;
}

/**
 * Список пользователей компании
 */
export async function listCompanyUsers(companyId: string): Promise<CompanyUser[]> {
  const users = await prisma.user.findMany({
    where: { companyId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      createdAt: true,
      _count: {
        select: { projectAccess: true },
      },
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  });

  return users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone || undefined,
    role: u.role,
    projectCount: u._count.projectAccess,
    createdAt: u.createdAt.toISOString(),
  }));
}

/**
 * Изменение роли пользователя
 */
export async function updateUserRole(
  userId: string,
  companyId: string,
  newRole: Role,
  requesterId: string
): Promise<void> {
  // Нельзя менять роль себе
  if (userId === requesterId) {
    throw new UserError(ErrorCodes.FORBIDDEN, 'Нельзя изменить свою роль');
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, companyId },
  });

  if (!user) {
    throw new UserError(ErrorCodes.NOT_FOUND, 'Пользователь не найден');
  }

  // Нельзя сделать кого-то OWNER (должен быть только один)
  if (newRole === 'OWNER') {
    throw new UserError(ErrorCodes.FORBIDDEN, 'Нельзя назначить роль Owner');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
  });
}

/**
 * Удаление пользователя из компании
 */
export async function removeUser(
  userId: string,
  companyId: string,
  requesterId: string
): Promise<void> {
  // Нельзя удалить себя
  if (userId === requesterId) {
    throw new UserError(ErrorCodes.FORBIDDEN, 'Нельзя удалить себя');
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, companyId },
  });

  if (!user) {
    throw new UserError(ErrorCodes.NOT_FOUND, 'Пользователь не найден');
  }

  // Нельзя удалить OWNER
  if (user.role === 'OWNER') {
    throw new UserError(ErrorCodes.FORBIDDEN, 'Нельзя удалить владельца компании');
  }

  // Удаляем пользователя (каскадно удалит projectAccess)
  await prisma.user.delete({
    where: { id: userId },
  });
}

/**
 * Генерация токена для привязки Telegram
 */
export async function generateTelegramLinkToken(userId: string): Promise<string> {
  const crypto = await import('crypto');
  const token = crypto.randomBytes(16).toString('hex');

  await prisma.user.update({
    where: { id: userId },
    data: { telegramLinkToken: token }
  });

  return token;
}

export interface InviteResult {
  code: string;
  link: string;
  expiresAt: Date;
}

/**
 * Создание приглашения в компанию
 */
export async function createInvite(
  companyId: string,
  role: Role = 'FOREMAN',
  _requesterId: string,
  email?: string
): Promise<InviteResult> {
  const crypto = await import('crypto');
  const code = crypto.randomBytes(4).toString('hex').toUpperCase();

  // 7 days expiry
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.invite.create({
    data: {
      code,
      companyId,
      role,
      expiresAt
    }
  });

  const relativeLink = `/join?code=${code}`;

  // If email is provided, send invitation automatically
  if (email) {
    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true }
      });

      const baseUrl = process.env.CORS_ORIGIN || 'http://localhost:3000';
      const fullLink = `${baseUrl}${relativeLink}`;

      const { MailService } = await import('../mail/mail.service');
      await MailService.getInstance().sendInvitation(
        email,
        fullLink,
        company?.name || 'СтройУчёт',
        role
      );
    } catch (error) {
      console.error('Failed to send invite email:', error);
      // We don't fail the invitation creation if email fails
    }
  }

  return {
    code,
    link: relativeLink,
    expiresAt,
  };
}

/**
 * Обновление Push-токена устройства
 */
export async function updatePushToken(userId: string, token: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { pushToken: token },
  });
}
