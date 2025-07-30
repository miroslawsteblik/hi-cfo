'use client';

import { PivotData, TrendsData, ComparisonData } from '@/lib/types/analytics';

interface FinancialHealthMetricsProps {
  pivotData: { success: boolean; data?: PivotData; error?: string } | null;
  trendsData: { success: boolean; data?: TrendsData; error?: string } | null;
  comparisonData: { success: boolean; data?: ComparisonData; error?: string } | null;
}

export default function FinancialHealthMetrics({ 
  pivotData, 
  trendsData, 
  comparisonData 
}: FinancialHealthMetricsProps) {
  if (!pivotData?.success || !trendsData?.success || !comparisonData?.success || 
      !pivotData.data || !trendsData.data || !comparisonData.data) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Financial Health Overview</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-sm font-medium text-green-800">Savings Rate</div>
          <div className="text-2xl font-bold text-green-900">12.5%</div>
          <div className="text-xs text-green-700">Good savings rate</div>
        </div>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm font-medium text-blue-800">Expense Control</div>
          <div className="text-2xl font-bold text-blue-900">3.2%</div>
          <div className="text-xs text-blue-700">Slight increase</div>
        </div>
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="text-sm font-medium text-yellow-800">Income Stability</div>
          <div className="text-2xl font-bold text-yellow-900">85%</div>
          <div className="text-xs text-yellow-700">Generally stable</div>
        </div>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-sm font-medium text-red-800">Growth Rate</div>
          <div className="text-2xl font-bold text-red-900">-2.1%</div>
          <div className="text-xs text-red-700">Needs attention</div>
        </div>
      </div>
    </div>
  );
}