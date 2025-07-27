'use client';

import { useCallback, useState } from 'react';
import { 
  ErrorLogger, 
  FinancialAppError, 
  ErrorCode, 
  isFinancialAppError,
  getErrorMessage,
  shouldRetry,
} from '@/lib/errors';
import { toast } from 'react-toastify';

interface UseErrorHandlerOptions {
  showToast?: boolean;
  logErrors?: boolean;
  retryLimit?: number;
}

interface ErrorState {
  error: string | null;
  code?: ErrorCode;
  isRetryable: boolean;
  retryCount: number;
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const {
    showToast = true,
    logErrors = true,
    retryLimit = 3,
  } = options;

  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isRetryable: false,
    retryCount: 0,
  });

  const logger = ErrorLogger.getInstance();

  const handleError = useCallback(async (
    error: unknown,
    context?: Record<string, unknown>
  ) => {
    let errorMessage: string;
    let errorCode: ErrorCode | undefined;
    let isRetryable = false;

    if (isFinancialAppError(error)) {
      errorMessage = error.userMessage;
      errorCode = error.code;
      isRetryable = shouldRetry(error);
    } else {
      errorMessage = getErrorMessage(error);
      errorCode = ErrorCode.UNKNOWN_ERROR;
      isRetryable = shouldRetry(error);
    }

    // Log the error
    if (logErrors) {
      if (error instanceof Error || isFinancialAppError(error)) {
        await logger.logError(error, context);
      } else {
        await logger.logError(new Error(String(error)), context);
      }
    }

    // Update error state
    setErrorState(prev => ({
      error: errorMessage,
      code: errorCode,
      isRetryable,
      retryCount: prev.retryCount,
    }));

    // Show toast notification
    if (showToast) {
      if (errorCode === ErrorCode.AUTHENTICATION_FAILED) {
        toast.error(`Authentication required: ${errorMessage}`);
      } else if (errorCode === ErrorCode.NETWORK_ERROR) {
        toast.error(`Connection issue: ${errorMessage}`);
      } else {
        toast.error(`Error: ${errorMessage}`);
      }
    }

    return errorMessage;
  }, [logger, logErrors, showToast]);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isRetryable: false,
      retryCount: 0,
    });
  }, []);

  const retry = useCallback(() => {
    if (errorState.retryCount < retryLimit) {
      setErrorState(prev => ({
        ...prev,
        retryCount: prev.retryCount + 1,
      }));
      return true;
    }
    return false;
  }, [errorState.retryCount, retryLimit]);

  const logUserAction = useCallback((action: string, details?: Record<string, unknown>) => {
    logger.logUserAction(action, undefined, details);
  }, [logger]);

  return {
    error: errorState.error,
    errorCode: errorState.code,
    isRetryable: errorState.isRetryable,
    retryCount: errorState.retryCount,
    canRetry: errorState.isRetryable && errorState.retryCount < retryLimit,
    handleError,
    clearError,
    retry,
    logUserAction,
  };
}

// Specialized hook for form error handling
export function useFormErrorHandler() {
  const { handleError, clearError, error } = useErrorHandler({
    showToast: false, // Forms usually handle their own error display
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleFormError = useCallback((error: unknown, fieldName?: string) => {
    if (fieldName && isFinancialAppError(error) && error.code === ErrorCode.VALIDATION_ERROR) {
      setFieldErrors(prev => ({
        ...prev,
        [fieldName]: error.userMessage,
      }));
    } else {
      handleError(error);
    }
  }, [handleError]);

  const clearFieldError = useCallback((fieldName: string) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    clearError();
    setFieldErrors({});
  }, [clearError]);

  return {
    error,
    fieldErrors,
    handleFormError,
    clearFieldError,
    clearAllErrors,
    hasErrors: !!error || Object.keys(fieldErrors).length > 0,
  };
}

// Hook for handling async operations with error handling
export function useAsyncOperation<T extends (...args: any[]) => Promise<any>>(
  operation: T,
  options: UseErrorHandlerOptions & {
    onSuccess?: (result: Awaited<ReturnType<T>>) => void;
    onError?: (error: unknown) => void;
  } = {}
) {
  const [isLoading, setIsLoading] = useState(false);
  const { handleError, clearError, ...errorState } = useErrorHandler(options);

  const execute = useCallback(async (...args: Parameters<T>) => {
    setIsLoading(true);
    clearError();

    try {
      const result = await operation(...args);
      options.onSuccess?.(result);
      return result;
    } catch (error) {
      await handleError(error, { operation: operation.name });
      options.onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [operation, handleError, clearError, options]);

  return {
    execute,
    isLoading,
    ...errorState,
  };
}