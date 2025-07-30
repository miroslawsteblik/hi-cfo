"use server";

import { apiClient } from "@/lib/api-client-enhanced";

import {
  PivotData,
  TrendsData,
  ComparisonData,
  AnalyticsFilters,
  AnalyticsApiResponse,
} from "@/lib/types/analytics";
import { FinancialAppError, ErrorCode, ErrorLogger } from "@/lib/errors";

export async function getPivotData(filters: AnalyticsFilters = {}): Promise<{
  success: boolean;
  data?: PivotData;
  error?: string;
}> {
    try {
      ErrorLogger.getInstance().logInfo("Fetching pivot data", {
        context: "get_pivot_data",
        filters,
      });

      const params = new URLSearchParams();

      if (filters.start_date) params.append("start_date", filters.start_date);
      if (filters.end_date) params.append("end_date", filters.end_date);

      const endpoint = `/pivot${params.toString() ? `?${params.toString()}` : ""}`;
      const result = await apiClient.get<PivotData>(`/api/v1/analytics${endpoint}`);

      return { success: true, data: result };
    } catch (error) {
      const appError = new FinancialAppError({
        code: ErrorCode.API_ERROR,
        message: "Failed to fetch pivot data",
        details: { originalError: error, context: "get_pivot_data" },
      });
      await ErrorLogger.getInstance().logError(appError);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch pivot data",
      };
    }
  }

// Get trends data
export async function getTrendsData(filters: AnalyticsFilters = {}): Promise<{
  success: boolean;
  data?: TrendsData;
  error?: string;
}> {
    try {
      ErrorLogger.getInstance().logInfo("Fetching trends data", {
        context: "get_trends_data",
        filters,
      });
      const params = new URLSearchParams();

      if (filters.start_date) params.append("start_date", filters.start_date);
      if (filters.end_date) params.append("end_date", filters.end_date);
      if (filters.group_by) params.append("group_by", filters.group_by);

      const endpoint = `/trends${params.toString() ? `?${params.toString()}` : ""}`;
      const result = await apiClient.get<TrendsData>(`/api/v1/analytics${endpoint}`);

      return { success: true, data: result };
    } catch (error) {
      const appError = new FinancialAppError({
        code: ErrorCode.API_ERROR,
        message: "Failed to fetch trends data",
        details: { originalError: error, context: "get_trends_data" },
      });
      await ErrorLogger.getInstance().logError(appError);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch trends data",
      };
    }
  }

// Get comparison data
export async function getComparisonData(filters: AnalyticsFilters): Promise<{
  success: boolean;
  data?: ComparisonData;
  error?: string;
}> {
    if (!filters.current) {
      throw new FinancialAppError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Current period is required for comparison",
        details: { filters },
      });
    }
    try {
      ErrorLogger.getInstance().logInfo("Fetching comparison data", {
        context: "get_comparison_data",
        filters,
      });
      const params = new URLSearchParams();

      if (!filters.current) {
        throw new Error("Current period is required for comparison");
      }

      params.append("current", filters.current);
      if (filters.period) params.append("period", filters.period);

      const endpoint = `/comparison?${params.toString()}`;
      const result = await apiClient.get<ComparisonData>(`/api/v1/analytics${endpoint}`);

      return { success: true, data: result };
    } catch (error) {
      const appError = new FinancialAppError({
        code: ErrorCode.API_ERROR,
        message: "Failed to fetch comparison data",
        details: { originalError: error, context: "get_comparison_data" },
      });
      await ErrorLogger.getInstance().logError(appError);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch comparison data",
      };
    }
  }

