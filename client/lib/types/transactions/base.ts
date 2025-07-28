import { Account } from "../accounts";
import { Category } from "../categories";
import { User } from "../user";

export interface CategorizationSettings {
  confidence_threshold: number;
  auto_categorize_on_upload: boolean;
  enabled_methods: string[];
}

export interface CategorySuggestion {
  category_id: string;
  category_name: string;
  confidence: number;
  match_method: string;
}

export interface MatchingStats {
  merchant_name: string;
  methods: Record<string, MethodStats>;
}

export interface MethodStats {
  best_score: number;
  match_count: number;
  best_category: string;
}

export interface CategorizationAnalysis {
  total_transactions: number;
  successful_categorizations: number;
  success_rate: number;
  method_stats: Record<string, number>;
  categorization_results: CategorizationResult[];
}

export interface CategorizationResult {
  description: string;
  result?: CategoryMatchResult;
  would_be_categorized: boolean;
}

export interface CategoryMatchResult {
  category_id: string;
  category_name: string;
  match_type: string;
  matched_text: string;
  confidence: number;
  similarity_type: string;
}

export interface CategorizationTestResponse {
  merchant_name: string;
  result?: CategoryMatchResult;
  stats?: MatchingStats;
  analysis_requested: boolean;
}

export interface CategorizationAnalysisResponse {
  success: boolean;
  data?: CategorizationAnalysis;
  error?: string;
}

export interface CategorizationSettingsResponse {
  success: boolean;
  data?: CategorizationSettings;
  error?: string;
}

export interface ImportSummary {
  total_transactions: number;
  successful_imports: number;
  failed_imports: number;
  duplicate_skips: number;
  categorization_stats: {
    auto_categorized: number;
    manually_categorized: number;
    uncategorized: number;
    average_confidence: number;
  };
  errors: string[];
  processing_time_ms: number;
}

// Transaction manager state types
export interface TransactionManagerState {
  transactions: TransactionListItem[];
  loading: boolean;
  error: string | null;
  filters: TransactionFilters;
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
  };
  bulkMode: {
    enabled: boolean;
    selectedIds: Set<string>;
  };
  categorization: {
    analysisData: CategorizationAnalysis | null;
    settings: CategorizationSettings | null;
    showAnalysis: boolean;
    showSettings: boolean;
  };
}

// Enhanced filters with categorization options
export interface EnhancedTransactionFilters extends TransactionFilters {
  has_category?: boolean;
  confidence_min?: number;
  confidence_max?: number;
  categorization_method?: string;
  needs_review?: boolean;
}

export interface CategorizationMethod {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  weight: number;
  confidence_threshold: number;
}

// Analytics data for categorization performance
export interface CategorizationAnalytics {
  overall_accuracy: number;
  method_performance: Record<
    string,
    {
      accuracy: number;
      usage_count: number;
      average_confidence: number;
    }
  >;
  category_distribution: Record<string, number>;
  uncategorized_trends: {
    common_patterns: string[];
    suggested_categories: string[];
  };
  user_correction_patterns: {
    frequently_corrected: Array<{
      original_category: string;
      corrected_to: string;
      frequency: number;
    }>;
  };
}

export interface Transaction {
  id: string;
  account_id: string;
  category_id?: string;
  transaction_date: string;
  description: string;
  amount: number;
  transaction_type: string;
  merchant_name?: string;
  memo?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface TransactionData {
  account_id: string;
  fit_id?: string;
  file_upload_id?: string; // Optional field for file upload ID
  category_id?: string;
  transaction_date: string;
  description: string;
  amount: number;
  transaction_type: "income" | "expense" | "transfer";
  merchant_name?: string;
  memo?: string;
  tags?: string[];
  currency: string; // Currency field
}

export interface TransactionFilters {
  page?: number;
  limit?: number;
  account_id?: string;
  category_id?: string;
  start_date?: string;
  end_date?: string;
  transaction_type?: string;
}

export interface TransactionStats {
  total_income: number;
  total_expenses: number;
  net_income: number;
  transaction_count: number;
  by_category: Array<{
    category_name: string;
    total_amount: number;
    transaction_count: number;
  }>;
  by_period: Array<{
    period: string;
    total_income: number;
    total_expenses: number;
    net_income: number;
  }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}
export interface TransactionsResponse extends PaginatedResponse<Transaction> {}


// export interface PagedTransactionData {
//   data: Transaction[];
//   total: number;
//   page: number;
//   pages: number;
// }

export interface EnhancedTransactionData extends TransactionData {
  suggested_category_id?: string;
  suggested_category_name?: string;
  categorization_confidence?: number;
  categorization_method?: string;
  manual_category_override?: boolean;
}

export interface TransactionsClientProps {
  initialData: TransactionsResponse;
  accounts: Account[];
  categories: Category[];
  user: User;
}

export interface TransactionFormProps {
  accounts: Account[];
  categories: Category[];
  onSubmit: (data: TransactionData) => Promise<void>;
  onCancel: () => void;
}

export interface TransactionListItem {
  id: string;
  account_id: string;
  category_id?: string;
  transaction_date: string;
  description: string;
  merchant_name?: string;
  amount: number;
  transaction_type: string;
  currency: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}
