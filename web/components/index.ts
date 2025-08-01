// components/index.ts - Barrel exports for components

// Layout Components
export { default as AppLayout } from "./layout/AppLayout";
export { default as Footer } from "./layout/Footer";
export { default as PageHeader } from "./layout/PageHeader";

// Navigation Components
export { default as MainNavigation } from "./navigation/MainNavigation";

// UI Components
export { default as ClientThemeToggle } from "./dark-mode/ClientThemeToggle";
export { default as ThemeToggle } from "./dark-mode/ThemeToggle";
export { default as CookieConsentBanner } from "./ui/CookieConsentBanner";
export { ErrorMessage } from "./ui/ErrorMessage";
export { default as LoadingSpinner } from "./ui/LoadingSpinner";

// Provider Components
export { AppProviders } from "./providers/AppProviders";
export { ErrorBoundary } from "./providers/ErrorBoundary";

// Auth Components
export { default as LogoutButton } from "./auth/logout-button";

// Dashboard Components
export { default as AccountOverview } from "./dashboard/AccountOverview";
export { default as AIInsights } from "./dashboard/AIinsights";
export { default as QuickActions } from "./dashboard/QuickActions";
export { default as RealDashboardStats } from "./dashboard/RealDashboardStats";
export { default as RecentActivity } from "./dashboard/RecentActivity";
export { default as ServerAccountOverview } from "./dashboard/ServerAccountOverview";
export { default as ServerAIInsights } from "./dashboard/ServerAIInsights";
export { default as ServerRecentActivity } from "./dashboard/ServerRecentActivity";
export { default as WelcomeSection } from "./dashboard/WelcomeSection";

// Transaction Components
export { default as CategoryAssignment } from "./transactions/CategoryAssignment";
export { default as EnhancedOFXManager } from "./transactions/OFX-manager";
export { default as TransactionHeader } from "./transactions/TransactionHeader";
export { default as TransactionManager } from "./transactions/TransactionManager";
export { default as TransactionSettings } from "./transactions/TransactionSettings";
export { default as TransactionsForm } from "./transactions/TransactionsForm";
export { default as TransactionTable } from "./transactions/TransactionTable";

// Transaction Step Components
export { default as OFXCategorizationStep } from "./transactions/steps/OFXCategorizationStep";
export { default as OFXImportingStep } from "./transactions/steps/OFXImportingStep";
export { default as OFXPreviewStep } from "./transactions/steps/OFXPreviewStep";
export { default as OFXResultStep } from "./transactions/steps/OFXResultStep";
export { default as OFXUploadStep } from "./transactions/steps/OFXUploadStep";

// Analytics Components
export { default as AnalyticsDashboard } from "./analytics/AnalyticsDashboard";
export { default as CategoryBreakdownChart } from "./analytics/CategoryBreakdownChart";
export { default as ComparisonComponent } from "./analytics/ComparisonComponent";
export { default as DateRangeFilter } from "./analytics/DateRangeFilter";
export { default as FinancialHealthMetrics } from "./analytics/FinancialHealthMetrics";
export { default as PivotTableComponent } from "./analytics/PivotTableComponent";
export { default as TrendsChartComponent } from "./analytics/TrendsChartComponent";

// Account Components
export { default as AccountForm } from "./accounts/AccountForm";
export { default as AccountManager } from "./accounts/AccountManager";

// Category Components
export { default as CategoryForm } from "./categories/CategoryForm";
export { default as CategoryManager } from "./categories/CategoryManager";

// Settings Components
export { default as SettingsContent } from "./settings/SettingsContent";
