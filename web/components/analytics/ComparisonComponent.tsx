"use client";

import { ComparisonData, CategoryComparison } from "@/lib/features/analytics";
import { Minus, ArrowUp, ArrowDown } from "lucide-react";
import { useState } from "react";

interface ComparisonComponentProps {
  data: { success: boolean; data?: ComparisonData; error?: string } | null;
  showDetails?: boolean;
}

export default function ComparisonComponent({
  data,
  showDetails = true,
}: ComparisonComponentProps) {
  const [showCategoryDetails, setShowCategoryDetails] = useState(false);

  if (!data?.success || !data.data) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-40 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  // TypeScript now knows data.data is defined due to the guard above
  const comparisonData = data.data;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUp size={16} className="text-green-500" />;
    if (change < 0) return <ArrowDown size={16} className="text-red-500" />;
    return <Minus size={16} className="text-gray-500" />;
  };

  const getChangeColor = (change: number, isExpense = false) => {
    if (Math.abs(change) < 0.1) return "text-gray-500";

    // For expenses, increase is bad (red), decrease is good (green)
    // For income, increase is good (green), decrease is bad (red)
    if (isExpense) {
      return change > 0 ? "text-red-500" : "text-green-500";
    } else {
      return change > 0 ? "text-green-500" : "text-red-500";
    }
  };

  // Filter significant category changes
  const significantChanges = comparisonData.category_changes
    .filter((change) => Math.abs(change.change_percent) > 5 || change.is_new || change.is_gone)
    .sort((a, b) => Math.abs(b.change_percent) - Math.abs(a.change_percent))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Overview Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Income Comparison */}
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-green-800">Income</h4>
            <div className="flex items-center space-x-1">
              {getChangeIcon(comparisonData.comparison.income_change)}
              <span
                className={`text-sm font-medium ${getChangeColor(
                  comparisonData.comparison.income_change_percent
                )}`}
              >
                {formatPercentage(comparisonData.comparison.income_change_percent)}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-2xl font-bold text-green-900">
              {formatCurrency(comparisonData.current.income)}
            </div>
            <div className="text-sm text-green-700">
              vs {formatCurrency(comparisonData.previous.income)} previously
            </div>
            <div
              className={`text-sm font-medium ${getChangeColor(
                comparisonData.comparison.income_change_percent
              )}`}
            >
              {comparisonData.comparison.income_change >= 0 ? "+" : ""}
              {formatCurrency(comparisonData.comparison.income_change)} change
            </div>
          </div>
        </div>

        {/* Expenses Comparison */}
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-red-800">Expenses</h4>
            <div className="flex items-center space-x-1">
              {getChangeIcon(comparisonData.comparison.expense_change)}
              <span
                className={`text-sm font-medium ${getChangeColor(
                  comparisonData.comparison.expense_change_percent,
                  true
                )}`}
              >
                {formatPercentage(comparisonData.comparison.expense_change_percent)}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-2xl font-bold text-red-900">
              {formatCurrency(comparisonData.current.expenses)}
            </div>
            <div className="text-sm text-red-700">
              vs {formatCurrency(comparisonData.previous.expenses)} previously
            </div>
            <div
              className={`text-sm font-medium ${getChangeColor(
                comparisonData.comparison.expense_change_percent,
                true
              )}`}
            >
              {comparisonData.comparison.expense_change >= 0 ? "+" : ""}
              {formatCurrency(comparisonData.comparison.expense_change)} change
            </div>
          </div>
        </div>

        {/* Net Income Comparison */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-blue-800">Net Income</h4>
            <div className="flex items-center space-x-1">
              {getChangeIcon(comparisonData.comparison.net_income_change)}
              <span
                className={`text-sm font-medium ${getChangeColor(
                  comparisonData.comparison.net_income_change_percent
                )}`}
              >
                {formatPercentage(comparisonData.comparison.net_income_change_percent)}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-2xl font-bold text-blue-900">
              {formatCurrency(comparisonData.current.net_income)}
            </div>
            <div className="text-sm text-blue-700">
              vs {formatCurrency(comparisonData.previous.net_income)} previously
            </div>
            <div
              className={`text-sm font-medium ${getChangeColor(
                comparisonData.comparison.net_income_change_percent
              )}`}
            >
              {comparisonData.comparison.net_income_change >= 0 ? "+" : ""}
              {formatCurrency(comparisonData.comparison.net_income_change)} change
            </div>
          </div>
        </div>
      </div>

      {/* Period Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
            Current Period ({comparisonData.current.period})
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Transactions:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {comparisonData.current.transaction_count}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Categories:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {Object.keys(comparisonData.current.categories).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Avg per transaction:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatCurrency(
                  comparisonData.current.expenses / comparisonData.current.transaction_count
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
            Previous Period ({comparisonData.previous.period})
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Transactions:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {comparisonData.previous.transaction_count}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Categories:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {Object.keys(comparisonData.previous.categories).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Avg per transaction:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatCurrency(
                  comparisonData.previous.expenses / comparisonData.previous.transaction_count
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Count Change */}
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900 dark:text-white">Transaction Activity</h4>
          <div className="flex items-center space-x-2">
            {getChangeIcon(comparisonData.comparison.transaction_count_change)}
            <span
              className={`font-medium ${
                comparisonData.comparison.transaction_count_change > 0
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-300"
              }`}
            >
              {comparisonData.comparison.transaction_count_change > 0 ? "+" : ""}
              {comparisonData.comparison.transaction_count_change} transactions
            </span>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          {comparisonData.comparison.transaction_count_change > 0
            ? "You had more transactions this period compared to the previous period."
            : comparisonData.comparison.transaction_count_change < 0
            ? "You had fewer transactions this period compared to the previous period."
            : "Transaction count remained the same between periods."}
        </p>
      </div>

      {/* Category Changes */}
      {showDetails && significantChanges.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Significant Category Changes</h4>
              <button
                onClick={() => setShowCategoryDetails(!showCategoryDetails)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showCategoryDetails ? "Hide Details" : "Show Details"}
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {significantChanges
              .slice(0, showCategoryDetails ? 10 : 5)
              .map((change: CategoryComparison, index: number) => (
                <div key={index} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {change.category_name}
                          {change.is_new && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              New
                            </span>
                          )}
                          {change.is_gone && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              Gone
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatCurrency(change.current_amount)} vs{" "}
                          {formatCurrency(change.previous_amount)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {getChangeIcon(change.change)}
                      <div className="text-right">
                        <div
                          className={`font-medium ${getChangeColor(change.change_percent, true)}`}
                        >
                          {change.change >= 0 ? "+" : ""}
                          {formatCurrency(change.change)}
                        </div>
                        <div className={`text-sm ${getChangeColor(change.change_percent, true)}`}>
                          {formatPercentage(change.change_percent)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {!showCategoryDetails && significantChanges.length > 5 && (
            <div className="px-4 py-2 bg-gray-50 text-center">
              <button
                onClick={() => setShowCategoryDetails(true)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Show {significantChanges.length - 5} more changes
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
