'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Coins, TrendingUp, Rocket, Flame, Gem, Crown,
  Plane, Award, Users, Trophy, Zap, Diamond, Layers
} from 'lucide-react';
import { Badge, TIER_STYLES, formatBadgeValue } from '@/lib/badges';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Coins, TrendingUp, Rocket, Flame, Gem, Crown,
  Plane, Award, Users, Trophy, Zap, Diamond, Layers,
};

interface AchievementBadgeProps {
  badge: Badge;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  onClick?: () => void;
}

const sizeClasses = {
  sm: { container: 'w-9 h-9', icon: 14, text: 'text-[7px]', padding: 'p-1' },
  md: { container: 'w-12 h-12', icon: 18, text: 'text-[9px]', padding: 'p-1.5' },
  lg: { container: 'w-16 h-16', icon: 24, text: 'text-[11px]', padding: 'p-2' },
};

export function AchievementBadge({
  badge,
  size = 'md',
  showTooltip = true,
  onClick
}: AchievementBadgeProps) {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<'top' | 'bottom'>('top');
  const badgeRef = useRef<HTMLDivElement>(null);

  const IconComponent = ICON_MAP[badge.icon] || Trophy;
  const tierStyle = TIER_STYLES[badge.tier];
  const sizeClass = sizeClasses[size];

  const handleMouseEnter = useCallback(() => {
    if (!showTooltip) return;
    if (badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      setTooltipPosition(rect.top > 200 ? 'top' : 'bottom');
    }
    setIsTooltipVisible(true);
  }, [showTooltip]);

  const handleMouseLeave = useCallback(() => {
    if (showTooltip) setIsTooltipVisible(false);
  }, [showTooltip]);

  const handleInteraction = () => {
    if (onClick) {
      onClick();
    } else if (showTooltip) {
      setIsTooltipVisible(!isTooltipVisible);
    }
  };

  const formattedValue = formatBadgeValue(badge);

  return (
    <div
      ref={badgeRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={handleInteraction}
        className={`
          ${sizeClass.container}
          ${sizeClass.padding}
          flex flex-col items-center justify-center gap-0.5
          ${tierStyle.bg}
          border ${tierStyle.border}
          ${tierStyle.shadow}
          transition-all duration-150
          hover:scale-105 hover:-translate-y-0.5
          active:scale-95
          cursor-pointer
          group
          font-mono
        `}
        aria-label={badge.label}
        title={`[${tierStyle.classifiedLabel}] ${badge.label}`}
      >
        <IconComponent
          size={sizeClass.icon}
          className={`${tierStyle.textColor} group-hover:scale-110 transition-transform`}
        />
        {size !== 'sm' && formattedValue && (
          <span className={`${sizeClass.text} ${tierStyle.textColor} font-bold leading-none tracking-wider font-mono`}>
            {formattedValue}
          </span>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && isTooltipVisible && (
        <div
          className={`
            absolute z-50 w-52
            ${tooltipPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}
            left-1/2 -translate-x-1/2
            bg-black-2 border border-white-20
            p-3
            animate-in fade-in-0 zoom-in-95 duration-150
          `}
        >
          {/* Arrow */}
          <div
            className={`
              absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5
              bg-black-2 border-white-20 rotate-45
              ${tooltipPosition === 'top' ? '-bottom-1.5 border-r border-b' : '-top-1.5 border-l border-t'}
            `}
          />

          <div className="relative">
            {/* Badge header */}
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 flex items-center justify-center ${tierStyle.bg} border ${tierStyle.border}`}>
                <IconComponent size={14} className={tierStyle.textColor} />
              </div>
              <div>
                <div className="font-mono font-bold text-white text-xs leading-tight">{badge.label}</div>
                <div className={`text-[10px] font-mono uppercase tracking-widest ${tierStyle.labelColor}`}>
                  [{tierStyle.classifiedLabel}]
                </div>
              </div>
            </div>

            <p className="text-white-60 text-xs font-mono leading-relaxed mb-2">{badge.description}</p>

            {/* Token info */}
            {badge.tokenName && (
              <div className="bg-black-1 border border-white-20 p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono font-bold text-white text-xs truncate">{badge.tokenName}</div>
                    <div className="text-white-40 text-[10px] font-mono">${badge.tokenSymbol}</div>
                  </div>
                  {badge.tokenMint && (
                    <Link
                      href={`/token/${badge.tokenMint}`}
                      className="text-white-60 hover:text-white text-[10px] font-mono font-bold uppercase shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      VIEW →
                    </Link>
                  )}
                </div>
                {formattedValue && (
                  <div className="mt-2 pt-2 border-t border-white-20 flex items-center justify-between">
                    <span className="text-white-40 text-[10px] font-mono">ACHIEVED</span>
                    <span className={`font-mono font-bold text-xs ${tierStyle.valueColor}`}>{formattedValue}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AchievementBadge;
