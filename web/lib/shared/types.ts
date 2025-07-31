// Re-export zod for runtime validation
export { z } from 'zod';

// ==========================================
// USER TYPES
// ==========================================

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

// ==========================================
// API RESPONSE TYPES
// ==========================================

export interface BaseApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends BaseApiResponse<T[]> {
  data?: T[];
  total?: number;
  page?: number;
  pages?: number;
  limit?: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ValidationError extends ApiError {
  field?: string;
  value?: unknown;
}

export interface ServerActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: ValidationError[];
}

// ==========================================
// REQUEST TYPES
// ==========================================

export interface PaginatedRequest {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface SearchRequest extends PaginatedRequest {
  query?: string;
  filters?: Record<string, unknown>;
}

// ==========================================
// COMMON TYPES
// ==========================================

export interface DateRange {
  start_date?: string;
  end_date?: string;
}

export interface BaseFilters {
  page?: number;
  limit?: number;
}

export interface SortOptions {
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface SearchOptions {
  query?: string;
}

// ==========================================
// HELPER TYPES
// ==========================================

export type WithTimestamps = {
  created_at: string;
  updated_at: string;
};

export type WithId = {
  id: string | number;
};

export type WithOptionalId = {
  id?: string | number;
};

// ==========================================
// STATUS TYPES
// ==========================================

export type LoadingStatus = 'idle' | 'loading' | 'success' | 'error';
export type ResponseStatus = 'idle' | 'loading' | 'success' | 'error';
export type Theme = 'light' | 'dark' | 'system';

// ==========================================
// DOMAIN TYPES
// ==========================================

export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type AccountType = 'checking' | 'savings' | 'credit' | 'investment' | 'other';
export type AnalyticsPeriod = 'week' | 'month' | 'quarter' | 'year';
export type GroupByOption = 'category' | 'account' | 'date' | 'merchant';

// ==========================================
// FORM AND STATE TYPES
// ==========================================

export interface FormState<T = Record<string, unknown>> {
  data: T;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isValid: boolean;
}

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface DataState<T> extends LoadingState {
  data: T | null;
}

// ==========================================
// UTILITY TYPES
// ==========================================

export type NonNullable<T> = T extends null | undefined ? never : T;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type Required<T, K extends keyof T> = T & { [P in K]-?: T[P] };
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};