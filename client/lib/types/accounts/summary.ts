import { User } from '../user';
import { Account } from '../accounts';

export interface AccountsData {
  accounts: Account[];
  total: number;
  page: number;
  limit: number;
  pages: number;
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

export interface AccountsClientProps {
  initialData: AccountsData;
  summary: AccountSummary;
  user: User;
}

export interface AccountSummary {
  total_accounts: number;
  total_balance: number;
  active_accounts: number;
  inactive_accounts: number;
  by_type: AccountTypeStats[];
}

