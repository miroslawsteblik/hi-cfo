// Re-export shared types for consistency
import type { PaginatedResponse, Currency } from '@/lib/shared/types';
import type { Account } from '@/lib/features/accounts/types';
import type { Category } from '@/lib/features/categories/types';
import type { User } from '@/lib/shared/types';

// ==========================================
// CORE TRANSACTION INTERFACES
// ==========================================

export interface Transaction {
  id: string;
  account_id: string;
  category_id?: string;
  transaction_date: string;
  description: string;
  amount: number;
  currency: Currency;
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
  file_upload_id?: string;
  category_id?: string;
  transaction_date: string;
  description: string;
  amount: number;
  transaction_type: "income" | "expense" | "transfer";
  merchant_name?: string;
  memo?: string;
  tags?: string[];
  currency: string;
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

export interface TransactionFilters {
  page?: number;
  limit?: number;
  account_id?: string;
  category_id?: string;
  start_date?: string;
  end_date?: string;
  transaction_type?: string;
}

export interface EnhancedTransactionFilters extends TransactionFilters {
  has_category?: boolean;
  confidence_min?: number;
  confidence_max?: number;
  categorization_method?: string;
  needs_review?: boolean;
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

export interface TransactionsResponse extends PaginatedResponse<Transaction> {}

// ==========================================
// CATEGORIZATION INTERFACES
// ==========================================

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

export interface CategorizationPreview {
  total_transactions: number;
  will_be_categorized: number;
  success_rate: number;
  previews: TransactionPreview[];
}

export interface TransactionPreview {
  index: number;
  description: string;
  merchant_name?: string;
  original_category?: string;
  suggested_category?: string;
  suggested_category_name?: string;
  confidence: number;
  match_method: string;
  will_be_categorized: boolean;
}

// ==========================================
// OFX/IMPORT INTERFACES
// ==========================================

export interface OFXTransaction {
  trnType: string;
  dtPosted: string;
  amount: number;
  fit_id: string;
  name: string;
  memo?: string;
  checkNum?: string;
  currency?: string;
  fileUploadId?: string;
  referenceNumber?: string;
}

export interface OFXAccount {
  bankId: string;
  acctId: string;
  acctType: string;
}

export interface OFXStatement {
  account: OFXAccount;
  transactions: OFXTransaction[];
  dtStart: string;
  dtEnd: string;
}

export interface ParsedOFX {
  statement: OFXStatement;
  header: Record<string, string>;
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

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  duplicates: string[];
  categorization_summary?: {
    auto_categorized: number;
    manually_assigned: number;
    uncategorized: number;
  };
}

export interface BulkUploadResponse {
  created: number;
  skipped: number;
  errors: string[];
  duplicates: string[];
  categorization_summary?: {
    auto_categorized: number;
    manually_assigned: number;
    uncategorized: number;
  };
}

// ==========================================
// UI/COMPONENT INTERFACES
// ==========================================

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

export interface OFXImportProps {
  accounts: Account[];
  categories: Category[];
  onSuccess: () => void;
  onCancel: () => void;
}

export interface PreviewTransaction {
  original: OFXTransaction;
  selected: boolean;
  index: number;
}

export interface EnhancedOFXImportProps extends OFXImportProps {
  enableSmartCategorization?: boolean;
  confidenceThreshold?: number;
}

export interface EnhancedPreviewTransaction extends PreviewTransaction {
  categorizationPreview?: TransactionPreview;
  manualCategoryId?: string;
  suggestionApplied?: boolean;
}

// ==========================================
// UTILITY TYPES
// ==========================================

export type ImportStep = "upload" | "preview" | "categorization" | "importing" | "result";

// ==========================================
// API RESPONSE TYPES
// ==========================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
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

export type ParseOFXResponse = ApiResponse<ParsedOFX>;
export type BulkCategorizationResponse = ApiResponse<CategorizationPreview>;
export type EnhancedBulkUploadResponse = ApiResponse<BulkUploadResponse>;
export type BulkCategorizationPreviewResponse = ApiResponse<CategorizationPreview>;