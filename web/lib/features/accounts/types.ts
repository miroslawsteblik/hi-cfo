// Re-export PaginatedResponse type for consistency
import type { PaginatedResponse } from '@/lib/shared/types';

export interface Account {
  id: string;
  account_name: string;
  account_type: string;
  bank_name: string;
  account_number_masked?: string;
  routing_number?: string;
  is_active: boolean;
  current_balance?: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface AccountsResponse extends PaginatedResponse<Account> {}

export interface AccountFilter {
  page?: number;
  limit?: number;
  account_type?: string;
  is_active?: boolean;
  search?: string;
}

export interface AccountSummary {
  total_accounts: number;
  total_balance: number;
  active_accounts: number;
  inactive_accounts: number;
  by_type: AccountTypeStats[];
}

export interface AccountTypeStats {
  account_type: string;
  count: number;
  total_balance: number;
}