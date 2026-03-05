'use client';

import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  text: string;
  label?: string;
  truncate?: boolean;
  className?: string;
}

export function CopyButton({ text, label, truncate = true, className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [text]);

  const displayText = label || (truncate && text.length > 12
    ? `${text.slice(0, 6)}...${text.slice(-4)}`
    : text);

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-2 font-mono text-xs tracking-wide uppercase px-2 py-1 border-2 border-transparent hover:border-white hover:bg-white hover:text-black transition-all duration-150 cursor-pointer group ${className}`}
      title={`Click to copy: ${text}`}
    >
      <span>{displayText}</span>
      {copied ? (
        <Check size={12} className="text-score-proven" strokeWidth={3} />
      ) : (
        <Copy size={12} className="opacity-60 group-hover:opacity-100" strokeWidth={2.5} />
      )}
    </button>
  );
}

interface AddressDisplayProps {
  address: string;
  showFull?: boolean;
  showCopy?: boolean;
  className?: string;
}

export function AddressDisplay({ address, showFull = false, showCopy = true, className = '' }: AddressDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [address]);

  const displayAddress = showFull
    ? address
    : `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-2 font-mono text-xs tracking-wide px-2 py-1 border-2 border-transparent hover:border-white hover:bg-white hover:text-black transition-all duration-150 cursor-pointer group ${className}`}
      title={`Click to copy: ${address}`}
    >
      <span>{displayAddress}</span>
      {showCopy && (
        copied ? (
          <Check size={12} className="text-score-proven shrink-0" strokeWidth={3} />
        ) : (
          <Copy size={12} className="opacity-60 group-hover:opacity-100 shrink-0" strokeWidth={2.5} />
        )
      )}
    </button>
  );
}
