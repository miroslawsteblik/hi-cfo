// lib/api-client-enhanced.ts - Enhanced API client with comprehensive error handling

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { 
  FinancialAppError, 
  ErrorCode, 
  ErrorLogger,
  createAuthError,
  createNetworkError,
  shouldRetry,
} from './errors';

const SERVER_API_URL = process.env.SERVER_API_URL || 'http://nginx_proxy:80';
const DEFAULT_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;

interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  skipAuth?: boolean;
}

interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

class ApiClient {
  private logger = ErrorLogger.getInstance();

  async authenticatedFetch<T = unknown>(
    endpoint: string, 
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      timeout = DEFAULT_TIMEOUT,
      retries = MAX_RETRIES,
      skipAuth = false,
      ...requestOptions
    } = options;

    let lastError: Error | FinancialAppError;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.makeRequest(endpoint, {
          ...requestOptions,
          timeout,
          skipAuth,
        });

        return await this.handleResponse<T>(response, endpoint);
      } catch (error) {
        lastError = error as Error;
        
        // Log each attempt
        await this.logger.logError(lastError, {
          endpoint,
          attempt: attempt + 1,
          maxRetries: retries + 1,
        });

        // Don't retry on certain errors
        if (error instanceof FinancialAppError) {
          if ([
            ErrorCode.AUTHENTICATION_FAILED,
            ErrorCode.AUTHORIZATION_DENIED,
            ErrorCode.VALIDATION_ERROR,
          ].includes(error.code)) {
            throw error;
          }
        }

        // Don't retry on the last attempt
        if (attempt === retries) {
          throw error;
        }

        // Only retry if the error is retryable
        if (!shouldRetry(error)) {
          throw error;
        }

        // Exponential backoff
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }

    throw lastError!;
  }

  private async makeRequest(
    endpoint: string,
    options: RequestOptions
  ): Promise<Response> {
    const { timeout, skipAuth, ...requestOptions } = options;
    
    // Handle authentication
    let headers = {
      'Content-Type': 'application/json',
      ...requestOptions.headers,
    } as Record<string, string>;

    if (!skipAuth) {
      const token = await this.getAuthToken();
      if (!token) {
        throw createAuthError('No authentication token found');
      }
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${SERVER_API_URL}${endpoint}`, {
        ...requestOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new FinancialAppError({
            code: ErrorCode.API_TIMEOUT,
            message: `Request to ${endpoint} timed out after ${timeout}ms`,
          });
        }
        
        throw createNetworkError(`Network error: ${error.message}`, {
          endpoint,
          originalError: error.message,
        });
      }
      
      throw error;
    }
  }

  private async handleResponse<T>(response: Response, endpoint: string): Promise<T> {
    // Handle authentication errors
    if (response.status === 401) {
      await this.logger.logError(
        createAuthError('Authentication failed'),
        { endpoint, status: response.status }
      );
      redirect('/login');
    }

    // Handle authorization errors
    if (response.status === 403) {
      throw new FinancialAppError({
        code: ErrorCode.AUTHORIZATION_DENIED,
        message: 'Access denied',
        details: { endpoint, status: response.status },
      });
    }

    // Handle validation errors
    if (response.status === 400) {
      const errorText = await response.text();
      let errorDetails: any = {};
      
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        // If not JSON, use the text as is
      }

      throw new FinancialAppError({
        code: ErrorCode.VALIDATION_ERROR,
        message: errorDetails.message || errorText || 'Validation failed',
        details: errorDetails,
      });
    }

    // Handle server errors
    if (response.status >= 500) {
      const errorText = await response.text();
      throw new FinancialAppError({
        code: ErrorCode.SERVER_ERROR,
        message: `Server error: ${response.status}`,
        details: { 
          endpoint, 
          status: response.status, 
          statusText: response.statusText,
          body: errorText,
        },
      });
    }

    // Handle other client errors
    if (!response.ok) {
      const errorText = await response.text();
      throw new FinancialAppError({
        code: ErrorCode.UNKNOWN_ERROR,
        message: `API Error: ${response.status} - ${errorText}`,
        details: { endpoint, status: response.status },
      });
    }

    // Handle successful responses
    return this.parseResponse<T>(response);
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    // Handle empty responses (like 204 No Content)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return null as T;
    }

    // Check content type
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const text = await response.text();
      
      if (!text) {
        return null as T;
      }

      try {
        const data = JSON.parse(text);
        
        // Handle wrapped API responses
        if (data && typeof data === 'object' && 'success' in data) {
          const apiResponse = data as ApiResponse<T>;
          if (!apiResponse.success && apiResponse.error) {
            throw new FinancialAppError({
              code: ErrorCode.SERVER_ERROR,
              message: apiResponse.error,
            });
          }
          return apiResponse.data;
        }
        
        return data;
      } catch (parseError) {
        throw new FinancialAppError({
          code: ErrorCode.SERVER_ERROR,
          message: 'Failed to parse server response',
          details: { 
            originalText: text,
            parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error',
          },
        });
      }
    }

    // For non-JSON responses, try to get text
    try {
      const text = await response.text();
      return text as unknown as T;
    } catch (error) {
      throw new FinancialAppError({
        code: ErrorCode.SERVER_ERROR,
        message: 'Failed to read server response',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
    }
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      const cookieStore = await cookies();
      return cookieStore.get('auth_token')?.value || null;
    } catch (error) {
      await this.logger.logError(
        new Error('Failed to access auth token from cookies'),
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
      return null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Convenience methods for common HTTP operations
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.authenticatedFetch<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.authenticatedFetch<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.authenticatedFetch<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.authenticatedFetch<T>(endpoint, { ...options, method: 'DELETE' });
  }

  async patch<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.authenticatedFetch<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export the legacy function for backward compatibility
export async function authenticatedFetch(endpoint: string, options: RequestInit = {}) {
  return apiClient.authenticatedFetch(endpoint, options);
}