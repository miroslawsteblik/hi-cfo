"use server";

import { apiClient } from "@/lib/api-client-enhanced";
import {
  TransactionData,
  TransactionStats,
  TransactionFilters,
  TransactionsData,
  CategorizationPreview,
  CategorizationAnalysis,
  CategorizationSettings,
} from "@/lib/types/transactions";
import { Account, AccountCreateData, AccountsResponse } from "@/lib/types/accounts";
import { Category, CategoriesResponse } from "@/lib/types/categories";
import { FinancialAppError, ErrorCode, ErrorLogger } from "@/lib/errors";

export async function createTransaction(data: TransactionData) {
  try {
    ErrorLogger.getInstance().logInfo("Creating transaction", { context: 'create_transaction', data });

    const transaction = await apiClient.post("/api/v1/transactions", data);

    ErrorLogger.getInstance().logInfo("Transaction created successfully", { context: 'create_transaction', transaction });
    return { success: true, transaction };
  } catch (error) {
    const appError = new FinancialAppError({
      code: ErrorCode.API_ERROR,
      message: 'Failed to create transaction',
      details: { originalError: error, context: 'create_transaction' }
    });
    await ErrorLogger.getInstance().logError(appError);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create transaction",
    };
  }
}

export async function getUserAccounts(): Promise<Account[]> {
  try {
    const accountsResponse = await apiClient.get<AccountsResponse>("/api/v1/accounts");

    // Handle paginated response format from backend
    if (accountsResponse.accounts && Array.isArray(accountsResponse.accounts)) {
      return accountsResponse.accounts;
    }

    // Fallback for other possible formats
    return [];
  } catch (error) {
    const appError = new FinancialAppError({
      code: ErrorCode.API_ERROR,
      message: 'Failed to fetch user accounts',
      details: { originalError: error, context: 'get_user_accounts' }
    });
    await ErrorLogger.getInstance().logError(appError);
    return [];
  }
}

// Get categories (system + user categories)
export async function getCategories(): Promise<Category[]> {
  try {
    const categoriesResponse = await apiClient.get<any>("/api/v1/categories");

    // Handle Go backend response structure: { data: [...], total, page, limit, pages }
    if (categoriesResponse && categoriesResponse.data && Array.isArray(categoriesResponse.data)) {
      return categoriesResponse.data;
    }

    // Handle CategoriesResponse structure with categories field (alternative API structure)
    if (categoriesResponse && categoriesResponse.categories && Array.isArray(categoriesResponse.categories)) {
      return categoriesResponse.categories;
    }

    // Fallback for direct array response
    if (Array.isArray(categoriesResponse)) {
      return categoriesResponse;
    }

    console.warn("Unexpected categories response structure:", categoriesResponse);
    return [];
  } catch (error) {
    await ErrorLogger.getInstance().logError(new FinancialAppError({
      code: ErrorCode.API_ERROR,
      message: 'Failed to fetch user categories',
      details: { originalError: error, context: 'get_user_categories' }
    }));
    return [];
  }
}

export async function getTransactions(params?: TransactionFilters) {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.account_id) queryParams.append("account_id", params.account_id);
    if (params?.category_id) queryParams.append("category_id", params.category_id);

    // Send date-only format (YYYY-MM-DD) which the backend now supports
    if (params?.start_date) {
      const startDate = params.start_date.split("T")[0];
      queryParams.append("start_date", startDate);
    }
    if (params?.end_date) {
      const endDate = params.end_date.split("T")[0];
      queryParams.append("end_date", endDate);
    }

    if (params?.transaction_type) queryParams.append("transaction_type", params.transaction_type);

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    const result = await apiClient.get<TransactionsData>(`/api/v1/transactions${query}`);

    return result;
  } catch (error) {
    await ErrorLogger.getInstance().logError(new FinancialAppError({
      code: ErrorCode.API_ERROR,
      message: 'Failed to fetch transactions',
      details: { originalError: error, context: 'get_transactions' }
    }));
    return { transactions: [], total: 0, page: 1, pages: 1 };
  }
}

// Update a transaction
export async function updateTransaction(id: string, data: Partial<TransactionData>) {
  try {
    const transaction = await apiClient.put(`/api/v1/transactions/${id}`, data);

    ErrorLogger.getInstance().logInfo("Transaction updated successfully", { context: 'update_transaction', transactionId: id });
    return { success: true, transaction };
  } catch (error) {
    await ErrorLogger.getInstance().logError(new FinancialAppError({
      code: ErrorCode.API_ERROR,
      message: 'Failed to update transaction',
      details: { originalError: error, context: 'update_transaction', transactionId: id }
    }));
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update transaction",
    };
  }
}

// Delete a transaction
export async function deleteTransaction(id: string) {
  try {
    await apiClient.delete(`/api/v1/transactions/${id}`);

    return { success: true };
  } catch (error) {
    console.error("❌ Failed to delete transaction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete transaction",
    };
  }
}

// ==================== BULK UPLOAD TRANSACTIONS ====================

export async function previewBulkCategorization(transactions: TransactionData[]): Promise<{
  success: boolean;
  data?: CategorizationPreview;
  error?: string;
}> {
  try {
    console.log("🔍 Previewing bulk categorization for", transactions.length, "transactions");

    const result = await apiClient.post<CategorizationPreview>("/api/v1/transactions/categorization/preview", { transactions });

    return { success: true, data: result };
  } catch (error) {
    console.error("❌ Failed to preview categorization:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to preview categorization",
    };
  }
}

export async function analyzeTransactionCategorization(descriptions: string[]): Promise<{
  success: boolean;
  data?: CategorizationAnalysis;
  error?: string;
}> {
  try {
    const result = await apiClient.post<CategorizationAnalysis>("/api/v1/transactions/categorization/analyze", { descriptions });

    return { success: true, data: result };
  } catch (error) {
    console.error("❌ Failed to analyze categorization:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to analyze categorization",
    };
  }
}

export async function testTransactionCategorization(
  merchantName: string,
  getStats = false
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const result = await apiClient.post("/api/v1/transactions/categorization/test", {
      merchant_name: merchantName,
      get_stats: getStats,
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("❌ Failed to test categorization:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to test categorization",
    };
  }
}

export async function getCategorizationSettings(): Promise<{
  success: boolean;
  data?: CategorizationSettings;
  error?: string;
}> {
  try {
    const result = await apiClient.get<CategorizationSettings>("/api/v1/transactions/categorization/settings");

    return { success: true, data: result };
  } catch (error) {
    console.error("❌ Failed to fetch categorization settings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch settings",
    };
  }
}

export async function updateCategorizationSettings(settings: Partial<CategorizationSettings>): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const result = await apiClient.put("/api/v1/transactions/categorization/settings", settings);

    return { success: true, data: result };
  } catch (error) {
    console.error("❌ Failed to update categorization settings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update settings",
    };
  }
}

export async function bulkCreateTransactionsWithCategorization(
  transactions: TransactionData[],
  categoryOverrides?: Record<number, string> // index -> category_id mapping
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    console.log("📦 Bulk creating transactions with categorization:", transactions.length);

    // Apply category overrides if provided
    if (categoryOverrides) {
      Object.entries(categoryOverrides).forEach(([indexStr, categoryId]) => {
        const index = parseInt(indexStr);
        if (index >= 0 && index < transactions.length) {
          transactions[index].category_id = categoryId;
        }
      });
    }

    if (!transactions || transactions.length === 0) {
      return { success: false, error: "No transactions provided" };
    }

    // Validate each transaction has required fields
    const validationErrors = [];
    for (let i = 0; i < transactions.length; i++) {
      const txn = transactions[i];
      if (!txn.account_id) {
        validationErrors.push(`Transaction ${i + 1}: Missing account_id`);
      }
      if (!txn.transaction_date) {
        validationErrors.push(`Transaction ${i + 1}: Missing transaction_date`);
      }
      if (!txn.description) {
        validationErrors.push(`Transaction ${i + 1}: Missing description`);
      }
      if (txn.amount === undefined || txn.amount === null) {
        validationErrors.push(`Transaction ${i + 1}: Missing amount`);
      }
      if (!txn.transaction_type) {
        validationErrors.push(`Transaction ${i + 1}: Missing transaction_type`);
      }
    }

    if (validationErrors.length > 0) {
      return { success: false, error: validationErrors.join(", ") };
    }

    try {
      const result = await apiClient.post<any>("/api/v1/transactions/bulk", { transactions });

      // Handle different success scenarios
      // 206 status typically indicates partial success (some created, some duplicates)
      if (result.data) {
        // If we have structured data with created/duplicates info
        const created = result.data.created || 0;
        const skipped = result.data.skipped || 0;

        return {
          success: created > 0 || (created === 0 && skipped > 0), // Success if any created OR all duplicates
          data: result.data,
        };
      }

      return { success: true, data: result };
    } catch (apiError) {
      // Handle 400 responses with duplicate data as valid business responses
      if (apiError instanceof Error && apiError.message.includes("API Error: 400")) {
        try {
          const errorText = apiError.message.split(" - ")[1];
          const errorData = JSON.parse(errorText);

          console.log("📊 Handling 400 response as business data:", errorData);

          // Check if this is a valid duplicate scenario
          if (errorData.data && errorData.data.duplicates && Array.isArray(errorData.data.duplicates)) {
            // This is a valid business response (all/some duplicates), not an error
            return {
              success: errorData.data.created > 0, // Success if some were created
              data: errorData.data,
            };
          }
        } catch (parseError) {
          console.error("❌ Failed to parse 400 response:", parseError);
        }
      }

      // Re-throw other API errors
      throw apiError;
    }
  } catch (error) {
    console.error("❌ Failed to bulk create transactions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create transactions",
    };
  }
}

// Bulk create transactions (legacy function for backward compatibility)
export async function bulkCreateTransactions(transactions: TransactionData[]) {
  return bulkCreateTransactionsWithCategorization(transactions);
}

// Create a new account
export async function createAccount(data: AccountCreateData) {
  try {
    console.log("🏦 Creating account:", data);

    const account = await apiClient.post("/api/v1/accounts", data);

    console.log("✅ Account created:", account);
    return { success: true, account };
  } catch (error) {
    console.error("❌ Failed to create account:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create account",
    };
  }
}

// Get transaction statistics for dashboard
export async function getTransactionStats(params?: {
  start_date?: string;
  end_date?: string;
  groupBy?: "day" | "week" | "month" | "category";
}): Promise<TransactionStats> {
  try {
    console.log("📊 Fetching transaction stats:", params);

    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append("start_date", params.start_date);
    if (params?.end_date) queryParams.append("end_date", params.end_date);
    if (params?.groupBy) queryParams.append("group_by", params.groupBy);

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    const stats = await apiClient.get<TransactionStats>(`/api/v1/transactions/stats${query}`);

    console.log("✅ Transaction stats fetched");
    return stats;
  } catch (error) {
    console.error("❌ Failed to fetch transaction stats:", error);
    return {
      total_income: 0,
      total_expenses: 0,
      net_income: 0,
      transaction_count: 0,
      by_category: [],
      by_period: [],
    };
  }
}
