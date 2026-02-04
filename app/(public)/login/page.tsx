'use client';

import React from 'react';
import { Shield, TrendingUp, ExternalLink } from 'lucide-react';
import { WalletAuth } from '@/components/wallet/WalletAuth';

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-8 sm:p-6 bg-cream relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-20 -right-20 w-48 sm:w-64 h-48 sm:h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-60 sm:w-80 h-60 sm:h-80 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
        backgroundSize: '32px 32px'
      }} />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6 sm:mb-8">
          <div className="w-14 h-14 sm:w-20 sm:h-20 bg-accent border-3 sm:border-4 border-dark flex items-center justify-center mb-4 sm:mb-6 transform -rotate-3 lg:hover:rotate-0 transition-transform text-2xl sm:text-4xl">
            👨‍💻
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-display-mock text-dark mb-3 sm:mb-4 leading-none">
            CLAIM YOUR <br />
            <span className="text-accent">PROFILE</span>
          </h1>
          <p className="text-sm sm:text-base text-dark/60 font-medium max-w-xs">
            Connect your wallet to build your on-chain reputation and track your launch history.
          </p>
        </div>

        {/* Wallet Auth Component */}
        <WalletAuth
          redirectTo="/dashboard"
          className="shadow-[8px_8px_0px_0px_var(--accent)] sm:shadow-[16px_16px_0px_0px_var(--accent)]"
        />

        {/* Trust indicators */}
        <div className="mt-4 sm:mt-6 bg-card border-2 sm:border-4 border-dark p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Shield size={14} className="text-accent sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-xs font-bold uppercase text-dark/60">No Password</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <TrendingUp size={14} className="text-accent sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-xs font-bold uppercase text-dark/60">On-Chain Rep</span>
            </div>
          </div>

          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-dark/10">
            <a
              href="https://pump.fun"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-accent hover:underline active:underline p-1"
            >
              Your profile links directly to Pump.fun <ExternalLink size={12} className="sm:w-3.5 sm:h-3.5" />
            </a>
          </div>
        </div>

        <p className="mt-3 sm:mt-4 text-[0.55rem] sm:text-[0.65rem] text-dark/40 text-center uppercase font-bold tracking-widest">
          Sign a message to prove wallet ownership. No transaction, no fees.
        </p>
      </div>
    </div>
  );
}
