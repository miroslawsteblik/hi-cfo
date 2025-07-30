import { Account } from "@/lib/types/accounts/base";
import Link from "next/link";

interface AccountOverviewProps {
  accounts: Account[];
}

// Helper function to get account type icon and background color
const getAccountIcon = (accountType: string): { icon: string; bgColor: string; textColor: string } => {
  const type = accountType.toLowerCase();
  
  if (type.includes("checking") || type.includes("current")) return { icon: "🏦", bgColor: "bg-blue-100", textColor: "text-blue-600" };
  if (type.includes("savings")) return { icon: "💰", bgColor: "bg-green-100", textColor: "text-green-600" };
  if (type.includes("credit")) return { icon: "💳", bgColor: "bg-red-100", textColor: "text-red-600" };
  if (type.includes("investment") || type.includes("brokerage")) return { icon: "📈", bgColor: "bg-purple-100", textColor: "text-purple-600" };
  if (type.includes("loan") || type.includes("mortgage")) return { icon: "🏠", bgColor: "bg-orange-100", textColor: "text-orange-600" };
  
  // Default
  return { icon: "🏦", bgColor: "bg-gray-100", textColor: "text-gray-600" };
};

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

// Helper function to get balance color based on account type and amount
const getBalanceColor = (accountType: string, balance: number): string => {
  const type = accountType.toLowerCase();
  
  if (type.includes("credit")) {
    return balance < 0 ? "text-red-600" : "text-green-600";
  }
  
  return balance >= 0 ? "text-gray-900" : "text-red-600";
};

// Helper function to mask account number
const maskAccountNumber = (accountNumber?: string): string => {
  if (!accountNumber) return "****";
  
  // Show last 4 digits if available
  const lastFour = accountNumber.slice(-4);
  return `****${lastFour}`;
};

const AccountOverview: React.FC<AccountOverviewProps> = ({ accounts }) => {
  // Calculate totals
  const activeAccounts = accounts.filter(account => account.is_active);
  const totalBalance = activeAccounts.reduce((sum, account) => sum + (account.current_balance || 0), 0);
  
  // Limit to top 3 accounts by balance for display
  const displayAccounts = activeAccounts
    .sort((a, b) => Math.abs(b.current_balance || 0) - Math.abs(a.current_balance || 0))
    .slice(0, 3);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Account Overview</h3>
      
      <div className="space-y-4">
        {displayAccounts.length > 0 ? (
          displayAccounts.map((account) => {
            const { icon, bgColor, textColor } = getAccountIcon(account.account_type);
            const balance = account.current_balance || 0;
            
            return (
              <div key={account.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                <div className="flex items-center">
                  <div className={`w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center mr-4`}>
                    <span className="text-lg">{icon}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">{account.account_name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {maskAccountNumber(account.account_number_masked)}
                      {account.bank_name && ` • ${account.bank_name}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${getBalanceColor(account.account_type, balance)}`}>
                    {formatCurrency(balance)}
                  </p>
                  <p className={`text-xs ${textColor}`}>
                    {account.account_type}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🏦</span>
            </div>
            <p className="text-sm mb-2">No accounts found</p>
            <Link href="/accounts" className="text-blue-600 hover:text-blue-700 text-sm">
              Add your first account →
            </Link>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {activeAccounts.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Total Balance</p>
              <p className={`font-semibold ${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totalBalance)}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Active Accounts</p>
              <p className="font-semibold text-gray-900">{activeAccounts.length}</p>
            </div>
          </div>
        </div>
      )}

      <Link
        href="/accounts"
        className="mt-4 w-full inline-flex items-center justify-center px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
      >
        Manage All Accounts
      </Link>
    </div>
  );
};

export default AccountOverview;