'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { WalletAuth } from '@/components/wallet/WalletAuth';

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-8 sm:p-6 bg-black relative overflow-hidden font-mono">
      {/* Scanline overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 1px, transparent 1px, transparent 3px)',
      }} />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6 sm:mb-8">
          <div className="w-14 h-14 sm:w-20 sm:h-20 border border-white-20 bg-black-1 flex items-center justify-center mb-4 sm:mb-6">
            <span className="text-white text-2xl sm:text-4xl font-mono font-extrabold">_</span>
          </div>
          <div className="text-white-40 text-xs tracking-widest mb-3">$ sudo register --identity</div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-mono font-extrabold uppercase text-white mb-3 sm:mb-4 leading-none">
            IDENTITY<br />
            <span className="text-white-60">REGISTRATION</span>
          </h1>
          <p className="text-sm sm:text-base text-white-40 max-w-xs font-mono">
            Connect your wallet to establish your on-chain identity and begin building your operational record.
          </p>
        </div>

        {/* Wallet Auth Component */}
        <WalletAuth
          redirectTo="/dashboard"
          className="border border-white-20"
        />

        {/* Trust indicators */}
        <div className="mt-4 sm:mt-6 border border-white-20 bg-black-1 p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-white-40 text-xs">[&#10003;]</span>
              <span className="text-[10px] sm:text-xs font-bold uppercase text-white-60">No Password</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-white-40 text-xs">[&#10003;]</span>
              <span className="text-[10px] sm:text-xs font-bold uppercase text-white-60">On-Chain Rep</span>
            </div>
          </div>

          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white-20">
            <a
              href="https://pump.fun"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-white-60 hover:text-white active:text-white transition-colors p-1 font-mono"
            >
              Profile links to Pump.fun <ExternalLink size={12} className="sm:w-3.5 sm:h-3.5" />
            </a>
          </div>
        </div>

        <p className="mt-3 sm:mt-4 text-[0.55rem] sm:text-[0.65rem] text-white-20 text-center uppercase font-bold tracking-widest font-mono">
          Sign a message to prove wallet ownership. No transaction, no fees.
        </p>
      </div>
    </div>
  );
}
