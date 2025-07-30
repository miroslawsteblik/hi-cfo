// components/categories/CategoryForm.tsx
'use client';

import { useState } from 'react';
import {  CategoryFormData, CategoryFormProps } from '@/lib/types/categories';


const CATEGORY_TYPES = [
  { value: 'expense', label: 'Expense', description: 'Money going out' },
  { value: 'income', label: 'Income', description: 'Money coming in' },
  { value: 'transfer', label: 'Transfer', description: 'Moving money between accounts' },
];

const DEFAULT_COLORS = [
  '#4A90E2', '#7ED321', '#F5A623', '#D0021B', '#9013FE', 
  '#F8E71C', '#50E3C2', '#BD10E0', '#9B9B9B', '#417505'
];

const COMMON_ICONS = [
  '🏠', '🛒', '🍔', '⛽', '💡', '🎬', '🏥', '👕', '🎓', '💰'
];

export default function CategoryForm({ onSubmit, onCancel, initialData, isEdit = false }: CategoryFormProps) {
  const [formData, setFormData] = useState<CategoryFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    color: initialData?.color || DEFAULT_COLORS[0],
    icon: initialData?.icon || '',
    category_type: initialData?.category_type || 'expense',
    keywords: initialData?.keywords || [],
    merchant_patterns: initialData?.merchant_patterns || [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [patternInput, setPatternInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.name || !formData.category_type) {
        throw new Error('Please fill in all required fields');
      }

      // Clean up data
      const submitData: CategoryFormData = {
        name: formData.name.trim(),
        category_type: formData.category_type,
        color: formData.color,
        icon: formData.icon?.trim() || undefined,
        description: formData.description?.trim() || undefined,
        keywords: formData.keywords?.filter(k => k.trim()) || [],
        merchant_patterns: formData.merchant_patterns?.filter(p => p.trim()) || [],
      };

      await onSubmit(submitData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !formData.keywords?.includes(keywordInput.trim())) {
      setFormData(prev => ({
        ...prev,
        keywords: [...(prev.keywords || []), keywordInput.trim()]
      }));
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords?.filter(k => k !== keyword) || []
    }));
  };

  const addMerchantPattern = () => {
    if (patternInput.trim() && !formData.merchant_patterns?.includes(patternInput.trim())) {
      setFormData(prev => ({
        ...prev,
        merchant_patterns: [...(prev.merchant_patterns || []), patternInput.trim()]
      }));
      setPatternInput('');
    }
  };

  const removeMerchantPattern = (pattern: string) => {
    setFormData(prev => ({
      ...prev,
      merchant_patterns: prev.merchant_patterns?.filter(p => p !== pattern) || []
    }));
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        {isEdit ? 'Edit Category' : 'Create New Category'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Category Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Category Name *
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="e.g., Groceries, Dining Out, Salary"
            required
          />
        </div>

        {/* Category Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category Type *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {CATEGORY_TYPES.map(type => (
              <label
                key={type.value}
                className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                  formData.category_type === type.value
                    ? 'border-blue-600 ring-2 ring-blue-600 bg-blue-50'
                    : 'border-gray-300 bg-white hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="category_type"
                  value={type.value}
                  checked={formData.category_type === type.value}
                  onChange={(e) => setFormData(prev => ({ ...prev, category_type: e.target.value }))}
                  className="sr-only"
                />
                <div className="flex flex-col">
                  <span className="block text-sm font-medium text-gray-900">
                    {type.label}
                  </span>
                  <span className="block text-sm text-gray-500">
                    {type.description}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            rows={3}
            placeholder="Optional description for this category"
          />
        </div>

        {/* Color and Icon */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  className={`w-8 h-8 rounded-full border-2 ${
                    formData.color === color ? 'border-gray-800 scale-110' : 'border-gray-300'
                  } transition-transform`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Icon Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Icon
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {COMMON_ICONS.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, icon }))}
                  className={`w-8 h-8 text-lg rounded border ${
                    formData.icon === icon ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  } hover:border-blue-300`}
                >
                  {icon}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={formData.icon}
              onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
              className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Or enter custom emoji/icon"
            />
          </div>
        </div>

        {/* Keywords */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Keywords for Auto-Categorization
          </label>
          <p className="text-sm text-gray-500 mb-2">
            Add keywords that might appear in transaction descriptions
          </p>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.keywords?.map(keyword => (
              <span
                key={keyword}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {keyword}
                <button
                  type="button"
                  onClick={() => removeKeyword(keyword)}
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
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
              className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="e.g., grocery, restaurant, gas"
            />
            <button
              type="button"
              onClick={addKeyword}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Add
            </button>
          </div>
        </div>

        {/* Merchant Patterns */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Merchant Patterns
          </label>
          <p className="text-sm text-gray-500 mb-2">
            Add merchant names or patterns to automatically categorize transactions
          </p>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.merchant_patterns?.map(pattern => (
              <span
                key={pattern}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
              >
                {pattern}
                <button
                  type="button"
                  onClick={() => removeMerchantPattern(pattern)}
                  className="ml-1 text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={patternInput}
              onChange={(e) => setPatternInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMerchantPattern())}
              className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="e.g., walmart, starbucks, shell"
            />
            <button
              type="button"
              onClick={addMerchantPattern}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Add
            </button>
          </div>
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

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
            {loading ? 'Saving...' : (isEdit ? 'Update Category' : 'Create Category')}
          </button>
        </div>
      </form>
    </div>
  );
}