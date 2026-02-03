'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { 
  Coins, TrendingUp, Rocket, Flame, Gem, Crown, 
  Plane, Award, Users, Trophy, Zap, Diamond, Layers 
} from 'lucide-react';
import { Badge, TIER_STYLES, formatBadgeValue } from '@/lib/badges';

// Icon map for dynamic rendering
const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Coins,
  TrendingUp,
  Rocket,
  Flame,
  Gem,
  Crown,
  Plane,
  Award,
  Users,
  Trophy,
  Zap,
  Diamond,
  Layers,
};

interface AchievementBadgeProps {
  badge: Badge;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  onClick?: () => void;
}

const sizeClasses = {
  sm: {
    container: 'w-10 h-10',
    icon: 14,
    text: 'text-[8px]',
  },
  md: {
    container: 'w-14 h-14',
    icon: 18,
    text: 'text-[10px]',
  },
  lg: {
    container: 'w-18 h-18',
    icon: 24,
    text: 'text-xs',
  },
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
  const tooltipRef = useRef<HTMLDivElement>(null);

  const IconComponent = ICON_MAP[badge.icon] || Trophy;
  const tierStyle = TIER_STYLES[badge.tier];
  const sizeClass = sizeClasses[size];

  // Calculate tooltip position when showing
  const handleMouseEnter = useCallback(() => {
    if (!showTooltip) return;
    
    // Calculate position before showing
    if (badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      setTooltipPosition(rect.top > 200 ? 'top' : 'bottom');
    }
    setIsTooltipVisible(true);
  }, [showTooltip]);

  const handleMouseLeave = useCallback(() => {
    if (showTooltip) {
      setIsTooltipVisible(false);
    }
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
          flex flex-col items-center justify-center gap-0.5
          rounded-lg
          bg-gradient-to-br ${tierStyle.gradient}
          border-2 ${tierStyle.border}
          ${tierStyle.shadow}
          ${tierStyle.textColor}
          transition-all duration-200
          hover:scale-110 hover:brightness-110
          active:scale-95
          cursor-pointer
          animate-gradient-x
        `}
        aria-label={badge.label}
        title={badge.label}
      >
        <IconComponent size={sizeClass.icon} className="drop-shadow-sm" />
        {size !== 'sm' && formattedValue && (
          <span className={`${sizeClass.text} font-bold leading-none drop-shadow-sm`}>
            {formattedValue}
          </span>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && isTooltipVisible && (
        <div 
          ref={tooltipRef}
          className={`
            absolute z-50 w-56
            ${tooltipPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}
            left-1/2 -translate-x-1/2
            bg-dark border-2 border-cream/20 rounded-lg
            shadow-2xl shadow-black/50
            p-4
            animate-in fade-in-0 zoom-in-95 duration-200
          `}
        >
          {/* Arrow */}
          <div 
            className={`
              absolute left-1/2 -translate-x-1/2 w-3 h-3
              bg-dark border-cream/20 rotate-45
              ${tooltipPosition === 'top' ? '-bottom-1.5 border-r border-b' : '-top-1.5 border-l border-t'}
            `}
          />

          <div className="relative">
            {/* Badge header */}
            <div className="flex items-center gap-2 mb-2">
              <div className={`
                w-8 h-8 rounded-md flex items-center justify-center
                bg-gradient-to-br ${tierStyle.gradient}
              `}>
                <IconComponent size={16} className={tierStyle.textColor} />
              </div>
              <div>
                <div className="font-bold text-cream text-sm">{badge.label}</div>
                <div className="text-cream/60 text-xs capitalize">{badge.tier}</div>
              </div>
            </div>

            {/* Description */}
            <p className="text-cream/70 text-xs mb-3">{badge.description}</p>

            {/* Token info */}
            {badge.tokenName && (
              <div className="bg-cream/5 border border-cream/10 rounded-md p-2">
                <div className="text-[10px] uppercase tracking-wider text-cream/50 mb-1">
                  Token
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-cream text-sm">{badge.tokenName}</div>
                    <div className="text-cream/60 text-xs">${badge.tokenSymbol}</div>
                  </div>
                  {badge.tokenMint && (
                    <Link 
                      href={`/token/${badge.tokenMint}`}
                      className="text-accent hover:text-accent/80 text-xs font-bold uppercase"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View →
                    </Link>
                  )}
                </div>
                {formattedValue && (
                  <div className="mt-2 pt-2 border-t border-cream/10">
                    <span className="text-cream/50 text-xs">Achieved: </span>
                    <span className="text-accent font-bold text-sm">{formattedValue}</span>
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
