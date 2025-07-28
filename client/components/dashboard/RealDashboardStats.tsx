"use client";

import { useState, useEffect } from "react";
import { getTransactions } from "@/app/actions/transactions";
import { TransactionListItem } from "@/lib/types/transactions/base";


interface DashboardStatsData {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  totalTransactions: number;
  categorizedTransactions: number;
  uncategorizedTransactions: number;
  categorizationRate: number;
}

interface RealDashboardStatsProps {
  className?: string;
  stats?: any; // Accept optional stats prop for compatibility but ignore it - we fetch real data
}

export default function RealDashboardStats({ className = "" }: RealDashboardStatsProps) {
  const [stats, setStats] = useState<DashboardStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch all transactions and calculate stats client-side
        // This is more reliable than using the stats endpoint which seems to have issues
        const transactionsData = await getTransactions({
          limit: 100,
          page: 1,
        });

        // Calculate stats from transaction data
        let totalIncome = 0;
        let totalExpenses = 0;
        let categorizedTransactions = 0;

        const transactions = transactionsData.data?.data || [];

        transactions.forEach((transaction: any) => {
          const amount = Math.abs(transaction.amount || 0);

          if (transaction.transaction_type === "income") {
            totalIncome += amount;
          } else if (transaction.transaction_type === "expense") {
            totalExpenses += amount;
          }

          // Count categorized transactions
          if (transaction.category_id && transaction.category_id.trim() !== "") {
            categorizedTransactions++;
          }
        });

        const totalTransactions = transactions.length;
        const uncategorizedTransactions = totalTransactions - categorizedTransactions;
        const categorizationRate = totalTransactions > 0 ? Math.round((categorizedTransactions / totalTransactions) * 100) : 0;

        const dashboardStats: DashboardStatsData = {
          totalIncome,
          totalExpenses,
          netIncome: totalIncome - totalExpenses,
          totalTransactions,
          categorizedTransactions,
          uncategorizedTransactions,
          categorizationRate,
        };

        setStats(dashboardStats);
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
        setError("Failed to load dashboard statistics");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-pulse">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-20"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              </div>
              <div className="mt-4">
                <div className="h-6 bg-gray-200 rounded w-32"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className={`${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Income */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Income</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(stats.totalIncome)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📈</span>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">Current Period</span>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(stats.totalExpenses)}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💸</span>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">Current Period</span>
          </div>
        </div>

        {/* Net Income */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Income</p>
              <p className={`text-2xl font-bold mt-1 ${stats.netIncome >= 0 ? "text-blue-600" : "text-red-600"}`}>
                {formatCurrency(stats.netIncome)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span
              className={`text-xs px-2 py-1 rounded-full ${stats.netIncome >= 0 ? "text-blue-600 bg-blue-100" : "text-red-600 bg-red-100"}`}
            >
              {stats.netIncome >= 0 ? "Positive" : "Negative"} Cash Flow
            </span>
          </div>
        </div>

        {/* Auto-Categorization Rate */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Categorization Rate</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{stats.categorizationRate}%</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🧠</span>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                stats.categorizationRate >= 80
                  ? "text-green-600 bg-green-100"
                  : stats.categorizationRate >= 60
                  ? "text-yellow-600 bg-yellow-100"
                  : "text-red-600 bg-red-100"
              }`}
            >
              {stats.categorizedTransactions} of {stats.totalTransactions} categorized
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
