// lib/types/forms.ts
import { z } from 'zod';

// Base Form Types
export interface FormField<T = string> {
  value: T;
  error?: string;
  touched: boolean;
  required?: boolean;
}

export interface FormConfig<T extends Record<string, unknown>> {
  initialValues: T;
  validationSchema?: z.ZodSchema<T>;
  onSubmit: (values: T) => Promise<void> | void;
  onValidate?: (values: T) => Record<keyof T, string>;
}

// Authentication Forms
export const LoginFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  remember: z.boolean().optional(),
});

export const RegisterFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const ResetPasswordFormSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const ChangePasswordFormSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Transaction Forms
export const TransactionFormSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  description: z.string().min(1, 'Description is required'),
  merchant_name: z.string().optional(),
  transaction_type: z.enum(['income', 'expense', 'transfer']),
  transaction_date: z.string().min(1, 'Date is required'),
  category_id: z.string().uuid().optional(),
  account_id: z.string().uuid('Account is required'),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

// Account Forms
export const AccountFormSchema = z.object({
  account_name: z.string().min(1, 'Account name is required'),
  account_type: z.enum(['checking', 'savings', 'credit', 'investment', 'other']),
  bank_name: z.string().optional(),
  account_number: z.string().optional(),
  routing_number: z.string().optional(),
  current_balance: z.number().optional(),
  is_active: z.boolean().default(true),
  notes: z.string().optional(),
});

// Category Forms
export const CategoryFormSchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  icon: z.string().optional(),
  parent_id: z.string().uuid().optional(),
  is_active: z.boolean().default(true),
  budget_limit: z.number().min(0).optional(),
});

// Settings Forms
export const ProfileFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().default('USD'),
  date_format: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']).default('MM/DD/YYYY'),
  language: z.string().default('en'),
});

export const NotificationSettingsSchema = z.object({
  email_notifications: z.boolean().default(true),
  push_notifications: z.boolean().default(true),
  weekly_summary: z.boolean().default(true),
  budget_alerts: z.boolean().default(true),
  transaction_alerts: z.boolean().default(false),
  security_alerts: z.boolean().default(true),
});

// Filter Forms
export const TransactionFilterSchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  account_id: z.string().uuid().optional(),
  category_id: z.string().uuid().optional(),
  transaction_type: z.enum(['income', 'expense', 'transfer']).optional(),
  min_amount: z.number().min(0).optional(),
  max_amount: z.number().min(0).optional(),
  search: z.string().optional(),
});

export const AnalyticsFilterSchema = z.object({
  period: z.enum(['week', 'month', 'quarter', 'year']).default('month'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  account_ids: z.array(z.string().uuid()).optional(),
  category_ids: z.array(z.string().uuid()).optional(),
  transaction_types: z.array(z.enum(['income', 'expense', 'transfer'])).optional(),
  group_by: z.enum(['category', 'account', 'date', 'merchant']).optional(),
});

// OFX Import Forms
export const OFXImportFormSchema = z.object({
  file: z.instanceof(File, { message: 'Please select a valid OFX file' }),
  account_id: z.string().uuid('Please select an account'),
  auto_categorize: z.boolean().default(true),
  skip_duplicates: z.boolean().default(true),
  date_range: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
  }).optional(),
});

// Export utility types from schemas
export type LoginFormData = z.infer<typeof LoginFormSchema>;
export type RegisterFormData = z.infer<typeof RegisterFormSchema>;
export type ResetPasswordFormData = z.infer<typeof ResetPasswordFormSchema>;
export type ChangePasswordFormData = z.infer<typeof ChangePasswordFormSchema>;
export type TransactionFormData = z.infer<typeof TransactionFormSchema>;
export type AccountFormData = z.infer<typeof AccountFormSchema>;
export type CategoryFormData = z.infer<typeof CategoryFormSchema>;
export type ProfileFormData = z.infer<typeof ProfileFormSchema>;
export type NotificationSettingsData = z.infer<typeof NotificationSettingsSchema>;
export type TransactionFilterData = z.infer<typeof TransactionFilterSchema>;
export type AnalyticsFilterData = z.infer<typeof AnalyticsFilterSchema>;
export type OFXImportFormData = z.infer<typeof OFXImportFormSchema>;

// Form Validation Helper
export function validateForm<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  try {
    const validData = schema.parse(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: { general: 'Validation failed' } };
  }
}