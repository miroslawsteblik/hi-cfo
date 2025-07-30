'use client';

import { AnalyticsFilters } from '@/lib/types/analytics';
import { Calendar } from 'lucide-react';
import { useState } from 'react';

interface DateRangeFilterProps {
  filters: AnalyticsFilters;
  onChange: (filters: Partial<AnalyticsFilters>) => void;
}

export default function DateRangeFilter({ filters, onChange }: DateRangeFilterProps) {
  const [showCustom, setShowCustom] = useState(false);

  const presetRanges = [
    { label: 'Last 30 days', value: 30 },
    { label: 'Last 90 days', value: 90 },
    { label: 'Last 6 months', value: 180 },
    { label: 'Last 12 months', value: 365 },
    { label: 'Custom', value: 'custom' },
  ];

  const handlePresetChange = (days: number | string) => {
    if (days === 'custom') {
      setShowCustom(true);
      return;
    }

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days as number));

    onChange({
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0],
    });
    setShowCustom(false);
  };

  const handleCustomDateChange = (field: 'start_date' | 'end_date', value: string) => {
    onChange({ [field]: value });
  };

  return (
    <div className="flex items-center gap-2">
      <Calendar size={16} className="text-gray-500" />

      <select
        className="px-3 py-1 border rounded text-sm"
        onChange={(e) => handlePresetChange(e.target.value === 'custom' ? 'custom' : parseInt(e.target.value))}
      >
        {presetRanges.map((range) => (
          <option key={range.label} value={range.value}>
            {range.label}
          </option>
        ))}
      </select>

      {showCustom && (
        <div className="flex items-center gap-2 ml-2">
          <input
            type="date"
            value={filters.start_date || ''}
            onChange={(e) => handleCustomDateChange('start_date', e.target.value)}
            className="px-2 py-1 border rounded text-sm"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={filters.end_date || ''}
            onChange={(e) => handleCustomDateChange('end_date', e.target.value)}
            className="px-2 py-1 border rounded text-sm"
          />
        </div>
      )}
    </div>
  );
}