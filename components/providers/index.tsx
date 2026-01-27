'use client';

import { ReactNode } from 'react';
import { AuthProvider } from './AuthProvider';
import { WalletProvider } from './WalletProvider';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <WalletProvider>
        {children}
      </WalletProvider>
    </AuthProvider>
  );
}
