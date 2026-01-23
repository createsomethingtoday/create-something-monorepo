/**
 * MetricCard - TEND metric card with wireframe → styled transition
 * 
 * Shows a stat with animated counter.
 * Transitions from gray placeholder to full styled card.
 */
import React from 'react';
import { interpolate } from 'remotion';
import { SPEC } from '../spec';
import { fontFamily } from '../../../fonts';

interface MetricCardProps {
  label: string;
  value: number;
  suffix?: string;
  color: 'success' | 'default';
  embodiment: number;
  countProgress: number; // 0-1 for counter animation
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  suffix = '',
  color,
  embodiment,
  countProgress,
}) => {
  const { colors } = SPEC;
  
  // Interpolations
  const contentOpacity = interpolate(embodiment, [0.3, 1], [0, 1], { extrapolateRight: 'clamp' });
  const wireframeOpacity = interpolate(embodiment, [0, 0.5], [1, 0], { extrapolateRight: 'clamp' });
  const bgAlpha = interpolate(embodiment, [0, 1], [0.02, 0.03]);
  const borderAlpha = interpolate(embodiment, [0, 1], [0.05, 0.08]);
  
  // Counter animation (ease out cubic)
  const easedProgress = 1 - Math.pow(1 - countProgress, 3);
  const displayValue = Math.round(value * easedProgress);
  
  // Color based on type
  const valueColor = color === 'success' ? colors.success : colors.fgPrimary;
  
  return (
    <div
      style={{
        minWidth: 200,
        padding: '32px 40px',
        borderRadius: 16,
        background: `rgba(255, 255, 255, ${bgAlpha})`,
        border: `1px solid rgba(255, 255, 255, ${borderAlpha})`,
        textAlign: 'center',
        position: 'relative',
      }}
    >
      {/* Wireframe placeholder */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          opacity: wireframeOpacity,
        }}
      >
        <div
          style={{
            width: 80,
            height: 40,
            borderRadius: 8,
            background: colors.wireframe,
          }}
        />
        <div
          style={{
            width: 100,
            height: 12,
            borderRadius: 4,
            background: colors.wireframe,
          }}
        />
      </div>
      
      {/* Styled content */}
      <div
        style={{
          opacity: contentOpacity,
        }}
      >
        <div
          style={{
            fontFamily: fontFamily.sans,
            fontSize: 56,
            fontWeight: 700,
            color: valueColor,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            marginBottom: 12,
          }}
        >
          {displayValue}{suffix}
        </div>
        
        <div
          style={{
            fontFamily: fontFamily.sans,
            fontSize: 13,
            fontWeight: 500,
            color: colors.fgMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
};

export default MetricCard;
