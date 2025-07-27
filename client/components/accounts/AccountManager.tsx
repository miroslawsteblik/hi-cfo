// app/accounts/manager.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AccountForm from "@/components/accounts/AccountForm";
import { createAccount, updateAccount, deleteAccount } from "@/app/actions/accounts";

import { Account, PagedAccountData, AccountSummary} from "@/lib/types/accounts";
import { User } from '@/lib/types/user';

interface AccountsClientProps {
  initialData: PagedAccountData;
  summary: AccountSummary;
  user: User;
}

export default function AccountsClient({ initialData, summary, user }: AccountsClientProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();


  const handleCreateAccount = async (data: any) => {
    setLoading(true);
    try {
      const result = await createAccount(data);
      if (result.success) {
        setShowForm(false);
        router.refresh(); // Refresh the page to show new account
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Failed to create account:", error);
      alert("Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAccount = async (data: any) => {
    if (!editingAccount) return;

    setLoading(true);
    try {
      const result = await updateAccount(editingAccount.id, data);
      if (result.success) {
        setEditingAccount(null);
        router.refresh(); // Refresh to show updated account
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Failed to update account:", error);
      alert("Failed to update account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (id: string, accountName: string) => {
    if (!confirm(`Are you sure you want to  "${accountName}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const result = await deleteAccount(id);
      if (result.success) {
        router.refresh(); // Refresh to show updated list
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Failed to delete account:", error);
      alert("Failed to delete account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
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

  if (showForm) {
    return (
      <div className="space-y-6">
        <AccountForm onSubmit={handleCreateAccount} onCancel={() => setShowForm(false)} />
      </div>
    );
  }

  if (editingAccount) {
    return (
      <div className="space-y-6">
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
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Your Accounts</h2>
          <p className="text-sm text-gray-500">{summary.total_accounts} total accounts</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            {formatCurrency(summary.total_balance)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-gray-500">Active Accounts</div>
          <div className="text-2xl font-bold text-blue-600">{summary.active_accounts}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-gray-500">Total Accounts</div>
          <div className="text-2xl font-bold text-gray-900">{summary.total_accounts}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-gray-500">Account Types</div>
          <div className="text-2xl font-bold text-purple-600">{Array.isArray(summary.by_type) ? summary.by_type.length : 0}</div>
        </div>
      </div>

      {/* Account Types Breakdown */}
      {Array.isArray(summary.by_type) && summary.by_type.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Accounts by Type</h3>
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
        {Array.isArray(initialData.data) && initialData.data.length > 0 ? (
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
                {initialData.data.map((account) => (
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
                          {formatCurrency(account.current_balance)}
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
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(account.id, account.account_name)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
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
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Add Your First Account
            </button>
          </div>
        )}
      </div>

      {/* Pagination */}
      {initialData.pages > 1 && (
        <div className="flex justify-center">
          <div className="flex space-x-2">
            {Array.from({ length: initialData.pages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => router.push(`/accounts?page=${page}`)}
                className={`px-3 py-2 rounded-md text-sm ${
                  page === initialData.page
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
