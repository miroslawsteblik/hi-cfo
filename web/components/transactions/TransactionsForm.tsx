// components/transactions/TransactionForm.tsx
"use client";

import { useState, useEffect } from "react";
import { autoCategorizeTransaction } from "@/lib/features/categories";
import { TransactionData, TransactionFormProps } from "@/lib/features/transactions";

export default function TransactionForm({
  accounts,
  categories,
  onSubmit,
  onCancel,
}: TransactionFormProps) {
  console.log("TransactionForm received:", {
    accounts: accounts?.length || "not array",
    categories: categories?.length || "not array",
  });

  const [formData, setFormData] = useState<TransactionData>({
    account_id: "",
    category_id: "",
    transaction_date: new Date().toISOString().split("T")[0],
    description: "",
    amount: 0,
    transaction_type: "expense",
    merchant_name: "",
    memo: "",
    tags: [],
    fit_id: "",
    currency: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [autoCategorizingMerchant, setAutoCategorizingMerchant] = useState(false);
  const [suggestedCategory, setSuggestedCategory] = useState<any>(null);

  // Auto-categorize when merchant name changes
  useEffect(() => {
    const autoCategorizeMerchant = async () => {
      if (formData.merchant_name && formData.merchant_name.length > 2) {
        setAutoCategorizingMerchant(true);
        try {
          const match = await autoCategorizeTransaction(formData.merchant_name);
          if (match && match.confidence > 0.3) {
            // Only suggest if confidence is reasonable
            setSuggestedCategory(match);
            // Auto-select if high confidence
            if (match.confidence > 0.7 && !formData.category_id) {
              setFormData((prev) => ({
                ...prev,
                category_id: match.category_id,
              }));
            }
          } else {
            setSuggestedCategory(null);
          }
        } catch (error) {
          console.error("Auto-categorization failed:", error);
        } finally {
          setAutoCategorizingMerchant(false);
        }
      } else {
        setSuggestedCategory(null);
      }
    };

    const debounceTimer = setTimeout(autoCategorizeMerchant, 500);
    return () => clearTimeout(debounceTimer);
  }, [formData.merchant_name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validate required fields
      if (!formData.account_id || !formData.description || formData.amount === 0) {
        throw new Error("Please fill in all required fields");
      }

      // Convert date to ISO datetime string for backend
      const transactionDate = new Date(formData.transaction_date + "T00:00:00.000Z").toISOString();

      // Convert amount to negative for expenses (following your schema convention)
      const processedData = {
        ...formData,
        transaction_date: transactionDate,
        amount:
          formData.transaction_type === "expense"
            ? -Math.abs(formData.amount)
            : Math.abs(formData.amount),
      };

      await onSubmit(processedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save transaction");
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()],
      }));
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags?.filter((tag) => tag !== tagToRemove) || [],
    }));
  };

  const acceptSuggestedCategory = () => {
    if (suggestedCategory) {
      setFormData((prev) => ({
        ...prev,
        category_id: suggestedCategory.category_id,
      }));
      setSuggestedCategory(null);
    }
  };

  // Safe category filtering with fallback
  const filteredCategories = Array.isArray(categories)
    ? categories.filter((cat) =>
        formData.transaction_type === "income"
          ? cat.category_type === "income"
          : cat.category_type === "expense"
      )
    : [];

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Add New Transaction</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Transaction Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Transaction Type *</label>
          <div className="flex space-x-4">
            {(["expense", "income", "transfer"] as const).map((type) => (
              <label key={type} className="flex items-center">
                <input
                  type="radio"
                  name="transaction_type"
                  value={type}
                  checked={formData.transaction_type === type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      transaction_type: e.target.value as "income" | "expense" | "transfer",
                      category_id: "", // Reset category when type changes
                    }))
                  }
                  className="mr-2"
                />
                <span className="capitalize text-sm text-gray-900 dark:text-white">{type}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Account Selection */}
        <div>
          <label htmlFor="account_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Account *
          </label>
          <select
            id="account_id"
            value={formData.account_id}
            onChange={(e) => setFormData((prev) => ({ ...prev, account_id: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            required
          >
            <option value="">Select an account</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.account_name} ({account.bank_name})
              </option>
            ))}
          </select>
        </div>

        {/* Merchant Name with Auto-Categorization */}
        <div>
          <label htmlFor="merchant_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Merchant/Payee
          </label>
          <input
            type="text"
            id="merchant_name"
            value={formData.merchant_name}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                merchant_name: e.target.value,
              }))
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="Store, company, or person"
          />
          {autoCategorizingMerchant && (
            <div className="mt-1 text-sm text-blue-600 dark:text-blue-400">🤖 Auto-categorizing...</div>
          )}
          {suggestedCategory && (
            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md border border-blue-200 dark:border-blue-700">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                    Suggested: {suggestedCategory.category_name}
                  </span>
                  <div className="text-xs text-blue-700 dark:text-blue-400">
                    Matched "{suggestedCategory.matched_text}" (
                    {Math.round(suggestedCategory.confidence * 100)}% confidence)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={acceptSuggestedCategory}
                  className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                >
                  Accept
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Category Selection */}
        <div>
          <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <select
            id="category_id"
            value={formData.category_id}
            onChange={(e) => setFormData((prev) => ({ ...prev, category_id: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">Select a category</option>
            {filteredCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div>
          <label
            htmlFor="transaction_date"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Date *
          </label>
          <input
            type="date"
            id="transaction_date"
            value={formData.transaction_date}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                transaction_date: e.target.value,
              }))
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            required
          />
        </div>

        {/* Amount */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
            Amount * ({formData.transaction_type === "expense" ? "expense" : "income"})
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            id="amount"
            value={formData.amount}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                amount: parseFloat(e.target.value) || 0,
              }))
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="0.00"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <input
            type="text"
            id="description"
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="What was this transaction for?"
            required
          />
        </div>

        {/* Memo */}
        <div>
          <label htmlFor="memo" className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            id="memo"
            value={formData.memo}
            onChange={(e) => setFormData((prev) => ({ ...prev, memo: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            rows={3}
            placeholder="Additional notes about this transaction"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.tags?.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              className="flex-1 px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add a tag"
            />
            <button
              type="button"
              onClick={addTag}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Add
            </button>
          </div>
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Transaction"}
          </button>
        </div>
      </form>
    </div>
  );
}
