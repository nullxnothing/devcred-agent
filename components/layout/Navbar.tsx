'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, LogOut, Search, Loader2, Wallet } from 'lucide-react';
import { getWalletDisplayName } from '@/lib/wallet-utils';

interface WalletUser {
  id: string;
  primaryWallet: string;
  twitterHandle?: string | null;
  twitterName?: string | null;
  avatar?: string | null;
}

export const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [user, setUser] = useState<WalletUser | null>(null);
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const searchRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Check wallet session on mount
  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setAuthStatus('authenticated');
      } else {
        setUser(null);
        setAuthStatus('unauthenticated');
      }
    } catch {
      setUser(null);
      setAuthStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const NavItem = ({ href, label }: { href: string; label: string }) => {
    const isActive = pathname === href || (href !== '/' && pathname?.startsWith(href));
    return (
      <Link
        href={href}
        onClick={() => setIsMenuOpen(false)}
        className={`text-sm font-bold uppercase tracking-wider transition-colors relative py-1
          ${isActive
            ? 'text-accent'
            : 'text-dark/70 hover:text-dark'
          }`}
      >
        {label}
        {isActive && (
          <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-accent" />
        )}
      </Link>
    );
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    router.push(`/profile/${encodeURIComponent(query)}`);
  };

  const handleSignIn = () => router.push('/login');
  
  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/wallet/disconnect', { method: 'POST' });
      setUser(null);
      setAuthStatus('unauthenticated');
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Compute display values
  const profileIdentifier = user?.twitterHandle || user?.primaryWallet || user?.id;
  const displayName = user?.twitterName || user?.twitterHandle || (user?.primaryWallet ? getWalletDisplayName(user.primaryWallet) : null);
  const displayAvatar = user?.avatar || (user?.primaryWallet ? `https://api.dicebear.com/7.x/identicon/svg?seed=${user.primaryWallet}` : '/default-avatar.svg');

  return (
    <nav className={`sticky top-0 z-50 w-full bg-cream/95 backdrop-blur-sm border-b-2 border-dark transition-shadow duration-200 ${
      isScrolled ? 'shadow-lg' : ''
    }`}>
      <div className="flex items-center justify-between px-4 py-3 md:px-8 lg:px-12">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group cursor-pointer select-none shrink-0">
          <span className="text-2xl md:text-3xl font-black font-display-mock tracking-tighter group-hover:text-accent transition-colors">
            DEVKARMA
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-6 flex-1 justify-end">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative">
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              placeholder="Search wallet or @handle"
              className={`w-48 xl:w-64 h-9 pl-9 pr-3 bg-white border-2 text-sm font-medium text-dark placeholder:text-dark/40 focus:outline-none transition-all duration-200 ${
                isSearchFocused
                  ? 'border-accent bg-white w-64 xl:w-80'
                  : 'border-dark/20 hover:border-dark/40'
              }`}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/40" size={16} />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-accent animate-spin" size={16} />
            )}
          </form>

          <div className="h-6 w-px bg-dark/15" />

          <NavItem href="/leaderboard" label="Leaderboard" />
          <NavItem href="/docs" label="Docs" />

          <div className="h-6 w-px bg-dark/15" />

          {authStatus === 'loading' ? (
            <div className="w-20 h-9 bg-dark/10 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <Link
                href={`/profile/${profileIdentifier}`}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-dark/5 transition-colors rounded-sm"
              >
                <Image
                  src={displayAvatar}
                  alt=""
                  width={28}
                  height={28}
                  className="rounded-full border-2 border-accent"
                />
                <span className="text-sm font-bold text-dark flex items-center gap-1">
                  {user.twitterHandle ? (
                    `@${user.twitterHandle}`
                  ) : (
                    <><Wallet size={14} className="text-accent" /> {displayName}</>
                  )}
                </span>
              </Link>
              <button
                onClick={handleSignOut}
                className="p-2 text-dark/50 hover:text-dark hover:bg-dark/5 transition-colors rounded-sm"
                title="Disconnect"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              className="text-sm font-bold uppercase tracking-wider bg-dark text-cream px-5 py-2 hover:bg-accent transition-colors border-2 border-dark hover:border-accent flex items-center gap-2"
            >
              <Wallet size={16} /> Connect
            </button>
          )}
        </div>

        {/* Mobile: Search + Menu */}
        <div className="flex lg:hidden items-center gap-2">
          <button
            onClick={() => searchRef.current?.focus()}
            className="p-2 text-dark/70 hover:text-dark"
          >
            <Search size={22} />
          </button>
          <button
            className="p-2 text-dark"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {isMenuOpen && (
        <div className="lg:hidden border-t-2 border-dark bg-cream absolute w-full left-0 flex flex-col p-6 gap-5 shadow-xl animate-in slide-in-from-top-2 duration-200">
          {/* Mobile Search */}
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search wallet or @handle"
              className="w-full h-11 pl-10 pr-4 bg-white border-2 border-dark/30 text-sm font-medium text-dark placeholder:text-dark/40 focus:outline-none focus:border-accent"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/40" size={18} />
          </form>

          <div className="h-px bg-dark/10" />

          <NavItem href="/leaderboard" label="Leaderboard" />
          <NavItem href="/docs" label="Docs" />

          <div className="h-px bg-dark/10" />

          {user ? (
            <>
              <Link
                href={`/profile/${profileIdentifier}`}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 text-sm font-bold uppercase tracking-wider text-dark hover:text-accent transition-colors"
              >
                <Image
                  src={displayAvatar}
                  alt=""
                  width={32}
                  height={32}
                  className="rounded-full border-2 border-accent"
                />
                {user.twitterHandle ? `@${user.twitterHandle}` : displayName}
              </Link>
              <button
                onClick={() => {
                  handleSignOut();
                  setIsMenuOpen(false);
                }}
                className="text-sm font-bold uppercase tracking-wider text-left text-dark/60 hover:text-dark transition-colors"
              >
                Disconnect Wallet
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                handleSignIn();
                setIsMenuOpen(false);
              }}
              className="text-sm font-bold uppercase tracking-wider bg-dark text-cream px-5 py-3 hover:bg-accent transition-colors text-center flex items-center justify-center gap-2"
            >
              <Wallet size={18} /> Connect Wallet
            </button>
          )}
        </div>
      )}
    </nav>
  );
};
