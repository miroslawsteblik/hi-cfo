// app/accounts/page.tsx
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth";
import { getAccounts, getAccountSummary } from "@/app/actions/accounts";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import AccountsClient from "../../components/accounts/AccountManager";

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Check authentication
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }

  // Await searchParams before using
  const params = await searchParams;

  // Get query parameters
  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || 20;
  const account_type = params.account_type as string;
  const is_active = params.is_active ? params.is_active === "true" : undefined;
  const search = params.search as string;

  // Fetch data in parallel
  const [accountsData, summary] = await Promise.all([
    getAccounts({
      page,
      limit,
      account_type,
      is_active,
      search,
    }),
    getAccountSummary(),
  ]);

  return (
    <AppLayout>
      {/* Page Header */}
      <PageHeader
        title="Accounts"
        subtitle="Manage your bank accounts and financial institutions"
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AccountsClient
          initialData={accountsData}
          summary={summary}
          user={user}
        />
      </div>
    </AppLayout>
  );
}
