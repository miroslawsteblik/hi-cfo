import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getServerUser } from "@/lib/auth/auth";
import { getTransactions, getUserAccounts, getCategories } from "@/lib/features/transactions";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import EnhancedTransactionManager from "@/components/transactions/TransactionManager";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Ensure user is authenticated
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    redirect("/login");
  }

  // Get user information
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  if (!params) {
    redirect("/dashboard");
  }

  // Get query parameters
  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || 20;
  const account_id = params.account_id as string;
  const category_id = params.category_id as string;
  const transaction_type = params.transaction_type as string;

  // Calculate date range (default to last 30 days)
  const end_date = new Date().toISOString().split("T")[0];
  const start_date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Fetch data in parallel
  const [transactionsData, accounts, categories] = await Promise.all([
    getTransactions({
      page,
      limit,
      account_id,
      category_id,
      start_date: (params.start_date as string) || start_date,
      end_date: (params.end_date as string) || end_date,
      transaction_type,
    }),
    getUserAccounts(),
    getCategories(),
  ]);

  return (
    <AppLayout>
      {/* Page Header */}
      <PageHeader
        title="Smart Transactions"
        subtitle="Manage your financial transactions with AI-powered categorization"
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EnhancedTransactionManager
          initialData={transactionsData}
          accounts={accounts}
          categories={categories}
          user={user}
          allTransactionsData={transactionsData}
        />
      </div>
    </AppLayout>
  );
}
