// lib/accounts/actions.ts
"use server";

import { authenticatedFetch } from "@/lib/api-client";
import { AccountData, Account, AccountsResponse, AccountSummary } from "@/lib/types/accounts";

export async function createAccount(data: AccountData) {
  try {
    const account = await authenticatedFetch("/api/v1/accounts", {
      method: "POST",
      body: JSON.stringify(data),
    });

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

// Get user's accounts with filtering and pagination
export async function getAccounts(params?: {
  page?: number;
  limit?: number;
  account_type?: string;
  is_active?: boolean;
  search?: string;
}): Promise<AccountsResponse> {
  try {
    console.log("🏦 Fetching accounts with params:", params);

    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.account_type) queryParams.append("account_type", params.account_type);
    if (params?.is_active !== undefined) queryParams.append("is_active", params.is_active.toString());
    if (params?.search) queryParams.append("search", params.search);

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    const result = await authenticatedFetch(`/api/v1/accounts${query}`);

    // Backend returns: { success, data: [...], total, page, limit, pages }
    if (result && Array.isArray(result.data)) {
      console.log("✅ Accounts fetched:", result.data.length);
      return {
        accounts: result.data,
        total: result.total ?? 0,
        page: result.page ?? 1,
        limit: result.limit ?? 20,
        pages: result.pages ?? 1,
      };
    }
    // Defensive fallback
    return {
      accounts: [],
      total: 0,
      page: 1,
      limit: 20,
      pages: 1,
    };
  } catch (error) {
    console.error("❌ Failed to fetch accounts:", error);
    return { accounts: [], total: 0, page: 1, limit: 20, pages: 1 };
  }
}

export async function getAccountSummary(): Promise<AccountSummary> {
  try {
    console.log("📊 Fetching account summary...");

    const result = await authenticatedFetch("/api/v1/accounts/summary");

    console.log("✅ Account summary fetched");
    return (
      result?.data ?? {
        total_accounts: 0,
        total_balance: 0,
        active_accounts: 0,
        inactive_accounts: 0,
        by_type: [],
      }
    );
  } catch (error) {
    console.error("❌ Failed to fetch account summary:", error);
    return {
      total_accounts: 0,
      total_balance: 0,
      active_accounts: 0,
      inactive_accounts: 0,
      by_type: [],
    };
  }
}

export async function getAccount(id: string) {
  try {
    console.log("🏦 Fetching account:", id);

    const account = await authenticatedFetch(`/api/v1/accounts/${id}`);

    console.log("✅ Account fetched:", account);
    return { success: true, account };
  } catch (error) {
    console.error("❌ Failed to fetch account:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch account",
    };
  }
}

export async function updateAccount(id: string, data: Partial<AccountData>) {
  try {
    console.log("✏️ Updating account:", id, data);

    const account = await authenticatedFetch(`/api/v1/accounts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });

    console.log("✅ Account updated:", account);
    return { success: true, account };
  } catch (error) {
    console.error("❌ Failed to update account:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update account",
    };
  }
}

export async function deleteAccount(id: string) {
  try {
    console.log("🗑️ Deleting account:", id);

    await authenticatedFetch(`/api/v1/accounts/${id}`, {
      method: "DELETE",
    });

    console.log("✅ Account deleted");
    return { success: true };
  } catch (error) {
    console.error("❌ Failed to delete account:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete account",
    };
  }
}
