'use client';

import { ReactNode } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface ProfileClientWrapperProps {
  children: ReactNode;
}

export function ProfileClientWrapper({ children }: ProfileClientWrapperProps) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}

interface ProfileInteractiveProps {
  profileUserId: string;
  hasWallets: boolean;
}

export function ProfileInteractive({ profileUserId, hasWallets }: ProfileInteractiveProps) {
  return null;
}
