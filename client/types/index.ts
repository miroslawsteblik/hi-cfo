// Authentication Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// API Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
}

// Dashboard Types
export interface DashboardStats {
  totalUsers: number;
  totalRevenue: number;
  activeSubscriptions: number;
  growthRate: number;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }[];
}