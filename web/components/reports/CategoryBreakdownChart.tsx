'use client';

import { PivotData, CategoryChartData } from '@/lib/types/analytics';
import { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

interface CategoryBreakdownChartProps {
  data: PivotData;
  height?: number;
  showLegend?: boolean;
}

export default function CategoryBreakdownChart({ 
  data, 
  height = 300, 
  showLegend = true 
}: CategoryBreakdownChartProps) {
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  const [showType, setShowType] = useState<'all' | 'expense' | 'income'>('expense');

  // Generate colors for categories
  const generateColors = (count: number) => {
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
      '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
      '#06b6d4', '#d946ef', '#eab308', '#22c55e', '#f43f5e',
    ];
    
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length]);
    }
    return result;
  };

  // Transform data for charts
  const chartData: CategoryChartData[] = data.categories
    .filter(category => {
      if (showType === 'all') return true;
      return category.category_type === showType;
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 10) // Show top 10 categories
    .map((category, index) => ({
      name: category.category_name,
      value: category.total,
      color: category.color || generateColors(data.categories.length)[index],
      percentage: (category.total / data.totals.grand_total) * 100,
    }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(value));
  };

  const formatTooltipValue = (value: number, name: string) => {
    const percentage = ((value / data.totals.grand_total) * 100).toFixed(1);
    return [`${formatCurrency(value)} (${percentage}%)`, name];
  };

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, percent
  }: any) => {
    if (percent < 0.05) return null; // Don't show labels for very small slices
    
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill=\"white\" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline=\"central\"
        fontSize={12}
        fontWeight=\"bold\"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className=\"space-y-4\">
      {/* Controls */}
      <div className=\"flex flex-wrap items-center justify-between gap-2\">
        <div className=\"flex items-center gap-2\">
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as any)}
            className=\"px-2 py-1 border rounded text-sm\"
          >
            <option value=\"pie\">Pie Chart</option>
            <option value=\"bar\">Bar Chart</option>
          </select>
          
          <select
            value={showType}
            onChange={(e) => setShowType(e.target.value as any)}
            className=\"px-2 py-1 border rounded text-sm\"
          >
            <option value=\"expense\">Expenses Only</option>
            <option value=\"income\">Income Only</option>
            <option value=\"all\">All Categories</option>
          </select>
        </div>
        
        <div className=\"text-sm text-gray-600\">
          Top {chartData.length} categories • {formatCurrency(chartData.reduce((sum, item) => sum + item.value, 0))} total
        </div>
      </div>

      {/* Chart */}
      <div style={{ height }}>
        <ResponsiveContainer width=\"100%\" height=\"100%\">
          {chartType === 'pie' ? (
            <PieChart>
              <Pie
                data={chartData}
                cx=\"50%\"
                cy=\"50%\"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={height * 0.35}
                fill=\"#8884d8\"
                dataKey=\"value\"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={formatTooltipValue} />
              {showLegend && (
                <Legend 
                  verticalAlign=\"bottom\" 
                  height={36}
                  formatter={(value, entry: any) => (
                    <span style={{ color: entry.color }}>
                      {value} ({entry.payload.percentage.toFixed(1)}%)
                    </span>
                  )}
                />
              )}
            </PieChart>
          ) : (
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray=\"3 3\" />
              <XAxis 
                dataKey=\"name\" 
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor=\"end\"
                height={80}
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip formatter={formatTooltipValue} />
              <Bar dataKey=\"value\" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Category List */}
      {chartData.length > 0 && (
        <div className=\"bg-gray-50 p-4 rounded-lg\">
          <h4 className=\"font-medium text-gray-900 mb-3\">Category Breakdown</h4>
          <div className=\"grid grid-cols-1 sm:grid-cols-2 gap-2\">
            {chartData.map((category, index) => (
              <div key={index} className=\"flex items-center justify-between py-1\">
                <div className=\"flex items-center gap-2\">
                  <div 
                    className=\"w-3 h-3 rounded-full\" 
                    style={{ backgroundColor: category.color }}
                  />
                  <span className=\"text-sm text-gray-700 truncate\">
                    {category.name}
                  </span>
                </div>
                <div className=\"flex items-center gap-2 text-sm\">
                  <span className=\"font-medium text-gray-900\">
                    {formatCurrency(category.value)}
                  </span>
                  <span className=\"text-gray-500 text-xs\">
                    ({category.percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}"