'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { ErrorLogger } from '@/lib/errors';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const errorLogger = ErrorLogger.getInstance();

  useEffect(() => {
    // Log the global error
    errorLogger.logError(error, {
      context: 'GlobalError',
      digest: error.digest,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    });
  }, [error, errorLogger]);

  const handleReload = () => {
    window.location.href = '/dashboard';
  };

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-8 w-8 text-red-500 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">
                Application Error
              </h1>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-2">
                A critical error occurred in the application. We've been notified and are working to fix it.
              </p>
              <p className="text-sm text-gray-500">
                Please try refreshing the page or returning to the dashboard.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={reset}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </button>

              <button
                onClick={handleReload}
                className="w-full flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <details className="mt-6 text-xs">
                <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                  Error Details (Development)
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
              Error ID: {error.digest || Date.now().toString(36)}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}