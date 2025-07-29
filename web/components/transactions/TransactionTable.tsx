// components/transactions/TransactionTable.tsx
"use client";

import { useState } from "react";
import { TransactionListItem } from "@/lib/types/transactions";
import { Category } from "@/lib/types/categories";
import CategoryAssignment from "./CategoryAssignment";
import { formatCurrency, formatDate } from "@/lib/utils";

interface TransactionTableProps {
  transactions: TransactionListItem[];
  categories: Category[];
  loading: boolean;
  bulkSelectMode: boolean;
  selectedTransactions: Set<string>;
  editingTransaction: string | null;
  userPrefs?: {
    showMerchantNames: boolean;
    showTags: boolean;
    compactView: boolean;
  };
  onTransactionSelect: (id: string) => void;
  onSelectAll: () => void;
  onCategoryChange: (transactionId: string, categoryId: string) => void;
  onEditTransaction: (id: string | null) => void;
  onDeleteTransaction: (id: string) => void;
  onImport: () => void;
}

export default function TransactionTable({
  transactions,
  categories,
  loading,
  bulkSelectMode,
  selectedTransactions,
  editingTransaction,
  userPrefs = { showMerchantNames: true, showTags: true, compactView: false },
  onTransactionSelect,
  onSelectAll,
  onCategoryChange,
  onEditTransaction,
  onDeleteTransaction,
  onImport,
}: TransactionTableProps) {
  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return "Uncategorized";
    if (!Array.isArray(categories)) return "Unknown Category";
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || "Unknown Category";
  };

  const allSelected = selectedTransactions.size === transactions.length && transactions.length > 0;
  const compactPadding = userPrefs.compactView ? "px-4 py-2" : "px-6 py-4";

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading transactions...</p>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-3.5m-9 0h-3.5"
            />
          </svg>
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No transactions found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Get started by importing your bank transactions</p>
          <button
            onClick={onImport}
            className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            Import Transactions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Bulk selection header */}
      {bulkSelectMode && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-6 py-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onSelectAll}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="ml-3 text-sm font-medium text-blue-900 dark:text-blue-100">
                {allSelected ? "Deselect all" : "Select all"} ({selectedTransactions.size} selected)
              </span>
            </label>
            {selectedTransactions.size > 0 && (
              <span className="text-sm text-blue-700 dark:text-blue-300">
                {selectedTransactions.size} of {transactions.length} selected
              </span>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {bulkSelectMode && (
                <th className={`${compactPadding} text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider`}>
                  <span className="sr-only">Select</span>
                </th>
              )}
              <th className={`${compactPadding} text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider`}>
                Date
              </th>
              <th className={`${compactPadding} text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-0 w-full`}>
                Description
              </th>
              <th className={`${compactPadding} text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider`}>
                Category
              </th>
              <th className={`${compactPadding} text-right text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                Amount
              </th>
              <th className={`${compactPadding} text-center text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {(Array.isArray(transactions) ? transactions : []).map((transaction) => (
              <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                {bulkSelectMode && (
                  <td className={`${compactPadding} whitespace-nowrap`}>
                    <input
                      type="checkbox"
                      checked={selectedTransactions.has(transaction.id)}
                      onChange={() => onTransactionSelect(transaction.id)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                  </td>
                )}

                {/* Date */}
                <td className={`${compactPadding} whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium`}>
                  {formatDate(transaction.transaction_date)}
                </td>

                {/* Description */}
                <td className={`${compactPadding} min-w-0 w-full`}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {transaction.description}
                    </div>
                    {userPrefs.showMerchantNames && transaction.merchant_name && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {transaction.merchant_name}
                      </div>
                    )}
                    {userPrefs.showTags && transaction.tags && transaction.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {transaction.tags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                          >
                            {tag}
                          </span>
                        ))}
                        {transaction.tags.length > 3 && (
                          <span className="inline-flex px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400">
                            +{transaction.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </td>

                {/* Category */}
                <td className={`${compactPadding} whitespace-nowrap`}>
                  {editingTransaction === transaction.id ? (
                    <div className="min-w-48">
                      <CategoryAssignment
                        categories={categories}
                        selectedCategoryId={transaction.category_id}
                        merchantName={transaction.merchant_name}
                        description={transaction.description}
                        onCategoryChange={(categoryId) => onCategoryChange(transaction.id, categoryId)}
                        size="sm"
                      />
                      <div className="flex space-x-2 mt-2">
                        <button
                          onClick={() => onEditTransaction(null)}
                          className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between min-w-32">
                      <span
                        className={`text-sm truncate ${
                          transaction.category_id ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500 italic"
                        }`}
                        title={getCategoryName(transaction.category_id)}
                      >
                        {getCategoryName(transaction.category_id)}
                      </span>
                      <button
                        onClick={() => onEditTransaction(transaction.id)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm ml-2 transition-colors"
                        title="Edit category"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </td>

                {/* Amount */}
                <td className={`${compactPadding} whitespace-nowrap text-sm font-semibold text-right`}>
                  <span className={transaction.amount >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                    {transaction.amount >= 0 ? "+" : ""}
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </span>
                </td>

                {/* Actions */}
                <td className={`${compactPadding} whitespace-nowrap text-center`}>
                  <button
                    onClick={() => onDeleteTransaction(transaction.id)}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                    title="Delete transaction"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}