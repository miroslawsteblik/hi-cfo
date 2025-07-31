// Re-export shared types for consistency
import type { PaginatedResponse } from '@/lib/shared/types';
import type { User } from '@/lib/shared/types';

export interface CategoryData {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  category_type: string;
  keywords?: string[];
  merchant_patterns?: string[];
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  category_type: string;
  is_system_category: boolean;
  is_active: boolean;
  keywords?: string[];
  merchant_patterns?: string[];
  created_at: string;
  updated_at: string;
}

export interface CategoriesResponse {
  data: Category[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface CategoryFilter {
  page?: number;
  limit?: number;
  category_type?: string;
  is_system_category?: boolean;
  is_active?: boolean;
  search?: string;
}

export interface CategoryAssignmentProps {
  categories: Category[];
  selectedCategoryId?: string;
  merchantName?: string;
  description?: string;
  showSuggestion?: boolean;
  onCategoryChange: (categoryId: string) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

export interface SmartCategorizationConfig {
  enabled: boolean;
  confidence_threshold: number;
  auto_apply_high_confidence: boolean;
  show_suggestions: boolean;
  enabled_methods: string[];
}

export interface SmartSuggestionConfig {
  enabled: boolean;
  show_confidence_scores: boolean;
  show_match_method: boolean;
  auto_apply_threshold: number;
  suggestion_sources: string[];
  learning_enabled: boolean;
}

export interface UserCategorizationPreferences {
  user_id: string;
  auto_categorize_on_import: boolean;
  confidence_threshold: number;
  preferred_methods: string[];
  custom_rules: Array<{
    pattern: string;
    category_id: string;
    priority: number;
  }>;
  notification_settings: {
    notify_on_low_confidence: boolean;
    notify_on_new_patterns: boolean;
    weekly_summary: boolean;
  };
}

export interface CategoryFormProps {
  onSubmit: (data: CategoryFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<CategoryFormData>;
  isEdit?: boolean;
}

export interface CategoryFormData {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  category_type: string;
  keywords?: string[];
  merchant_patterns?: string[];
}

export interface CategoriesData {
  categories: Category[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
