'use client';

import { useState } from 'react';
import { Copy, Check, ExternalLink, Coins } from 'lucide-react';
import { TOKEN_CONFIG } from '@/lib/token-config';
import { useToast } from '@/components/ui/Toast';

export function TokenHero() {
  const [copied, setCopied] = useState(false);
  const { success, error } = useToast();

  const handleCopy = async () => {
    if (TOKEN_CONFIG.contractAddress === 'Coming Soon') return;
    try {
      await navigator.clipboard.writeText(TOKEN_CONFIG.contractAddress);
      setCopied(true);
      success('Contract address copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      error('Failed to copy address');
    }
  };

  const isLaunched = TOKEN_CONFIG.contractAddress !== 'Coming Soon';

  return (
    <div className="px-6 md:px-12 py-12 md:py-20 border-b-2 border-border bg-card relative overflow-hidden">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-accent flex items-center justify-center border-2 border-border shadow-[4px_4px_0px_0px_var(--border)] accent-box-glow">
            <Coins size={28} className="text-cream coin-spin" />
          </div>
          <h1 className="text-5xl md:text-8xl font-mono font-extrabold uppercase text-white">
            ${TOKEN_CONFIG.symbol}
          </h1>
        </div>

        <p className="text-lg md:text-xl max-w-2xl font-medium leading-relaxed text-text-muted mb-8">
          The community token powering Blacklist infrastructure. Fund API costs,
          unlock premium features, and support the threat assessment ecosystem.
        </p>

        {/* Contract Address */}
        <div className="mb-8">
          <div className="text-xs font-bold uppercase tracking-widest text-text-muted mb-2">
            Contract Address
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleCopy}
              disabled={!isLaunched}
              className={`inline-flex items-center gap-2 px-4 py-2 bg-cream border-2 border-border font-mono text-sm ${
                isLaunched
                  ? 'hover:border-accent cursor-pointer'
                  : 'cursor-default opacity-70'
              } transition-colors`}
            >
              <span className="truncate max-w-[200px] md:max-w-none">
                {TOKEN_CONFIG.contractAddress}
              </span>
              {isLaunched &&
                (copied ? (
                  <Check size={16} className="text-success shrink-0" />
                ) : (
                  <Copy size={16} className="text-text-muted shrink-0" />
                ))}
            </button>
            {!isLaunched && (
              <span className="px-3 py-1 bg-accent/10 text-accent text-xs font-bold uppercase border border-accent/30">
                Pre-Launch
              </span>
            )}
          </div>
        </div>

        {/* External Links */}
        {isLaunched && (
          <div className="flex flex-wrap gap-3">
            <a
              href={TOKEN_CONFIG.links.dexscreener}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-dark text-cream font-bold text-sm uppercase border-2 border-dark hover:bg-accent hover:border-accent transition-colors"
            >
              DexScreener <ExternalLink size={14} />
            </a>
            <a
              href={TOKEN_CONFIG.links.pump}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-transparent text-dark font-bold text-sm uppercase border-2 border-dark hover:bg-dark hover:text-cream transition-colors"
            >
              pump.fun <ExternalLink size={14} />
            </a>
            <a
              href={TOKEN_CONFIG.links.raydium}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-transparent text-dark font-bold text-sm uppercase border-2 border-dark hover:bg-dark hover:text-cream transition-colors"
            >
              Raydium <ExternalLink size={14} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
