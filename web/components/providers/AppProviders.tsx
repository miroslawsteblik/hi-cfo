'use client';

import { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { ThemeProvider } from '@/contexts/ThemeContext';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ErrorBoundary showErrorDetails={process.env.NODE_ENV === 'development'}>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </ErrorBoundary>
  );
}