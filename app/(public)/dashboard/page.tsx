'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface User {
  walletAddress: string;
  twitterHandle: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();

        if (!data.user) {
          router.replace('/login');
          return;
        }

        const user = data.user as User;

        // Redirect to profile - prefer Twitter handle, fallback to wallet address
        if (user.twitterHandle && user.twitterHandle.trim() !== '') {
          router.replace(`/profile/${user.twitterHandle}`);
        } else if (user.walletAddress) {
          router.replace(`/profile/${user.walletAddress}`);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Error loading user:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-error" />
          <h2 className="text-xl font-bold text-dark">Profile Error</h2>
          <p className="text-dark/60">
            We couldn&apos;t load your profile. Please try logging in again.
          </p>
          <Button
            onClick={() => router.push('/login')}
            variant="accent"
          >
            Return to Login
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-accent" />
          <p className="text-lg font-medium text-dark/60">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return null;
}
