
"use server";

import { apiClient } from "@/lib/api-client-enhanced";
import { CategoryData, Category, CategoriesResponse, CategoryFilter } from "@/lib/types/categories";
import { CategoryMatchResult } from "@/lib/types/transactions";
import { FinancialAppError, ErrorCode, ErrorLogger } from "@/lib/errors";
export async function createCategory(data: CategoryData) {
  try {
    ErrorLogger.getInstance().logInfo("Creating category", { context: 'create_category', data });

    const category = await apiClient.post("/api/v1/categories", data);

    ErrorLogger.getInstance().logInfo("Category created successfully", { context: 'create_category', category });
    return { success: true, category };
  } catch (error) {
    const appError = new FinancialAppError({
      code: ErrorCode.API_ERROR,
      message: 'Failed to create category',
      details: { originalError: error, context: 'create_category' }
    });
    await ErrorLogger.getInstance().logError(appError);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create category",
    };
  }
}

// Get categories with filtering and pagination
export async function getCategories(params?: CategoryFilter): Promise<CategoriesResponse> {
  try {
    ErrorLogger.getInstance().logInfo("Fetching categories", { context: 'get_categories', params });

    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.category_type) queryParams.append("category_type", params.category_type);
    if (params?.is_system_category !== undefined)
      queryParams.append("is_system_category", params.is_system_category.toString());
    if (params?.is_active !== undefined)
      queryParams.append("is_active", params.is_active.toString());
    if (params?.search) queryParams.append("search", params.search);

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    const result = await apiClient.get<CategoriesResponse>(`/api/v1/categories${query}`);

    ErrorLogger.getInstance().logInfo("Categories fetched successfully", { context: 'get_categories', count: result.data?.length || 0 });
    return result;
  } catch (error) {
    const appError = new FinancialAppError({
      code: ErrorCode.API_ERROR,
      message: 'Failed to fetch categories',
      details: { originalError: error, context: 'get_categories' }
    });
    await ErrorLogger.getInstance().logError(appError);
    return { data: [], total: 0, page: 1, limit: 20, pages: 1 };
  }
}

// Get categories (simple list for dropdowns)
export async function getCategoriesSimple(categoryType?: string): Promise<Category[]> {
  try {
    ErrorLogger.getInstance().logInfo("Fetching simple categories list", { context: 'get_categories_simple', categoryType });

    const queryParams = new URLSearchParams();
    if (categoryType) queryParams.append("category_type", categoryType);
    queryParams.append("is_active", "true");

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    const categories = await apiClient.get<Category[]>(`/api/v1/categories/simple${query}`);

    ErrorLogger.getInstance().logInfo("Simple categories fetched successfully", { context: 'get_categories_simple', count: categories?.length || 0 });
    return categories || [];
  } catch (error) {
    const appError = new FinancialAppError({
      code: ErrorCode.API_ERROR,
      message: 'Failed to fetch simple categories',
      details: { originalError: error, context: 'get_categories_simple' }
    });
    await ErrorLogger.getInstance().logError(appError);
    return [];
  }
}

// Get single category by ID
export async function getCategory(id: string) {
  try {
    ErrorLogger.getInstance().logInfo("Fetching category", { context: 'get_category', categoryId: id });

    const category = await apiClient.get(`/api/v1/categories/${id}`);

    ErrorLogger.getInstance().logInfo("Category fetched successfully", { context: 'get_category', categoryId: id });
    return { success: true, category };
  } catch (error) {
    const appError = new FinancialAppError({
      code: ErrorCode.API_ERROR,
      message: 'Failed to fetch category',
      details: { originalError: error, context: 'get_category', categoryId: id }
    });
    await ErrorLogger.getInstance().logError(appError);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch category",
    };
  }
}

// Update a category
export async function updateCategory(id: string, data: Partial<CategoryData>) {
  try {
    ErrorLogger.getInstance().logInfo("Updating category", { context: 'update_category', categoryId: id, data });

    const category = await apiClient.put(`/api/v1/categories/${id}`, data);

    ErrorLogger.getInstance().logInfo("Category updated successfully", { context: 'update_category', categoryId: id });
    return { success: true, category };
  } catch (error) {
    const appError = new FinancialAppError({
      code: ErrorCode.API_ERROR,
      message: 'Failed to update category',
      details: { originalError: error, context: 'update_category', categoryId: id }
    });
    await ErrorLogger.getInstance().logError(appError);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update category",
    };
  }
}

// Delete a category
export async function deleteCategory(id: string) {
  try {
    ErrorLogger.getInstance().logInfo("Deleting category", { context: 'delete_category', categoryId: id });

    await apiClient.delete(`/api/v1/categories/${id}`);

    ErrorLogger.getInstance().logInfo("Category deleted successfully", { context: 'delete_category', categoryId: id });
    return { success: true };
  } catch (error) {
    const appError = new FinancialAppError({
      code: ErrorCode.API_ERROR,
      message: 'Failed to delete category',
      details: { originalError: error, context: 'delete_category', categoryId: id }
    });
    await ErrorLogger.getInstance().logError(appError);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete category",
    };
  }
}

// Auto-categorize based on merchant name
export async function autoCategorizeTransaction(
  merchantName: string
): Promise<CategoryMatchResult | null> {
  try {
    ErrorLogger.getInstance().logInfo("Auto-categorizing merchant", { context: 'auto_categorize', merchantName });

    const result = await apiClient.post<CategoryMatchResult>("/api/v1/categories/auto-categorize", { merchant_name: merchantName });

    ErrorLogger.getInstance().logInfo("Auto-categorization completed", { context: 'auto_categorize', merchantName, result });
    return result || null;
  } catch (error) {
    const appError = new FinancialAppError({
      code: ErrorCode.API_ERROR,
      message: 'Failed to auto-categorize transaction',
      details: { originalError: error, context: 'auto_categorize', merchantName }
    });
    await ErrorLogger.getInstance().logError(appError);
    return null;
  }
}
