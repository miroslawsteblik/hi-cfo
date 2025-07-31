// components/transactions/steps/OFXCategorizationStep.tsx
"use client";

import { useState } from "react";
import { EnhancedPreviewTransaction, CategorizationPreview } from "@/lib/features/transactions";
import { Category } from "@/lib/features/categories";
import { formatCurrency, formatDate } from "@/lib/shared/utils";

interface OFXCategorizationStepProps {
  previewTransactions: EnhancedPreviewTransaction[];
  categorizationPreview: CategorizationPreview;
  categories: Category[];
  loading: boolean;
  error: string | null;
  onCategoryChange: (transactionIndex: number, categoryId: string) => void;
  onBack: () => void;
  onCancel: () => void;
  onImport: () => void;
}

export default function OFXCategorizationStep({
  previewTransactions,
  categorizationPreview,
  categories,
  loading,
  error,
  onCategoryChange,
  onBack,
  onCancel,
  onImport,
}: OFXCategorizationStepProps) {
  // Ensure categories is always an array with robust checking
  const safeCategories = Array.isArray(categories) ? categories : [];
  const [showCategorizationDetails, setShowCategorizationDetails] = useState(false);
  const selectedTransactions = previewTransactions.filter((t) => t.selected);
  const manualAssignmentCount = previewTransactions.filter((t) => t.manualCategoryId).length;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600 bg-green-50";
    if (confidence >= 0.6) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.6) return "Medium";
    return "Low";
  };

  return (
    <div className="space-y-6">
      {/* Categorization Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Smart Categorization Results</h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {categorizationPreview.total_transactions || 0}
            </div>
            <div className="text-sm text-gray-600">Total Transactions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {categorizationPreview.will_be_categorized || 0}
            </div>
            <div className="text-sm text-gray-600">Auto-Categorized</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{manualAssignmentCount}</div>
            <div className="text-sm text-gray-600">Manual Assignments</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {categorizationPreview.total_transactions > 0
                ? Math.round(
                    (categorizationPreview.will_be_categorized /
                      categorizationPreview.total_transactions) *
                      100
                  )
                : 0}
              %
            </div>
            <div className="text-sm text-gray-600">Success Rate</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowCategorizationDetails(!showCategorizationDetails)}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
          >
            {showCategorizationDetails ? "Hide" : "Show"} Details
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={showCategorizationDetails ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
              />
            </svg>
          </button>
          <div className="text-sm text-gray-500">Review and adjust categories before importing</div>
        </div>
      </div>

      {/* Detailed Transaction Categorization */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <h3 className="text-lg font-medium text-gray-900">Review Categorization</h3>
          <p className="text-sm text-gray-600 mt-1">
            Auto-categorized transactions are marked with confidence levels. You can override any
            category.
          </p>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Suggested Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assign Category
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {selectedTransactions.map((transaction, index) => {
                const catPreview = transaction.categorizationPreview;
                const hasAutoCategory = catPreview?.will_be_categorized;
                const suggestedCategory = Array.isArray(safeCategories)
                  ? safeCategories.find((c) => c.id === catPreview?.suggested_category)
                  : undefined;

                return (
                  <tr key={transaction.original.fit_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {transaction.original.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(transaction.original.dtPosted)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span
                        className={
                          transaction.original.amount >= 0 ? "text-green-600" : "text-red-600"
                        }
                      >
                        {transaction.original.amount >= 0 ? "+" : "-"}
                        {formatCurrency(transaction.original.amount, transaction.original.currency)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {hasAutoCategory ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {suggestedCategory?.name || catPreview?.suggested_category_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            via {catPreview?.match_method}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No suggestion</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {hasAutoCategory ? (
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getConfidenceColor(
                            catPreview.confidence
                          )}`}
                        >
                          {getConfidenceLabel(catPreview.confidence)} (
                          {Math.round(catPreview.confidence * 100)}%)
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={transaction.manualCategoryId || catPreview?.suggested_category || ""}
                        onChange={(e) => onCategoryChange(index, e.target.value)}
                        className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 min-w-[150px] bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="">No category</option>
                        {Array.isArray(safeCategories) &&
                          safeCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-600">{error}</div>
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
        >
          Back
        </button>
        <div className="flex space-x-4">
          <button
            onClick={onCancel}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={onImport}
            disabled={loading}
            className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Importing..." : `Import ${selectedTransactions.length} Transactions`}
          </button>
        </div>
      </div>
    </div>
  );
}
