'use client';

import { useState } from 'react';
import { Check, AlertCircle, Loader2 } from 'lucide-react';

interface PumpFunUsernameSetupProps {
  onComplete?: (username: string) => void;
  onSkip?: () => void;
}

export function PumpFunUsernameSetup({ onComplete, onSkip }: PumpFunUsernameSetupProps) {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    setStatus('saving');
    setError(null);

    try {
      const response = await fetch('/api/user/pumpfun-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save username');
      }

      setStatus('success');
      onComplete?.(username);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleSkip = () => {
    onSkip?.();
  };

  if (status === 'success') {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-50 border-2 border-green-500 text-green-700">
        <Check size={20} />
        <span className="font-bold text-sm">Username saved!</span>
      </div>
    );
  }

  return (
    <div className="p-4 border-2 border-dark/10 bg-white/50">
      <div className="mb-3">
        <h3 className="font-bold text-sm text-dark mb-1">Link Pump.fun Username (Optional)</h3>
        <p className="text-xs text-dark/60">
          If you have a username on pump.fun, enter it here to link your profiles.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your pump.fun username"
            className="w-full h-10 px-3 border-2 border-dark/30 bg-white text-sm font-medium focus:border-accent focus:outline-none"
            disabled={status === 'saving'}
            maxLength={50}
          />
          {error && (
            <div className="flex items-center gap-2 mt-2 text-red-600 text-xs">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={status === 'saving' || !username.trim()}
            className="flex-1 h-10 bg-accent text-white font-bold uppercase tracking-tight text-xs hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {status === 'saving' ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving...
              </>
            ) : (
              'Save Username'
            )}
          </button>

          <button
            type="button"
            onClick={handleSkip}
            className="h-10 px-4 border-2 border-dark/20 bg-white text-dark font-bold uppercase tracking-tight text-xs hover:bg-dark/5 transition-colors"
          >
            Skip
          </button>
        </div>
      </form>
    </div>
  );
}
