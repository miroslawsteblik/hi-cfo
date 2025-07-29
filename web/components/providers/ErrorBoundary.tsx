'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { ErrorLogger, FinancialAppError, ErrorCode, isFinancialAppError } from '@/lib/errors';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showErrorDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private errorLogger = ErrorLogger.getInstance();
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log the error
    this.errorLogger.logError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: 'ErrorBoundary',
      retryCount: this.state.retryCount,
    });

    // Call optional onError callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1;
    
    if (newRetryCount <= this.maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: newRetryCount,
      });
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const error = this.state.error;
      const isFinancialError = isFinancialAppError(error);
      const canRetry = this.state.retryCount < this.maxRetries;
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-8 w-8 text-red-500 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">
                Something went wrong
              </h1>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-2">
                {isFinancialError 
                  ? error.userMessage 
                  : 'We encountered an unexpected error. Our team has been notified.'}
              </p>
              
              {isFinancialError && error.code === ErrorCode.AUTHENTICATION_FAILED && (
                <p className="text-sm text-blue-600">
                  You may need to log in again to continue.
                </p>
              )}
            </div>

            <div className="space-y-3">
              {canRetry && (
                <button
                  onClick={this.handleRetry}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again ({this.maxRetries - this.state.retryCount} attempts left)
                </button>
              )}

              <button
                onClick={this.handleGoHome}
                className="w-full flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </button>

              <button
                onClick={this.handleReload}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Page
              </button>
            </div>

            {this.props.showErrorDetails && process.env.NODE_ENV === 'development' && (
              <details className="mt-6 text-xs">
                <summary className="cursor-pointer text-gray-500 hover:text-gray-700 flex items-center">
                  <Bug className="h-4 w-4 mr-1" />
                  Developer Details
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded border overflow-auto max-h-32">
                  <p className="font-mono text-red-600 mb-2">{error.message}</p>
                  {error.stack && (
                    <pre className="text-gray-700 whitespace-pre-wrap text-xs">
                      {error.stack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <div className="mt-4 text-xs text-gray-500 text-center">
              Error ID: {Date.now().toString(36)}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specialized error boundaries for different contexts

export function FinancialDataErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            <h3 className="text-sm font-medium text-red-800">
              Financial Data Error
            </h3>
          </div>
          <p className="mt-1 text-sm text-red-700">
            There was an issue loading your financial data. Please refresh the page or contact support if the problem persists.
          </p>
        </div>
      }
      onError={(error) => {
        ErrorLogger.getInstance().logError(error, { context: 'FinancialData' });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export function FormErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
            <h3 className="text-sm font-medium text-yellow-800">
              Form Error
            </h3>
          </div>
          <p className="mt-1 text-sm text-yellow-700">
            There was an issue with the form. Please refresh the page and try again.
          </p>
        </div>
      }
      onError={(error) => {
        ErrorLogger.getInstance().logError(error, { context: 'Form' });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export function FileUploadErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-md">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
            <h3 className="text-sm font-medium text-orange-800">
              File Upload Error
            </h3>
          </div>
          <p className="mt-1 text-sm text-orange-700">
            There was an issue processing your file. Please check the file format and try again.
          </p>
        </div>
      }
      onError={(error) => {
        ErrorLogger.getInstance().logError(error, { context: 'FileUpload' });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}