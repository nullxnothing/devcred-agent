'use client';

import { Crown, Zap, Shield, Star, CheckCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import { DevTier } from '@/lib/scoring';

interface TierBadgeProps {
  tier: DevTier | string;
  tierName: string;
  tierColor: string;
  size?: 'sm' | 'md' | 'lg';
  showGlow?: boolean;
}

// Icons for each tier - using cream for contrast on colored backgrounds (theme-aware)
const tierIcons: Record<string, React.ReactNode> = {
  legend: <Crown size={12} className="text-cream" />,
  elite: <Zap size={12} className="text-cream/90" />,
  rising_star: <Star size={12} className="text-cream/90" />,
  proven: <Shield size={12} className="text-cream/90" />,
  builder: <Star size={12} className="text-cream/90" />,
  verified: <CheckCircle size={12} className="text-cream/80" />,
  penalized: <AlertTriangle size={12} className="text-cream/90" />,
  unverified: <HelpCircle size={12} className="text-dark/70" />,
};

const tierStyles: Record<string, {
  bg: string;
  shadow: string;
  textShadow: string;
  border: string;
}> = {
  legend: {
    bg: 'bg-score-legend',
    shadow: 'badge-glow-legend',
    textShadow: '',
    border: 'border-score-legend/80',
  },
  elite: {
    bg: 'bg-score-elite',
    shadow: '',
    textShadow: '',
    border: 'border-score-elite/80',
  },
  rising_star: {
    bg: 'bg-score-rising',
    shadow: '',
    textShadow: '',
    border: 'border-score-rising/80',
  },
  proven: {
    bg: 'bg-score-proven',
    shadow: '',
    textShadow: '',
    border: 'border-score-proven/80',
  },
  builder: {
    bg: 'bg-score-builder',
    shadow: '',
    textShadow: '',
    border: 'border-score-builder/80',
  },
  verified: {
    bg: 'bg-score-verified',
    shadow: '',
    textShadow: '',
    border: 'border-score-verified/80',
  },
  penalized: {
    bg: 'bg-score-penalized',
    shadow: '',
    textShadow: '',
    border: 'border-score-penalized/80',
  },
  unverified: {
    bg: 'bg-score-unverified',
    shadow: '',
    textShadow: '',
    border: 'border-score-unverified/80',
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
  const icon = tierIcons[normalizedTier] || tierIcons.unverified;
  // Only legend tier gets glow effect
  const isLegend = normalizedTier === 'legend';

  return (
    <span
      className={`
        inline-flex items-center gap-1
        ${sizeClasses[size]}
        ${style.bg}
        ${showGlow && isLegend ? 'animate-gold-glow' : ''}
        ${showGlow && isLegend ? style.shadow : ''}
        border ${style.border}
        font-bold uppercase tracking-wider
        ${normalizedTier === 'unverified' ? 'text-dark' : 'text-cream'}
        rounded-sm
      `}
      role="status"
      aria-label={`Developer tier: ${tierName}`}
    >
      {icon}
      {tierName}
    </span>
  );
}

export default TierBadge;
