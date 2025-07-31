import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/auth";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { FinancialDataErrorBoundary } from "@/components/providers/ErrorBoundary";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";

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
        title="Financial Analytics"
        subtitle="Comprehensive insights into your financial data"
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FinancialDataErrorBoundary>
          <AnalyticsDashboard />
        </FinancialDataErrorBoundary>
      </div>
    </AppLayout>
  );
}