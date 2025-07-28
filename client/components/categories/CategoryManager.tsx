// client/components/categories/CategoryManager.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CategoryForm from "@/components/categories/CategoryForm";
import { createCategory, updateCategory, deleteCategory } from "@/app/actions/categories";
import { Category, CategoriesData } from "@/lib/types/categories";
import { User } from "@/lib/types/user";

export interface CategoriesClientProps {
  initialData: CategoriesData;
  user: User;
}

export default function CategoriesClient({ initialData, user }: CategoriesClientProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const router = useRouter();

  const handleCreateCategory = async (data: any) => {
    setLoading(true);
    try {
      const result = await createCategory(data);
      if (result.success) {
        setShowForm(false);
        router.refresh();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Failed to create category:", error);
      alert("Failed to create category. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCategory = async (data: any) => {
    if (!editingCategory) return;

    setLoading(true);
    try {
      const result = await updateCategory(editingCategory.id, data);
      if (result.success) {
        setEditingCategory(null);
        router.refresh();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Failed to update category:", error);
      alert("Failed to update category. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const result = await deleteCategory(id);
      if (result.success) {
        router.refresh();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Failed to delete category:", error);
      alert("Failed to delete category. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getCategoryTypeColor = (categoryType: string) => {
    const colorMap: { [key: string]: string } = {
      income: "bg-green-100 text-green-800",
      expense: "bg-red-100 text-red-800",
      transfer: "bg-blue-100 text-blue-800",
    };
    return colorMap[categoryType] || "bg-gray-100 text-gray-800";
  };

  const safeCategories = Array.isArray(initialData.categories) ? initialData.categories : [];
  const filteredCategories = safeCategories.filter((category) => {
    if (filter === "all") return true;
    if (filter === "system") return category.is_system_category;
    if (filter === "user") return !category.is_system_category;
    return category.category_type === filter;
  });

  const getCategoryStats = () => {
    const total = safeCategories.length;
    const system = safeCategories.filter((c) => c.is_system_category).length;
    const user = safeCategories.filter((c) => !c.is_system_category).length;
    const income = safeCategories.filter((c) => c.category_type === "income").length;
    const expense = safeCategories.filter((c) => c.category_type === "expense").length;

    return { total, system, user, income, expense };
  };

  const stats = getCategoryStats();

  if (showForm) {
    return (
      <div className="space-y-6">
        <CategoryForm onSubmit={handleCreateCategory} onCancel={() => setShowForm(false)} />
      </div>
    );
  }

  if (editingCategory) {
    return (
      <div className="space-y-6">
        <CategoryForm
          onSubmit={handleUpdateCategory}
          onCancel={() => setEditingCategory(null)}
          initialData={editingCategory}
          isEdit={true}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Transaction Categories</h2>
          <p className="text-sm text-gray-500">{initialData.total} total categories</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            + Add Category
          </button>
        </div>
      </div>

      {/* Category Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-gray-500">Total</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-gray-500">System</div>
          <div className="text-2xl font-bold text-blue-600">{stats.system}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-gray-500">Custom</div>
          <div className="text-2xl font-bold text-purple-600">{stats.user}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-gray-500">Income</div>
          <div className="text-2xl font-bold text-green-600">{stats.income}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-gray-500">Expense</div>
          <div className="text-2xl font-bold text-red-600">{stats.expense}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: "all", label: "All Categories", count: stats.total },
            { key: "system", label: "System", count: stats.system },
            { key: "user", label: "Custom", count: stats.user },
            { key: "income", label: "Income", count: stats.income },
            { key: "expense", label: "Expense", count: stats.expense },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                filter === tab.key
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCategories.map((category) => (
          <div key={category.id} className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            {/* Category Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                {category.icon && <div className="text-2xl">{category.icon}</div>}
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color || "#9B9B9B" }} />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{category.name}</h3>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryTypeColor(
                      category.category_type
                    )}`}
                  >
                    {category.category_type}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {category.is_system_category && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    System
                  </span>
                )}
                {!category.is_system_category && (
                  <>
                    <button
                      onClick={() => setEditingCategory(category)}
                      disabled={loading}
                      className="text-blue-600 hover:text-blue-900 text-sm disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id, category.name)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-900 text-sm disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Category Description */}
            {category.description && <p className="text-gray-600 text-sm mb-4">{category.description}</p>}

            {/* Keywords */}
            {category.keywords && category.keywords.length > 0 && (
              <div className="mb-3">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Keywords:</h4>
                <div className="flex flex-wrap gap-1">
                  {category.keywords.slice(0, 3).map((keyword) => (
                    <span
                      key={keyword}
                      className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {keyword}
                    </span>
                  ))}
                  {category.keywords.length > 3 && <span className="text-xs text-gray-500">+{category.keywords.length - 3} more</span>}
                </div>
              </div>
            )}

            {/* Merchant Patterns */}
            {category.merchant_patterns && category.merchant_patterns.length > 0 && (
              <div className="mb-3">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Merchants:</h4>
                <div className="flex flex-wrap gap-1">
                  {category.merchant_patterns.slice(0, 3).map((pattern) => (
                    <span
                      key={pattern}
                      className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800"
                    >
                      {pattern}
                    </span>
                  ))}
                  {category.merchant_patterns.length > 3 && (
                    <span className="text-xs text-gray-500">+{category.merchant_patterns.length - 3} more</span>
                  )}
                </div>
              </div>
            )}

            {/* Category Footer */}
            <div className="text-xs text-gray-500 pt-3 border-t">Created: {new Date(category.created_at).toLocaleDateString()}</div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredCategories.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">{filter === "all" ? "No categories found" : `No ${filter} categories found`}</div>
          {filter === "all" && (
            <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
              Create Your First Category
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {initialData.pages > 1 && (
        <div className="flex justify-center">
          <div className="flex space-x-2">
            {Array.from({ length: initialData.pages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => router.push(`/categories?page=${page}`)}
                className={`px-3 py-2 rounded-md text-sm ${
                  page === initialData.page ? "bg-blue-600 text-white" : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
