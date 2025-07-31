
import RecentActivity from "./RecentActivity";
import { TransactionListItem , getTransactions} from "@/lib/features/transactions";

export default async function ServerRecentActivity() {
  let transactions: TransactionListItem[] = [];
  let thisMonthTransactions = 0;

  try {
    // Fetch recent transactions (limit to 10 for recent activity)
    const result = await getTransactions({
      page: 1,
      limit: 10,
    });

    if (result && result.success && result.data?.data) {
      // Map transactions to include currency field
      transactions = result.data.data.map((transaction: any) => ({
        ...transaction,
        currency: "USD", // Default currency
      }));

      // Calculate this month's transaction count
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      thisMonthTransactions = transactions.filter((transaction) => {
        const transactionDate = new Date(transaction.transaction_date);
        return (
          transactionDate.getMonth() === currentMonth &&
          transactionDate.getFullYear() === currentYear
        );
      }).length;
    }
  } catch (error) {
    console.error("Error fetching recent transactions:", error);
    // Component will handle empty state
  }

  return (
    <RecentActivity transactions={transactions} thisMonthTransactions={thisMonthTransactions} />
  );
}
