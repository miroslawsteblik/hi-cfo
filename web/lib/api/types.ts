// lib/types/api.ts
import { z } from 'zod';

// Base API Response Types
export interface BaseApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Legacy structure that matches existing codebase usage
export interface PaginatedResponse<T> extends BaseApiResponse<T[]> {
  data?: T[];
  total?: number;
  page?: number;
  pages?: number; // Note: using 'pages' to match existing code
  limit?: number;
}

// API Error Types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ValidationError extends ApiError {
  field?: string;
  value?: unknown;
}

// Request Types
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

// Response Status Types
export type ResponseStatus = 'idle' | 'loading' | 'success' | 'error';

// Server Action Response Type
export interface ServerActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: ValidationError[];
}

// Zod Schemas for Runtime Validation
export const BaseApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export const PaginatedRequestSchema = z.object({
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export const SearchRequestSchema = PaginatedRequestSchema.extend({
  query: z.string().optional(),
  filters: z.record(z.unknown()).optional(),
});

// Helper Types are now in common.ts

// Form States
export interface FormState<T = Record<string, unknown>> {
  data: T;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isValid: boolean;
}

// Loading States
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface DataState<T> extends LoadingState {
  data: T | null;
}

// Export utility types
export type NonNullable<T> = T extends null | undefined ? never : T;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type Required<T, K extends keyof T> = T & { [P in K]-?: T[P] };
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};