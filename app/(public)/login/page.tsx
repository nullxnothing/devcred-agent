'use client';

import React from 'react';
import { signIn } from 'next-auth/react';
import { Twitter, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const handleTwitterSignIn = () => {
    signIn('twitter', { callbackUrl: '/dashboard' });
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 bg-cream">
      <div className="w-full max-w-md bg-white border-4 border-dark p-8 md:p-12 shadow-[16px_16px_0px_0px_#3B3B3B]">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-20 h-20 bg-accent border-4 border-dark rounded-none flex items-center justify-center mb-6 transform -rotate-3">
             <Twitter size={40} className="text-dark" strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl md:text-5xl font-black font-display-mock text-dark mb-4 leading-none">
            CLAIM YOUR <br />
            <span className="text-accent underline decoration-4 underline-offset-4 decoration-dark">LEGACY</span>
          </h1>
          <p className="text-dark/60 font-medium">
            Connect your Twitter to build your on-chain reputation and track your launch history.
          </p>
        </div>

        <div className="space-y-4">
          <Button 
            onClick={handleTwitterSignIn}
            variant="accent" 
            className="w-full h-16 text-lg font-black uppercase tracking-tight flex items-center justify-center gap-3"
          >
            Sign in with Twitter <ArrowRight size={20} />
          </Button>

          <p className="text-[0.65rem] text-dark/40 text-center uppercase font-bold tracking-widest mt-8">
            DevKarma uses read-only Twitter access to verify your developer profile.
          </p>
        </div>
      </div>
    </div>
  );
}
