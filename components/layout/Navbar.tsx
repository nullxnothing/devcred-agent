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

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
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
        className={`text-xs font-mono font-bold uppercase tracking-widest transition-colors relative py-3 lg:py-1 px-1 -mx-1 block active:bg-white/5 lg:active:bg-transparent
          ${isActive
            ? 'text-white'
            : 'text-white-60 hover:text-white'
          }`}
      >
        {isActive && <span className="mr-1">&gt;</span>}
        {label}
        {isActive && (
          <span className="absolute -bottom-1 left-0 right-0 h-px bg-white" />
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

  const profileIdentifier = user?.twitterHandle || user?.primaryWallet || user?.id;
  const displayName = user?.twitterName || user?.twitterHandle || (user?.primaryWallet ? getWalletDisplayName(user.primaryWallet) : null);
  const displayAvatar = user?.avatarUrl || (user?.primaryWallet ? `https://api.dicebear.com/7.x/identicon/svg?seed=${user.primaryWallet}` : '/default-avatar.svg');

  return (
    <nav className={`sticky top-0 z-50 w-full bg-black/95 backdrop-blur-sm border-b border-white-20 transition-shadow duration-200 ${
      isScrolled ? 'shadow-[0_1px_12px_rgba(255,255,255,0.05)]' : ''
    }`}>
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 md:px-8 lg:px-12">
        {/* Logo — Terminal prompt style */}
        <Link href="/" className="flex items-center gap-1.5 sm:gap-2 group cursor-pointer select-none shrink-0 no-min-touch">
          <span className="text-lg sm:text-xl md:text-2xl font-mono font-extrabold uppercase tracking-tight">
            <span className="text-white-60 group-hover:text-white-40 transition-colors">[</span>
            <span className="text-white group-hover:text-white-90 transition-colors">BLACKLIST</span>
            <span className="text-white-60 group-hover:text-white-40 transition-colors">]</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-6 flex-1 justify-end">
          {/* Search — Terminal input */}
          <form onSubmit={handleSearch} className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white-40 font-mono text-xs">&gt;</span>
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              placeholder="search wallet or @handle"
              className={`w-48 xl:w-64 h-9 pl-7 pr-3 bg-black-2 border text-xs font-mono text-white placeholder:text-white-40 focus:outline-none transition-all duration-200 ${
                isSearchFocused
                  ? 'border-white-60 w-64 xl:w-80'
                  : 'border-white-20 hover:border-white-40'
              }`}
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-white-60 animate-spin" size={14} />
            )}
          </form>

          <div className="h-5 w-px bg-white-20" />

          <NavItem href="/leaderboard" label="Rankings" />
          <NavItem href="/docs" label="Manual" />

          <div className="h-5 w-px bg-white-20" />

          {authStatus === 'loading' ? (
            <div className="w-20 h-9 bg-white-20 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <Link
                href={`/profile/${profileIdentifier}`}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition-colors"
              >
                <Image
                  src={displayAvatar}
                  alt=""
                  width={24}
                  height={24}
                  className="rounded-none border border-white-20 grayscale"
                />
                <span className="text-xs font-mono font-bold text-white-90 flex items-center gap-1">
                  {user.twitterHandle ? (
                    `@${user.twitterHandle}`
                  ) : (
                    <><Wallet size={12} className="text-white-60" /> {displayName}</>
                  )}
                </span>
              </Link>
              <button
                onClick={handleSignOut}
                className="p-2 text-white-40 hover:text-white hover:bg-white/5 transition-colors"
                title="Disconnect"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              className="text-xs font-mono font-bold uppercase tracking-widest bg-white text-black px-5 py-2 hover:bg-white-90 transition-colors border border-white flex items-center gap-2"
            >
              <Wallet size={14} /> CONNECT
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
            className="p-2.5 sm:p-3 text-white-40 hover:text-white active:bg-white/5 transition-colors"
            aria-label="Open search"
          >
            <Search size={20} />
          </button>
          <button
            className="p-2.5 sm:p-3 text-white active:bg-white/5 transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {isMenuOpen && (
        <div className="lg:hidden border-t border-white-20 bg-black absolute w-full left-0 flex flex-col p-4 sm:p-6 gap-4 sm:gap-5 shadow-[0_4px_24px_rgba(255,255,255,0.03)] max-h-[calc(100vh-60px)] overflow-y-auto safe-area-bottom">
          {/* Mobile Search */}
          <form onSubmit={handleSearch} className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white-40 font-mono text-sm">&gt;</span>
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="search wallet or @handle"
              className="w-full h-12 pl-9 pr-4 bg-black-2 border border-white-20 text-sm font-mono text-white placeholder:text-white-40 focus:outline-none focus:border-white-60"
            />
            {isSearching && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-white-60 animate-spin" size={16} />
            )}
          </form>

          <div className="h-px bg-white-20" />

          <div className="flex flex-col gap-1">
            <NavItem href="/leaderboard" label="Rankings" />
            <NavItem href="/docs" label="Manual" />
          </div>

          <div className="h-px bg-white-20" />

          {user ? (
            <div className="flex flex-col gap-3">
              <Link
                href={`/profile/${profileIdentifier}`}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 p-3 -m-3 text-xs font-mono font-bold uppercase tracking-widest text-white hover:text-white-90 active:bg-white/5 transition-colors"
              >
                <Image
                  src={displayAvatar}
                  alt=""
                  width={32}
                  height={32}
                  className="rounded-none border border-white-20 grayscale"
                />
                <span className="truncate">{user.twitterHandle ? `@${user.twitterHandle}` : displayName}</span>
              </Link>
              <button
                onClick={() => {
                  handleSignOut();
                  setIsMenuOpen(false);
                }}
                className="text-xs font-mono font-bold uppercase tracking-widest text-left text-white-40 hover:text-white active:bg-white/5 p-3 -mx-3 transition-colors"
              >
                DISCONNECT
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                handleSignIn();
                setIsMenuOpen(false);
              }}
              className="text-xs font-mono font-bold uppercase tracking-widest bg-white text-black px-5 py-3.5 hover:bg-white-90 transition-colors text-center flex items-center justify-center gap-2"
            >
              <Wallet size={16} /> CONNECT WALLET
            </button>
          )}
        </div>
      )}
    </nav>
  );
};
