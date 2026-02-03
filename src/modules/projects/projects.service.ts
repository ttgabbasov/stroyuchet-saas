// ============================================
// Projects Service
// ============================================
// CRUD объектов + баланс + доступы
// ============================================

import { Prisma, ProjectStatus, Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { CreateProjectInput, UpdateProjectInput, ListProjectsQuery } from './projects.schema';
import { ProjectResponse, ProjectBalance } from '../../types/api.types';
import { getCompanyLimits, checkLimit } from '../../config/plan-limits';
import { NotFoundError, PlanLimitExceededError } from '../../lib/errors';

export interface ProjectListResult {
  projects: ProjectResponse[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================
// CREATE
// ============================================

/**
 * Создание нового объекта
 * Проверяет лимит по тарифу
 */
export async function createProject(
  companyId: string,
  input: CreateProjectInput
): Promise<ProjectResponse> {
  // Проверяем лимит объектов
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { plan: true, maxProjects: true },
  });

  if (!company) {
    throw new NotFoundError('Компания не найдена');
  }

  const limits = getCompanyLimits(company.plan, { maxProjects: company.maxProjects });
  const currentCount = await prisma.project.count({ where: { companyId } });

  const limitCheck = checkLimit(currentCount, limits.maxProjects, 'объектов');
  if (!limitCheck.allowed) {
    throw new PlanLimitExceededError(limitCheck.message!);
  }

  // Создаём объект
  const project = await prisma.project.create({
    data: {
      name: input.name,
      address: input.address,
      budgetCents: input.budgetCents,
      companyId,
      status: ProjectStatus.ACTIVE,
    },
  });

  return mapProjectToResponse(project, { totalIncomeCents: 0, totalExpenseCents: 0, balanceCents: 0 });
}

// ============================================
// READ
// ============================================

/**
 * Получение списка объектов
 * Учитывает роль: FOREMAN видит только назначенные
 */
export async function listProjects(
  companyId: string,
  userId: string,
  userRole: Role,
  query: ListProjectsQuery
): Promise<ProjectListResult> {
  const { status, search, page, limit } = query;
  const skip = (page - 1) * limit;

  // Базовый фильтр
  const where: Prisma.ProjectWhereInput = { companyId };

  // Фильтр по статусу
  if (status) {
    where.status = status;
  }

  // Поиск по имени/адресу
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
    ];
  }

  // FOREMAN и VIEWER видят только назначенные объекты
  if (userRole === 'FOREMAN' || userRole === 'VIEWER') {
    where.accessList = {
      some: { userId },
    };
  }

  // Запрос
  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.project.count({ where }),
  ]);

  // Получаем балансы для всех объектов одним запросом (исправление N+1)
  const projectIds = projects.map(p => p.id);

  // Группируем транзакции по проектам и типам
  const balanceResults = await prisma.transaction.groupBy({
    by: ['projectId', 'type'],
    where: {
      projectId: { in: projectIds },
      deletedAt: null,
    },
    _sum: { amountCents: true },
  });

  // Создаём мапу балансов по projectId
  const balanceMap = new Map<string, ProjectBalance>();

  for (const result of balanceResults) {
    if (!result.projectId) continue;

    if (!balanceMap.has(result.projectId)) {
      balanceMap.set(result.projectId, {
        totalIncomeCents: 0,
        totalExpenseCents: 0,
        balanceCents: 0,
      });
    }

    const balance = balanceMap.get(result.projectId)!;
    if (result.type === 'INCOME') {
      balance.totalIncomeCents = result._sum.amountCents || 0;
    } else if (result.type === 'EXPENSE') {
      balance.totalExpenseCents = result._sum.amountCents || 0;
    }
    balance.balanceCents = balance.totalIncomeCents - balance.totalExpenseCents;
  }

  // Маппим проекты с балансами
  const projectsWithBalance = projects.map((project) => {
    const balance = balanceMap.get(project.id) || {
      totalIncomeCents: 0,
      totalExpenseCents: 0,
      balanceCents: 0,
    };
    return mapProjectToResponse(project, balance);
  });

  return {
    projects: projectsWithBalance,
    total,
    page,
    limit,
    hasMore: skip + projects.length < total,
  };
}

/**
 * Получение одного объекта по ID
 */
export async function getProject(
  projectId: string,
  companyId: string
): Promise<ProjectResponse> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId },
  });

  if (!project) {
    throw new NotFoundError('Объект не найден');
  }

  const balance = await calculateProjectBalance(project.id);
  return mapProjectToResponse(project, balance);
}

/**
 * Получение детальной информации об объекте
 * Включает статистику, последние транзакции, сотрудников
 */
export async function getProjectDetails(
  projectId: string,
  companyId: string
): Promise<{
  project: ProjectResponse;
  recentTransactions: number;
  teamMembers: { id: string; name: string; role: Role }[];
  categoryBreakdown: { categoryId: string; name: string; totalCents: number }[];
}> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId },
    include: {
      accessList: {
        include: {
          user: { select: { id: true, name: true, role: true } },
        },
      },
    },
  });

  if (!project) {
    throw new NotFoundError('Объект не найден');
  }

  // Баланс
  const balance = await calculateProjectBalance(project.id);

  // Количество транзакций за последние 30 дней
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentTransactions = await prisma.transaction.count({
    where: {
      projectId,
      deletedAt: null,
      createdAt: { gte: thirtyDaysAgo },
    },
  });

  // Расходы по категориям
  const categoryStats = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: {
      projectId,
      type: 'EXPENSE',
      deletedAt: null,
    },
    _sum: { amountCents: true },
  });

  const categoryIds = categoryStats.map((c) => c.categoryId);
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true },
  });
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const categoryBreakdown = categoryStats
    .map((c) => ({
      categoryId: c.categoryId,
      name: categoryMap.get(c.categoryId) || 'Неизвестно',
      totalCents: c._sum.amountCents || 0,
    }))
    .sort((a, b) => b.totalCents - a.totalCents);

  // Команда (Owner видит всех, для остальных — только назначенные)
  const teamMembers = project.accessList.map((a) => ({
    id: a.user.id,
    name: a.user.name,
    role: a.user.role,
  }));

  return {
    project: mapProjectToResponse(project, balance),
    recentTransactions,
    teamMembers,
    categoryBreakdown,
  };
}

// ============================================
// UPDATE
// ============================================

/**
 * Обновление объекта
 */
export async function updateProject(
  projectId: string,
  companyId: string,
  input: UpdateProjectInput
): Promise<ProjectResponse> {
  // Проверяем существование
  const existing = await prisma.project.findFirst({
    where: { id: projectId, companyId },
  });

  if (!existing) {
    throw new NotFoundError('Объект не найден');
  }

  // Обновляем
  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      name: input.name,
      address: input.address,
      status: input.status,
      budgetCents: input.budgetCents,
    },
  });

  const balance = await calculateProjectBalance(project.id);
  return mapProjectToResponse(project, balance);
}

// ============================================
// DELETE
// ============================================

// Импорты
import { generateCode } from '../../lib/jwt';
import * as emailService from '../../services/email.service';

/**
 * Шаг 1: Инициализация удаления (отправка кода)
 */
export async function initiateProjectDeletion(
  projectId: string,
  companyId: string
): Promise<void> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId },
  });

  if (!project) {
    throw new NotFoundError('Объект не найден');
  }

  // Получаем владельца компании, чтобы отправить ему код
  const owner = await prisma.user.findFirst({
    where: { companyId, role: 'OWNER' },
  });

  if (!owner) {
    throw new NotFoundError('Владелец компании не найден');
  }

  // Генерируем код (6 цифр)
  const code = generateCode(6).replace(/-/g, ''); // 6 chars (e.g. A3F9X2)

  // Сохраняем код верификации
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 минут

  await prisma.actionVerification.create({
    data: {
      code,
      action: 'DELETE_PROJECT',
      payload: { projectId },
      userId: owner.id,
      expiresAt,
    },
  });

  // Отправляем email
  await emailService.sendProjectDeletionCode(owner.email, project.name, code);
}

/**
 * Шаг 2: Подтверждение удаления
 */
export async function confirmProjectDeletion(
  projectId: string,
  companyId: string,
  code: string
): Promise<void> {
  // Проверяем существование проекта
  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId },
  });

  if (!project) {
    throw new NotFoundError('Объект не найден');
  }

  // Проверяем код
  const verification = await prisma.actionVerification.findUnique({
    where: { code },
  });

  if (!verification) {
    throw new NotFoundError('Неверный код подтверждения');
  }

  if (verification.action !== 'DELETE_PROJECT') {
    throw new Error('Код не для этой операции');
  }

  if (verification.expiresAt < new Date()) {
    // Удаляем просроченный код
    await prisma.actionVerification.delete({ where: { id: verification.id } });
    throw new Error('Код истёк. Запросите новый.');
  }

  const payload = verification.payload as { projectId: string };
  if (payload.projectId !== projectId) {
    throw new Error('Код для другого объекта');
  }

  // Удаляем код (он одноразовый)
  await prisma.actionVerification.delete({ where: { id: verification.id } });

  // Удаляем проект (логика прежняя)
  const transactionCount = await prisma.transaction.count({
    where: { projectId },
  });

  if (transactionCount > 0) {
    // Не удаляем, а архивируем
    await prisma.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.ARCHIVED },
    });
    return;
  }

  // Если транзакций нет — удаляем полностью
  await prisma.project.delete({
    where: { id: projectId },
  });
}

// ============================================
// ACCESS MANAGEMENT
// ============================================

/**
 * Назначение доступа пользователю к объекту
 */
export async function assignAccess(
  projectId: string,
  userId: string,
  companyId: string
): Promise<void> {
  // Проверяем, что объект принадлежит компании
  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId },
  });

  if (!project) {
    throw new NotFoundError('Объект не найден');
  }

  // Проверяем, что пользователь принадлежит компании
  const user = await prisma.user.findFirst({
    where: { id: userId, companyId },
  });

  if (!user) {
    throw new NotFoundError('Пользователь не найден');
  }

  // Owner и Accountant имеют доступ ко всем объектам по умолчанию
  if (user.role === 'OWNER' || user.role === 'ACCOUNTANT') {
    return; // Ничего не делаем
  }

  // Создаём доступ (upsert для идемпотентности)
  await prisma.projectAccess.upsert({
    where: {
      userId_projectId: { userId, projectId },
    },
    create: { userId, projectId },
    update: {},
  });
}

/**
 * Отзыв доступа пользователя к объекту
 */
export async function revokeAccess(
  projectId: string,
  userId: string,
  companyId: string
): Promise<void> {
  // Проверяем, что объект принадлежит компании
  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId },
  });

  if (!project) {
    throw new NotFoundError('Объект не найден');
  }

  await prisma.projectAccess.deleteMany({
    where: { projectId, userId },
  });
}

/**
 * Список пользователей с доступом к объекту
 */
export async function getProjectAccess(
  projectId: string,
  companyId: string
): Promise<{ id: string; name: string; email: string; role: Role }[]> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId },
  });

  if (!project) {
    throw new NotFoundError('Объект не найден');
  }

  // Owner и Accountant всегда имеют доступ
  const usersWithAutoAccess = await prisma.user.findMany({
    where: {
      companyId,
      role: { in: ['OWNER', 'ACCOUNTANT'] },
    },
    select: { id: true, name: true, email: true, role: true },
  });

  // Явно назначенные
  const explicitAccess = await prisma.projectAccess.findMany({
    where: { projectId },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  const explicitUsers = explicitAccess.map((a) => a.user);

  // Объединяем и убираем дубликаты
  const allUsers = [...usersWithAutoAccess, ...explicitUsers];
  const uniqueUsers = Array.from(
    new Map(allUsers.map((u) => [u.id, u])).values()
  );

  return uniqueUsers;
}

// ============================================
// BALANCE CALCULATION
// ============================================

/**
 * Вычисление баланса объекта
 */
async function calculateProjectBalance(projectId: string): Promise<ProjectBalance> {
  const result = await prisma.transaction.groupBy({
    by: ['type'],
    where: {
      projectId,
      deletedAt: null,
    },
    _sum: { amountCents: true },
  });

  let totalIncomeCents = 0;
  let totalExpenseCents = 0;

  for (const row of result) {
    if (row.type === 'INCOME') {
      totalIncomeCents = row._sum.amountCents || 0;
    } else if (row.type === 'EXPENSE') {
      totalExpenseCents = row._sum.amountCents || 0;
    }
  }

  return {
    totalIncomeCents,
    totalExpenseCents,
    balanceCents: totalIncomeCents - totalExpenseCents,
  };
}

// ============================================
// SUMMARY / DASHBOARD
// ============================================

/**
 * Сводка по всем объектам компании (для dashboard)
 */
export async function getCompanySummary(companyId: string): Promise<{
  totalProjects: number;
  activeProjects: number;
  totalBalance: ProjectBalance;
  topProjects: { id: string; name: string; balanceCents: number }[];
}> {
  const [totalProjects, activeProjects] = await Promise.all([
    prisma.project.count({ where: { companyId } }),
    prisma.project.count({ where: { companyId, status: 'ACTIVE' } }),
  ]);

  // Общий баланс компании
  const balanceResult = await prisma.transaction.groupBy({
    by: ['type'],
    where: {
      project: { companyId },
      deletedAt: null,
    },
    _sum: { amountCents: true },
  });

  let totalIncomeCents = 0;
  let totalExpenseCents = 0;

  for (const row of balanceResult) {
    if (row.type === 'INCOME') {
      totalIncomeCents = row._sum.amountCents || 0;
    } else if (row.type === 'EXPENSE') {
      totalExpenseCents = row._sum.amountCents || 0;
    }
  }

  // Топ-5 объектов по балансу (исправление N+1)
  const projects = await prisma.project.findMany({
    where: { companyId, status: 'ACTIVE' },
    select: { id: true, name: true },
  });

  const projectIds = projects.map(p => p.id);

  // Получаем балансы для всех проектов одним запросом
  const projectBalanceResults = await prisma.transaction.groupBy({
    by: ['projectId', 'type'],
    where: {
      projectId: { in: projectIds },
      deletedAt: null,
    },
    _sum: { amountCents: true },
  });

  // Создаём мапу балансов
  const projectBalanceMap = new Map<string, number>();

  for (const result of projectBalanceResults) {
    if (!result.projectId) continue;

    const currentBalance = projectBalanceMap.get(result.projectId) || 0;
    if (result.type === 'INCOME') {
      projectBalanceMap.set(
        result.projectId,
        currentBalance + (result._sum.amountCents || 0)
      );
    } else if (result.type === 'EXPENSE') {
      projectBalanceMap.set(
        result.projectId,
        currentBalance - (result._sum.amountCents || 0)
      );
    }
  }

  const projectsWithBalance = projects.map((p) => ({
    id: p.id,
    name: p.name,
    balanceCents: projectBalanceMap.get(p.id) || 0,
  }));

  const topProjects = projectsWithBalance
    .sort((a, b) => b.balanceCents - a.balanceCents)
    .slice(0, 5);

  return {
    totalProjects,
    activeProjects,
    totalBalance: {
      totalIncomeCents,
      totalExpenseCents,
      balanceCents: totalIncomeCents - totalExpenseCents,
    },
    topProjects,
  };
}

// ============================================
// MAPPER
// ============================================

function mapProjectToResponse(
  project: {
    id: string;
    name: string;
    address: string | null;
    status: ProjectStatus;
    budgetCents: number | null;
    createdAt: Date;
  },
  balance: ProjectBalance
): ProjectResponse {
  return {
    id: project.id,
    name: project.name,
    address: project.address || undefined,
    status: project.status,
    budgetCents: project.budgetCents || undefined,
    balance,
    createdAt: project.createdAt.toISOString(),
  };
}
