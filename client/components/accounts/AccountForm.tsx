// components/accounts/AccountForm.tsx
'use client';

import { useState } from 'react';
import {  AccountFormData, AccountFormProps } from '@/lib/types/accounts';
import { useErrorHandler } from '@/lib/errors';


const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Checking Account' },
  { value: 'savings', label: 'Savings Account' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'investment', label: 'Investment Account' },
  { value: 'loan', label: 'Loan Account' },
  { value: 'other', label: 'Other' },
];

const CURRENCIES = [
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
  { value: 'CAD', label: 'Canadian Dollar (CAD)' },
  { value: 'AUD', label: 'Australian Dollar (AUD)' },
];

export default function AccountForm({ onSubmit, onCancel, initialData, isEdit = false }: AccountFormProps) {
  const [formData, setFormData] = useState<AccountFormData>({
    account_name: initialData?.account_name || '',
    account_type: initialData?.account_type || 'checking',
    bank_name: initialData?.bank_name || '',
    account_number_masked: initialData?.account_number_masked || '',
    routing_number: initialData?.routing_number || '',
    current_balance: initialData?.current_balance || 0,
    currency: initialData?.currency || 'USD',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { handleError, logUserAction } = useErrorHandler();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      logUserAction(isEdit ? 'account_form_update_attempt' : 'account_form_create_attempt', {
        accountType: formData.account_type,
        bankName: formData.bank_name
      });
      
      // Validate required fields
      if (!formData.account_name || !formData.bank_name || !formData.account_type) {
        throw new Error('Please fill in all required fields');
      }

      // Prepare data for submission
      const submitData: AccountFormData = {
        account_name: formData.account_name.trim(),
        account_type: formData.account_type,
        bank_name: formData.bank_name.trim(),
        currency: formData.currency,
      };

      // Add optional fields if they have values
      if (formData.account_number_masked?.trim()) {
        submitData.account_number_masked = formData.account_number_masked.trim();
      }
      if (formData.routing_number?.trim()) {
        submitData.routing_number = formData.routing_number.trim();
      }
      if (formData.current_balance !== undefined && formData.current_balance !== 0) {
        submitData.current_balance = formData.current_balance;
      }

      await onSubmit(submitData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save account';
      setError(errorMessage);
      await handleError(err instanceof Error ? err : new Error(errorMessage), {
        component: 'AccountForm',
        action: isEdit ? 'update_account' : 'create_account',
        formData: { ...formData, account_number_masked: '[REDACTED]' } // Don't log sensitive data
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        {isEdit ? 'Edit Account' : 'Add New Account'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Account Name */}
        <div>
          <label htmlFor="account_name" className="block text-sm font-medium text-gray-700 mb-2">
            Account Name *
          </label>
          <input
            type="text"
            id="account_name"
            value={formData.account_name}
            onChange={(e) => setFormData(prev => ({ ...prev, account_name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Chase Checking, Wells Fargo Savings"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Give your account a memorable name
          </p>
        </div>

        {/* Account Type */}
        <div>
          <label htmlFor="account_type" className="block text-sm font-medium text-gray-700 mb-2">
            Account Type *
          </label>
          <select
            id="account_type"
            value={formData.account_type}
            onChange={(e) => setFormData(prev => ({ ...prev, account_type: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            {ACCOUNT_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Bank Name */}
        <div>
          <label htmlFor="bank_name" className="block text-sm font-medium text-gray-700 mb-2">
            Bank Name *
          </label>
          <input
            type="text"
            id="bank_name"
            value={formData.bank_name}
            onChange={(e) => setFormData(prev => ({ ...prev, bank_name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Chase, Wells Fargo, Bank of America"
            required
          />
        </div>

        {/* Account Number (Masked) */}
        <div>
          <label htmlFor="account_number_masked" className="block text-sm font-medium text-gray-700 mb-2">
            Account Number (Last 4 digits)
          </label>
          <input
            type="text"
            id="account_number_masked"
            value={formData.account_number_masked}
            onChange={(e) => setFormData(prev => ({ ...prev, account_number_masked: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="****1234"
            maxLength={20}
          />
          <p className="text-xs text-gray-500 mt-1">
            For security, only enter the last 4 digits
          </p>
        </div>

        {/* Routing Number */}
        <div>
          <label htmlFor="routing_number" className="block text-sm font-medium text-gray-700 mb-2">
            Routing Number
          </label>
          <input
            type="text"
            id="routing_number"
            value={formData.routing_number}
            onChange={(e) => setFormData(prev => ({ ...prev, routing_number: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="123456789"
            maxLength={20}
          />
          <p className="text-xs text-gray-500 mt-1">
            Optional - for ACH transfers
          </p>
        </div>

        {/* Current Balance */}
        <div>
          <label htmlFor="current_balance" className="block text-sm font-medium text-gray-700 mb-2">
            Current Balance
          </label>
          <input
            type="number"
            step="0.01"
            id="current_balance"
            value={formData.current_balance || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, current_balance: parseFloat(e.target.value) || 0 }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
          />
          <p className="text-xs text-gray-500 mt-1">
            Optional - enter your current account balance
          </p>
        </div>

        {/* Currency */}
        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
            Currency
          </label>
          <select
            id="currency"
            value={formData.currency}
            onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CURRENCIES.map(currency => (
              <option key={currency.value} value={currency.value}>
                {currency.label}
              </option>
            ))}
          </select>
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
            {loading ? 'Saving...' : (isEdit ? 'Update Account' : 'Create Account')}
          </button>
        </div>
      </form>
    </div>
  );
}