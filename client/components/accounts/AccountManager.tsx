// app/accounts/manager.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AccountForm, { AccountFormData } from "@/components/accounts/AccountForm";
import { createAccount, updateAccount, deleteAccount } from "@/app/actions/accounts";

import { Account, AccountsResponse, AccountSummary } from "@/lib/types/accounts";
import { User } from "@/lib/types/user";



interface AccountManagerProps {
  accountsData: AccountsResponse;
  summary: AccountSummary;
  user?: User;
}

export default function AccountManager({ accountsData, summary }: AccountManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  // Clear messages after timeout
  const clearMessages = () => {
    setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 5000);
  };

  // Transform form data to API format
  const transformFormData = (formData: AccountFormData): Partial<Account> => {
    const apiData: Partial<Account> = {
      account_name: formData.account_name,
      account_type: formData.account_type,
      bank_name: formData.bank_name,
      currency: formData.currency,
    };

    // Add optional fields if they exist
    if (formData.account_number_masked) {
      apiData.account_number_masked = formData.account_number_masked;
    }
    if (formData.routing_number) {
      apiData.routing_number = formData.routing_number;
    }
    if (formData.current_balance !== undefined && formData.current_balance !== null && formData.current_balance !== '') {
      const balance = typeof formData.current_balance === 'string' 
        ? parseFloat(formData.current_balance) 
        : formData.current_balance;
      if (!isNaN(balance)) {
        apiData.current_balance = balance;
      }
    }

    return apiData;
  };

  const handleCreateAccount = async (data: AccountFormData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await createAccount(transformFormData(data));
      if (result.success) {
        setShowForm(false);
        setSuccess("Account created successfully!");
        clearMessages();
        router.refresh();
      } else {
        setError(result.error || "Failed to create account");
        clearMessages();
      }
    } catch (error) {
      console.error("Failed to create account:", error);
      setError("Failed to create account. Please try again.");
      clearMessages();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAccount = async (data: AccountFormData) => {
    if (!editingAccount) return;

    setLoading(true);
    setError(null);
    try {
      const result = await updateAccount(editingAccount.id, transformFormData(data));
      if (result.success) {
        setEditingAccount(null);
        setSuccess("Account updated successfully!");
        clearMessages();
        router.refresh();
      } else {
        setError(result.error || "Failed to update account");
        clearMessages();
      }
    } catch (error) {
      console.error("Failed to update account:", error);
      setError("Failed to update account. Please try again.");
      clearMessages();
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (id: string, accountName: string) => {
    if (
      !confirm(`Are you sure you want to delete "${accountName}"? This action cannot be undone.`)
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await deleteAccount(id);
      if (result.success) {
        setSuccess("Account deleted successfully!");
        clearMessages();
        router.refresh();
      } else {
        setError(result.error || "Failed to delete account");
        clearMessages();
      }
    } catch (error) {
      console.error("Failed to delete account:", error);
      setError("Failed to delete account. Please try again.");
      clearMessages();
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getAccountTypeLabel = (accountType: string) => {
    const typeMap: { [key: string]: string } = {
      checking: "Checking",
      savings: "Savings",
      credit_card: "Credit Card",
      investment: "Investment",
      loan: "Loan",
      other: "Other",
    };
    return typeMap[accountType] || accountType;
  };

  const getAccountTypeColor = (accountType: string) => {
    const colorMap: { [key: string]: string } = {
      checking: "bg-blue-100 text-blue-800",
      savings: "bg-green-100 text-green-800",
      credit_card: "bg-red-100 text-red-800",
      investment: "bg-purple-100 text-purple-800",
      loan: "bg-orange-100 text-orange-800",
      other: "bg-gray-100 text-gray-800",
    };
    return colorMap[accountType] || "bg-gray-100 text-gray-800";
  };

  // Error/Success Messages Component
  const MessageDisplay = () => {
    if (!error && !success) return null;

    return (
      <div
        className={`p-4 rounded-md mb-4 ${
          error ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"
        }`}
        role="alert"
        aria-live="polite"
      >
        <div className={`text-sm ${error ? "text-red-800" : "text-green-800"}`}>
          {error || success}
        </div>
      </div>
    );
  };

  // Validate required data
  if (!accountsData || !summary) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">Error loading account data</div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="space-y-6">
        <MessageDisplay />
        <AccountForm onSubmit={handleCreateAccount} onCancel={() => setShowForm(false)} />
      </div>
    );
  }

  if (editingAccount) {
    return (
      <div className="space-y-6">
        <MessageDisplay />
        <AccountForm
          onSubmit={handleUpdateAccount}
          onCancel={() => setEditingAccount(null)}
          initialData={editingAccount}
          isEdit={true}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MessageDisplay />

      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Your Accounts</h1>
          <p className="text-sm text-gray-500">{summary?.total_accounts || 0} total accounts</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowForm(true)}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Add new account"
          >
            + Add Account
          </button>
        </div>
      </div>

      {/* Account Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-gray-500">Total Balance</div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(summary?.total_balance || 0)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-gray-500">Active Accounts</div>
          <div className="text-2xl font-bold text-blue-600">{summary?.active_accounts || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-gray-500">Total Accounts</div>
          <div className="text-2xl font-bold text-gray-900">{summary?.total_accounts || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-gray-500">Account Types</div>
          <div className="text-2xl font-bold text-purple-600">
            {Array.isArray(summary?.by_type) ? summary.by_type.length : 0}
          </div>
        </div>
      </div>

      {/* Account Types Breakdown */}
      {Array.isArray(summary?.by_type) && summary.by_type.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Accounts by Type</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {summary.by_type.map((typeStats) => (
              <div key={typeStats.account_type} className="p-4 border rounded-md">
                <div className="flex justify-between items-center">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getAccountTypeColor(
                      typeStats.account_type
                    )}`}
                  >
                    {getAccountTypeLabel(typeStats.account_type)}
                  </span>
                  <span className="text-sm text-gray-500">{typeStats.count} accounts</span>
                </div>
                <div className="text-lg font-semibold text-gray-900 mt-2">
                  {formatCurrency(typeStats.total_balance)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accounts List */}
      <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
        {Array.isArray(accountsData?.data) && accountsData.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {accountsData.data.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900">
                          {account.account_name}
                        </div>
                        {account.account_number_masked && (
                          <div className="text-sm text-gray-500">
                            ****{account.account_number_masked}
                          </div>
                        )}
                        <div className="text-xs text-gray-400">
                          Created {formatDate(account.created_at)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getAccountTypeColor(
                          account.account_type
                        )}`}
                      >
                        {getAccountTypeLabel(account.account_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{account.bank_name}</td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {account.current_balance !== undefined ? (
                        <span className="text-green-600">
                          {formatCurrency(account.current_balance, account.currency)}
                        </span>
                      ) : (
                        <span className="text-gray-400">Not set</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          account.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {account.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingAccount(account)}
                          disabled={loading}
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                          aria-label={`Edit ${account.account_name}`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(account.id, account.account_name)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                          aria-label={`Delete ${account.account_name}`}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">No accounts found</div>
            <button
              onClick={() => setShowForm(true)}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              aria-label="Add your first account"
            >
              Add Your First Account
            </button>
          </div>
        )}
      </div>

      {/* Pagination */}
      {accountsData && accountsData.pages > 1 && (
        <nav className="flex justify-center" aria-label="Accounts pagination">
          <div className="flex space-x-2">
            {Array.from({ length: accountsData.pages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => router.push(`/accounts?page=${page}`)}
                disabled={loading}
                className={`px-3 py-2 rounded-md text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  page === accountsData.page
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
                aria-label={`Go to page ${page}`}
                aria-current={page === accountsData.page ? "page" : undefined}
              >
                {page}
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
