'use client';

interface KolBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showGlow?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'px-1.5 py-0.5 text-[9px] gap-1',
  md: 'px-2 py-0.5 text-[10px] gap-1',
  lg: 'px-3 py-1 text-xs gap-1.5',
};

export function KolBadge({ size = 'md', showGlow = true, className = '' }: KolBadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center
        ${sizeClasses[size]}
        bg-gradient-to-r from-warning via-score-legend to-white
        ${showGlow ? 'badge-glow-kol' : ''}
        border border-warning-border
        font-black uppercase tracking-wider
        text-black
        animate-gradient-x
        ${className}
      `}
      style={{
        backgroundSize: '200% 100%',
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={size === 'sm' ? 'w-2.5 h-2.5' : size === 'md' ? 'w-3 h-3' : 'w-3.5 h-3.5'}
      >
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
      </svg>
      KOL
    </span>
  );
}

export default KolBadge;
