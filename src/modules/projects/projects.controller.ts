// ============================================
// Projects Controller
// ============================================

import { Request, Response, NextFunction } from 'express';
import * as projectsService from './projects.service';
import {
  CreateProjectInput,
  UpdateProjectInput,
  AssignAccessInput,
  ListProjectsQuery,
} from './projects.schema';
import { ErrorCodes } from '../../types/api.types';
import { NotFoundError, PlanLimitExceededError } from '../../lib/errors';

// ============================================
// ERROR HANDLER
// ============================================

function handleProjectError(error: unknown, res: Response, next: NextFunction): void {
  if (error instanceof NotFoundError) {
    res.status(404).json({
      success: false,
      error: { code: ErrorCodes.NOT_FOUND, message: error.message },
    });
    return;
  }

  if (error instanceof PlanLimitExceededError) {
    res.status(403).json({
      success: false,
      error: { code: ErrorCodes.PLAN_LIMIT, message: error.message },
    });
    return;
  }

  next(error);
}

// ============================================
// LIST
// ============================================

/**
 * GET /api/projects
 * Список объектов (с учётом роли)
 */
export async function list(
  req: Request<{}, {}, {}, ListProjectsQuery>,
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

    const result = await projectsService.listProjects(
      req.user.companyId,
      req.user.userId,
      req.user.role,
      req.query
    );

    res.json({
      success: true,
      data: result.projects,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        hasMore: result.hasMore,
      },
    });
  } catch (error) {
    handleProjectError(error, res, next);
  }
}

// ============================================
// GET ONE
// ============================================

/**
 * GET /api/projects/:id
 * Получение объекта по ID
 */
export async function getOne(
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

    const project = await projectsService.getProject(
      req.params.id,
      req.user.companyId
    );

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    handleProjectError(error, res, next);
  }
}

/**
 * GET /api/projects/:id/details
 * Детальная информация об объекте
 */
export async function getDetails(
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

    const details = await projectsService.getProjectDetails(
      req.params.id,
      req.user.companyId
    );

    res.json({
      success: true,
      data: details,
    });
  } catch (error) {
    handleProjectError(error, res, next);
  }
}

// ============================================
// CREATE
// ============================================

/**
 * POST /api/projects
 * Создание объекта
 */
export async function create(
  req: Request<{}, {}, CreateProjectInput>,
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

    const project = await projectsService.createProject(
      req.user.companyId,
      req.body
    );

    res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error) {
    handleProjectError(error, res, next);
  }
}

// ============================================
// UPDATE
// ============================================

/**
 * PATCH /api/projects/:id
 * Обновление объекта
 */
export async function update(
  req: Request<{ id: string }, {}, UpdateProjectInput>,
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

    const project = await projectsService.updateProject(
      req.params.id,
      req.user.companyId,
      req.body
    );

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    handleProjectError(error, res, next);
  }
}

// ============================================
// DELETE
// ============================================

/**
 * POST /api/projects/:id/delete/init
 * Шаг 1: Отправка кода подтверждения на удаление
 */
export async function initiateDelete(
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

    await projectsService.initiateProjectDeletion(req.params.id, req.user.companyId, req.user.userId);

    res.json({
      success: true,
      data: { message: 'Код подтверждения отправлен на email владельца компании' },
    });
  } catch (error) {
    handleProjectError(error, res, next);
  }
}

/**
 * DELETE /api/projects/:id/delete/confirm
 * Шаг 2: Удаление с кодом подтверждения
 */
export async function confirmDelete(
  req: Request<{ id: string }, {}, { code: string }>,
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

    await projectsService.confirmProjectDeletion(
      req.params.id,
      req.user.companyId,
      req.body.code
    );

    res.json({
      success: true,
      data: { message: 'Объект успешно удалён' },
    });
  } catch (error) {
    handleProjectError(error, res, next);
  }
}

// ============================================
// ACCESS MANAGEMENT
// ============================================

/**
 * GET /api/projects/:id/access
 * Список пользователей с доступом к объекту
 */
export async function getAccess(
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

    const users = await projectsService.getProjectAccess(
      req.params.id,
      req.user.companyId
    );

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    handleProjectError(error, res, next);
  }
}

/**
 * POST /api/projects/:id/access
 * Назначение доступа пользователю
 */
export async function assignAccess(
  req: Request<{ id: string }, {}, AssignAccessInput>,
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

    await projectsService.assignAccess(
      req.params.id,
      req.body.userId,
      req.user.companyId
    );

    res.json({
      success: true,
      data: { message: 'Доступ назначен' },
    });
  } catch (error) {
    handleProjectError(error, res, next);
  }
}

/**
 * DELETE /api/projects/:id/access/:userId
 * Отзыв доступа пользователя
 */
export async function revokeAccess(
  req: Request<{ id: string; userId: string }>,
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

    await projectsService.revokeAccess(
      req.params.id,
      req.params.userId,
      req.user.companyId
    );

    res.json({
      success: true,
      data: { message: 'Доступ отозван' },
    });
  } catch (error) {
    handleProjectError(error, res, next);
  }
}

// ============================================
// SUMMARY
// ============================================

/**
 * GET /api/projects/summary
 * Сводка по всем объектам (dashboard)
 */
export async function summary(
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

    const data = await projectsService.getCompanySummary(req.user.companyId);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    handleProjectError(error, res, next);
  }
}
