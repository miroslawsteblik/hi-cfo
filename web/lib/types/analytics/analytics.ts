// Analytics types for the frontend
export interface PivotData {
  categories: CategoryPivot[];
  periods: string[];
  totals: PivotTotals;
  summary: PivotSummary;
}

export interface CategoryPivot {
  category_id: string;
  category_name: string;
  category_type: string;
  color?: string;
  periods: Record<string, number>;
  total: number;
  average: number;
  count: number;
}

export interface PivotTotals {
  periods: Record<string, number>;
  grand_total: number;
  total_income: number;
  total_expense: number;
}

export interface PivotSummary {
  date_range: DateRange;
  total_categories: number;
  total_periods: number;
  transaction_count: number;
}

export interface TrendsData {
  periods: TrendPeriod[];
  total_income: number[];
  total_expenses: number[];
  net_income: number[];
  top_categories: CategoryTrend[];
  summary: TrendSummary;
}

export interface TrendPeriod {
  period: string;
  income: number;
  expenses: number;
  net_income: number;
  transaction_count: number;
}

export interface CategoryTrend {
  category_id: string;
  category_name: string;
  color?: string;
  values: number[];
  total: number;
  trend: "increasing" | "decreasing" | "stable";
}

export interface TrendSummary {
  date_range: DateRange;
  average_income: number;
  average_expenses: number;
  growth_rate: number;
  volatility: number;
}

export interface ComparisonData {
  current: PeriodData;
  previous: PeriodData;
  comparison: ComparisonMetrics;
  category_changes: CategoryComparison[];
}

export interface PeriodData {
  period: string;
  income: number;
  expenses: number;
  net_income: number;
  transaction_count: number;
  categories: Record<string, number>;
  top_categories: CategorySummary[];
}

export interface CategorySummary {
  category_id: string;
  category_name: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface ComparisonMetrics {
  income_change: number;
  income_change_percent: number;
  expense_change: number;
  expense_change_percent: number;
  net_income_change: number;
  net_income_change_percent: number;
  transaction_count_change: number;
}

export interface CategoryComparison {
  category_id: string;
  category_name: string;
  current_amount: number;
  previous_amount: number;
  change: number;
  change_percent: number;
  is_new: boolean;
  is_gone: boolean;
}

// Use the DateRange from common.ts instead
import type { DateRange } from "../common";

// Chart data interfaces for Recharts
export interface PivotChartData {
  period: string;
  [categoryName: string]: number | string;
}

export interface TrendChartData {
  period: string;
  income: number;
  expenses: number;
  net_income: number;
}

export interface CategoryChartData {
  name: string;
  value: number;
  color?: string;
  percentage: number;
}

// API Response types
export interface AnalyticsApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Filters and options
export interface AnalyticsFilters {
  start_date?: string;
  end_date?: string;
  group_by?: "day" | "week" | "month" | "year";
  period?: "month" | "quarter" | "year";
  current?: string;
}

export interface ChartConfig {
  type: "bar" | "line" | "pie" | "area";
  colors: string[];
  showLegend: boolean;
  showGrid: boolean;
  responsive: boolean;
}
