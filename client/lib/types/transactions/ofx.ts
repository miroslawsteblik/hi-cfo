
import { Account } from '../accounts';
import { Category } from '../categories';


export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ==========================================
// DOMAIN/DATA INTERFACES (Pure business data)
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
  fileUploadId?: string; // Optional field for file upload ID
  referenceNumber?: string; // Optional field for reference number
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



// ==========================================
// CATEGORIZATION INTERFACES
// ==========================================

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

export interface CategorizationPreview {
  total_transactions: number;
  will_be_categorized: number;
  success_rate: number;
  previews: TransactionPreview[];
}

// ==========================================
// BULK OPERATIONS INTERFACES
// ==========================================

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
// COMPOSED API RESPONSE TYPES
// ==========================================

export type ParseOFXResponse = ApiResponse<ParsedOFX>;
export type BulkCategorizationResponse = ApiResponse<CategorizationPreview>;
export type EnhancedBulkUploadResponse = ApiResponse<BulkUploadResponse>;
export type BulkCategorizationPreviewResponse = ApiResponse<CategorizationPreview>;


// ==========================================
// UTILITY TYPES
// ==========================================
export type ImportStep = "upload" | "preview" | "categorization" | "importing" | "result";

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