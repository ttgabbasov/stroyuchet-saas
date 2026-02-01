// ============================================
// Categories Service
// ============================================
// Системные + пользовательские категории
// ============================================

import { TransactionType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { CategoryResponse, ErrorCodes } from '../../types/api.types';

export class CategoryError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'CategoryError';
  }
}

export interface CategoryWithGroup extends CategoryResponse {
  groupName?: string;
}

// ============================================
// READ
// ============================================

/**
 * Получение всех категорий (системные + компании)
 */
export async function getCategories(
  companyId: string,
  type?: TransactionType
): Promise<{ groups: CategoryGroupResponse[]; ungrouped: CategoryWithGroup[] }> {
  const where: any = {
    OR: [
      { isSystem: true },
      { companyId },
    ],
  };

  if (type) {
    where.allowedTypes = { has: type };
  }

  const categories = await prisma.category.findMany({
    where,
    include: {
      group: true,
    },
    orderBy: [{ group: { sortOrder: 'asc' } }, { sortOrder: 'asc' }, { name: 'asc' }],
  });

  // Группируем по группам
  const groupsMap = new Map<string, { group: { id: string; name: string }; categories: CategoryWithGroup[] }>();
  const ungrouped: CategoryWithGroup[] = [];

  for (const cat of categories) {
    const mapped: CategoryWithGroup = {
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      allowedTypes: cat.allowedTypes,
      groupName: cat.group?.name,
    };

    if (cat.group) {
      if (!groupsMap.has(cat.group.id)) {
        groupsMap.set(cat.group.id, {
          group: { id: cat.group.id, name: cat.group.name },
          categories: [],
        });
      }
      groupsMap.get(cat.group.id)!.categories.push(mapped);
    } else {
      ungrouped.push(mapped);
    }
  }

  const groups: CategoryGroupResponse[] = Array.from(groupsMap.values()).map((g) => ({
    id: g.group.id,
    name: g.group.name,
    categories: g.categories,
  }));

  return { groups, ungrouped };
}

/**
 * Получение категории по ID
 */
export async function getCategoryById(
  categoryId: string,
  companyId: string
): Promise<CategoryWithGroup> {
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      OR: [{ isSystem: true }, { companyId }],
    },
    include: { group: true },
  });

  if (!category) {
    throw new CategoryError(ErrorCodes.NOT_FOUND, 'Категория не найдена');
  }

  return {
    id: category.id,
    name: category.name,
    icon: category.icon,
    color: category.color,
    allowedTypes: category.allowedTypes,
    groupName: category.group?.name,
  };
}

// ============================================
// CREATE (custom categories)
// ============================================

export interface CreateCategoryInput {
  name: string;
  icon: string;
  color: string;
  allowedTypes: TransactionType[];
  groupId?: string;
}

/**
 * Создание пользовательской категории
 */
export async function createCategory(
  companyId: string,
  input: CreateCategoryInput
): Promise<CategoryWithGroup> {
  // Проверяем, что нет дубликата
  const existing = await prisma.category.findFirst({
    where: {
      name: input.name,
      OR: [{ isSystem: true }, { companyId }],
    },
  });

  if (existing) {
    throw new CategoryError(ErrorCodes.ALREADY_EXISTS, 'Категория с таким названием уже существует');
  }

  const category = await prisma.category.create({
    data: {
      name: input.name,
      icon: input.icon,
      color: input.color,
      allowedTypes: input.allowedTypes,
      groupId: input.groupId,
      companyId,
      isSystem: false,
    },
    include: { group: true },
  });

  return {
    id: category.id,
    name: category.name,
    icon: category.icon,
    color: category.color,
    allowedTypes: category.allowedTypes,
    groupName: category.group?.name,
  };
}

// ============================================
// UPDATE
// ============================================

export interface UpdateCategoryInput {
  name?: string;
  icon?: string;
  color?: string;
}

/**
 * Обновление пользовательской категории
 */
export async function updateCategory(
  categoryId: string,
  companyId: string,
  input: UpdateCategoryInput
): Promise<CategoryWithGroup> {
  const existing = await prisma.category.findFirst({
    where: { id: categoryId, companyId, isSystem: false },
  });

  if (!existing) {
    throw new CategoryError(ErrorCodes.NOT_FOUND, 'Категория не найдена или её нельзя редактировать');
  }

  const category = await prisma.category.update({
    where: { id: categoryId },
    data: {
      name: input.name,
      icon: input.icon,
      color: input.color,
    },
    include: { group: true },
  });

  return {
    id: category.id,
    name: category.name,
    icon: category.icon,
    color: category.color,
    allowedTypes: category.allowedTypes,
    groupName: category.group?.name,
  };
}

// ============================================
// DELETE
// ============================================

/**
 * Удаление пользовательской категории
 */
export async function deleteCategory(
  categoryId: string,
  companyId: string
): Promise<void> {
  const existing = await prisma.category.findFirst({
    where: { id: categoryId, companyId, isSystem: false },
  });

  if (!existing) {
    throw new CategoryError(ErrorCodes.NOT_FOUND, 'Категория не найдена или её нельзя удалить');
  }

  // Проверяем, используется ли категория
  const usageCount = await prisma.transaction.count({
    where: { categoryId },
  });

  if (usageCount > 0) {
    throw new CategoryError(
      ErrorCodes.FORBIDDEN,
      `Категория используется в ${usageCount} транзакциях. Сначала измените категорию в транзакциях.`
    );
  }

  await prisma.category.delete({
    where: { id: categoryId },
  });
}

// ============================================
// TYPES
// ============================================

export interface CategoryGroupResponse {
  id: string;
  name: string;
  categories: CategoryWithGroup[];
}
