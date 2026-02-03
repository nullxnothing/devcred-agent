import React from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t-2 border-dark/30 bg-cream">
      <div className="px-6 md:px-12 py-12 md:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl font-black font-display-mock text-dark">
                  DEV<span className="text-accent">KARMA</span>
                </span>
              </div>
              <p className="text-sm text-dark/60 max-w-sm leading-relaxed mb-4">
                On-chain reputation scoring for Solana token creators. Your launches. Your legacy.
              </p>
              <div className="flex gap-3">
                <a
                  href="https://x.com/devkarma_io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-accent text-cream flex items-center justify-center hover:bg-accent/90 transition-colors"
                  title="Follow on X"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-dark/50 mb-4">Product</h4>
              <ul className="space-y-3">
                <li><Link href="/leaderboard" className="text-sm font-medium text-dark/70 hover:text-accent transition-colors">Leaderboard</Link></li>
                <li><Link href="/docs" className="text-sm font-medium text-dark/70 hover:text-accent transition-colors">Documentation</Link></li>
                <li><Link href="/login" className="text-sm font-medium text-dark/70 hover:text-accent transition-colors">Claim Profile</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-dark/50 mb-4">Resources</h4>
              <ul className="space-y-3">
                <li><a href="https://x.com/devkarma_io" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-dark/70 hover:text-accent transition-colors">Twitter / X</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t-2 border-dark/10 px-6 md:px-12 py-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-dark/50">
          <span>&copy; 2025 DevKarma. All rights reserved.</span>
          <span>Built for the Solana community</span>
        </div>
      </div>
    </footer>
  );
};
