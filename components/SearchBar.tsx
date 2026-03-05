'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X, User, Coins, Wallet, Loader2 } from 'lucide-react';
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
    if (type === 'wallet' || type === 'token') {
      setIsNavigating(true);
    }
    router.push(`/profile/${encodeURIComponent(value)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
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
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4">
          <div className="terminal-card p-6 sm:p-8 text-center max-w-md w-full">
            <Loader2 size={40} className="mx-auto mb-3 text-white-60 animate-spin" />
            <h3 className="text-lg font-mono font-extrabold uppercase mb-2 text-white">&gt; SCANNING WALLET...</h3>
            <p className="text-xs font-mono text-white-40">Fetching on-chain data. Please stand by.</p>
          </div>
        </div>
      )}

      <div className="relative">
        <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-white-40 font-mono text-sm">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => hasResults && setIsOpen(true)}
          placeholder="search wallet or @handle..."
          className="w-full h-11 sm:h-12 pl-8 sm:pl-10 pr-10 bg-black-2 border border-white-20 text-sm font-mono text-white placeholder:text-white-40 focus:outline-none focus:border-white-60"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults(null);
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white-40 hover:text-white p-1"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-black-2 border border-white-20 z-50 max-h-[60vh] sm:max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-white-40 text-xs font-mono">&gt; SEARCHING...</div>
          ) : hasResults ? (
            <div>
              {results.users.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-widest text-white-40 bg-black-1 border-b border-white-20">
                    SUBJECTS
                  </div>
                  {results.users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleSelect('user', user.twitterHandle)}
                      className="w-full px-3 py-3 flex items-center gap-2.5 hover:bg-black-3 transition-colors text-left"
                    >
                      <div className="w-9 h-9 bg-black-3 border border-white-20 overflow-hidden shrink-0">
                        {user.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={user.avatarUrl} alt="" className="w-full h-full object-cover grayscale" />
                        ) : (
                          <User className="w-full h-full p-2 text-white-40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono font-bold text-xs truncate text-white">{user.twitterName}</div>
                        <div className="text-[10px] font-mono text-white-40 truncate">@{user.twitterHandle}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`font-mono font-bold text-sm ${getDevScoreColor(user.score).textClass}`}>
                          {user.score}
                        </div>
                        {user.rank && (
                          <div className="text-[10px] font-mono text-white-40">#{user.rank}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results.wallet && (
                <div>
                  <div className="px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-widest text-white-40 bg-black-1 border-b border-white-20">
                    WALLET
                  </div>
                  <button
                    onClick={() => handleSelect('wallet', results.wallet!.address)}
                    className="w-full px-3 py-3 flex items-center gap-2.5 hover:bg-black-3 transition-colors text-left"
                  >
                    <div className="w-9 h-9 bg-black-3 border border-white-20 flex items-center justify-center shrink-0">
                      <Wallet size={16} className="text-white-60" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-xs truncate text-white">{results.wallet.address}</div>
                      {results.wallet.label && (
                        <div className="text-[10px] font-mono text-white-40">{results.wallet.label}</div>
                      )}
                    </div>
                  </button>
                </div>
              )}

              {results.token && (
                <div>
                  <div className="px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-widest text-white-40 bg-black-1 border-b border-white-20">
                    TOKEN
                  </div>
                  <button
                    onClick={() => handleSelect('token', results.token!.creatorWallet)}
                    className="w-full px-3 py-3 flex items-center gap-2.5 hover:bg-black-3 transition-colors text-left"
                  >
                    <div className="w-9 h-9 bg-black-3 border border-white-20 flex items-center justify-center shrink-0">
                      <Coins size={16} className="text-white-60" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono font-bold text-xs text-white">{results.token.name}</div>
                      <div className="text-[10px] font-mono text-white-40">${results.token.symbol}</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          ) : query.length >= 2 ? (
            <div className="p-4 text-center text-white-40 text-xs font-mono">&gt; NO RECORDS FOUND</div>
          ) : null}
        </div>
      )}
    </div>
  );
}
