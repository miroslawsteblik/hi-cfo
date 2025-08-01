"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CategoryForm from "@/components/categories/CategoryForm";
import { createCategory, updateCategory, deleteCategory } from "@/lib/features/categories";
import { Category, CategoriesData } from "@/lib/features/categories";
import { User } from "@/lib/shared/types";
import { formatDate } from "@/lib/shared/utils";

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
      income: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
      expense: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
      transfer: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
    };
    return colorMap[categoryType] || "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300";
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
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Transaction Categories</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{initialData.total} total categories</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            + Add Category
          </button>
        </div>
      </div>

      {/* Category Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white   dark:bg-gray-800 p-4 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-gray-500  dark:text-gray-400">Total</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-blue-600">{stats.total}</div>
        </div>
        <div className="bg-white   dark:bg-gray-800 p-4 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-gray-500  dark:text-gray-400">System</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-blue-600">{stats.system}</div>
        </div>
        <div className="bg-white   dark:bg-gray-800 p-4 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-gray-500  dark:text-gray-400">Custom</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-blue-600">{stats.user}</div>
        </div>
        <div className="bg-white   dark:bg-gray-800 p-4 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-gray-500  dark:text-gray-00">Income</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-blue-600">{stats.income}</div>
        </div>
        <div className="bg-white   dark:bg-gray-800 p-4 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-gray-500  dark:text-gray-400">Expense</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-blue-600">{stats.expense}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
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
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Categories List */}
      <div className="space-y-3">
        {filteredCategories.map((category) => (
          <div
            key={category.id}
            className="bg-white  dark:bg-gray-800 rounded-xl border border-gray-200 hover:border-gray-300  dark:border-gray-700 hover:shadow-lg transition-all duration-200 group"
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                {/* Left Section: Category Identity */}
                <div className="flex items-center space-x-4 flex-1">
                  {/* Icon & Color */}
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      {category.icon ? (
                        <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-2xl group-hover:bg-gray-100 transition-colors">
                          {category.icon}
                        </div>
                      ) : (
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: category.color || "#9B9B9B" }}
                        >
                          <div className="w-6 h-6 bg-white rounded-full opacity-80"></div>
                        </div>
                      )}
                      <div
                        className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white"
                        style={{ backgroundColor: category.color || "#9B9B9B" }}
                      />
                    </div>
                  </div>

                  {/* Category Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900  dark:text-white truncate">
                        {category.name}
                      </h3>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getCategoryTypeColor(
                          category.category_type
                        )}`}
                      >
                        {category.category_type}
                      </span>
                      {category.is_system_category && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800  dark:text-blue-400 ">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                              clipRule="evenodd"
                            />
                          </svg>
                          System
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {category.description && (
                      <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
                        {category.description}
                      </p>
                    )}

                    {/* Tags Row */}
                    <div className="flex items-center space-x-4">
                      {/* Keywords */}
                      {category.keywords && category.keywords.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-medium text-gray-500  dark:text-orange-300 ">Keywords:</span>
                          <div className="flex flex-wrap gap-1">
                            {category.keywords.slice(0, 2).map((keyword) => (
                              <span
                                key={keyword}
                                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                              >
                                {keyword}
                              </span>
                            ))}
                            {category.keywords.length > 2 && (
                              <span className="text-xs text-gray-500  dark:text-gray-400 px-2 py-1">
                                +{category.keywords.length - 2}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Merchant Patterns */}
                      {category.merchant_patterns && category.merchant_patterns.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-medium text-gray-500  dark:text-gray-400">Merchants:</span>
                          <div className="flex flex-wrap gap-1">
                            {category.merchant_patterns.slice(0, 2).map((pattern) => (
                              <span
                                key={pattern}
                                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                              >
                                {pattern}
                              </span>
                            ))}
                            {category.merchant_patterns.length > 2 && (
                              <span className="text-xs text-gray-500  dark:text-gray-400 px-2 py-1">
                                +{category.merchant_patterns.length - 2}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Section: Actions & Meta */}
                <div className="flex items-center space-x-4 ml-6">
                  {/* Created Date */}
                  <div className="text-right hidden sm:block">
                    <div className="text-xs text-gray-500 dark:text-gray-300">Created</div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-400">
                      {formatDate(category.created_at)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    {!category.is_system_category ? (
                      <>
                        <button
                          onClick={() => setEditingCategory(category)}
                          disabled={loading}
                          className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id, category.name)}
                          disabled={loading}
                          className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          Delete
                        </button>
                      </>
                    ) : (
                      <div className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-lg">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredCategories.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            {filter === "all" ? "No categories found" : `No ${filter} categories found`}
          </div>
          {filter === "all" && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
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
                  page === initialData.page
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
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
