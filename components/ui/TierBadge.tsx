'use client';

import { ShieldCheck, ScanEye, Crosshair, Fingerprint, Radio, FileSearch, TriangleAlert, CircleHelp } from 'lucide-react';
import { DevTier } from '@/lib/scoring';

interface TierBadgeProps {
  tier: DevTier | string;
  tierName: string;
  tierColor?: string;
  size?: 'sm' | 'md' | 'lg';
  showGlow?: boolean;
}

const tierIcons: Record<string, React.ReactNode> = {
  sovereign: <ShieldCheck size={12} />,
  cleared: <ScanEye size={12} />,
  operative: <Crosshair size={12} />,
  vetted: <Fingerprint size={12} />,
  tracked: <Radio size={12} />,
  filed: <FileSearch size={12} />,
  flagged: <TriangleAlert size={12} />,
  ghost: <CircleHelp size={12} />,
};

const tierClasses: Record<string, string> = {
  sovereign: 'tier-sovereign bg-black-2',
  cleared: 'tier-cleared bg-black-2',
  operative: 'tier-operative bg-black-2',
  vetted: 'tier-vetted bg-black-2',
  tracked: 'tier-tracked bg-black-2',
  filed: 'tier-filed bg-black-2',
  flagged: 'tier-flagged bg-black-2',
  ghost: 'tier-ghost bg-black-2',
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-3 py-1 text-xs',
  lg: 'px-4 py-1.5 text-sm',
};

export function TierBadge({ tier, tierName, size = 'md', showGlow = true }: TierBadgeProps) {
  const normalizedTier = tier.toLowerCase().replace(' ', '_') as keyof typeof tierClasses;
  const classes = tierClasses[normalizedTier] || tierClasses.ghost;
  const icon = tierIcons[normalizedTier] || tierIcons.ghost;

  return (
    <span
      className={`
        inline-flex items-center gap-1
        ${sizeClasses[size]}
        ${classes}
        font-mono font-bold uppercase tracking-widest
      `}
      role="status"
      aria-label={`Classification: ${tierName}`}
    >
      {icon}
      [{tierName}]
    </span>
  );
}

export default TierBadge;
