// lib/types/common.ts - Basic shared types

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

// Helper types
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

// Status types
export type LoadingStatus = 'idle' | 'loading' | 'success' | 'error';

// Theme types
export type Theme = 'light' | 'dark' | 'system';

// Currency types
export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD';

// Transaction types (commonly used across the app)
export type TransactionType = 'income' | 'expense' | 'transfer';

// Account types
export type AccountType = 'checking' | 'savings' | 'credit' | 'investment' | 'other';

// Period types for analytics
export type AnalyticsPeriod = 'week' | 'month' | 'quarter' | 'year';

// Group by options for analytics
export type GroupByOption = 'category' | 'account' | 'date' | 'merchant';