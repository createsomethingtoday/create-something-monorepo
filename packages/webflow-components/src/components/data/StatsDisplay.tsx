import React, { CSSProperties, useEffect, useState, useRef } from 'react';
import { tokens, BrandVariant, getBrandColors } from '../../styles/tokens';

export type StatsVariant = 'default' | 'cards' | 'minimal';

export interface StatItem {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
}

export interface StatsDisplayProps {
  /** Stats data (JSON string for Webflow) */
  stats?: string;
  /** Number of columns (accepts string for Webflow Variant prop) */
  columns?: 2 | 3 | 4 | '2' | '3' | '4';
  /** Visual variant */
  variant?: StatsVariant;
  /** Brand color */
  brandVariant?: BrandVariant;
  /** Enable count-up animation */
  animated?: boolean;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Additional class name */
  className?: string;
}

/**
 * CountUp hook - animates number from 0 to target
 */
const useCountUp = (
  target: number,
  duration: number,
  shouldAnimate: boolean
): number => {
  const [count, setCount] = useState(0);
  const startTime = useRef<number | null>(null);

  useEffect(() => {
    if (!shouldAnimate) {
      setCount(target);
      return;
    }

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);

    return () => {
      startTime.current = null;
    };
  }, [target, duration, shouldAnimate]);

  return count;
};

const StatCard: React.FC<{
  stat: StatItem;
  variant: StatsVariant;
  brandVariant: BrandVariant;
  animated: boolean;
  animationDuration: number;
}> = ({ stat, variant, brandVariant, animated, animationDuration }) => {
  const brand = getBrandColors(brandVariant);
  const animatedValue = useCountUp(stat.value, animationDuration, animated);
  const displayValue = animated ? animatedValue : stat.value;

  const isCards = variant === 'cards';
  const isMinimal = variant === 'minimal';

  const containerStyles: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: isMinimal ? 'flex-start' : 'center',
    textAlign: isMinimal ? 'left' : 'center',
    padding: isCards ? tokens.spacing.lg : isMinimal ? 0 : tokens.spacing.md,
    backgroundColor: isCards ? tokens.colors.bgSurface : 'transparent',
    borderRadius: 0, // Maverick X: no border radius
    border: isCards ? `1px solid ${tokens.colors.borderDefault}` : 'none',
  };

  const valueStyles: CSSProperties = {
    fontFamily: tokens.typography.fontFamily.tight,
    fontSize: isMinimal ? tokens.typography.fontSize.h2 : tokens.typography.fontSize.display,
    fontWeight: tokens.typography.fontWeight.bold,
    color: brand.primary,
    lineHeight: tokens.typography.lineHeight.tight,
    marginBottom: tokens.spacing.xs,
  };

  const labelStyles: CSSProperties = {
    fontFamily: tokens.typography.fontFamily.sans,
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.normal,
    color: tokens.colors.fgSecondary,
  };

  return (
    <div style={containerStyles}>
      <div style={valueStyles}>
        {stat.prefix}
        {displayValue.toLocaleString()}
        {stat.suffix}
      </div>
      <div style={labelStyles}>{stat.label}</div>
    </div>
  );
};

/**
 * Default stats for demo
 */
const defaultStats: StatItem[] = [
  { value: 99, suffix: '%', label: 'Recovery Rate' },
  { value: 50, suffix: '+', label: 'Installations' },
  { value: 24, suffix: '/7', label: 'Support' },
];

export const StatsDisplay: React.FC<StatsDisplayProps> = ({
  stats: statsJson,
  columns: columnsInput = 3,
  variant = 'default',
  brandVariant = 'default',
  animated = true,
  animationDuration = 2000,
  className = '',
}) => {
  // Parse columns (Webflow Variant returns string)
  const columns = typeof columnsInput === 'string' ? parseInt(columnsInput, 10) : columnsInput;
  // Parse stats from JSON string
  let parsedStats: StatItem[] = defaultStats;

  if (statsJson) {
    try {
      parsedStats = JSON.parse(statsJson);
    } catch {
      // Keep default stats on parse error
    }
  }

  const containerStyles: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: tokens.spacing.lg,
  };

  // Responsive CSS
  const responsiveCSS = `
    @media (max-width: ${tokens.breakpoints.md}) {
      .mavx-stats-display {
        grid-template-columns: repeat(2, 1fr) !important;
      }
    }
    @media (max-width: ${tokens.breakpoints.sm}) {
      .mavx-stats-display {
        grid-template-columns: 1fr !important;
      }
    }
  `;

  return (
    <div className={`mavx-stats-display ${className}`} style={containerStyles}>
      <style>{responsiveCSS}</style>
      {parsedStats.map((stat, index) => (
        <StatCard
          key={index}
          stat={stat}
          variant={variant}
          brandVariant={brandVariant}
          animated={animated}
          animationDuration={animationDuration}
        />
      ))}
    </div>
  );
};

export default StatsDisplay;
