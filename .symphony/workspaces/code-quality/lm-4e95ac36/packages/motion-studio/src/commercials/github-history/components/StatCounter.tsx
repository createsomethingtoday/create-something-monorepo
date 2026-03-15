/**
 * StatCounter - Animated statistic display
 * 
 * Displays a numeric statistic with animated counting effect.
 * Vox style - kinetic typography, no decorative elements.
 */
import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { colors, typography } from '../../../styles';

interface StatCounterProps {
  value: number;
  label: string;
  startFrame?: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
}

export const StatCounter: React.FC<StatCounterProps> = ({
  value,
  label,
  startFrame = 0,
  duration = 45,
  suffix = '',
  prefix = '',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const relativeFrame = frame - startFrame;
  
  // Animated number counting
  const countProgress = interpolate(
    relativeFrame,
    [0, duration * 0.8],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Eased progress for smooth counting
  const easedProgress = 1 - Math.pow(1 - countProgress, 3); // ease-out cubic
  const displayValue = Math.floor(value * easedProgress);
  
  // Entry animation
  const entryProgress = spring({
    frame: relativeFrame,
    fps,
    config: {
      damping: 20,
      stiffness: 150,
      mass: 0.8,
    },
  });
  
  const opacity = interpolate(relativeFrame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  
  const translateY = interpolate(entryProgress, [0, 1], [20, 0]);
  
  // Format number with commas
  const formattedValue = displayValue.toLocaleString();
  
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      {/* Value */}
      <div
        style={{
          fontFamily: typography.fontFamily.sans,
          fontSize: typography.fontSize.display,
          fontWeight: typography.fontWeight.bold,
          color: colors.neutral[0],
          letterSpacing: typography.letterSpacing.tight,
          lineHeight: 1,
        }}
      >
        {prefix}{formattedValue}{suffix}
      </div>
      
      {/* Animated underline */}
      <div
        style={{
          width: interpolate(countProgress, [0, 1], [0, 100]),
          height: 2,
          backgroundColor: colors.neutral[700],
          marginTop: 12,
          marginBottom: 12,
          borderRadius: 1,
        }}
      />
      
      {/* Label */}
      <div
        style={{
          fontFamily: typography.fontFamily.mono,
          fontSize: typography.fontSize.body,
          fontWeight: typography.fontWeight.normal,
          color: colors.neutral[500],
          letterSpacing: typography.letterSpacing.wider,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
    </div>
  );
};

export default StatCounter;
