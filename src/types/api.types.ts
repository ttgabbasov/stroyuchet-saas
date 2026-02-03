// ============================================
// СтройУчёт - API Types
// ============================================

import { Role, Plan, TransactionType, ProjectStatus } from '@prisma/client';

// ============================================
// AUTH
// ============================================

export interface JWTPayload {
  userId: string;
  companyId: string;
  email: string;
  role: Role;
  plan: Plan;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ============================================
// API RESPONSES
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
}

// ============================================
// ERROR CODES
// ============================================

export const ErrorCodes = {
  // Auth
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',

  // Limits
  PLAN_LIMIT: 'PLAN_LIMIT',
  PLAN_LIMIT_EXCEEDED: 'PLAN_LIMIT_EXCEEDED',
  FEATURE_NOT_AVAILABLE: 'FEATURE_NOT_AVAILABLE',

  // Server
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// ============================================
// REQUEST DTOs
// ============================================

// Auth
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  companyName: string;
}

export interface JoinCompanyRequest {
  inviteCode: string;
  email: string;
  password: string;
  name: string;
}

// Projects
export interface CreateProjectRequest {
  name: string;
  address?: string;
  budgetCents?: number;
}

export interface UpdateProjectRequest {
  name?: string;
  address?: string;
  status?: ProjectStatus;
  budgetCents?: number;
}

// Transactions
export interface CreateTransactionRequest {
  projectId: string;
  type: TransactionType;
  amountCents: number;
  categoryId: string;
  date: string; // ISO date
  comment?: string;
  toUserId?: string; // для transfer
}

export interface TransactionFilters {
  projectId?: string;
  type?: TransactionType;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  createdById?: string;
}

// Estimates
export interface CreateEstimateRequest {
  projectId: string;
  name: string;
  unit: string;
  quantity: number;
  priceCents: number;
}

// ============================================
// RESPONSE DTOs
// ============================================

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: Role;
  companyId: string;
  isSuperAdmin?: boolean;
}

export interface CompanyResponse {
  id: string;
  name: string;
  plan: Plan;
  limits: {
    maxProjects: number;
    maxUsers: number;
    currentProjects: number;
    currentUsers: number;
  };
}

export interface ProjectResponse {
  id: string;
  name: string;
  address?: string;
  status: ProjectStatus;
  budgetCents?: number;
  balance: ProjectBalance;
  createdAt: string;
}

export interface ProjectBalance {
  totalIncomeCents: number;
  totalExpenseCents: number;
  balanceCents: number;
}

export interface TransactionResponse {
  id: string;
  type: TransactionType;
  amountCents: number;
  category: CategoryResponse;
  comment?: string;
  date: string;
  createdBy: { id: string; name: string };
  runningBalanceCents?: number; // Нарастающий итог
  createdAt: string;
}

export interface CategoryResponse {
  id: string;
  name: string;
  icon: string;
  color: string;
  allowedTypes: TransactionType[];
  group?: string;
}

export interface EstimateResponse {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  priceCents: number;
  totalCents: number;
}

// ============================================
// ANALYTICS (для BUSINESS плана)
// ============================================

export interface AnalyticsSummary {
  period: { from: string; to: string };
  totalIncomeCents: number;
  totalExpenseCents: number;
  profitCents: number;
  profitMargin: number;
  byCategory: CategorySummary[];
  byProject: ProjectSummary[];
  byUser: UserSummary[];
  history: DailyHistory[];
}

export interface CashFlowReport {
  period: { from: string; to: string };
  columns: string[]; // "2024-01", "2024-02" etc.
  categories: {
    income: CashFlowCategoryRow[];
    expense: CashFlowCategoryRow[];
  };
  totals: {
    income: Record<string, number>; // "2024-01": 10000
    expense: Record<string, number>;
    balance: Record<string, number>;
    cumulativeBalance: Record<string, number>; // Scale logic if needed
  };
}

export interface CashFlowCategoryRow {
  categoryId: string;
  categoryName: string;
  values: Record<string, number>; // "2024-01": 500
  total: number; // Row total
}

export interface DailyHistory {
  date: string;
  incomeCents: number;
  expenseCents: number;
}

export interface CategorySummary {
  categoryId: string;
  categoryName: string;
  totalCents: number;
  percentage: number;
  count: number;
}

export interface ProjectSummary {
  projectId: string;
  projectName: string;
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
}

export interface UserSummary {
  userId: string;
  userName: string;
  receivedCents: number;
  spentCents: number;
}
