import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import Link from "next/link";
import { FinancialDataErrorBoundary } from "@/components/providers/ErrorBoundary";

export default async function ReportsPage() {
  // Get user from server-side cookies
  let user;
  try {
    user = await getServerUser();
  } catch (error) {
    // If getServerUser throws an error, treat it as no user
    redirect("/login");
  }

  // If no user, redirect to login
  if (!user) {
    redirect("/login");
  }

  return (
    <AppLayout>
      {/* Page Header */}
      <PageHeader
        title="Reports"
        subtitle="Generate financial reports and insights"
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FinancialDataErrorBoundary>
          <p className="text-gray-600 mb-4">
            Coming soon! This section will allow you to generate detailed financial reports.
          </p>
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            Back to Dashboard
          </Link>
        </FinancialDataErrorBoundary>
      </div>
    </AppLayout>
  );
}