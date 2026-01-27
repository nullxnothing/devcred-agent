'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }

    if (status === 'authenticated' && session?.user) {
      const handle = session.user.twitterHandle;
      if (handle && handle.trim() !== '') {
        router.replace(`/profile/${handle}`);
      } else {
        // Handle is missing - show error state
        setError(true);
      }
    }
  }, [session, status, router]);

  if (error) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <h2 className="text-xl font-bold text-dark">Profile Setup Required</h2>
          <p className="text-dark/60">
            We couldn&apos;t retrieve your Twitter handle. Please sign out and sign in again.
          </p>
          <Button
            onClick={() => signOut({ callbackUrl: '/login' })}
            variant="accent"
          >
            Sign Out & Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-accent" />
        <p className="text-lg font-medium text-dark/60">Loading your profile...</p>
      </div>
    </div>
  );
}
