
//lib/auth.ts
import { User, AuthResponse, LoginCredentials, RegisterCredentials } from '@/types';

// You'll need to import or define your apiClient
import { apiClient } from '@/lib/api';

export class AuthService {
  private static readonly TOKEN_KEY = 'accessToken';
  private static readonly REFRESH_TOKEN_KEY = 'refreshToken';
  private static readonly USER_KEY = 'user';

  // Login
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    if (response.success && response.data) {
      this.setTokens(response.data);
      this.setUser(response.data.user);
      return response.data;
    }
    throw new Error(response.message || 'Login failed');
  }

  // Register
  static async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', credentials);
    if (response.success && response.data) {
      this.setTokens(response.data);
      this.setUser(response.data.user);
      return response.data;
    }
    throw new Error(response.message || 'Registration failed');
  }

  // Logout
  static async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuth();
    }
  }

  // Refresh token
  static async refreshToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return null;
    
    try {
      const response = await apiClient.post<{ accessToken: string }>('/auth/refresh', { refreshToken });
      if (response.success && response.data) {
        this.setAccessToken(response.data.accessToken);
        return response.data.accessToken;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearAuth();
    }
    return null;
  }

  // Get current user from API
  static async getCurrentUser(): Promise<User | null> {
    try {
      const response = await apiClient.get<User>('/auth/me');
      if (response.success && response.data) {
        this.setUser(response.data);
        return response.data;
      }
    } catch (error) {
      console.error('Get current user failed:', error);
      this.clearAuth();
    }
    return null;
  }

  // Token management
  static setTokens(authData: AuthResponse): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.TOKEN_KEY, authData.accessToken);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, authData.refreshToken);
    }
  }

  static setAccessToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.TOKEN_KEY, token);
    }
  }

  static getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }

  static getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    }
    return null;
  }

  // User management
  static setUser(user: User): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }
  }

  static getUser(): User | null {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem(this.USER_KEY);
      // Check for null, empty string, or the string "undefined"
      if (!user || user === 'undefined' || user === 'null') {
        return null;
      }
      try {
        return JSON.parse(user);
      } catch (error) {
        console.error('Error parsing user from localStorage:', error);
        this.clearAuth();
        return null;
      }
    }
    return null;
  }

  // Clear authentication
  static clearAuth(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
  }

  // Check if user is authenticated
  static isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}

// Utility functions
export const getAuthToken = () => AuthService.getAccessToken();
export const isAuthenticated = () => AuthService.isAuthenticated();
export const getCurrentUser = () => AuthService.getUser();