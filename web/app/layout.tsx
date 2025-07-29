// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css'
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ErrorBoundary } from '@/components/providers/ErrorBoundary';
import CookieConsentBanner from '@/components/ui/CookieConsentBanner';

export const metadata: Metadata = {
  title: 'Hi-CFO - Financial Dashboard',
  description: 'Transform your financial data into actionable insights',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ErrorBoundary>
          <ThemeProvider>
            {children}
            <CookieConsentBanner />
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}