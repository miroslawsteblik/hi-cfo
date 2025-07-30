
"use client";

import { useState, useCallback } from "react";
import { useErrorHandler } from "@/lib/errors";

const ACCOUNT_TYPES = [
  { value: "checking", label: "Checking Account" },
  { value: "savings", label: "Savings Account" },
  { value: "credit_card", label: "Credit Card" },
  { value: "investment", label: "Investment Account" },
  { value: "loan", label: "Loan Account" },
  { value: "other", label: "Other" },
];

const CURRENCIES = [
  { value: "USD", label: "US Dollar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "GBP", label: "British Pound (GBP)" },
  { value: "CAD", label: "Canadian Dollar (CAD)" },
  { value: "AUD", label: "Australian Dollar (AUD)" },
];

export interface AccountFormData {
  account_name: string;
  account_type: string;
  bank_name: string;
  account_number_masked?: string;
  routing_number?: string;
  current_balance?: number | string;
  currency: string;
}

interface FormErrors {
  account_name?: string;
  bank_name?: string;
  account_number_masked?: string;
  routing_number?: string;
  current_balance?: string;
  general?: string;
}

export interface AccountFormProps {
  onSubmit: (data: AccountFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<AccountFormData>;
  isEdit?: boolean;
}

export default function AccountForm({
  onSubmit,
  onCancel,
  initialData,
  isEdit = false,
}: AccountFormProps) {
  const [formData, setFormData] = useState<AccountFormData>({
    account_name: initialData?.account_name || "",
    account_type: initialData?.account_type || "checking",
    bank_name: initialData?.bank_name || "",
    account_number_masked: initialData?.account_number_masked || "",
    routing_number: initialData?.routing_number || "",
    current_balance: initialData?.current_balance,
    currency: initialData?.currency || "USD",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { handleError, logUserAction } = useErrorHandler();

  // Validation functions
  const validateField = useCallback(
    (name: keyof AccountFormData, value: any): string | undefined => {
      switch (name) {
        case "account_name":
          if (!value?.trim()) return "Account name is required";
          if (value.trim().length < 2) return "Account name must be at least 2 characters";
          if (value.trim().length > 100) return "Account name must be less than 100 characters";
          break;
        case "bank_name":
          if (!value?.trim()) return "Bank name is required";
          if (value.trim().length < 2) return "Bank name must be at least 2 characters";
          if (value.trim().length > 100) return "Bank name must be less than 100 characters";
          break;
        case "account_number_masked":
          if (value && value.trim()) {
            const cleaned = value.replace(/[^0-9]/g, "");
            if (cleaned.length !== 4) return "Please enter exactly the last 4 digits";
          }
          break;
        case "routing_number":
          if (value && value.trim()) {
            const cleaned = value.replace(/[^0-9]/g, "");
            if (cleaned.length !== 9) return "Routing number must be exactly 9 digits";
          }
          break;
        case "current_balance":
          if (value !== undefined && value !== null) {
            const num = typeof value === "string" ? parseFloat(value) : value;
            if (value === "" || isNaN(num)) {
              // Empty string is valid (means no balance set)
              if (value !== "") {
                return "Please enter a valid number";
              }
            } else {
              if (num < -999999999) return "Balance cannot be less than -$999,999,999";
              if (num > 999999999) return "Balance cannot be more than $999,999,999";
            }
          }
          break;
        default:
          break;
      }
      return undefined;
    },
    []
  );

  const validateForm = useCallback((): FormErrors => {
    const newErrors: FormErrors = {};

    Object.keys(formData).forEach((key) => {
      const error = validateField(
        key as keyof AccountFormData,
        formData[key as keyof AccountFormData]
      );
      if (error) {
        newErrors[key as keyof FormErrors] = error;
      }
    });

    return newErrors;
  }, [formData, validateField]);

  const handleFieldChange = useCallback(
    (field: keyof AccountFormData, value: any) => {
      setHasUnsavedChanges(true);
      setFormData((prev) => ({ ...prev, [field]: value }));

      // Clear field error on change
      if (errors[field as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [errors]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      logUserAction(isEdit ? "account_form_update_attempt" : "account_form_create_attempt", {
        accountType: formData.account_type,
        bankName: formData.bank_name.substring(0, 10), // Partial for privacy
      });

      // Validate all fields
      const formErrors = validateForm();
      if (Object.keys(formErrors).length > 0) {
        setErrors(formErrors);
        return;
      }

      // Prepare data for submission
      const submitData: AccountFormData = {
        account_name: formData.account_name.trim(),
        account_type: formData.account_type,
        bank_name: formData.bank_name.trim(),
        currency: formData.currency,
      };

      // Add optional fields if they have valid values
      if (formData.account_number_masked?.trim()) {
        const cleaned = formData.account_number_masked.replace(/[^0-9]/g, "");
        submitData.account_number_masked = cleaned;
      }
      if (formData.routing_number?.trim()) {
        const cleaned = formData.routing_number.replace(/[^0-9]/g, "");
        submitData.routing_number = cleaned;
      }
      if (
        formData.current_balance !== undefined &&
        formData.current_balance !== null &&
        formData.current_balance !== ""
      ) {
        const balance =
          typeof formData.current_balance === "string"
            ? parseFloat(formData.current_balance)
            : formData.current_balance;
        if (!isNaN(balance)) {
          submitData.current_balance = balance;
        }
      }

      await onSubmit(submitData);
      setHasUnsavedChanges(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save account";
      setErrors({ general: errorMessage });
      await handleError(err instanceof Error ? err : new Error(errorMessage), {
        component: "AccountForm",
        action: isEdit ? "update_account" : "create_account",
        formData: {
          ...formData,
          account_number_masked: "[REDACTED]",
          routing_number: "[REDACTED]",
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (
      hasUnsavedChanges &&
      !confirm("You have unsaved changes. Are you sure you want to cancel?")
    ) {
      return;
    }
    onCancel();
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        {isEdit ? "Edit Account" : "Add New Account"}
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
            onChange={(e) => handleFieldChange("account_name", e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.account_name
                ? "border-red-300 focus:ring-red-500"
                : "border-gray-300 focus:ring-blue-500"
            }`}
            placeholder="e.g., Chase Checking, Wells Fargo Savings"
            maxLength={100}
            required
            aria-describedby="account_name_help account_name_error"
          />
          <p id="account_name_help" className="text-xs text-gray-500 mt-1">
            Give your account a memorable name
          </p>
          {errors.account_name && (
            <p id="account_name_error" className="text-xs text-red-600 mt-1" role="alert">
              {errors.account_name}
            </p>
          )}
        </div>

        {/* Account Type */}
        <div>
          <label htmlFor="account_type" className="block text-sm font-medium text-gray-700 mb-2">
            Account Type *
          </label>
          <select
            id="account_type"
            value={formData.account_type}
            onChange={(e) => setFormData((prev) => ({ ...prev, account_type: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            required
          >
            {ACCOUNT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Bank Name */}
        <div>
          <label htmlFor="bank_name" className="block text-sm font-medium text-gray-700 mb-2">
            Financial Institution *
          </label>
          <input
            type="text"
            id="bank_name"
            value={formData.bank_name}
            onChange={(e) => handleFieldChange("bank_name", e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.bank_name
                ? "border-red-300 focus:ring-red-500"
                : "border-gray-300 focus:ring-blue-500"
            }`}
            placeholder="e.g., Chase, Wells Fargo, Bank of America"
            maxLength={100}
            required
            aria-describedby="bank_name_error"
          />
          {errors.bank_name && (
            <p id="bank_name_error" className="text-xs text-red-600 mt-1" role="alert">
              {errors.bank_name}
            </p>
          )}
        </div>

        {/* Account Number (Masked) */}
        <div>
          <label
            htmlFor="account_number_masked"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Account Number (Last 4 digits)
          </label>
          <input
            type="text"
            id="account_number_masked"
            value={formData.account_number_masked}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, "").slice(0, 4);
              handleFieldChange("account_number_masked", value);
            }}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.account_number_masked
                ? "border-red-300 focus:ring-red-500"
                : "border-gray-300 focus:ring-blue-500"
            }`}
            placeholder="1234"
            maxLength={4}
            aria-describedby="account_number_help account_number_error"
          />
          <p id="account_number_help" className="text-xs text-gray-500 mt-1">
            For security, only enter the last 4 digits
          </p>
          {errors.account_number_masked && (
            <p id="account_number_error" className="text-xs text-red-600 mt-1" role="alert">
              {errors.account_number_masked}
            </p>
          )}
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
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, "").slice(0, 9);
              handleFieldChange("routing_number", value);
            }}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.routing_number
                ? "border-red-300 focus:ring-red-500"
                : "border-gray-300 focus:ring-blue-500"
            }`}
            placeholder="123456789"
            maxLength={9}
            aria-describedby="routing_number_help routing_number_error"
          />
          <p id="routing_number_help" className="text-xs text-gray-500 mt-1">
            Optional - 9-digit number for ACH transfers
          </p>
          {errors.routing_number && (
            <p id="routing_number_error" className="text-xs text-red-600 mt-1" role="alert">
              {errors.routing_number}
            </p>
          )}
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
            value={formData.current_balance ?? ""}
            onChange={(e) => {
              const value = e.target.value === "" ? undefined : e.target.value;
              handleFieldChange("current_balance", value);
            }}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.current_balance
                ? "border-red-300 focus:ring-red-500"
                : "border-gray-300 focus:ring-blue-500"
            }`}
            placeholder="0.00"
            min="-999999999"
            max="999999999"
            aria-describedby="current_balance_help current_balance_error"
          />
          <p id="current_balance_help" className="text-xs text-gray-500 mt-1">
            Optional - leave blank if unknown. Negative values allowed for credit accounts.
          </p>
          {errors.current_balance && (
            <p id="current_balance_error" className="text-xs text-red-600 mt-1" role="alert">
              {errors.current_balance}
            </p>
          )}
        </div>

        {/* Currency */}
        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
            Currency *
          </label>
          <select
            id="currency"
            value={formData.currency}
            onChange={(e) => handleFieldChange("currency", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            required
          >
            {CURRENCIES.map((currency) => (
              <option key={currency.value} value={currency.value}>
                {currency.label}
              </option>
            ))}
          </select>
        </div>

        {errors.general && (
          <div
            className="text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200"
            role="alert"
          >
            {errors.general}
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
            aria-label="Cancel form"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || Object.keys(errors).length > 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={isEdit ? "Update account" : "Create account"}
          >
            {loading ? "Saving..." : isEdit ? "Update Account" : "Create Account"}
          </button>
        </div>
      </form>
    </div>
  );
}
