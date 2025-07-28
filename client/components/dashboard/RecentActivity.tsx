
import Link from "next/link";
import { TransactionListItem } from "@/lib/types/transactions/base";

interface RecentActivityProps {
  transactions: TransactionListItem[];
  thisMonthTransactions: number;
}

// Helper function to get category icon based on merchant name or category
const getCategoryIcon = (merchantName: string = "", categoryName: string = ""): string => {
  const name = (merchantName + " " + categoryName).toLowerCase();
  
  if (name.includes("grocery") || name.includes("supermarket") || name.includes("food")) return "🛒";
  if (name.includes("gas") || name.includes("fuel") || name.includes("station")) return "⛽";
  if (name.includes("coffee") || name.includes("cafe") || name.includes("restaurant")) return "☕";
  if (name.includes("salary") || name.includes("payroll") || name.includes("income")) return "💰";
  if (name.includes("bank") || name.includes("transfer")) return "🏦";
  if (name.includes("entertainment") || name.includes("movie") || name.includes("netflix")) return "🎬";
  if (name.includes("shopping") || name.includes("amazon") || name.includes("store")) return "🛍️";
  if (name.includes("transport") || name.includes("uber") || name.includes("taxi")) return "🚗";
  if (name.includes("utility") || name.includes("electric") || name.includes("water")) return "🔌";
  if (name.includes("medical") || name.includes("health") || name.includes("pharmacy")) return "🏥";
  
  // Default based on transaction type
  return "💳";
};

// Helper function to get background color for icon
const getIconBgColor = (transactionType: string): string => {
  return transactionType === "income" ? "bg-green-100" : "bg-red-100";
};

// Helper function to format relative time
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  return date.toLocaleDateString();
};

// Helper function to format amount
const formatAmount = (amount: number, transactionType: string): string => {
  const prefix = transactionType === "income" ? "+" : "-";
  return `${prefix}$${Math.abs(amount).toFixed(2)}`;
};

// Helper function to get amount color
const getAmountColor = (transactionType: string): string => {
  return transactionType === "income" ? "text-green-600" : "text-red-600";
};

const RecentActivity: React.FC<RecentActivityProps> = ({ transactions, thisMonthTransactions }) => {
  // Get the 5 most recent transactions
  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        <Link href="/transactions" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
          View All →
        </Link>
      </div>
      
      <div className="space-y-4">
        {recentTransactions.length > 0 ? (
          recentTransactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <div className="flex items-center">
                <div className={`w-8 h-8 ${getIconBgColor(transaction.transaction_type)} rounded-full flex items-center justify-center mr-3`}>
                  <span className="text-xs">
                    {getCategoryIcon(transaction.merchant_name || "", "")}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">
                    {transaction.merchant_name || transaction.description || "Transaction"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatRelativeTime(transaction.transaction_date)}
                  </p>
                </div>
              </div>
              <span className={`${getAmountColor(transaction.transaction_type)} font-medium text-sm`}>
                {formatAmount(transaction.amount, transaction.transaction_type)}
              </span>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No recent transactions found</p>
            <Link href="/transactions" className="text-blue-600 hover:text-blue-700 text-sm mt-2 inline-block">
              Add your first transaction →
            </Link>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600 text-center">
          {thisMonthTransactions} transactions this month
        </p>
      </div>
    </div>
  );
};

export default RecentActivity;