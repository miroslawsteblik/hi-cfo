// lib/server-action-wrapper.ts - Wrapper for server actions with consistent error handling

import { 
  FinancialAppError, 
  ErrorCode, 
  ErrorLogger,
  isFinancialAppError,
  getErrorMessage,
} from './errors';

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: ErrorCode;
}

export type ServerAction<TInput = unknown, TOutput = unknown> = (
  input: TInput
) => Promise<ActionResult<TOutput>>;

export function withErrorHandling<TInput = unknown, TOutput = unknown>(
  action: (input: TInput) => Promise<TOutput>,
  actionName: string
): ServerAction<TInput, TOutput> {
  return async (input: TInput): Promise<ActionResult<TOutput>> => {
    const logger = ErrorLogger.getInstance();
    const startTime = Date.now();

    try {
      // Log the action start
      logger.logUserAction(`${actionName}_start`, undefined, {
        input: typeof input === 'object' ? Object.keys(input as object) : typeof input,
      });

      const result = await action(input);
      
      // Log successful completion
      const duration = Date.now() - startTime;
      logger.logUserAction(`${actionName}_success`, undefined, {
        duration,
        hasResult: !!result,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Handle known application errors
      if (isFinancialAppError(error)) {
        await logger.logError(error, {
          actionName,
          duration,
          input: typeof input === 'object' ? Object.keys(input as object) : typeof input,
        });

        return {
          success: false,
          error: error.userMessage,
          code: error.code,
        };
      }

      // Handle unknown errors
      const unknownError = new FinancialAppError({
        code: ErrorCode.UNKNOWN_ERROR,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: {
          actionName,
          originalError: error instanceof Error ? error.stack : String(error),
        },
      });

      await logger.logError(unknownError, {
        actionName,
        duration,
        input: typeof input === 'object' ? Object.keys(input as object) : typeof input,
      });

      return {
        success: false,
        error: getErrorMessage(error),
        code: ErrorCode.UNKNOWN_ERROR,
      };
    }
  };
}

// Specialized wrappers for different types of actions

export function withAuthErrorHandling<TInput = unknown, TOutput = unknown>(
  action: (input: TInput) => Promise<TOutput>,
  actionName: string
): ServerAction<TInput, TOutput> {
  return withErrorHandling(async (input: TInput) => {
    try {
      return await action(input);
    } catch (error) {
      // Convert common auth-related errors
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          throw new FinancialAppError({
            code: ErrorCode.AUTHENTICATION_FAILED,
            message: 'Authentication failed',
            userMessage: 'Please log in again to continue.',
          });
        }
        if (error.message.includes('403') || error.message.includes('Forbidden')) {
          throw new FinancialAppError({
            code: ErrorCode.AUTHORIZATION_DENIED,
            message: 'Access denied',
            userMessage: 'You don\'t have permission to perform this action.',
          });
        }
      }
      throw error;
    }
  }, actionName);
}

export function withValidationErrorHandling<TInput = unknown, TOutput = unknown>(
  action: (input: TInput) => Promise<TOutput>,
  actionName: string,
  validateInput?: (input: TInput) => void
): ServerAction<TInput, TOutput> {
  return withErrorHandling(async (input: TInput) => {
    // Run validation if provided
    if (validateInput) {
      try {
        validateInput(input);
      } catch (error) {
        throw new FinancialAppError({
          code: ErrorCode.VALIDATION_ERROR,
          message: error instanceof Error ? error.message : 'Validation failed',
          userMessage: 'Please check your input and try again.',
          details: { input },
        });
      }
    }

    try {
      return await action(input);
    } catch (error) {
      // Convert validation-related errors from the API
      if (error instanceof Error && error.message.includes('400')) {
        throw new FinancialAppError({
          code: ErrorCode.VALIDATION_ERROR,
          message: error.message,
          userMessage: 'The data provided is invalid. Please check your input.',
        });
      }
      throw error;
    }
  }, actionName);
}

export function withFileErrorHandling<TInput = unknown, TOutput = unknown>(
  action: (input: TInput) => Promise<TOutput>,
  actionName: string
): ServerAction<TInput, TOutput> {
  return withErrorHandling(async (input: TInput) => {
    try {
      return await action(input);
    } catch (error) {
      if (error instanceof Error) {
        // File size errors
        if (error.message.includes('file too large') || error.message.includes('size')) {
          throw new FinancialAppError({
            code: ErrorCode.FILE_TOO_LARGE,
            message: error.message,
          });
        }
        
        // File format errors
        if (error.message.includes('format') || error.message.includes('parse')) {
          throw new FinancialAppError({
            code: ErrorCode.INVALID_FILE_FORMAT,
            message: error.message,
          });
        }
        
        // OFX specific errors
        if (error.message.includes('OFX') || error.message.includes('ofx')) {
          throw new FinancialAppError({
            code: ErrorCode.OFX_PARSE_ERROR,
            message: error.message,
          });
        }
      }
      throw error;
    }
  }, actionName);
}

// Utility for handling form submissions
export function createFormAction<TFormData = FormData, TOutput = unknown>(
  action: (formData: TFormData) => Promise<TOutput>,
  actionName: string,
  parseFormData?: (formData: FormData) => TFormData
) {
  return withValidationErrorHandling(
    async (formData: FormData) => {
      const parsedData = parseFormData ? parseFormData(formData) : (formData as TFormData);
      return await action(parsedData);
    },
    actionName
  );
}

// Helper for handling async operations with loading states
export function withLoadingState<T>(
  operation: () => Promise<T>,
  setLoading: (loading: boolean) => void
): Promise<T> {
  setLoading(true);
  return operation().finally(() => setLoading(false));
}

// Type guards for action results
export function isSuccessResult<T>(result: ActionResult<T>): result is ActionResult<T> & { success: true; data: T } {
  return result.success && result.data !== undefined;
}

export function isErrorResult<T>(result: ActionResult<T>): result is ActionResult<T> & { success: false; error: string } {
  return !result.success && result.error !== undefined;
}