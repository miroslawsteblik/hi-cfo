// lib/types.ts

// export interface User {
//   id: string;
//   email: string;
//   first_name?: string;
//   last_name?: string;
// }

// ======== Transaction Types ======== //

// export interface Transaction {
//   id: string;
//   account_id: string;
//   category_id?: string;
//   transaction_date: string;
//   description: string;
//   amount: number;
//   transaction_type: string;
//   merchant_name?: string;
//   memo?: string;
//   tags?: string[];
//   created_at: string;
//   updated_at: string;
// }

// export interface TransactionData {
//   account_id: string;
//   fit_id?: string;
//   file_upload_id?: string; // Optional field for file upload ID
//   category_id?: string;
//   transaction_date: string;
//   description: string;
//   amount: number;
//   transaction_type: "income" | "expense" | "transfer";
//   merchant_name?: string;
//   memo?: string;
//   tags?: string[];
//   currency: string; // Currency field
// }

// export interface TransactionFilters {
//   page?: number;
//   limit?: number;
//   account_id?: string;
//   category_id?: string;
//   start_date?: string;
//   end_date?: string;
//   transaction_type?: string;
// }

// export interface TransactionStats {
//   total_income: number;
//   total_expenses: number;
//   net_income: number;
//   transaction_count: number;
//   by_category: Array<{
//     category_name: string;
//     total_amount: number;
//     transaction_count: number;
//   }>;
//   by_period: Array<{
//     period: string;
//     total_income: number;
//     total_expenses: number;
//     net_income: number;
//   }>;
// }

// export interface TransactionsData {
//   transactions: Transaction[];
//   total: number;
//   page: number;
//   pages: number;
// }

// export interface EnhancedTransactionData extends TransactionData {
//   suggested_category_id?: string;
//   suggested_category_name?: string;
//   categorization_confidence?: number;
//   categorization_method?: string;
//   manual_category_override?: boolean;
// }

// export interface TransactionsClientProps {
//   initialData: TransactionsData;
//   accounts: Account[];
//   categories: Category[];
//   user: User;
// }

// export interface TransactionFormProps {
//   accounts: Account[];
//   categories: Category[];
//   onSubmit: (data: TransactionData) => Promise<void>;
//   onCancel: () => void;
// }

// export interface TransactionPreview {
//   index: number;
//   description: string;
//   merchant_name?: string;
//   original_category?: string;
//   suggested_category?: string;
//   suggested_category_name?: string;
//   confidence: number;
//   match_method: string;
//   will_be_categorized: boolean;
// }

// export interface TransactionManagerProps {
//   initialData: any;
//   accounts: Account[];
//   categories: Category[];
//   user: User;
// }

// export interface TransactionListItem {
//   id: string;
//   account_id: string;
//   category_id?: string;
//   transaction_date: string;
//   description: string;
//   merchant_name?: string;
//   amount: number;
//   transaction_type: string;
//   currency: string;
//   tags?: string[];
//   created_at: string;
//   updated_at: string;
// }

// export interface OFXTransaction {
//   trnType: string;
//   dtPosted: string;
//   amount: number;
//   fitId: string;
//   name: string;
//   memo?: string;
//   checkNum?: string;
//   currency?: string;
//   fileUploadId?: string; // Optional field for file upload ID
//   referenceNumber?: string; // Optional field for reference number
// }

// export interface OFXAccount {
//   bankId: string;
//   acctId: string;
//   acctType: string;
// }

// export interface OFXStatement {
//   account: OFXAccount;
//   transactions: OFXTransaction[];
//   dtStart: string;
//   dtEnd: string;
// }

// export interface ParsedOFX {
//   statement: OFXStatement;
//   header: Record<string, string>;
// }

// export interface OFXImportProps {
//   accounts: Account[];
//   categories: Category[];
//   onSuccess: () => void;
//   onCancel: () => void;
// }

// export interface PreviewTransaction {
//   original: OFXTransaction;
//   selected: boolean;
//   index: number;
// }

// export interface EnhancedBulkUploadResponse {
//   success: boolean;
//   created: number;
//   skipped: number;
//   errors: string[];
//   duplicates: string[];
//   categorization_summary?: {
//     auto_categorized: number;
//     manually_assigned: number;
//     uncategorized: number;
//   };
// }

// export interface EnhancedOFXImportProps extends OFXImportProps {
//   enableSmartCategorization?: boolean;
//   confidenceThreshold?: number;
// }

// export interface EnhancedPreviewTransaction extends PreviewTransaction {
//   categorizationPreview?: TransactionPreview;
//   manualCategoryId?: string;
//   suggestionApplied?: boolean;
// }

// ======== Category Types ======== //

// export interface CategoryData {
//   name: string;
//   description?: string;
//   color?: string;
//   icon?: string;
//   category_type: string;
//   keywords?: string[];
//   merchant_patterns?: string[];
// }

// export interface CategoriesData {
//   categories: Category[];
//   total: number;
//   page: number;
//   limit: number;
//   pages: number;
// }

// export interface CategoriesClientProps {
//   initialData: CategoriesData;
//   user: User;
// }

// export interface Category {
//   id: string;
//   name: string;
//   description?: string;
//   color?: string;
//   icon?: string;
//   category_type: string;
//   is_system_category: boolean;
//   is_active: boolean;
//   keywords?: string[];
//   merchant_patterns?: string[];
//   created_at: string;
//   updated_at: string;
// }

// export interface CategoriesResponse {
//   categories: Category[];
//   total: number;
//   page: number;
//   limit: number;
//   pages: number;
// }

// export interface CategoryMatchResult {
//   category_id: string;
//   category_name: string;
//   match_type: string;
//   matched_text: string;
//   confidence: number;
//   similarity_type: string;
// }

// export interface CategorizationPreview {
//   total_transactions: number;
//   will_be_categorized: number;
//   success_rate: number;
//   previews: TransactionPreview[];
// }

// export interface CategorizationAnalysis {
//   total_transactions: number;
//   successful_categorizations: number;
//   success_rate: number;
//   method_stats: Record<string, number>;
//   categorization_results: CategorizationResult[];
// }

// export interface CategorizationResult {
//   description: string;
//   result?: CategoryMatchResult;
//   would_be_categorized: boolean;
// }

// export interface CategorizationSettings {
//   confidence_threshold: number;
//   auto_categorize_on_upload: boolean;
//   enabled_methods: string[];
// }

// export interface CategorySuggestion {
//   category_id: string;
//   category_name: string;
//   confidence: number;
//   match_method: string;
// }

// export interface CategoryAssignmentProps {
//   categories: Category[];
//   selectedCategoryId?: string;
//   merchantName?: string;
//   description?: string;
//   showSuggestion?: boolean;
//   onCategoryChange: (categoryId: string) => void;
//   disabled?: boolean;
//   size?: "sm" | "md" | "lg";
// }

// export interface MatchingStats {
//   merchant_name: string;
//   methods: Record<string, MethodStats>;
// }

// export interface MethodStats {
//   best_score: number;
//   match_count: number;
//   best_category: string;
// }

// export interface SmartCategorizationConfig {
//   enabled: boolean;
//   confidence_threshold: number;
//   auto_apply_high_confidence: boolean;
//   show_suggestions: boolean;
//   enabled_methods: string[];
// }

// export interface CategorizationTestResponse {
//   merchant_name: string;
//   result?: CategoryMatchResult;
//   stats?: MatchingStats;
//   analysis_requested: boolean;
// }

// export interface BulkCategorizationPreviewResponse {
//   success: boolean;
//   data?: CategorizationPreview;
//   error?: string;
// }

// export interface CategorizationAnalysisResponse {
//   success: boolean;
//   data?: CategorizationAnalysis;
//   error?: string;
// }

// export interface CategorizationSettingsResponse {
//   success: boolean;
//   data?: CategorizationSettings;
//   error?: string;
// }

// export interface ImportSummary {
//   total_transactions: number;
//   successful_imports: number;
//   failed_imports: number;
//   duplicate_skips: number;
//   categorization_stats: {
//     auto_categorized: number;
//     manually_categorized: number;
//     uncategorized: number;
//     average_confidence: number;
//   };
//   errors: string[];
//   processing_time_ms: number;
// }

// // Transaction manager state types
// export interface TransactionManagerState {
//   transactions: TransactionListItem[];
//   loading: boolean;
//   error: string | null;
//   filters: TransactionFilters;
//   pagination: {
//     current_page: number;
//     total_pages: number;
//     total_items: number;
//     items_per_page: number;
//   };
//   bulkMode: {
//     enabled: boolean;
//     selectedIds: Set<string>;
//   };
//   categorization: {
//     analysisData: CategorizationAnalysis | null;
//     settings: CategorizationSettings | null;
//     showAnalysis: boolean;
//     showSettings: boolean;
//   };
// }

// // Enhanced filters with categorization options
// export interface EnhancedTransactionFilters extends TransactionFilters {
//   has_category?: boolean;
//   confidence_min?: number;
//   confidence_max?: number;
//   categorization_method?: string;
//   needs_review?: boolean;
// }

// export interface CategorizationMethod {
//   id: string;
//   name: string;
//   description: string;
//   enabled: boolean;
//   weight: number;
//   confidence_threshold: number;
// }

// // Analytics data for categorization performance
// export interface CategorizationAnalytics {
//   overall_accuracy: number;
//   method_performance: Record<
//     string,
//     {
//       accuracy: number;
//       usage_count: number;
//       average_confidence: number;
//     }
//   >;
//   category_distribution: Record<string, number>;
//   uncategorized_trends: {
//     common_patterns: string[];
//     suggested_categories: string[];
//   };
//   user_correction_patterns: {
//     frequently_corrected: Array<{
//       original_category: string;
//       corrected_to: string;
//       frequency: number;
//     }>;
//   };
// }

// export interface SmartSuggestionConfig {
//   enabled: boolean;
//   show_confidence_scores: boolean;
//   show_match_method: boolean;
//   auto_apply_threshold: number;
//   suggestion_sources: string[];
//   learning_enabled: boolean;
// }

// // User preferences for categorization
// export interface UserCategorizationPreferences {
//   user_id: string;
//   auto_categorize_on_import: boolean;
//   confidence_threshold: number;
//   preferred_methods: string[];
//   custom_rules: Array<{
//     pattern: string;
//     category_id: string;
//     priority: number;
//   }>;
//   notification_settings: {
//     notify_on_low_confidence: boolean;
//     notify_on_new_patterns: boolean;
//     weekly_summary: boolean;
//   };
// }

// ======== Account Types ======== //
// export interface Account {
//   id: string;
//   account_name: string;
//   account_type: string;
//   bank_name: string;
//   account_number_masked?: string;
//   routing_number?: string;
//   is_active: boolean;
//   current_balance?: number;
//   currency: string;
//   created_at: string;
//   updated_at: string;
// }

// export interface AccountCreateData {
//   account_name: string;
//   account_type: string;
//   bank_name: string;
//   account_number_masked?: string;
//   current_balance?: number;
// }

// export interface AccountsResponse {
//   accounts: Account[];
//   total: number;
//   page: number;
//   limit: number;
//   pages: number;
// }

// export interface AccountSummary {
//   total_accounts: number;
//   total_balance: number;
//   active_accounts: number;
//   inactive_accounts: number;
//   by_type: AccountTypeStats[];
// }

// export interface AccountTypeStats {
//   account_type: string;
//   count: number;
//   total_balance: number;
// }

// export interface AccountData {
//   account_name: string;
//   account_type: string;
//   bank_name: string;
//   account_number_masked?: string;
//   routing_number?: string;
//   current_balance?: number;
//   currency?: string;
// }

// export interface AccountsData {
//   accounts: Account[];
//   total: number;
//   page: number;
//   limit: number;
//   pages: number;
// }

// export interface AccountSummary {
//   total_accounts: number;
//   total_balance: number;
//   active_accounts: number;
//   inactive_accounts: number;
//   by_type: AccountTypeStats[];
// }

// export interface AccountTypeStats {
//   account_type: string;
//   count: number;
//   total_balance: number;
// }

// export interface AccountsClientProps {
//   initialData: AccountsData;
//   summary: AccountSummary;
//   user: User;
// }
