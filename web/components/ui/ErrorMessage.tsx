'use client';

import { AlertCircle, AlertTriangle, Info, CheckCircle, X } from 'lucide-react';
import { ReactNode } from 'react';

export type ErrorSeverity = 'error' | 'warning' | 'info' | 'success';

interface ErrorMessageProps {
  message: string;
  severity?: ErrorSeverity;
  title?: string;
  details?: string;
  actions?: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const severityConfig = {
  error: {
    icon: AlertCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-500',
    titleColor: 'text-red-800',
    textColor: 'text-red-700',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    iconColor: 'text-yellow-500',
    titleColor: 'text-yellow-800',
    textColor: 'text-yellow-700',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-500',
    titleColor: 'text-blue-800',
    textColor: 'text-blue-700',
  },
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconColor: 'text-green-500',
    titleColor: 'text-green-800',
    textColor: 'text-green-700',
  },
};

export function ErrorMessage({
  message,
  severity = 'error',
  title,
  details,
  actions,
  dismissible = false,
  onDismiss,
  className = '',
}: ErrorMessageProps) {
  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <div
      className={`
        ${config.bgColor} ${config.borderColor} border rounded-md p-4 
        ${className}
      `}
      role="alert"
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={`h-5 w-5 ${config.iconColor}`} />
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={`text-sm font-medium ${config.titleColor} mb-1`}>
              {title}
            </h3>
          )}
          <p className={`text-sm ${config.textColor}`}>
            {message}
          </p>
          {details && (
            <details className="mt-2">
              <summary className={`cursor-pointer text-xs ${config.textColor} hover:underline`}>
                More details
              </summary>
              <p className={`mt-1 text-xs ${config.textColor} font-mono bg-white bg-opacity-50 p-2 rounded`}>
                {details}
              </p>
            </details>
          )}
          {actions && (
            <div className="mt-3">
              {actions}
            </div>
          )}
        </div>
        {dismissible && onDismiss && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onDismiss}
                className={`
                  inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${config.textColor} hover:${config.bgColor}
                `}
              >
                <span className="sr-only">Dismiss</span>
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Specialized error message components
export function ValidationErrorMessage({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;

  return (
    <ErrorMessage
      severity="error"
      title="Validation Error"
      message={errors.length === 1 ? errors[0] : `${errors.length} validation errors occurred:`}
      details={errors.length > 1 ? errors.join('\n') : undefined}
    />
  );
}

export function NetworkErrorMessage({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorMessage
      severity="error"
      title="Connection Error"
      message="Unable to connect to the server. Please check your internet connection."
      actions={
        onRetry && (
          <button
            onClick={onRetry}
            className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200 transition-colors"
          >
            Try Again
          </button>
        )
      }
    />
  );
}

export function FinancialDataErrorMessage({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <ErrorMessage
      severity="warning"
      title="Financial Data Issue"
      message="There was an issue loading your financial data. This might be temporary."
      actions={
        onRefresh && (
          <button
            onClick={onRefresh}
            className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded hover:bg-yellow-200 transition-colors"
          >
            Refresh Data
          </button>
        )
      }
    />
  );
}

export function SuccessMessage({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <ErrorMessage
      severity="success"
      message={message}
      dismissible={!!onDismiss}
      onDismiss={onDismiss}
    />
  );
}