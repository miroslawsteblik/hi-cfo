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

export interface AccountCreateData {
  account_name: string;
  account_type: string;
  bank_name: string;
  account_number_masked?: string;
  current_balance?: number;
}

export interface AccountData {
  account_name: string;
  account_type: string;
  bank_name: string;
  account_number_masked?: string;
  routing_number?: string;
  current_balance?: number;
  currency?: string;
}

export interface AccountsResponse {
  accounts: Account[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface AccountFormProps {
  onSubmit: (data: AccountFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<AccountFormData>;
  isEdit?: boolean;
}

export interface AccountFormData {
  account_name: string;
  account_type: string;
  bank_name: string;
  account_number_masked?: string;
  routing_number?: string;
  current_balance?: number;
  currency?: string;
}