'use client';

import { DevTier } from '@/lib/scoring';

interface TierBadgeProps {
  tier: DevTier | string;
  tierName: string;
  tierColor: string;
  size?: 'sm' | 'md' | 'lg';
  showGlow?: boolean;
}

const tierStyles: Record<string, {
  gradient: string;
  shadow: string;
  textShadow: string;
  border: string;
  icon?: string;
}> = {
  legend: {
    gradient: 'bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600',
    shadow: 'shadow-[0_0_20px_rgba(255,215,0,0.5)]',
    textShadow: 'drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]',
    border: 'border-yellow-400',
    icon: '',
  },
  elite: {
    gradient: 'bg-gradient-to-r from-purple-700 via-purple-500 to-purple-700',
    shadow: 'shadow-[0_0_15px_rgba(155,89,182,0.5)]',
    textShadow: 'drop-shadow-[0_0_6px_rgba(155,89,182,0.8)]',
    border: 'border-purple-400',
    icon: '',
  },
  rising_star: {
    gradient: 'bg-gradient-to-r from-amber-600 via-orange-400 to-amber-600',
    shadow: 'shadow-[0_0_15px_rgba(245,158,11,0.5)]',
    textShadow: 'drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]',
    border: 'border-amber-400',
    icon: '',
  },
  proven: {
    gradient: 'bg-gradient-to-r from-green-700 via-green-500 to-green-700',
    shadow: 'shadow-[0_0_12px_rgba(39,174,96,0.4)]',
    textShadow: '',
    border: 'border-green-500',
    icon: '',
  },
  builder: {
    gradient: 'bg-gradient-to-r from-blue-700 via-blue-500 to-blue-700',
    shadow: 'shadow-[0_0_10px_rgba(52,152,219,0.3)]',
    textShadow: '',
    border: 'border-blue-500',
    icon: '',
  },
  verified: {
    gradient: 'bg-gradient-to-r from-gray-600 to-gray-500',
    shadow: '',
    textShadow: '',
    border: 'border-gray-400',
    icon: '',
  },
  penalized: {
    gradient: 'bg-gradient-to-r from-red-900 to-red-800',
    shadow: 'shadow-[0_0_10px_rgba(139,0,0,0.4)]',
    textShadow: '',
    border: 'border-red-700',
    icon: '',
  },
  unverified: {
    gradient: 'bg-gray-700',
    shadow: '',
    textShadow: '',
    border: 'border-gray-500',
    icon: '',
  },
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-3 py-1 text-xs',
  lg: 'px-4 py-1.5 text-sm',
};

export function TierBadge({ tier, tierName, size = 'md', showGlow = true }: TierBadgeProps) {
  const normalizedTier = tier.toLowerCase().replace(' ', '_') as keyof typeof tierStyles;
  const style = tierStyles[normalizedTier] || tierStyles.unverified;

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        ${sizeClasses[size]}
        ${style.gradient}
        ${showGlow ? style.shadow : ''}
        border ${style.border}
        font-bold uppercase tracking-wider
        text-white ${style.textShadow}
        rounded-sm
        animate-gradient-x
      `}
      style={{
        backgroundSize: '200% 100%',
      }}
    >
      {style.icon && <span>{style.icon}</span>}
      {tierName}
    </span>
  );
}

export default TierBadge;
