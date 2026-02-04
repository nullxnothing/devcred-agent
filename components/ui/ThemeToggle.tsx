'use client';

import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

// Subscribe to nothing - just used to detect client-side hydration
const emptySubscribe = () => () => {};

export function ThemeToggle() {
  // Proper way to handle hydration mismatch without triggering lint warnings
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,  // Client: mounted
    () => false  // Server: not mounted
  );
  const { theme, setTheme } = useTheme();

  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-sm border-2 border-dark/20 dark:border-white/20 bg-card dark:bg-dark" />
    );
  }

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun size={18} />;
      case 'dark':
        return <Moon size={18} />;
      default:
        return <Monitor size={18} />;
    }
  };

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light mode';
      case 'dark':
        return 'Dark mode';
      default:
        return 'System theme';
    }
  };

  return (
    <button
      onClick={cycleTheme}
      className="p-2 rounded-sm border-2 border-dark/20 dark:border-white/20 bg-card dark:bg-dark-light hover:bg-cream dark:hover:bg-dark transition-colors"
      aria-label={`Current: ${getLabel()}. Click to change.`}
      title={getLabel()}
    >
      <span className="text-dark dark:text-cream">
        {getIcon()}
      </span>
    </button>
  );
}
