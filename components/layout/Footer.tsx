import React from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t-2 border-dark py-12 px-6 md:px-12 bg-cream text-center md:text-left">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <div className="text-2xl font-black font-display-mock mb-2">DEVKARMA</div>
          <div className="text-sm opacity-60">&copy; 2024 DevKarma. Building trust on-chain.</div>
        </div>
        <div className="flex gap-6 text-sm font-bold uppercase tracking-wider">
          <a href="https://x.com/devkarmasol" target="_blank" rel="noopener noreferrer" className="hover:text-accent">X</a>
          <Link href="/docs" className="hover:text-accent">Docs</Link>
        </div>
      </div>
    </footer>
  );
};
