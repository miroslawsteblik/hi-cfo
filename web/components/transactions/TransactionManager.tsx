"use client";

import EnhancedOFXManager from "./OFX-manager";
import {
  updateTransaction,
  deleteTransaction,
  analyzeTransactionCategorization,
  getTransactions,
} from "@/lib/features/transactions";
import { useState, useEffect, useCallback } from "react";
import {
  TransactionFilters,
  CategorizationAnalysis,
  TransactionListItem,
  CategorizationSettings,
} from "@/lib/features/transactions";

import TransactionHeader from "./TransactionHeader";
import TransactionTable from "./TransactionTable";
import TransactionSettings from "./TransactionSettings";
import { formatCurrency, formatDate, getUserPreferredCurrency, convertCurrency } from "@/lib/shared/utils";
import type { Currency } from "@/lib/shared/types";
import { useErrorHandler } from "@/lib/errors";

import { Account } from "@/lib/features/accounts";
import { Category } from "@/lib/features/categories";
import { User } from "@/lib/shared/types";

interface TransactionManagerProps {
  initialData: any;
  accounts: Account[];
  categories: Category[];
  user: User;
  allTransactionsData?: any;
}

export default function EnhancedTransactionManager({
  initialData,
  accounts,
  categories,
  user,
  allTransactionsData,
}: TransactionManagerProps) {
  // Transaction State
  const [transactions, setTransactions] = useState<TransactionListItem[]>(
    initialData?.data?.data?.map((transaction: any) => ({
      ...transaction,
      currency: "USD",
    })) || []
  );
  const [total, setTotal] = useState(initialData?.data?.total || 0);

  const [currentPage, setCurrentPage] = useState(initialData?.data?.page || 1);
  const [totalPages, setTotalPages] = useState(initialData?.data?.pages || 1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { handleError, logUserAction } = useErrorHandler();

  // UI State
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [pendingDeleteCount, setPendingDeleteCount] = useState(0);
  // ADD NEW STATE after existing state
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // User preferences (loaded from localStorage)
  const [userPrefs, setUserPrefs] = useState({
    showMerchantNames: true,
    showTags: true,
    compactView: false,
    defaultPageSize: 20,
  });

  // Currency detection
  const [userCurrency, setUserCurrency] = useState<string>("USD");

  // Analysis State
  const [analysisData, setAnalysisData] = useState<CategorizationAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // Filters
  const [filters, setFilters] = useState<TransactionFilters>({
    page: initialData?.page || 1,
    limit: userPrefs.defaultPageSize,
  });


  // Load user preferences on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("transaction-preferences");
      if (saved) {
        const prefs = JSON.parse(saved);
        setUserPrefs((prev) => ({ ...prev, ...prefs }));
        setFilters((prev) => ({ ...prev, limit: prefs.defaultPageSize || 20 }));
      }
    } catch (err) {
      console.error("Failed to load user preferences:", err);
    }
  }, []);

  // ==================== HOOKS & EFFECTS ====================
  // Keep existing useCallback and useEffect
  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getTransactions(filters);

      console.log("🔍 getTransactions result:", result);

      if (!result) {
        throw new Error("Failed to load transactions");
      }

      let transactionData: TransactionListItem[] = [];
      let totalCount = 0;
      let currentPageNum = 1;
      let totalPagesNum = 1;

      if (result && result.success && result.data && Array.isArray(result.data.data)) {
        // Use user's preferred currency with transaction data as fallback
        const transactionCurrencies = result.data.data.map(t => t.currency).filter(Boolean) as Currency[];
        const detectedCurrency = getUserPreferredCurrency(
          user?.preferred_currency, // User preference takes priority
          [], 
          transactionCurrencies
        );
        setUserCurrency(detectedCurrency);
        
        transactionData = result.data.data.map((transaction: any) => ({
          ...transaction,
          currency: transaction.currency || detectedCurrency, // Use actual currency or detected default
        }));
        totalCount = result.data.total || 0;
        currentPageNum = result.data.page || 1;
        totalPagesNum = result.data.pages || 1;
      } else if (result && !result.success) {
        console.error("❌ API Error:", result.error);
        throw new Error(result.error || "API returned error");
      } else {
        console.error("❌ Unexpected response format:", result);
        console.error(
          "❌ Expected: { success: boolean, data: { data: [], total: number, page: number, pages: number } }"
        );
        // Use empty fallback data
        transactionData = [];
        totalCount = 0;
        currentPageNum = 1;
        totalPagesNum = 1;
      }

      setTransactions(transactionData);
      setTotal(totalCount);
      setCurrentPage(currentPageNum);
      setTotalPages(totalPagesNum);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load transactions";
      setError(errorMessage);
      await handleError(error instanceof Error ? error : new Error(errorMessage), {
        component: "TransactionManager",
        action: "loadTransactions",
        filters,
      });
      setTransactions([]);
      setTotal(0);
      setCurrentPage(1);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // ADD NEW EFFECTS after existing ones
  useEffect(() => {
    // Keyboard shortcuts
    const handleKeyPress = (e: KeyboardEvent) => {
      /* keyboard logic */
    };
    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [bulkSelectMode, selectedTransactions]);

  // Auto-hide success messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // ==================== UTILITY FUNCTIONS ====================

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return "Uncategorized";
    if (!Array.isArray(categories)) return "Unknown Category";
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || "Unknown Category";
  };

  const exportTransactions = () => {
    const csvContent = [
      ["Date", "Description", "Category", "Amount", "Currency"].join(","),
      ...transactions.map((t) =>
        [
          t.transaction_date,
          `"${t.description}"`,
          `"${getCategoryName(t.category_id)}"`,
          t.amount,
          t.currency || "USD",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // ==================== HANDLERS ====================

  const handleCategoryChange = async (transactionId: string, categoryId: string) => {
    try {
      const result = await updateTransaction(transactionId, {
        category_id: categoryId || undefined,
      });

      if (result.success) {
        // Update local state
        setTransactions((prev) =>
          prev.map((tx) =>
            tx.id === transactionId ? { ...tx, category_id: categoryId || undefined } : tx
          )
        );
        setEditingTransaction(null);
      } else {
        setError(result.error || "Failed to update transaction");
      }
    } catch (err) {
      setError("Failed to update transaction");
      await handleError(err instanceof Error ? err : new Error("Failed to update transaction"), {
        component: "TransactionManager",
        action: "updateTransaction",
        transactionId,
        categoryId,
      });
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) {
      return;
    }

    try {
      const result = await deleteTransaction(transactionId);

      if (result.success) {
        // Remove from local state
        setTransactions((prev) => prev.filter((tx) => tx.id !== transactionId));
        setTotal((prev: number) => prev - 1);
      } else {
        setError(result.error || "Failed to delete transaction");
      }
    } catch (err) {
      setError("Failed to delete transaction");
      console.error("Error deleting transaction:", err);
    }
  };

  const handleBulkDelete = async () => {
    console.log("🔍 handleBulkDelete called");
    console.log("🔍 selectedTransactions.size:", selectedTransactions.size);

    if (selectedTransactions.size === 0) {
      console.log("❌ No transactions selected, returning early");
      return;
    }

    // Instead of using confirm(), show our custom modal
    setPendingDeleteCount(selectedTransactions.size);
    setShowDeleteConfirmation(true);
  };

  // This is the function that will be called when user confirms in the modal
  const confirmBulkDelete = async () => {
    console.log("✅ Starting confirmed bulk deletion process (with reload)");
    setShowDeleteConfirmation(false);
    setLoading(true);
    setError(null);

    const transactionIds = Array.from(selectedTransactions);
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    try {
      // Process deletions in batches
      const batchSize = 5;
      console.log(`🔍 Processing ${transactionIds.length} transactions in batches of ${batchSize}`);

      for (let i = 0; i < transactionIds.length; i += batchSize) {
        const batch = transactionIds.slice(i, i + batchSize);
        console.log(`🔍 Processing batch ${Math.floor(i / batchSize) + 1}:`, batch);

        const batchPromises = batch.map(async (transactionId) => {
          try {
            console.log(`🔍 Deleting transaction: ${transactionId}`);
            const result = await deleteTransaction(transactionId);

            if (result.success) {
              successCount++;
              console.log(`✅ Backend claims successful deletion: ${transactionId}`);
              return { id: transactionId, success: true };
            } else {
              failedCount++;
              errors.push(`Failed to delete transaction: ${result.error}`);
              console.log(`❌ Backend reported failure for ${transactionId}:`, result.error);
              return { id: transactionId, success: false };
            }
          } catch (err) {
            failedCount++;
            errors.push(
              `Error deleting transaction: ${err instanceof Error ? err.message : "Unknown error"}`
            );
            console.error(`❌ Exception deleting ${transactionId}:`, err);
            return { id: transactionId, success: false };
          }
        });

        await Promise.all(batchPromises);
      }

      // Clear selections and exit bulk mode FIRST
      setSelectedTransactions(new Set());
      setBulkSelectMode(false);

      // Reload transactions from server to ensure consistency
      await loadTransactions();

      if (failedCount === 0) {
        setSuccessMessage(
          `Successfully deleted ${successCount} transaction${successCount > 1 ? "s" : ""}`
        );
      } else if (successCount > 0) {
        setError(
          `Deleted ${successCount} of ${transactionIds.length} transactions. ${failedCount} failed.`
        );
      } else {
        setError(
          `Failed to delete all selected transactions. ${errors.slice(0, 3).join(", ")}${
            errors.length > 3 ? "..." : ""
          }`
        );
      }
    } catch (err) {
      setError("An unexpected error occurred during bulk deletion");
      console.error("❌ Unexpected error in bulk delete:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkCategoryUpdate = async (categoryId: string) => {
    if (selectedTransactions.size === 0) return;

    setLoading(true);
    const updates = Array.from(selectedTransactions);
    let successCount = 0;

    try {
      for (const transactionId of updates) {
        const result = await updateTransaction(transactionId, {
          category_id: categoryId || undefined,
        });

        if (result.success) {
          successCount++;
        }
      }

      // Update local state for successful updates
      setTransactions((prev) =>
        prev.map((tx) =>
          selectedTransactions.has(tx.id) ? { ...tx, category_id: categoryId || undefined } : tx
        )
      );

      setSelectedTransactions(new Set());
      setBulkSelectMode(false);

      if (successCount < updates.length) {
        setError(`Updated ${successCount} of ${updates.length} transactions`);
      }
    } catch (err) {
      setError("Failed to update transactions");
      console.error("Error bulk updating transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  const analyzeCurrentTransactions = async () => {
    setAnalysisLoading(true);
    setError(null);

    try {
      const descriptions = transactions
        .filter((tx) => tx.merchant_name || tx.description)
        .map((tx) => tx.merchant_name || tx.description);

      const result = await analyzeTransactionCategorization(descriptions);

      if (result.success && result.data) {
        setAnalysisData(result.data);
        setShowAnalysisModal(true);
      } else {
        setError(result.error || "Failed to analyze transactions");
      }
    } catch (err) {
      setError("Failed to analyze transactions");
      console.error("Error analyzing transactions:", err);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const toggleTransactionSelection = (transactionId: string) => {
    setSelectedTransactions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(transactionId)) {
        newSet.delete(transactionId);
      } else {
        newSet.add(transactionId);
      }
      return newSet;
    });
  };

  const toggleAllTransactions = () => {
    if (selectedTransactions.size === transactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(transactions.map((tx) => tx.id)));
    }
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + A to select all (when in bulk mode)
      if ((e.ctrlKey || e.metaKey) && e.key === "a" && bulkSelectMode) {
        e.preventDefault();
        toggleAllTransactions();
      }

      // Escape to exit bulk mode
      if (e.key === "Escape" && bulkSelectMode) {
        setBulkSelectMode(false);
        setSelectedTransactions(new Set());
      }

      // Delete key to trigger bulk delete
      if (e.key === "Delete" && selectedTransactions.size > 0 && bulkSelectMode) {
        handleBulkDelete();
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [bulkSelectMode, selectedTransactions]);

  // ==================== 5. COMPUTED VALUES ====================
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const uncategorizedCount = safeTransactions.filter((tx) => !tx.category_id).length;
  const categorizedCount = safeTransactions.filter((tx) => tx.category_id).length;
  const totalTransactionsCount = safeTransactions.length;
  const categorizationRate = totalTransactionsCount > 0 ? Math.round((categorizedCount / totalTransactionsCount) * 100) : 0;
  
  // Get user's preferred currency with proper hierarchy
  const transactionCurrencies = safeTransactions.map(t => t.currency).filter(Boolean) as Currency[];
  const userPreferredCurrency = getUserPreferredCurrency(
    user?.preferred_currency,
    [],
    transactionCurrencies
  );
  
  // Calculate totals with currency conversion to user's preferred currency
  const totalIncome = safeTransactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => {
      const convertedAmount = convertCurrency(t.amount, t.currency as Currency, userPreferredCurrency);
      return sum + convertedAmount;
    }, 0);
  const totalExpenses = safeTransactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => {
      const convertedAmount = convertCurrency(Math.abs(t.amount), t.currency as Currency, userPreferredCurrency);
      return sum + convertedAmount;
    }, 0);
  const netAmount = totalIncome - totalExpenses;

  // ==================== SUB-COMPONENTS  ====================

  const TransactionStatsPanel = useCallback(() => (
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
      <div className="p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
          Transaction Overview
        </h3>
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-full mb-3">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9z" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalTransactionsCount}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Transactions</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full mb-3">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{categorizedCount}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Auto-Categorized</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-yellow-100 dark:bg-yellow-900/30 rounded-full mb-3">
              <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{uncategorizedCount}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Needs Review</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-purple-100 dark:bg-purple-900/30 rounded-full mb-3">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{categorizationRate}%</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Categorization Rate</div>
          </div>
        </div>
        
        {/* Progress bar for categorization */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>Categorization Progress</span>
            <span>{categorizationRate}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-green-600 dark:bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${categorizationRate}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  ), [totalTransactionsCount, categorizedCount, uncategorizedCount, categorizationRate]);

  const SummaryStats = useCallback(() => (
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Total Income
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-green-600 dark:text-green-400">
              {formatCurrency(totalIncome, userPreferredCurrency)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Total Expenses
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-red-600 dark:text-red-400">
              {formatCurrency(totalExpenses, userPreferredCurrency)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Net Amount
            </dt>
            <dd
              className={`mt-1 text-3xl font-semibold ${
                netAmount >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {formatCurrency(Math.abs(netAmount), userPreferredCurrency)}
            </dd>
          </div>
        </div>
      </div>
    </div>
  ), [totalIncome, totalExpenses, netAmount, userPreferredCurrency]);

  const FilterPanel = useCallback(() => (
    <div
      className={`bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 px-4 py-3 transition-all duration-200 ${
        showFilters ? "block" : "hidden"
      }`}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Search
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search transactions..."
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        {/* Account Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
          <select
            value={filters.account_id || ""}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, account_id: e.target.value || undefined, page: 1 }))
            }
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">All Accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.account_name}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={filters.category_id || ""}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, category_id: e.target.value || undefined, page: 1 }))
            }
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">All Categories</option>
            <option value="uncategorized">Uncategorized</option>
            {Array.isArray(categories) &&
              categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </select>
        </div>

        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
          <select
            onChange={(e) => {
              const value = e.target.value;
              const today = new Date();
              let start_date = "";
              let end_date = "";

              switch (value) {
                case "this_month":
                  start_date = new Date(today.getFullYear(), today.getMonth(), 1)
                    .toISOString()
                    .split("T")[0];
                  end_date = today.toISOString().split("T")[0];
                  break;
                case "last_month":
                  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                  start_date = lastMonth.toISOString().split("T")[0];
                  end_date = new Date(today.getFullYear(), today.getMonth(), 0)
                    .toISOString()
                    .split("T")[0];
                  break;
                case "last_3_months":
                  start_date = new Date(today.getFullYear(), today.getMonth() - 3, 1)
                    .toISOString()
                    .split("T")[0];
                  end_date = today.toISOString().split("T")[0];
                  break;
              }

              setFilters((prev) => ({ ...prev, start_date, end_date, page: 1 }));
            }}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">All Time</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="last_3_months">Last 3 Months</option>
          </select>
        </div>
      </div>

      <div className="mt-4 flex space-x-2">
        <button
          onClick={() => {
            setFilters({ page: 1, limit: 20 });
            setSearchTerm("");
          }}
          className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
        >
          Clear Filters
        </button>
      </div>
    </div>
  ), [showFilters, searchTerm, setSearchTerm, filters, setFilters, accounts, categories]);

  const PaginationControls = useCallback(() => (
    <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
      <div className="flex-1 flex justify-between sm:hidden">
        {/* Mobile pagination */}
        <button
          onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, currentPage - 1) }))}
          disabled={currentPage <= 1}
          className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={() =>
            setFilters((prev) => ({ ...prev, page: Math.min(totalPages, currentPage + 1) }))
          }
          disabled={currentPage >= totalPages}
          className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          Next
        </button>
      </div>

      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Showing{" "}
            <span className="font-medium">{(currentPage - 1) * (filters.limit || 20) + 1}</span> to{" "}
            <span className="font-medium">
              {Math.min(currentPage * (filters.limit || 20), total)}
            </span>{" "}
            of <span className="font-medium">{total}</span> results
          </p>
        </div>

        <div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
            <button
              onClick={() =>
                setFilters((prev) => ({ ...prev, page: Math.max(1, currentPage - 1) }))
              }
              disabled={currentPage <= 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Previous
            </button>

            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, currentPage - 2) + i;
              if (pageNum > totalPages) return null;

              return (
                <button
                  key={pageNum}
                  onClick={() => setFilters((prev) => ({ ...prev, page: pageNum }))}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                    pageNum === currentPage
                      ? "z-10 bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400"
                      : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() =>
                setFilters((prev) => ({ ...prev, page: Math.min(totalPages, currentPage + 1) }))
              }
              disabled={currentPage >= totalPages}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Next
            </button>
          </nav>
        </div>
      </div>
    </div>
  ), [currentPage, totalPages, setFilters, total]);

  // ==================== MAIN RETURN STATEMENT ====================

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* SUCCESS NOTIFICATIONS */}
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-400 dark:border-green-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                {successMessage}
              </p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-green-400 dark:text-green-300 hover:text-green-600 dark:hover:text-green-100"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <TransactionHeader
        total={total}
        uncategorizedCount={uncategorizedCount}
        currentPage={currentPage}
        totalPages={totalPages}
        bulkSelectMode={bulkSelectMode}
        selectedCount={selectedTransactions.size}
        onImport={() => setShowImportModal(true)}
        onExport={exportTransactions}
        onAnalyze={analyzeCurrentTransactions}
        onBulkMode={() => setBulkSelectMode(!bulkSelectMode)}
        onSettings={() => setShowSettingsModal(true)}
        onFiltersToggle={() => setShowFilters(!showFilters)}
        showFilters={showFilters}
        isAnalyzing={analysisLoading}
        hasTransactions={transactions.length > 0}
      />

      {/* CONTENT CONTAINER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* TRANSACTION STATS PANEL */}
        <TransactionStatsPanel />

        {/* SUMMARY STATS */}
        <div className="mb-6">
          <SummaryStats />
        </div>

        {/* FILTER PANEL */}
        {showFilters && (
          <div className="mb-6">
            <FilterPanel />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6">
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-500 p-4 rounded-md">
              <div className="text-red-800 dark:text-red-200">{error}</div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 text-sm mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Bulk Actions Bar */}
        {bulkSelectMode && selectedTransactions.size > 0 && (
          <div className="mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {selectedTransactions.size} transaction{selectedTransactions.size > 1 ? "s" : ""}{" "}
                  selected
                </div>

                <div className="flex items-center space-x-3">
                  {/* Bulk Category Assignment */}
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleBulkCategoryUpdate(e.target.value);
                        e.target.value = "";
                      }
                    }}
                    className="text-sm border border-blue-300 dark:border-blue-600 rounded-md px-3 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    disabled={loading}
                  >
                    <option value="">Assign category...</option>
                    {Array.isArray(categories) &&
                      categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    <option value="">Remove category</option>
                  </select>

                  {/* Bulk Delete Button */}
                  <button
                    onClick={handleBulkDelete}
                    disabled={loading}
                    className="inline-flex items-center px-3 py-1 text-sm font-medium text-red-700 dark:text-red-200 bg-red-100 dark:bg-red-900/30 rounded-md hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50 transition-colors"
                  >
                    {loading ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            className="opacity-25"
                          ></circle>
                          <path
                            fill="currentColor"
                            className="opacity-75"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Deleting...
                      </>
                    ) : (
                      `Delete ${selectedTransactions.size}`
                    )}
                  </button>

                  {/* Exit Bulk Mode */}
                  <button
                    onClick={() => {
                      setBulkSelectMode(false);
                      setSelectedTransactions(new Set());
                    }}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TRANSACTIONS TABLE */}
        <TransactionTable
          transactions={transactions}
          categories={categories}
          loading={loading}
          bulkSelectMode={bulkSelectMode}
          selectedTransactions={selectedTransactions}
          editingTransaction={editingTransaction}
          userPrefs={userPrefs}
          onTransactionSelect={toggleTransactionSelection}
          onSelectAll={toggleAllTransactions}
          onCategoryChange={handleCategoryChange}
          onEditTransaction={setEditingTransaction}
          onDeleteTransaction={handleDeleteTransaction}
          onImport={() => setShowImportModal(true)}
        />

        {/* PAGINATION */}
        {!loading && transactions.length > 0 && totalPages > 1 && (
          <div className="mt-6">
            <PaginationControls />
          </div>
        )}
      </div>

      {/* MODAL COMPONENTS */}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl max-h-[90vh] overflow-y-auto">
            <EnhancedOFXManager
              accounts={accounts}
              categories={categories}
              onSuccess={() => {
                setShowImportModal(false);
                loadTransactions();
              }}
              onCancel={() => setShowImportModal(false)}
            />
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <TransactionSettings isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />

      {/* Analysis Modal */}
      {showAnalysisModal && analysisData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Categorization Analysis
              </h3>
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {analysisData.total_transactions}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Analyzed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {analysisData.successful_categorizations}
                </div>
                <div className="text-sm text-gray-600">Successfully Categorized</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {Math.round(analysisData.success_rate * 100)}%
                </div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">Method Performance</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(analysisData.method_stats).map(([method, count]) => (
                  <div
                    key={method}
                    className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-center"
                  >
                    <div className="text-lg font-medium text-gray-900 dark:text-white">{count}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {method}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="bg-blue-600 dark:bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Delete Transactions
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete <strong>{pendingDeleteCount}</strong> selected
                transaction
                {pendingDeleteCount > 1 ? "s" : ""}? This action cannot be undone.
              </p>

              <div className="flex space-x-4 justify-center">
                <button
                  onClick={() => {
                    console.log("🔍 User cancelled deletion via modal");
                    setShowDeleteConfirmation(false);
                    setPendingDeleteCount(0);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    console.log("🔍 User confirmed deletion via modal");
                    confirmBulkDelete(); // This now calls the correct function
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Delete {pendingDeleteCount} Transaction{pendingDeleteCount > 1 ? "s" : ""}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
