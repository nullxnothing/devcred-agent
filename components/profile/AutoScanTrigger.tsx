'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface AutoScanTriggerProps {
  userId: string;
  walletAddress: string | undefined;
  hasTokens: boolean;
}

export function AutoScanTrigger({ userId, walletAddress, hasTokens }: AutoScanTriggerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(hasTokens);

  useEffect(() => {
    // Auto-trigger scan on mount if no tokens and has wallet
    if (!hasTokens && walletAddress && !scanComplete && !isScanning) {
      triggerScan();
    }
  }, [hasTokens, walletAddress, scanComplete, isScanning]);

  const triggerScan = async () => {
    if (!walletAddress || isScanning) return;

    setIsScanning(true);
    try {
      const res = await fetch(`/api/wallet/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, userId }),
      });

      if (res.ok) {
        setScanComplete(true);
        // Reload page to show new tokens
        window.location.reload();
      }
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setIsScanning(false);
    }
  };

  if (hasTokens || !walletAddress) return null;

  return (
    <div className="border-2 border-dashed border-white-20 bg-black-2 p-6 text-center">
      {isScanning ? (
        <>
          <RefreshCw size={32} className="mx-auto mb-3 text-white-60 animate-spin" />
          <p className="text-sm font-mono text-white-60">Scanning blockchain for token launches...</p>
          <p className="text-xs font-mono text-white-40 mt-2">This may take up to 30 seconds</p>
        </>
      ) : (
        <>
          <p className="text-sm font-mono text-white-60 mb-4">No tokens found. Scan this wallet?</p>
          <button
            onClick={triggerScan}
            className="px-4 py-2 bg-white text-black font-mono font-bold uppercase text-xs hover:bg-white-90 transition-colors"
          >
            Scan Wallet
          </button>
        </>
      )}
    </div>
  );
}
