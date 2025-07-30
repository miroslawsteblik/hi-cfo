'use client';

import { TrendsData } from '@/lib/types/analytics';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TrendsChartComponentProps {
  data: { success: boolean; data?: TrendsData; error?: string } | null;
  height?: number;
  showControls?: boolean;
}

export default function TrendsChartComponent({ 
  data, 
  height = 400, 
  showControls = false 
}: TrendsChartComponentProps) {
  if (!data?.success || !data.data) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-96 bg-gray-200 rounded"></div>
      </div>
    );
  }

  const trendsData = data.data;
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(value));
  };

  const chartData = trendsData.periods.map(period => ({
    period: period.period,
    income: period.income,
    expenses: Math.abs(period.expenses),
    net_income: period.net_income,
  }));

  return (
    <div>
      {showControls && (
        <div className="mb-4">
          <h4 className="text-lg font-semibold text-gray-900 mb-2">Financial Trends</h4>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
              <span>Income</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
              <span>Expenses</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
              <span>Net Income</span>
            </div>
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData}>
          {/* @ts-ignore */}
          <CartesianGrid strokeDasharray="3 3" />
          {/* @ts-ignore */}
          <XAxis dataKey="period" />
          {/* @ts-ignore */}
          <YAxis tickFormatter={(value: number) => formatCurrency(value)} />
          {/* @ts-ignore */}
          <Tooltip 
            formatter={(value: number, name: string) => [formatCurrency(value), name]}
            labelFormatter={(label: string) => `Period: ${label}`}
          />
          {/* @ts-ignore */}
          <Legend />
          {/* @ts-ignore */}
          <Line 
            type="monotone" 
            dataKey="income" 
            stroke="#10b981" 
            strokeWidth={2}
            name="Income"
          />
          {/* @ts-ignore */}
          <Line 
            type="monotone" 
            dataKey="expenses" 
            stroke="#ef4444" 
            strokeWidth={2}
            name="Expenses"
          />
          {/* @ts-ignore */}
          <Line 
            type="monotone" 
            dataKey="net_income" 
            stroke="#3b82f6" 
            strokeWidth={2}
            name="Net Income"
          />
        </LineChart>
      </ResponsiveContainer>

      {showControls && (
        <div className="mt-4 flex justify-between text-sm text-gray-600">
          <div>
            <span>Growth Rate: </span>
            <span className={`font-medium ${
              trendsData.summary.growth_rate >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {trendsData.summary.growth_rate.toFixed(1)}%
            </span>
          </div>
          <div>
            <span>Volatility: </span>
            <span className="font-medium text-gray-900">
              {trendsData.summary.volatility.toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}