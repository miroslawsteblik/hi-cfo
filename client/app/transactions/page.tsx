
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getServerUser } from "@/lib/auth";
import {
  getTransactions,
  getUserAccounts,
  getCategories,
} from "@/app/actions/transactions";
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
  const token = cookieStore.get('auth_token')?.value;
  
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
  const start_date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

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
      {/* Enhanced Page Header with Smart Categorization Info */}
      <PageHeader
        title="Smart Transactions"
        subtitle="Manage your financial transactions with AI-powered categorization"
      >
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9z"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Transactions
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {transactionsData?.total || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Auto-Categorized
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {transactionsData?.data?.filter((tx: any) => tx.category_id)?.length || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-yellow-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Needs Review
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {transactionsData?.data?.filter((tx: any) => !tx.category_id)?.length || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Categories Available
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {categories?.length || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageHeader>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EnhancedTransactionManager
          initialData={transactionsData}
          accounts={accounts}
          categories={categories}
          user={user}
        />
      </div>
    </AppLayout>
  );
}
