'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, User, Coins, Wallet, Loader2 } from 'lucide-react';
import { getDevScoreColor } from '@/lib/score-colors';

interface SearchResult {
  users: Array<{
    id: string;
    twitterHandle: string;
    twitterName: string;
    avatarUrl: string | null;
    score: number;
    rank: number | null;
  }>;
  wallet: {
    address: string;
    userId: string | null;
    label: string | null;
  } | null;
  token: {
    mint: string;
    name: string;
    symbol: string;
    creatorWallet: string;
  } | null;
}

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchDebounce = setTimeout(async () => {
      if (query.length >= 2) {
        setIsLoading(true);
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
          if (res.ok) {
            const data = await res.json();
            setResults(data);
            setIsOpen(true);
          }
        } catch (error) {
          console.error('Search error:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setResults(null);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(searchDebounce);
  }, [query]);

  const handleSelect = (type: 'user' | 'wallet' | 'token', value: string) => {
    setIsOpen(false);
    setQuery('');
    
    // Show scanning message for wallet addresses
    if (type === 'wallet' || type === 'token') {
      setIsNavigating(true);
    }
    
    if (type === 'user') {
      router.push(`/profile/${encodeURIComponent(value)}`);
    } else {
      // For wallet or token creator, redirect to handle the on-demand creation/scan
      router.push(`/profile/${encodeURIComponent(value)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // If it's a valid address, go straight to it
      const trimQuery = query.trim();
      if (trimQuery.length >= 32 && trimQuery.length <= 44) {
        handleSelect('wallet', trimQuery);
      } else if (results && results.users.length > 0) {
        handleSelect('user', results.users[0].twitterHandle);
      }
    }
  };

  const hasResults = results && (results.users.length > 0 || results.wallet || results.token);

  return (
    <div ref={containerRef} className="relative">
      {/* Scanning Overlay */}
      {isNavigating && (
        <div className="fixed inset-0 bg-dark/80 z-[100] flex items-center justify-center p-4">
          <div className="bg-card border-2 border-border p-6 sm:p-8 shadow-[4px_4px_0px_0px_var(--border)] sm:shadow-[8px_8px_0px_0px_var(--border)] text-center max-w-md w-full">
            <Loader2 size={40} className="mx-auto mb-3 sm:mb-4 text-accent animate-spin sm:w-12 sm:h-12" />
            <h3 className="text-xl sm:text-2xl font-black font-display-mock mb-2 text-dark">Scanning Wallet</h3>
            <p className="text-sm sm:text-base text-text-muted">Fetching on-chain token data. This may take a few seconds...</p>
          </div>
        </div>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => hasResults && setIsOpen(true)}
          placeholder="Search wallet or @handle..."
          className="w-full h-11 sm:h-12 pl-10 sm:pl-12 pr-10 bg-card border-2 border-border text-sm sm:text-base text-dark placeholder:text-text-muted font-medium focus:outline-none focus:ring-2 focus:ring-accent shadow-[3px_3px_0px_0px_var(--border)] sm:shadow-[4px_4px_0px_0px_var(--border)] rounded-sm"
        />
        <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults(null);
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-dark active:text-dark p-1"
            aria-label="Clear search"
          >
            <X size={16} className="sm:w-[18px] sm:h-[18px]" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border-2 border-border shadow-[3px_3px_0px_0px_var(--border)] sm:shadow-[4px_4px_0px_0px_var(--border)] z-50 max-h-[60vh] sm:max-h-80 overflow-y-auto rounded-sm">
          {isLoading ? (
            <div className="p-4 text-center text-text-muted text-sm">Searching...</div>
          ) : hasResults ? (
            <div>
              {/* Users */}
              {results.users.length > 0 && (
                <div>
                  <div className="px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-bold uppercase text-text-muted bg-cream border-b border-border">
                    Developers
                  </div>
                  {results.users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleSelect('user', user.twitterHandle)}
                      className="w-full px-3 sm:px-4 py-3 flex items-center gap-2.5 sm:gap-3 hover:bg-cream active:bg-cream transition-colors text-left"
                    >
                      <div className="w-9 h-9 sm:w-10 sm:h-10 bg-surface border border-border overflow-hidden shrink-0 rounded-sm">
                        {user.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-full h-full p-2 text-text-muted" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm sm:text-base truncate text-dark">{user.twitterName}</div>
                        <div className="text-xs sm:text-sm text-text-muted truncate">@{user.twitterHandle}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`font-stat text-sm sm:text-base ${getDevScoreColor(user.score).textClass}`}>
                          {user.score}
                        </div>
                        {user.rank && (
                          <div className="text-[10px] sm:text-xs text-text-muted">#{user.rank}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Wallet */}
              {results.wallet && (
                <div>
                  <div className="px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-bold uppercase text-text-muted bg-cream border-b border-border">
                    Wallet
                  </div>
                  <button
                    onClick={() => handleSelect('wallet', results.wallet!.address)}
                    className="w-full px-3 sm:px-4 py-3 flex items-center gap-2.5 sm:gap-3 hover:bg-cream active:bg-cream transition-colors text-left"
                  >
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-accent/20 border border-border flex items-center justify-center shrink-0 text-dark rounded-sm">
                      <Wallet size={18} className="sm:w-5 sm:h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-xs sm:text-sm truncate text-dark">{results.wallet.address}</div>
                      {results.wallet.label && (
                        <div className="text-xs sm:text-sm text-text-muted">{results.wallet.label}</div>
                      )}
                    </div>
                  </button>
                </div>
              )}

              {/* Token */}
              {results.token && (
                <div>
                  <div className="px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-bold uppercase text-text-muted bg-cream border-b border-border">
                    Token
                  </div>
                  <button
                    onClick={() => handleSelect('token', results.token!.creatorWallet)}
                    className="w-full px-3 sm:px-4 py-3 flex items-center gap-2.5 sm:gap-3 hover:bg-cream active:bg-cream transition-colors text-left"
                  >
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-success/10 border border-border flex items-center justify-center shrink-0 text-dark rounded-sm">
                      <Coins size={18} className="sm:w-5 sm:h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm sm:text-base text-dark">{results.token.name}</div>
                      <div className="text-xs sm:text-sm text-text-muted">${results.token.symbol}</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          ) : query.length >= 2 ? (
            <div className="p-4 text-center text-text-muted text-sm">No results found</div>
          ) : null}
        </div>
      )}
    </div>
  );
}
