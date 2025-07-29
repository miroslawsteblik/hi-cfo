export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}


export interface DateRange {
  start_date?: string;
  end_date?: string;
}

export interface BaseFilters {
  page?: number;
  limit?: number;
}