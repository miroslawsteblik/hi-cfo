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
    <div className=\"flex items-center gap-2\">
      <Calendar size={16} className=\"text-gray-500\" />
      
      <select
        className=\"px-3 py-1 border rounded text-sm\"\n        onChange={(e) => handlePresetChange(e.target.value === 'custom' ? 'custom' : parseInt(e.target.value))}\n      >\n        {presetRanges.map((range) => (\n          <option key={range.label} value={range.value}>\n            {range.label}\n          </option>\n        ))}\n      </select>\n\n      {showCustom && (\n        <div className=\"flex items-center gap-2 ml-2\">\n          <input\n            type=\"date\"\n            value={filters.start_date || ''}\n            onChange={(e) => handleCustomDateChange('start_date', e.target.value)}\n            className=\"px-2 py-1 border rounded text-sm\"\n          />\n          <span className=\"text-gray-500\">to</span>\n          <input\n            type=\"date\"\n            value={filters.end_date || ''}\n            onChange={(e) => handleCustomDateChange('end_date', e.target.value)}\n            className=\"px-2 py-1 border rounded text-sm\"\n          />\n        </div>\n      )}\n    </div>\n  );\n}"