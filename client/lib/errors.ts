// lib/errors.ts - Centralized error handling utilities

export enum ErrorCode {
  // Authentication errors
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  AUTHORIZATION_DENIED = 'AUTHORIZATION_DENIED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Financial data errors
  INVALID_TRANSACTION_DATA = 'INVALID_TRANSACTION_DATA',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  DUPLICATE_TRANSACTION = 'DUPLICATE_TRANSACTION',
  
  // File processing errors
  FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',
  OFX_PARSE_ERROR = 'OFX_PARSE_ERROR',
  INVALID_FILE_FORMAT = 'INVALID_FILE_FORMAT',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  API_TIMEOUT = 'API_TIMEOUT',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  FEATURE_UNAVAILABLE = 'FEATURE_UNAVAILABLE',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  API_ERROR = 'API_ERROR',
}

export interface AppError {
  code: ErrorCode;
  message: string;
  userMessage?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  userId?: string;
  requestId?: string;
  stack?: string;
}

export class FinancialAppError extends Error {
  public readonly code: ErrorCode;
  public readonly userMessage: string;
  public readonly details: Record<string, unknown>;
  public readonly timestamp: Date;
  public readonly userId?: string;
  public readonly requestId?: string;

  constructor({
    code,
    message,
    userMessage,
    details = {},
    userId,
    requestId,
  }: {
    code: ErrorCode;
    message: string;
    userMessage?: string;
    details?: Record<string, unknown>;
    userId?: string;
    requestId?: string;
  }) {
    super(message);
    this.name = 'FinancialAppError';
    this.code = code;
    this.userMessage = userMessage || this.getDefaultUserMessage(code);
    this.details = details;
    this.timestamp = new Date();
    this.userId = userId;
    this.requestId = requestId;
  }

  private getDefaultUserMessage(code: ErrorCode): string {
    const messages: Record<ErrorCode, string> = {
      [ErrorCode.AUTHENTICATION_FAILED]: 'Please log in to access this feature.',
      [ErrorCode.AUTHORIZATION_DENIED]: 'You don\'t have permission to perform this action.',
      [ErrorCode.TOKEN_EXPIRED]: 'Your session has expired. Please log in again.',
      [ErrorCode.INVALID_TRANSACTION_DATA]: 'The transaction data provided is invalid.',
      [ErrorCode.INSUFFICIENT_FUNDS]: 'Insufficient funds for this transaction.',
      [ErrorCode.ACCOUNT_NOT_FOUND]: 'The requested account could not be found.',
      [ErrorCode.DUPLICATE_TRANSACTION]: 'This transaction already exists.',
      [ErrorCode.FILE_UPLOAD_FAILED]: 'Failed to upload the file. Please try again.',
      [ErrorCode.OFX_PARSE_ERROR]: 'Unable to read the financial file. Please check the format.',
      [ErrorCode.INVALID_FILE_FORMAT]: 'Invalid file format. Please upload a supported file type.',
      [ErrorCode.FILE_TOO_LARGE]: 'File is too large. Please upload a smaller file.',
      [ErrorCode.NETWORK_ERROR]: 'Network connection issue. Please check your internet connection.',
      [ErrorCode.SERVER_ERROR]: 'A server error occurred. Please try again later.',
      [ErrorCode.API_TIMEOUT]: 'Request timed out. Please try again.',
      [ErrorCode.VALIDATION_ERROR]: 'Please check your input and try again.',
      [ErrorCode.MISSING_REQUIRED_FIELD]: 'Please fill in all required fields.',
      [ErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
      [ErrorCode.FEATURE_UNAVAILABLE]: 'This feature is currently unavailable.',
      [ErrorCode.SYSTEM_ERROR]: 'A system error occurred. Please try again.',
      [ErrorCode.API_ERROR]: 'API request failed. Please try again.',
    };
    return messages[code] || 'An error occurred.';
  }

  toJSON(): AppError {
    return {
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      details: this.details,
      timestamp: this.timestamp,
      userId: this.userId,
      requestId: this.requestId,
      stack: this.stack,
    };
  }
}

// Error factory functions
export const createAuthError = (message: string, details?: Record<string, unknown>) =>
  new FinancialAppError({
    code: ErrorCode.AUTHENTICATION_FAILED,
    message,
    details,
  });

export const createValidationError = (message: string, details?: Record<string, unknown>) =>
  new FinancialAppError({
    code: ErrorCode.VALIDATION_ERROR,
    message,
    details,
  });

export const createNetworkError = (message: string, details?: Record<string, unknown>) =>
  new FinancialAppError({
    code: ErrorCode.NETWORK_ERROR,
    message,
    details,
  });

export const createFileError = (message: string, details?: Record<string, unknown>) =>
  new FinancialAppError({
    code: ErrorCode.FILE_UPLOAD_FAILED,
    message,
    details,
  });

// Error logging utility
export class ErrorLogger {
  private static instance: ErrorLogger;
  
  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  async logError(error: Error | FinancialAppError, context?: Record<string, unknown>): Promise<void> {
    // Handle cases where error might be null, undefined, or not a proper Error object
    if (!error) {
      console.error('🚨 Error logged: Error object is null or undefined', { context });
      return;
    }

    let errorData: any;
    
    try {
      if (error instanceof FinancialAppError) {
        errorData = {
          ...error.toJSON(),
          stack: error.stack,
          context,
        };
      } else if (error instanceof Error) {
        errorData = {
          code: ErrorCode.UNKNOWN_ERROR,
          message: error.message || 'Unknown error occurred',
          timestamp: new Date(),
          stack: error.stack,
          context,
        };
      } else {
        // Handle non-Error objects that might have been thrown
        errorData = {
          code: ErrorCode.UNKNOWN_ERROR,
          message: typeof error === 'string' ? error : 'Unknown error occurred',
          details: { originalError: error },
          timestamp: new Date(),
          context,
        };
      }
    } catch (serializationError) {
      console.error('🚨 Error serializing error object:', serializationError);
      errorData = {
        code: ErrorCode.UNKNOWN_ERROR,
        message: 'Error occurred but could not be serialized',
        timestamp: new Date(),
        context,
      };
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('🚨 Error logged:', errorData);
    }

    // In production, send to monitoring service
    try {
      // TODO: Replace with your monitoring service (Sentry, LogRocket, etc.)
      if (process.env.NODE_ENV === 'production') {
        // await sendToMonitoringService(errorData);
      }
    } catch (loggingError) {
      console.error('Failed to log error to monitoring service:', loggingError);
    }
  }

  logUserAction(action: string, userId?: string, details?: Record<string, unknown>): void {
    const actionData = {
      timestamp: new Date().toISOString(),
      action,
      userId,
      details,
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('👤 User action:', actionData);
    }
  }

  logInfo(message: string, context?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'development') {
      console.log('ℹ️ Info:', { message, context, timestamp: new Date().toISOString() });
    }
  }

  logWarning(message: string, context?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Warning:', { message, context, timestamp: new Date().toISOString() });
    }
  }
}

// Utility functions
export function isFinancialAppError(error: unknown): error is FinancialAppError {
  return error instanceof FinancialAppError;
}

export function getErrorMessage(error: unknown): string {
  if (isFinancialAppError(error)) {
    return error.userMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred.';
}

export function shouldRetry(error: unknown): boolean {
  if (isFinancialAppError(error)) {
    return [
      ErrorCode.NETWORK_ERROR,
      ErrorCode.API_TIMEOUT,
      ErrorCode.SERVER_ERROR,
    ].includes(error.code);
  }
  return false;
}

// Error boundary hook for client components
export function useErrorHandler() {
  const logger = ErrorLogger.getInstance();

  return {
    handleError: async (error: Error, context?: Record<string, unknown>) => {
      await logger.logError(error, context);
    },
    logUserAction: (action: string, details?: Record<string, unknown>) => {
      logger.logUserAction(action, undefined, details);
    },
  };
}