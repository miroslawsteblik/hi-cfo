import Link from "next/link";
import { TransactionListItem } from "@/lib/types/transactions/base";
import { Account } from "@/lib/types/accounts/base";

interface AIInsightsProps {
  transactions: TransactionListItem[];
  accounts: Account[];
  totalIncome: number;
  totalExpenses: number;
  categorizedTransactions: number;
  uncategorizedTransactions: number;
}

interface InsightData {
  type: 'positive' | 'warning' | 'negative' | 'info';
  icon: string;
  title: string;
  message: string;
  action?: string;
  actionLink?: string;
}

// Helper function to analyze spending patterns
const analyzeSpendingPatterns = (transactions: TransactionListItem[]): InsightData[] => {
  const insights: InsightData[] = [];
  const now = new Date();
  
  // Get current and previous month data
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  
  const currentMonthTransactions = transactions.filter(t => {
    const date = new Date(t.transaction_date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
  
  const previousMonthTransactions = transactions.filter(t => {
    const date = new Date(t.transaction_date);
    return date.getMonth() === previousMonth && date.getFullYear() === previousYear;
  });
  
  // Calculate spending trends
  const currentMonthExpenses = currentMonthTransactions
    .filter(t => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
  const previousMonthExpenses = previousMonthTransactions
    .filter(t => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  if (previousMonthExpenses > 0) {
    const change = ((currentMonthExpenses - previousMonthExpenses) / previousMonthExpenses) * 100;
    
    if (change < -10) {
      insights.push({
        type: 'positive',
        icon: '📉',
        title: 'Excellent Spending Control',
        message: `Your expenses decreased by ${Math.abs(change).toFixed(1)}% compared to last month. Outstanding financial discipline!`,
      });
    } else if (change > 20) {
      insights.push({
        type: 'warning',
        icon: '📈',
        title: 'Spending Spike Detected',
        message: `Your expenses increased by ${change.toFixed(1)}% compared to last month. Consider reviewing your recent purchases.`,
        action: 'Review Expenses',
        actionLink: '/transactions?transaction_type=expense'
      });
    } else if (change > 0 && change <= 20) {
      insights.push({
        type: 'info',
        icon: '📊',
        title: 'Moderate Spending Increase',
        message: `Your expenses increased by ${change.toFixed(1)}% compared to last month. Keep monitoring your budget.`,
      });
    } else {
      insights.push({
        type: 'positive',
        icon: '📊',
        title: 'Stable Spending Pattern',
        message: `Your monthly expenses are consistent. Great job maintaining your budget!`,
      });
    }
  }
  
  // Analyze top spending categories
  const categorySpending = currentMonthTransactions
    .filter(t => t.transaction_type === 'expense')
    .reduce((acc, t) => {
      const category = t.category_id || 'uncategorized';
      acc[category] = (acc[category] || 0) + Math.abs(t.amount);
      return acc;
    }, {} as Record<string, number>);
  
  const topCategory = Object.entries(categorySpending)
    .sort(([,a], [,b]) => b - a)[0];
  
  if (topCategory && topCategory[1] > currentMonthExpenses * 0.3) {
    insights.push({
      type: 'info',
      icon: '🎯',
      title: 'Top Spending Category',
      message: `${((topCategory[1] / currentMonthExpenses) * 100).toFixed(1)}% of your expenses go to your top category. Consider if this aligns with your priorities.`,
    });
  }
  
  // Check for irregular transactions
  const amounts = transactions.map(t => Math.abs(t.amount)).sort((a, b) => b - a);
  const median = amounts[Math.floor(amounts.length / 2)] || 0;
  const largeTransactions = transactions.filter(t => Math.abs(t.amount) > median * 5);
  
  if (largeTransactions.length > 0) {
    insights.push({
      type: 'info',
      icon: '🔍',
      title: 'Large Transactions Detected',
      message: `You have ${largeTransactions.length} unusually large transaction(s) this month. Review them to ensure they're expected.`,
      action: 'Review Large Transactions',
      actionLink: '/transactions'
    });
  }
  
  return insights;
};

// Helper function to get categorization insights
const getCategorizationInsights = (categorizedCount: number, uncategorizedCount: number): InsightData => {
  const total = categorizedCount + uncategorizedCount;
  const rate = total > 0 ? (categorizedCount / total) * 100 : 0;
  
  if (rate >= 90) {
    return {
      type: 'positive',
      icon: '🧠',
      title: 'Excellent Categorization',
      message: `${rate.toFixed(1)}% of your transactions are categorized. Your financial insights are highly accurate!`,
    };
  } else if (rate >= 70) {
    return {
      type: 'info',
      icon: '🧠',
      title: 'Good Categorization',
      message: `${rate.toFixed(1)}% of your transactions are categorized. Consider reviewing ${uncategorizedCount} uncategorized transactions.`,
      action: 'Review Uncategorized',
      actionLink: '/transactions?category_id='
    };
  } else {
    return {
      type: 'warning',
      icon: '⚠️',
      title: 'Categorization Needed',
      message: `Only ${rate.toFixed(1)}% of your transactions are categorized. ${uncategorizedCount} transactions need attention for better insights.`,
      action: 'Categorize Now',
      actionLink: '/transactions?category_id='
    };
  }
};

// Helper function to analyze account health
const analyzeAccountHealth = (accounts: Account[]): InsightData[] => {
  const insights: InsightData[] = [];
  const activeAccounts = accounts.filter(a => a.is_active);
  
  // Check for low balances
  const lowBalanceAccounts = activeAccounts.filter(a => 
    a.current_balance !== undefined && 
    a.current_balance < 100 && 
    !a.account_type.toLowerCase().includes('credit')
  );
  
  if (lowBalanceAccounts.length > 0) {
    insights.push({
      type: 'warning',
      icon: '💰',
      title: 'Low Account Balance',
      message: `${lowBalanceAccounts.length} account(s) have balances below $100. Consider reviewing your cash flow.`,
      action: 'View Accounts',
      actionLink: '/accounts'
    });
  }
  
  // Check for credit utilization
  const creditAccounts = activeAccounts.filter(a => 
    a.account_type.toLowerCase().includes('credit') && 
    a.current_balance !== undefined
  );
  
  const highUtilizationAccounts = creditAccounts.filter(a => 
    a.current_balance! < -1000 // Assuming negative balance means debt
  );
  
  if (highUtilizationAccounts.length > 0) {
    insights.push({
      type: 'info',
      icon: '💳',
      title: 'Credit Card Activity',
      message: `Monitor your credit card balances. Consider paying down balances to improve your financial health.`,
      action: 'View Credit Accounts',
      actionLink: '/accounts?account_type=credit'
    });
  }
  
  return insights;
};

const getInsightStyles = (type: InsightData['type']) => {
  switch (type) {
    case 'positive':
      return {
        container: 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700',
        iconBg: 'bg-green-600',
        title: 'text-green-900 dark:text-green-100',
        message: 'text-green-700 dark:text-green-300',
        button: 'bg-green-600 hover:bg-green-700'
      };
    case 'warning':
      return {
        container: 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700',
        iconBg: 'bg-yellow-600',
        title: 'text-yellow-900 dark:text-yellow-100',
        message: 'text-yellow-700 dark:text-yellow-300',
        button: 'bg-yellow-600 hover:bg-yellow-700'
      };
    case 'negative':
      return {
        container: 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700',
        iconBg: 'bg-red-600',
        title: 'text-red-900 dark:text-red-100',
        message: 'text-red-700 dark:text-red-300',
        button: 'bg-red-600 hover:bg-red-700'
      };
    default:
      return {
        container: 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700',
        iconBg: 'bg-blue-600',
        title: 'text-blue-900 dark:text-blue-100',
        message: 'text-blue-700 dark:text-blue-300',
        button: 'bg-blue-600 hover:bg-blue-700'
      };
  }
};

export default function AIInsights({ 
  transactions, 
  accounts, 
  totalIncome, 
  totalExpenses, 
  categorizedTransactions, 
  uncategorizedTransactions 
}: AIInsightsProps) {
  // Generate all insights
  const spendingInsights = analyzeSpendingPatterns(transactions);
  const categorizationInsight = getCategorizationInsights(categorizedTransactions, uncategorizedTransactions);
  const accountInsights = analyzeAccountHealth(accounts);
  
  // Combine and limit to top 3 most important insights
  const allInsights = [categorizationInsight, ...spendingInsights, ...accountInsights];
  const topInsights = allInsights.slice(0, 3);
  
  // Calculate savings rate
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">AI Insights</h3>
      
      <div className="space-y-4">
        {topInsights.map((insight, index) => {
          const styles = getInsightStyles(insight.type);
          
          return (
            <div key={index} className={`p-4 rounded-lg ${styles.container}`}>
              <div className="flex items-start">
                <div className={`w-8 h-8 ${styles.iconBg} rounded-full flex items-center justify-center mr-3 mt-0.5`}>
                  <span className="text-white text-sm">{insight.icon}</span>
                </div>
                <div className="flex-1">
                  <h4 className={`font-medium ${styles.title}`}>{insight.title}</h4>
                  <p className={`text-sm ${styles.message} mt-1`}>
                    {insight.message}
                  </p>
                  {insight.action && insight.actionLink && (
                    <Link
                      href={insight.actionLink}
                      className={`inline-flex items-center mt-2 px-3 py-1 text-xs font-medium text-white rounded-md ${styles.button} transition-colors`}
                    >
                      {insight.action} →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Financial Health Summary */}
        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
          <div className="flex items-start">
            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center mr-3 mt-0.5">
              <span className="text-white text-sm">📋</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Financial Health Score</h4>
              <div className="flex items-center mt-2 space-x-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-300">Savings Rate: </span>
                  <span className={`font-semibold ${savingsRate > 20 ? 'text-green-600 dark:text-green-400' : savingsRate > 10 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                    {savingsRate.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-300">Active Accounts: </span>
                  <span className="font-semibold text-gray-900 dark:text-white">{accounts.filter(a => a.is_active).length}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-300">Categorization: </span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {((categorizedTransactions / (categorizedTransactions + uncategorizedTransactions)) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Link
        href="/transactions"
        className="mt-4 w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Review All Transactions
      </Link>
    </div>
  );
};
