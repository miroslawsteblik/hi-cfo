// components/transactions/CategoryAssignment.tsx
"use client";

import { useState, useEffect } from "react";
import { type CategorizationSettings, CategorySuggestion} from "@/lib/types/transactions";
import { testTransactionCategorization, getCategorizationSettings, updateCategorizationSettings } from "@/app/actions/transactions";
import { CategoryAssignmentProps } from "@/lib/types/categories";

export default function CategoryAssignment({
  categories,
  selectedCategoryId = "",
  merchantName,
  description,
  showSuggestion = true,
  onCategoryChange,
  disabled = false,
  size = "md",
}: CategoryAssignmentProps) {
  // Ensure categories is always an array
  const safeCategories = Array.isArray(categories) ? categories : [];
  
  const [suggestion, setSuggestion] = useState<CategorySuggestion | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [showSuggestionDetails, setShowSuggestionDetails] = useState(false);

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-2",
    lg: "text-base px-4 py-3",
  };

  // Get categorization suggestion when component mounts or merchant name changes
  useEffect(() => {
    if (showSuggestion && (merchantName || description) && !selectedCategoryId) {
      getSuggestion();
    }
  }, [merchantName, description, showSuggestion]);

  const getSuggestion = async () => {
    const searchText = merchantName || description;
    if (!searchText) return;

    setLoadingSuggestion(true);

    try {
      const result = await testTransactionCategorization(searchText, true);

      if (result.success && result.data?.result) {
        setSuggestion({
          category_id: result.data.result.category_id,
          category_name: result.data.result.category_name,
          confidence: result.data.result.confidence,
          match_method: result.data.result.similarity_type,
        });
      }
    } catch (error) {
      console.error("Failed to get category suggestion:", error);
    } finally {
      setLoadingSuggestion(false);
    }
  };

  const applySuggestion = () => {
    if (suggestion) {
      onCategoryChange(suggestion.category_id);
      setSuggestion(null);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600";
    if (confidence >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.6) return "Medium";
    return "Low";
  };

  return (
    <div className="space-y-2">
      {/* Category Selection Dropdown */}
      <div className="relative">
        <select
          value={selectedCategoryId}
          onChange={(e) => onCategoryChange(e.target.value)}
          disabled={disabled || loadingSuggestion}
          className={`
            w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500
            ${sizeClasses[size]}
            ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white"}
            ${loadingSuggestion ? "opacity-50" : ""}
          `}
        >
          <option value="">{loadingSuggestion ? "Getting suggestion..." : "Select category..."}</option>

          {/* Group categories by type */}
          <optgroup label="Income">
            {safeCategories
              .filter((cat) => cat.category_type === "income")
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </optgroup>

          <optgroup label="Expenses">
            {safeCategories
              .filter((cat) => cat.category_type === "expense")
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </optgroup>

          <optgroup label="Transfers">
            {safeCategories
              .filter((cat) => cat.category_type === "transfer")
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </optgroup>
        </select>

        {/* Loading indicator */}
        {loadingSuggestion && (
          <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
            <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
        )}
      </div>

      {/* Category Suggestion */}
      {suggestion && !selectedCategoryId && showSuggestion && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <span className="text-sm font-medium text-blue-900">Suggested: {suggestion.category_name}</span>
                <span className={`text-xs font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                  {getConfidenceLabel(suggestion.confidence)} ({Math.round(suggestion.confidence * 100)}%)
                </span>
              </div>

              {showSuggestionDetails && (
                <div className="mt-2 text-xs text-blue-700">
                  Matched via: {suggestion.match_method}
                  {merchantName && <div>Search term: "{merchantName}"</div>}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowSuggestionDetails(!showSuggestionDetails)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                {showSuggestionDetails ? "Less" : "More"}
              </button>
              <button onClick={applySuggestion} className="bg-blue-600 text-white text-xs px-3 py-1 rounded hover:bg-blue-700">
                Apply
              </button>
              <button onClick={() => setSuggestion(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Category Display */}
      {selectedCategoryId && (
        <div className="text-xs text-gray-600">
          Selected: {safeCategories.find((c) => c.id === selectedCategoryId)?.name || "Unknown category"}
        </div>
      )}
    </div>
  );
}

// Categorization Settings Component
interface CategorizationSettingsProps {
  onClose: () => void;
}

export function CategorizationSettings({ onClose }: CategorizationSettingsProps) {
  const [settings, setSettings] = useState<CategorizationSettings>({
    confidence_threshold: 0.5,
    auto_categorize_on_upload: true,
    enabled_methods: ["keyword", "jaccard", "cosine_tfidf"],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const result = await getCategorizationSettings();
      if (result.success && result.data) {
        setSettings(result.data);
      }
    } catch (err) {
      setError("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setError(null);

    try {
      const result = await updateCategorizationSettings(settings);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError(result.error || "Failed to save settings");
      }
    } catch (err) {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleMethodToggle = (method: string) => {
    setSettings((prev) => ({
      ...prev,
      enabled_methods: prev.enabled_methods.includes(method)
        ? prev.enabled_methods.filter((m) => m !== method)
        : [...prev.enabled_methods, method],
    }));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">Categorization Settings</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-3">
            <div className="text-green-800 text-sm">Settings saved successfully!</div>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
            <div className="text-red-800 text-sm">{error}</div>
          </div>
        )}

        <div className="space-y-6">
          {/* Confidence Threshold */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confidence Threshold: {Math.round(settings.confidence_threshold * 100)}%
            </label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={settings.confidence_threshold}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  confidence_threshold: parseFloat(e.target.value),
                }))
              }
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Conservative (10%)</span>
              <span>Aggressive (100%)</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">Higher values require more confidence before auto-categorizing</p>
          </div>

          {/* Auto Categorize on Upload */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Auto-categorize on upload</label>
              <p className="text-xs text-gray-600">Automatically categorize transactions during bulk imports</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.auto_categorize_on_upload}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    auto_categorize_on_upload: e.target.checked,
                  }))
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Enabled Methods */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Categorization Methods</label>
            <div className="space-y-2">
              {[
                { id: "keyword", name: "Keyword Matching", description: "Direct keyword matches" },
                {
                  id: "jaccard",
                  name: "Jaccard Similarity",
                  description: "Token-based similarity",
                },
                {
                  id: "levenshtein",
                  name: "Levenshtein Distance",
                  description: "Character-level similarity",
                },
                {
                  id: "cosine_tfidf",
                  name: "TF-IDF Cosine",
                  description: "Weighted term similarity",
                },
              ].map((method) => (
                <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{method.name}</div>
                    <div className="text-xs text-gray-600">{method.description}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enabled_methods.includes(method.id)}
                    onChange={() => handleMethodToggle(method.id)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
            Cancel
          </button>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
