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
        <div className="fixed inset-0 bg-dark/80 z-[100] flex items-center justify-center">
          <div className="bg-white border-2 border-dark p-8 shadow-[8px_8px_0px_0px_#3B3B3B] text-center max-w-md mx-4">
            <Loader2 size={48} className="mx-auto mb-4 text-accent animate-spin" />
            <h3 className="text-2xl font-black font-display-mock mb-2">Scanning Wallet</h3>
            <p className="text-dark/70">Fetching on-chain token data. This may take a few seconds...</p>
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
          className="w-full sm:w-64 h-12 pl-12 pr-10 bg-white border-2 border-dark text-dark placeholder:text-dark/50 font-medium focus:outline-none focus:ring-2 focus:ring-accent shadow-[4px_4px_0px_0px_#3B3B3B]"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dark/50" size={20} />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults(null);
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-dark/50 hover:text-dark"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-dark shadow-[4px_4px_0px_0px_#3B3B3B] z-50 max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-dark/50">Searching...</div>
          ) : hasResults ? (
            <div>
              {/* Users */}
              {results.users.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-bold uppercase text-dark/50 bg-cream border-b border-dark/10">
                    Developers
                  </div>
                  {results.users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleSelect('user', user.twitterHandle)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-cream transition-colors text-left"
                    >
                      <div className="w-10 h-10 bg-gray-200 border border-dark overflow-hidden shrink-0">
                        {user.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-full h-full p-2 text-dark/30" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold truncate">{user.twitterName}</div>
                        <div className="text-sm text-dark/50 truncate">@{user.twitterHandle}</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold font-display-mock ${getDevScoreColor(user.score).textClass}`}>
                          {user.score}
                        </div>
                        {user.rank && (
                          <div className="text-xs text-dark/50">#{user.rank}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Wallet */}
              {results.wallet && (
                <div>
                  <div className="px-4 py-2 text-xs font-bold uppercase text-dark/50 bg-cream border-b border-dark/10">
                    Wallet
                  </div>
                  <button
                    onClick={() => handleSelect('wallet', results.wallet!.address)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-cream transition-colors text-left"
                  >
                    <div className="w-10 h-10 bg-accent/20 border border-dark flex items-center justify-center shrink-0">
                      <Wallet size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm truncate">{results.wallet.address}</div>
                      {results.wallet.label && (
                        <div className="text-sm text-dark/50">{results.wallet.label}</div>
                      )}
                    </div>
                  </button>
                </div>
              )}

              {/* Token */}
              {results.token && (
                <div>
                  <div className="px-4 py-2 text-xs font-bold uppercase text-dark/50 bg-cream border-b border-dark/10">
                    Token
                  </div>
                  <button
                    onClick={() => handleSelect('token', results.token!.creatorWallet)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-cream transition-colors text-left"
                  >
                    <div className="w-10 h-10 bg-green-100 border border-dark flex items-center justify-center shrink-0">
                      <Coins size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold">{results.token.name}</div>
                      <div className="text-sm text-dark/50">${results.token.symbol}</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          ) : query.length >= 2 ? (
            <div className="p-4 text-center text-dark/50">No results found</div>
          ) : null}
        </div>
      )}
    </div>
  );
}
