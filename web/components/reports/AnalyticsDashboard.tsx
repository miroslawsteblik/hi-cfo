'use client';

import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, PieChart, BarChart3, Download } from 'lucide-react';
import { AnalyticsAPI } from '@/lib/api/analytics';
import { PivotData, TrendsData, ComparisonData, AnalyticsFilters } from '@/lib/types/analytics';
import LoadingSpinner from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';

// Individual components
import PivotTableComponent from './PivotTableComponent';
import TrendsChartComponent from './TrendsChartComponent';
import ComparisonComponent from './ComparisonComponent';
import CategoryBreakdownChart from './CategoryBreakdownChart';
import FinancialHealthMetrics from './FinancialHealthMetrics';
import DateRangeFilter from './DateRangeFilter';

interface AnalyticsState {
  pivotData: PivotData | null;
  trendsData: TrendsData | null;
  comparisonData: ComparisonData | null;
  loading: boolean;
  error: string | null;
  filters: AnalyticsFilters;
}

export default function AnalyticsDashboard() {
  const [state, setState] = useState<AnalyticsState>({
    pivotData: null,
    trendsData: null,
    comparisonData: null,
    loading: true,
    error: null,
    filters: {
      ...AnalyticsAPI.getDateRange(12),
      group_by: 'month',
      period: 'month',
      current: AnalyticsAPI.getCurrentMonth(),
    },
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'pivot' | 'trends' | 'comparison'>('overview');

  // Load all analytics data
  const loadAnalyticsData = async (filters: AnalyticsFilters) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const [pivotData, trendsData, comparisonData] = await Promise.all([
        AnalyticsAPI.getPivotData(filters),
        AnalyticsAPI.getTrendsData(filters),
        AnalyticsAPI.getComparisonData(filters),
      ]);

      setState(prev => ({
        ...prev,
        pivotData,
        trendsData,
        comparisonData,
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load analytics data',
        loading: false,
      }));
    }
  };

  // Handle filter changes
  const handleFiltersChange = (newFilters: Partial<AnalyticsFilters>) => {
    const updatedFilters = { ...state.filters, ...newFilters };
    setState(prev => ({ ...prev, filters: updatedFilters }));
    loadAnalyticsData(updatedFilters);
  };

  // Export functionality
  const handleExport = async (format: 'csv' | 'pdf' | 'excel') => {
    try {
      // TODO: Implement export functionality
      console.log(`Exporting data as ${format}`);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadAnalyticsData(state.filters);
  }, []);

  if (state.loading) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <ErrorMessage 
          message={state.error}
          actions={
            <button
              onClick={() => loadAnalyticsData(state.filters)}
              className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200 transition-colors"
            >
              Retry
            </button>
          }
        />
      </div>
    );
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
    { id: 'pivot' as const, label: 'Pivot Analysis', icon: PieChart },
    { id: 'trends' as const, label: 'Trends', icon: TrendingUp },
    { id: 'comparison' as const, label: 'Comparison', icon: Calendar },
  ];

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
        
        <div className="flex items-center gap-2">
          <DateRangeFilter 
            filters={state.filters}
            onChange={handleFiltersChange}
          />
          
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              title="Export as CSV"
            >
              <Download size={14} />
              CSV
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              title="Export as Excel"
            >
              <Download size={14} />
              Excel
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="min-h-96">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Financial Health Metrics */}
            <FinancialHealthMetrics 
              pivotData={state.pivotData}
              trendsData={state.trendsData}
              comparisonData={state.comparisonData}
            />
            
            {/* Quick Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4">Monthly Trends</h3>
                {state.trendsData && (
                  <TrendsChartComponent 
                    data={state.trendsData} 
                    height={300}
                    showControls={false}
                  />
                )}
              </div>
              
              <div className="bg-white p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4">Category Breakdown</h3>
                {state.pivotData && (
                  <CategoryBreakdownChart 
                    data={state.pivotData}
                    height={300}
                    showLegend={true}
                  />
                )}
              </div>
            </div>

            {/* Month-over-Month Comparison */}
            {state.comparisonData && (
              <div className="bg-white p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4">Period Comparison</h3>
                <ComparisonComponent 
                  data={state.comparisonData}
                  showDetails={false}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'pivot' && state.pivotData && (
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Transaction Pivot Analysis</h3>
              <p className="text-sm text-gray-600">
                {state.pivotData.summary.transaction_count} transactions • 
                {state.pivotData.summary.total_categories} categories • 
                {state.pivotData.summary.total_periods} periods
              </p>
            </div>
            <PivotTableComponent data={state.pivotData} />
          </div>
        )}

        {activeTab === 'trends' && state.trendsData && (
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Financial Trends Analysis</h3>
              <div className="flex items-center gap-2">
                <select
                  value={state.filters.group_by || 'month'}
                  onChange={(e) => handleFiltersChange({ group_by: e.target.value as any })}
                  className="px-3 py-1 border rounded text-sm"
                >
                  <option value="day">Daily</option>
                  <option value="week">Weekly</option>
                  <option value="month">Monthly</option>
                  <option value="year">Yearly</option>
                </select>
              </div>
            </div>
            <TrendsChartComponent 
              data={state.trendsData} 
              height={500}
              showControls={true}
            />
          </div>
        )}

        {activeTab === 'comparison' && state.comparisonData && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Period-over-Period Comparison</h3>
                <div className="flex items-center gap-2">
                  <select
                    value={state.filters.period || 'month'}
                    onChange={(e) => handleFiltersChange({ period: e.target.value as any })}
                    className="px-3 py-1 border rounded text-sm"
                  >
                    <option value="month">Month-over-Month</option>
                    <option value="quarter">Quarter-over-Quarter</option>
                    <option value="year">Year-over-Year</option>
                  </select>
                </div>
              </div>
              <ComparisonComponent 
                data={state.comparisonData}
                showDetails={true}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}