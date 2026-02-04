'use client';

import { ReactNode } from 'react';
import { AuthProvider } from './AuthProvider';
import { WalletProvider } from './WalletProvider';
import { ThemeProvider } from './ThemeProvider';
import { ToastProvider } from '@/components/ui/Toast';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <WalletProvider>
            {children}
          </WalletProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
