'use client';

import { PivotData } from '@/lib/types/analytics';

interface PivotTableComponentProps {
  data: PivotData;
}

export default function PivotTableComponent({ data }: PivotTableComponentProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Category
            </th>
            {data.periods.map((period) => (
              <th key={period} className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {period}
              </th>
            ))}
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.categories.map((category) => (
            <tr key={category.category_name}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {category.category_name}
              </td>
              {data.periods.map((period) => {
                const amount = category.periods[period] || 0;
                return (
                  <td key={period} className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                    {formatCurrency(amount)}
                  </td>
                );
              })}
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                {formatCurrency(category.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}