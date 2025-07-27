
"use server";

import { apiClient } from "@/lib/api-client-enhanced";
import { CategoryData, Category, CategoriesResponse } from "@/lib/types/categories";
import { CategoryMatchResult } from "@/lib/types/transactions";
export async function createCategory(data: CategoryData) {
  try {
    console.log("📂 Creating category:", data);

    const category = await apiClient.post("/api/v1/categories", data);

    console.log("✅ Category created:", category);
    return { success: true, category };
  } catch (error) {
    console.error("❌ Failed to create category:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create category",
    };
  }
}

// Get categories with filtering and pagination
export async function getCategories(params?: {
  page?: number;
  limit?: number;
  category_type?: string;
  is_system_category?: boolean;
  is_active?: boolean;
  search?: string;
}): Promise<CategoriesResponse> {
  try {
    console.log("📂 Fetching categories with params:", params);

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

    console.log("✅ Categories fetched:", result.categories?.length || 0);
    return result;
  } catch (error) {
    console.error("❌ Failed to fetch categories:", error);
    return { categories: [], total: 0, page: 1, limit: 20, pages: 1 };
  }
}

// Get categories (simple list for dropdowns)
export async function getCategoriesSimple(categoryType?: string): Promise<Category[]> {
  try {
    console.log("📂 Fetching simple categories list...");

    const queryParams = new URLSearchParams();
    if (categoryType) queryParams.append("category_type", categoryType);
    queryParams.append("is_active", "true");

    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    const categories = await apiClient.get<Category[]>(`/api/v1/categories/simple${query}`);

    console.log("✅ Simple categories fetched:", categories?.length || 0);
    return categories || [];
  } catch (error) {
    console.error("❌ Failed to fetch simple categories:", error);
    return [];
  }
}

// Get single category by ID
export async function getCategory(id: string) {
  try {
    console.log("📂 Fetching category:", id);

    const category = await apiClient.get(`/api/v1/categories/${id}`);

    console.log("✅ Category fetched:", category);
    return { success: true, category };
  } catch (error) {
    console.error("❌ Failed to fetch category:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch category",
    };
  }
}

// Update a category
export async function updateCategory(id: string, data: Partial<CategoryData>) {
  try {
    console.log("✏️ Updating category:", id, data);

    const category = await apiClient.put(`/api/v1/categories/${id}`, data);

    console.log("✅ Category updated:", category);
    return { success: true, category };
  } catch (error) {
    console.error("❌ Failed to update category:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update category",
    };
  }
}

// Delete a category
export async function deleteCategory(id: string) {
  try {
    console.log("🗑️ Deleting category:", id);

    await apiClient.delete(`/api/v1/categories/${id}`);

    console.log("✅ Category deleted successfully");
    return { success: true };
  } catch (error) {
    console.error("❌ Failed to delete category:", error);
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
    console.log("🤖 Auto-categorizing merchant:", merchantName);

    const result = await apiClient.post<CategoryMatchResult>("/api/v1/categories/auto-categorize", { merchant_name: merchantName });

    console.log("✅ Auto-categorization result:", result);
    return result || null;
  } catch (error) {
    console.error("❌ Failed to auto-categorize:", error);
    return null;
  }
}
