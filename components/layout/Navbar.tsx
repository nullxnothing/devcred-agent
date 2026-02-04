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
  avatarUrl?: string | null;
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
        if (data.user) {
          // Map API response to component interface
          setUser({
            id: data.user.id,
            primaryWallet: data.user.walletAddress,
            twitterHandle: data.user.twitterHandle,
            twitterName: data.user.twitterName,
            avatarUrl: data.user.avatarUrl,
          });
          setAuthStatus('authenticated');
        } else {
          setUser(null);
          setAuthStatus('unauthenticated');
        }
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
        className={`text-sm font-bold uppercase tracking-wider transition-colors relative py-3 lg:py-1 px-1 -mx-1 block active:bg-dark/5 lg:active:bg-transparent rounded-sm
          ${isActive
            ? 'text-accent'
            : 'text-dark/70 hover:text-dark'
          }`}
      >
        {label}
        {isActive && (
          <span className="absolute -bottom-1 left-1 right-1 lg:left-0 lg:right-0 h-0.5 bg-accent" />
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
  const displayAvatar = user?.avatarUrl || (user?.primaryWallet ? `https://api.dicebear.com/7.x/identicon/svg?seed=${user.primaryWallet}` : '/default-avatar.svg');

  return (
    <nav className={`sticky top-0 z-50 w-full bg-cream/95 backdrop-blur-sm border-b-2 border-border transition-shadow duration-200 ${
      isScrolled ? 'shadow-lg' : ''
    }`}>
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 md:px-8 lg:px-12">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 sm:gap-2 group cursor-pointer select-none shrink-0 no-min-touch">
          <Image
            src="/Untitled%20design%20(69).png"
            alt="DevKarma"
            width={32}
            height={32}
            className="group-hover:scale-105 transition-transform w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9"
          />
          <span className="text-xl sm:text-2xl md:text-3xl font-black font-display-mock tracking-tighter">
            <span className="text-dark group-hover:text-dark/80 transition-colors">DEV</span>
            <span className="text-accent">KARMA</span>
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
              className={`w-48 xl:w-64 h-9 pl-9 pr-3 bg-card border-2 text-sm font-medium text-dark placeholder:text-text-muted focus:outline-none transition-all duration-200 ${
                isSearchFocused
                  ? 'border-accent w-64 xl:w-80'
                  : 'border-border hover:border-dark/40'
              }`}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-accent animate-spin" size={16} />
            )}
          </form>

          <div className="h-6 w-px bg-border" />

          <NavItem href="/leaderboard" label="Leaderboard" />
          <NavItem href="/token" label="Token" />
          <NavItem href="/docs" label="Docs" />

          <div className="h-6 w-px bg-border" />

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
                className="p-2 text-text-muted hover:text-dark hover:bg-dark/5 transition-colors rounded-sm"
                title="Disconnect"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              className="text-sm font-bold uppercase tracking-wider bg-dark text-cream px-5 py-2 hover:bg-accent hover:text-cream transition-colors border-2 border-dark hover:border-accent flex items-center gap-2"
            >
              <Wallet size={16} /> Connect
            </button>
          )}
        </div>

        {/* Mobile: Search + Menu */}
        <div className="flex lg:hidden items-center gap-1">
          <button
            onClick={() => {
              setIsMenuOpen(true);
              setTimeout(() => searchRef.current?.focus(), 100);
            }}
            className="p-2.5 sm:p-3 text-text-muted hover:text-dark active:bg-dark/5 rounded-sm transition-colors"
            aria-label="Open search"
          >
            <Search size={20} className="sm:w-[22px] sm:h-[22px]" />
          </button>
          <button
            className="p-2.5 sm:p-3 text-dark active:bg-dark/5 rounded-sm transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X size={24} className="sm:w-[26px] sm:h-[26px]" /> : <Menu size={24} className="sm:w-[26px] sm:h-[26px]" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {isMenuOpen && (
        <div className="lg:hidden border-t-2 border-border bg-cream absolute w-full left-0 flex flex-col p-4 sm:p-6 gap-4 sm:gap-5 shadow-xl animate-in slide-in-from-top-2 duration-200 max-h-[calc(100vh-60px)] overflow-y-auto safe-area-bottom">
          {/* Mobile Search */}
          <form onSubmit={handleSearch} className="relative">
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search wallet or @handle"
              className="w-full h-12 pl-11 pr-4 bg-card border-2 border-border text-base font-medium text-dark placeholder:text-text-muted focus:outline-none focus:border-accent rounded-sm"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            {isSearching && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-accent animate-spin" size={18} />
            )}
          </form>

          <div className="h-px bg-border" />

          <div className="flex flex-col gap-1">
            <NavItem href="/leaderboard" label="Leaderboard" />
            <NavItem href="/token" label="Token" />
            <NavItem href="/docs" label="Docs" />
          </div>

          <div className="h-px bg-border" />

          {user ? (
            <div className="flex flex-col gap-3">
              <Link
                href={`/profile/${profileIdentifier}`}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 p-3 -m-3 text-sm font-bold uppercase tracking-wider text-dark hover:text-accent active:bg-dark/5 transition-colors rounded-sm"
              >
                <Image
                  src={displayAvatar}
                  alt=""
                  width={36}
                  height={36}
                  className="rounded-full border-2 border-accent"
                />
                <span className="truncate">{user.twitterHandle ? `@${user.twitterHandle}` : displayName}</span>
              </Link>
              <button
                onClick={() => {
                  handleSignOut();
                  setIsMenuOpen(false);
                }}
                className="text-sm font-bold uppercase tracking-wider text-left text-text-muted hover:text-dark active:bg-dark/5 p-3 -mx-3 transition-colors rounded-sm"
              >
                Disconnect Wallet
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                handleSignIn();
                setIsMenuOpen(false);
              }}
              className="text-sm font-bold uppercase tracking-wider bg-dark text-cream px-5 py-3.5 hover:bg-accent active:bg-accent-dark hover:text-cream transition-colors text-center flex items-center justify-center gap-2 rounded-sm"
            >
              <Wallet size={18} /> Connect Wallet
            </button>
          )}
        </div>
      )}
    </nav>
  );
};
