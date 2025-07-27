// components/transactions/TransactionHeader.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { TransactionListItem } from "@/lib/types/transactions";

interface TransactionHeaderProps {
  total: number;
  uncategorizedCount: number;
  currentPage: number;
  totalPages: number;
  bulkSelectMode: boolean;
  selectedCount: number;
  onImport: () => void;
  onExport: () => void;
  onAnalyze: () => void;
  onBulkMode: () => void;
  onSettings: () => void;
  onFiltersToggle: () => void;
  showFilters: boolean;
  isAnalyzing: boolean;
  hasTransactions: boolean;
}

export default function TransactionHeader({
  total,
  uncategorizedCount,
  currentPage,
  totalPages,
  bulkSelectMode,
  selectedCount,
  onImport,
  onExport,
  onAnalyze,
  onBulkMode,
  onSettings,
  onFiltersToggle,
  showFilters,
  isAnalyzing,
  hasTransactions,
}: TransactionHeaderProps) {
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const MenuItem = ({ onClick, icon, children, disabled = false, variant = "default" }: {
    onClick: () => void;
    icon: React.ReactNode;
    children: React.ReactNode;
    disabled?: boolean;
    variant?: "default" | "primary" | "success" | "warning";
  }) => {
    const getVariantClasses = () => {
      switch (variant) {
        case "primary":
          return "text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20";
        case "success":
          return "text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20";
        case "warning":
          return "text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20";
        default:
          return "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700";
      }
    };

    return (
      <button
        onClick={() => {
          onClick();
          setShowActionsMenu(false);
        }}
        disabled={disabled}
        className={`w-full flex items-center px-4 py-2 text-sm ${getVariantClasses()} ${
          disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50 dark:hover:bg-gray-700"
        }`}
      >
        <div className="w-4 h-4 mr-3">{icon}</div>
        {children}
      </button>
    );
  };

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Title and stats */}
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Transactions</h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
              <span>{total.toLocaleString()} total</span>
              {uncategorizedCount > 0 && (
                <span className="text-amber-600 dark:text-amber-400">
                  {uncategorizedCount} uncategorized
                </span>
              )}
              {totalPages > 1 && (
                <span>Page {currentPage} of {totalPages}</span>
              )}
              {bulkSelectMode && selectedCount > 0 && (
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  {selectedCount} selected
                </span>
              )}
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-3">
            {/* Filters Toggle */}
            <button
              onClick={onFiltersToggle}
              className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                showFilters
                  ? "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/30"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z"
                />
              </svg>
              Filters
            </button>

            {/* Bulk Mode Toggle */}
            {hasTransactions && (
              <button
                onClick={onBulkMode}
                className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  bulkSelectMode
                    ? "bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/30"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {bulkSelectMode ? "Exit Bulk" : "Bulk Edit"}
              </button>
            )}

            {/* Actions Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowActionsMenu(!showActionsMenu)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-600 rounded-md hover:bg-blue-700 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
              >
                Actions
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {showActionsMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black dark:ring-white ring-opacity-5 dark:ring-opacity-10 z-50">
                  <div className="py-1">
                    <MenuItem
                      onClick={onImport}
                      variant="primary"
                      icon={
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                      }
                    >
                      Import OFX File
                    </MenuItem>

                    <MenuItem
                      onClick={onExport}
                      variant="success"
                      disabled={!hasTransactions}
                      icon={
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                          />
                        </svg>
                      }
                    >
                      Export to CSV
                    </MenuItem>

                    <MenuItem
                      onClick={onAnalyze}
                      variant="warning"
                      disabled={!hasTransactions || isAnalyzing}
                      icon={
                        isAnalyzing ? (
                          <svg className="animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                        ) : (
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                            />
                          </svg>
                        )
                      }
                    >
                      {isAnalyzing ? "Analyzing..." : "Analyze Categories"}
                    </MenuItem>

                    <div className="border-t border-gray-100 my-1" />

                    <MenuItem
                      onClick={onSettings}
                      icon={
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                          />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      }
                    >
                      Settings
                    </MenuItem>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}