// ============================================
// Projects Validation Schemas (Zod)
// ============================================

import { z } from 'zod';
import { ProjectStatus } from '@prisma/client';

// ============================================
// REQUEST SCHEMAS
// ============================================

/**
 * Создание объекта
 */
export const createProjectSchema = z.object({
  name: z
    .string()
    .min(2, 'Минимум 2 символа')
    .max(200, 'Максимум 200 символов')
    .trim(),
  address: z
    .string()
    .max(500, 'Максимум 500 символов')
    .trim()
    .optional(),
  budgetCents: z
    .number()
    .int('Бюджет должен быть целым числом')
    .min(0, 'Бюджет не может быть отрицательным')
    .optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

/**
 * Обновление объекта
 */
export const updateProjectSchema = z.object({
  name: z
    .string()
    .min(2, 'Минимум 2 символа')
    .max(200, 'Максимум 200 символов')
    .trim()
    .optional(),
  address: z
    .string()
    .max(500, 'Максимум 500 символов')
    .trim()
    .nullable()
    .optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  budgetCents: z
    .number()
    .int('Бюджет должен быть целым числом')
    .min(0, 'Бюджет не может быть отрицательным')
    .nullable()
    .optional(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

/**
 * Назначение доступа к объекту
 */
export const assignAccessSchema = z.object({
  userId: z.string().cuid('Некорректный ID пользователя'),
});

export type AssignAccessInput = z.infer<typeof assignAccessSchema>;

/**
 * Query параметры для списка
 */
export const listProjectsQuerySchema = z.object({
  status: z.nativeEnum(ProjectStatus).optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
