
"use server";

import { apiClient } from "@/lib/api-client-enhanced";
import { Account, AccountSummary, AccountFilter, AccountsResponse } from "@/lib/types/accounts";
import { FinancialAppError, ErrorCode, ErrorLogger } from "@/lib/errors";

export async function createAccount(data: Partial<Account>): Promise<{ success: boolean; account?: Account; error?: string }> {
  try {
    // Validate required fields
    const requiredFields = ['account_name', 'account_type', 'bank_name', 'currency'];
    const missingFields = requiredFields.filter(field => !data[field as keyof Account]);
    
    if (missingFields.length > 0) {
      const error = `Missing required fields: ${missingFields.join(', ')}`;
      await ErrorLogger.getInstance().logError(
        new FinancialAppError({
          code: ErrorCode.VALIDATION_ERROR,
          message: error,
          details: { missingFields, context: 'create_account' }
        })
      );
      return { success: false, error };
    }

    const account = await apiClient.post<Account>("/api/v1/accounts", data);

    ErrorLogger.getInstance().logInfo("Account created successfully", { context: 'create_account', accountId: account.id });
    return { success: true, account };
  } catch (error) {
    const appError = new FinancialAppError({
      code: ErrorCode.API_ERROR,
      message: 'Failed to create account',
      details: { originalError: error, context: 'create_account' }
    });
    await ErrorLogger.getInstance().logError(appError);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create account",
    };
  }
}

// Get user's accounts with filtering and pagination
export async function getAccounts(params?: AccountFilter): Promise<{ success: boolean; data?: AccountsResponse; error?: string }> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.account_type) queryParams.append("account_type", params.account_type);
    if (params?.is_active !== undefined) queryParams.append("is_active", params.is_active.toString());
    if (params?.search) queryParams.append("search", params.search);

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    const result = await apiClient.get<AccountsResponse>(`/api/v1/accounts${query}`);

    return { success: true, data: result };
  } catch (error) {
    const appError = new FinancialAppError({
      code: ErrorCode.API_ERROR,
      message: "Failed to fetch accounts",
      details: { originalError: error, context: "get_accounts" },
    });
    await ErrorLogger.getInstance().logError(appError);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch accounts",
    };
  }
}

export async function getAccountSummary(): Promise<AccountSummary> {
  try {
    const result = await apiClient.get<AccountSummary>("/api/v1/accounts/summary");

    return (
      result ?? {
        total_accounts: 0,
        total_balance: 0,
        active_accounts: 0,
        inactive_accounts: 0,
        by_type: [],
      }
    );
  } catch (error) {
    const appError = new FinancialAppError({
      code: ErrorCode.API_ERROR,
      message: 'Failed to fetch account summary',
      details: { originalError: error, context: 'get_account_summary' }
    });
    await ErrorLogger.getInstance().logError(appError);
    return {
      total_accounts: 0,
      total_balance: 0,
      active_accounts: 0,
      inactive_accounts: 0,
      by_type: [],
    };
  }
}

export async function getAccount(id: string): Promise<{ success: boolean; account?: Account; error?: string }> {
  try {
    ErrorLogger.getInstance().logInfo("Fetching account", { context: 'get_account', accountId: id });

    const account = await apiClient.get<Account>(`/api/v1/accounts/${id}`);

    ErrorLogger.getInstance().logInfo("Account fetched successfully", { context: 'get_account', accountId: id });
    return { success: true, account };
  } catch (error) {
    const appError = new FinancialAppError({
      code: ErrorCode.API_ERROR,
      message: 'Failed to fetch account',
      details: { originalError: error, context: 'get_account', accountId: id }
    });
    await ErrorLogger.getInstance().logError(appError);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch account",
    };
  }
}

export async function updateAccount(id: string, request: Partial<Account>) {
  try {
    ErrorLogger.getInstance().logInfo("Updating account", { context: 'update_account', accountId: id });

    const account = await apiClient.put<Account>(`/api/v1/accounts/${id}`, request);

    ErrorLogger.getInstance().logInfo("Account updated successfully", { context: 'update_account', accountId: id });
    return { success: true, account };
  } catch (error) {
    const appError = new FinancialAppError({
      code: ErrorCode.API_ERROR,
      message: 'Failed to update account',
      details: { originalError: error, context: 'update_account', accountId: id }
    });
    await ErrorLogger.getInstance().logError(appError);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update account",
    };
  }
}

export async function deleteAccount(id: string) {
  try {
    ErrorLogger.getInstance().logInfo("Deleting account", { context: 'delete_account', accountId: id });

    await apiClient.delete(`/api/v1/accounts/${id}`);

    ErrorLogger.getInstance().logInfo("Account deleted successfully", { context: 'delete_account', accountId: id });
    return { success: true };
  } catch (error) {
    const appError = new FinancialAppError({
      code: ErrorCode.API_ERROR,
      message: 'Failed to delete account',
      details: { originalError: error, context: 'delete_account', accountId: id }
    });
    await ErrorLogger.getInstance().logError(appError);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete account",
    };
  }
}
