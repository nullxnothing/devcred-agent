import React from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-white-20 bg-black safe-area-bottom">
      <div className="px-4 sm:px-6 md:px-12 py-8 sm:py-12 md:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {/* Brand */}
            <div className="col-span-2">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-xl sm:text-2xl font-mono font-extrabold uppercase tracking-tight">
                  <span className="text-white-40">[</span>
                  <span className="text-white">BLACKLIST</span>
                  <span className="text-white-40">]</span>
                </span>
              </div>
              <p className="text-xs font-mono text-white-40 max-w-sm leading-relaxed mb-3">
                We see everything. Developer threat assessment for Solana token creators.
              </p>
              <a
                href="https://x.com/Blacklistfun"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-mono text-white-60 hover:text-white transition-colors group"
                title="Follow @Blacklistfun on X"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span className="group-hover:underline">@Blacklistfun</span>
              </a>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-white-40 mb-3 sm:mb-4">SYSTEM</h4>
              <ul className="space-y-2 sm:space-y-3">
                <li><Link href="/leaderboard" className="text-xs font-mono text-white-60 hover:text-white transition-colors">Rankings</Link></li>
                <li><Link href="/docs" className="text-xs font-mono text-white-60 hover:text-white transition-colors">System Manual</Link></li>
                <li><Link href="/login" className="text-xs font-mono text-white-60 hover:text-white transition-colors">Register Identity</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-white-40 mb-3 sm:mb-4">INTEL</h4>
              <ul className="space-y-2 sm:space-y-3">
                {/* Reserved for future intel links */}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white-20 px-4 sm:px-6 md:px-12 py-3 sm:py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-1.5 text-[10px] font-mono text-white-40 uppercase tracking-widest">
          <span>&copy; 2026 BLACKLIST. All rights reserved.</span>
          <span>We see everything.</span>
        </div>
      </div>
    </footer>
  );
};
