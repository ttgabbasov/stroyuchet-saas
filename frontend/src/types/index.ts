// ============================================
// СтройУчёт - Frontend Types
// ============================================

// ============================================
// ENUMS
// ============================================

export type Plan = 'FREE' | 'PRO' | 'BUSINESS';
export type Role = 'OWNER' | 'FOREMAN' | 'ACCOUNTANT' | 'VIEWER';
export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type TransactionType = 'INCOME' | 'EXPENSE' | 'PAYOUT' | 'INTERNAL';
export type ReceiptStatus = 'RECEIPT' | 'NO_RECEIPT' | 'PENDING';

// ============================================
// AUTH
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: Role;
  companyId: string;
  telegramId?: string;
}

export interface Company {
  id: string;
  name: string;
  plan: Plan;
  logoUrl?: string; // For backend logos if we ever add them
  projectsCount?: number;
  maxProjects?: number;
  usersCount?: number;
  maxUsers?: number;
}

export interface AuthResponse {
  user: User;
  company: Company;
  tokens: {
    accessToken: string;
    refreshToken?: string;
  };
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
  companyName: string;
}

// ============================================
// PROJECTS
// ============================================

export interface Project {
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

// ============================================
// MONEY SOURCES
// ============================================

export interface MoneySource {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  ownerName: string;
  isCompanyMain: boolean;
  isAdvance: boolean;
  isActive: boolean;
  balanceCents: number;
  sharedWith: MoneySourceAccess[];
  createdAt: string;
}

export interface MoneySourceAccess {
  userId: string;
  userName: string;
  canView: boolean;
  canSpend: boolean;
}

// ============================================
// TRANSACTIONS
// ============================================

export interface Transaction {
  id: string;
  type: TransactionType;
  amountCents: number;
  category: Category;
  moneySource: { id: string; name: string };
  toMoneySource?: { id: string; name: string };
  payoutUser?: { id: string; name: string };
  project?: { id: string; name: string };
  comment?: string;
  receiptStatus: ReceiptStatus;
  receiptUrl?: string;
  date: string;
  createdBy: { id: string; name: string };
  runningBalanceCents?: number;
  createdAt: string;
}

export interface CreateTransactionInput {
  type: TransactionType;
  moneySourceId: string;
  amountCents: number;
  categoryId: string;
  date: string;
  comment?: string;
  receiptStatus?: ReceiptStatus;
  receiptUrl?: string;
  // Type-specific
  projectId?: string;
  toMoneySourceId?: string;
  payoutUserId?: string;
}

// ============================================
// CATEGORIES
// ============================================

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  groupName?: string;
}

export interface CategoryGroup {
  id: string;
  name: string;
  categories: Category[];
}

// ============================================
// USERS
// ============================================

export interface CompanyUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: Role;
  projectCount: number;
  createdAt: string;
}

// ============================================
// HELPERS
// ============================================

export function formatMoney(cents: number): string {
  const rubles = cents / 100;
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rubles);
}

export function formatMoneyShort(cents: number): string {
  const rubles = Math.abs(cents / 100);

  if (rubles >= 1_000_000) {
    return `${(rubles / 1_000_000).toFixed(1)}М`;
  }
  if (rubles >= 1_000) {
    return `${(rubles / 1_000).toFixed(0)}К`;
  }
  return rubles.toFixed(0);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDateFull(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: 'Владелец',
  FOREMAN: 'Прораб',
  ACCOUNTANT: 'Бухгалтер',
  VIEWER: 'Наблюдатель',
};

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  ACTIVE: 'Активный',
  COMPLETED: 'Завершён',
  ARCHIVED: 'Архив',
};

export const TYPE_LABELS: Record<TransactionType, string> = {
  INCOME: 'Доход',
  EXPENSE: 'Расход',
  PAYOUT: 'Выплата',
  INTERNAL: 'Перевод',
};

// ============================================
// ANALYTICS
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
  icon?: string;
  color?: string;
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
  totalCents: number;
  count: number;
}

export interface CashFlowReport {
  period: { from: string; to: string };
  columns: string[];
  categories: {
    income: CashFlowCategoryRow[];
    expense: CashFlowCategoryRow[];
  };
  totals: {
    income: Record<string, number>;
    expense: Record<string, number>;
    balance: Record<string, number>;
    cumulativeBalance: Record<string, number>;
  };
}

export interface CashFlowCategoryRow {
  categoryId: string;
  categoryName: string;
  values: Record<string, number>;
  total: number;
}

// ============================================
// EQUITY
// ============================================

export interface PartnerEquity {
  userId: string;
  userName: string;
  cashBalanceCents: number;
  withdrawnCents: number;
  totalEquityCents: number;
  targetShareCents: number;
  settlementCents: number;
}

export interface EquityReport {
  partners: PartnerEquity[];
  totalCompanyValueCents: number;
  settlementNeeded: boolean;
  settlementSummary?: {
    from: { userId: string; userName: string };
    to: { userId: string; userName: string };
    amountCents: number;
  };
}

