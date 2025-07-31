import { getTransactions, getUserAccounts } from "@/lib/actions/transactions";
import AIInsights from "./AIinsights";
import { TransactionListItem } from "@/lib/types/transactions/base";
import { Account } from "@/lib/types/accounts/base";

export default async function ServerAIInsights() {
  let transactions: TransactionListItem[] = [];
  let accounts: Account[] = [];
  let totalIncome = 0;
  let totalExpenses = 0;
  let categorizedTransactions = 0;
  let uncategorizedTransactions = 0;

  try {
    // Fetch transactions and accounts in parallel
    const [transactionsResult, accountsResult] = await Promise.all([
      getTransactions({ page: 1, limit: 100 }), // Get more transactions for better analysis
      getUserAccounts(),
    ]);

    // Process transactions
    if (transactionsResult && transactionsResult.success && transactionsResult.data?.data) {
      transactions = transactionsResult.data.data.map((transaction: any) => ({
        ...transaction,
        currency: "USD", // Default currency
      }));

      // Calculate financial metrics
      transactions.forEach((transaction) => {
        const amount = Math.abs(transaction.amount || 0);

        if (transaction.transaction_type === "income") {
          totalIncome += amount;
        } else if (transaction.transaction_type === "expense") {
          totalExpenses += amount;
        }

        // Count categorized vs uncategorized
        if (transaction.category_id) {
          categorizedTransactions++;
        } else {
          uncategorizedTransactions++;
        }
      });
    }

    // Process accounts
    accounts = accountsResult || [];
  } catch (error) {
    console.error("Error fetching AI insights data:", error);
    // Component will handle empty state gracefully
  }

  return (
    <AIInsights
      transactions={transactions}
      accounts={accounts}
      totalIncome={totalIncome}
      totalExpenses={totalExpenses}
      categorizedTransactions={categorizedTransactions}
      uncategorizedTransactions={uncategorizedTransactions}
    />
  );
}
