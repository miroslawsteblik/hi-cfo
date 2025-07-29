import { 
  PivotData, 
  TrendsData, 
  ComparisonData, 
  AnalyticsFilters,
  AnalyticsApiResponse 
} from '@/lib/types/analytics';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export class AnalyticsAPI {
  private static async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${API_BASE_URL}/api/v1/transactions/analytics${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies for authentication
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data: AnalyticsApiResponse<T> = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'API request failed');
    }

    return data.data;
  }

  // Get pivot table data
  static async getPivotData(filters: AnalyticsFilters = {}): Promise<PivotData> {
    const params = new URLSearchParams();
    
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);

    const endpoint = `/pivot${params.toString() ? `?${params.toString()}` : ''}`;
    return this.makeRequest<PivotData>(endpoint);
  }

  // Get trends data
  static async getTrendsData(filters: AnalyticsFilters = {}): Promise<TrendsData> {
    const params = new URLSearchParams();
    
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.group_by) params.append('group_by', filters.group_by);

    const endpoint = `/trends${params.toString() ? `?${params.toString()}` : ''}`;
    return this.makeRequest<TrendsData>(endpoint);
  }

  // Get comparison data
  static async getComparisonData(filters: AnalyticsFilters): Promise<ComparisonData> {
    const params = new URLSearchParams();
    
    if (!filters.current) {
      throw new Error('Current period is required for comparison');
    }
    
    params.append('current', filters.current);
    if (filters.period) params.append('period', filters.period);

    const endpoint = `/comparison?${params.toString()}`;
    return this.makeRequest<ComparisonData>(endpoint);
  }

  // Utility methods for date formatting
  static formatDateForAPI(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  static getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  static getPreviousMonth(): string {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  }

  static getDateRange(months: number = 12): { start_date: string; end_date: string } {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - months);

    return {
      start_date: this.formatDateForAPI(start),
      end_date: this.formatDateForAPI(end),
    };
  }
}