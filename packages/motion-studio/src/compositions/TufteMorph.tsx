/**
 * TufteMorph - Single card zoom/morph animation
 * 
 * A focused animation showing one dashboard card transforming
 * from desktop to mobile using Tufte principles.
 * 
 * Camera zooms in during transformation, zooms out to reveal result.
 * Simple. Elegant. One card. One story.
 */
import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  AbsoluteFill,
  Easing,
} from 'remotion';
import { TrendingUp } from 'lucide-react';

// Configuration
export const TUFTE_MORPH_CONFIG = {
  durationInFrames: 450, // 15 seconds at 30fps
  fps: 30,
  width: 1920,
  height: 1080,
};

// Card data
const CARD = {
  title: 'Revenue',
  value: '$47.2K',
  trend: [32, 35, 38, 41, 39, 44, 47.2],
  change: 12.3,
};

// Colors
const COLORS = {
  bg: '#000000',
  fg: '#ffffff',
  fgMuted: 'rgba(255, 255, 255, 0.5)',
  fgTertiary: 'rgba(255, 255, 255, 0.3)',
  border: 'rgba(255, 255, 255, 0.1)',
  success: '#44aa44',
  successMuted: 'rgba(68, 170, 68, 0.2)',
};

/**
 * Sparkline - adapts size based on tufte level
 */
const Sparkline: React.FC<{
  data: number[];
  width: number;
  height: number;
  strokeWidth?: number;
}> = ({ data, width, height, strokeWidth = 2 }) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg width={width} height={height}>
      <polyline
        points={points}
        fill="none"
        stroke={COLORS.fgMuted}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * The morphing card component
 */
const MorphCard: React.FC<{ progress: number }> = ({ progress }) => {
  // Interpolate all properties based on morph progress (0 = desktop, 1 = mobile)
  
  // Dimensions morph
  const width = interpolate(progress, [0, 1], [320, 360]);
  const height = interpolate(progress, [0, 1], [200, 80]);
  const padding = interpolate(progress, [0, 1], [24, 16]);
  const borderRadius = interpolate(progress, [0, 1], [16, 10]);
  
  // Border and shadow fade out (data-ink ratio)
  const borderOpacity = interpolate(progress, [0, 0.3], [0.15, 0.05], { extrapolateRight: 'clamp' });
  const shadowOpacity = interpolate(progress, [0, 0.3], [0.2, 0], { extrapolateRight: 'clamp' });
  
  // Layout shift (column to row)
  const isRow = progress > 0.5;
  
  // Value typography
  const valueSize = interpolate(progress, [0, 1], [42, 28]);
  
  // Label position (below to inline)
  const labelOpacity = interpolate(progress, [0.4, 0.6], [1, 1]); // Always visible, just moves
  const labelSize = interpolate(progress, [0, 1], [13, 12]);
  const labelMarginTop = interpolate(progress, [0, 0.5], [6, 0], { extrapolateRight: 'clamp' });
  
  // Sparkline transformation
  const sparklineWidth = interpolate(progress, [0, 1], [260, 56]);
  const sparklineHeight = interpolate(progress, [0, 1], [50, 18]);
  const sparklineMarginTop = interpolate(progress, [0, 0.5], [20, 0], { extrapolateRight: 'clamp' });
  
  // Change badge
  const badgeOpacity = interpolate(progress, [0, 0.2], [1, 0], { extrapolateRight: 'clamp' });
  const changeTextOpacity = interpolate(progress, [0.6, 0.8], [0, 1], { extrapolateLeft: 'clamp' });
  
  return (
    <div
      style={{
        width,
        height,
        padding,
        borderRadius,
        border: `1px solid rgba(255, 255, 255, ${borderOpacity})`,
        background: 'rgba(255, 255, 255, 0.03)',
        boxShadow: `0 8px 32px rgba(0, 0, 0, ${shadowOpacity})`,
        display: 'flex',
        flexDirection: isRow ? 'row' : 'column',
        alignItems: isRow ? 'center' : 'flex-start',
        justifyContent: isRow ? 'space-between' : 'flex-start',
        transition: 'none', // We're animating manually
        overflow: 'hidden',
      }}
    >
      {/* Left side: Value + Label */}
      <div
        style={{
          display: 'flex',
          flexDirection: isRow ? 'row' : 'column',
          alignItems: isRow ? 'baseline' : 'flex-start',
          gap: isRow ? 10 : 0,
        }}
      >
        <span
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: valueSize,
            fontWeight: 600,
            color: COLORS.fg,
            lineHeight: 1,
          }}
        >
          {CARD.value}
        </span>
        
        <span
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: labelSize,
            fontWeight: 500,
            color: COLORS.fgMuted,
            marginTop: isRow ? 0 : labelMarginTop,
            textTransform: progress < 0.5 ? 'uppercase' : 'none',
            letterSpacing: progress < 0.5 ? '0.05em' : '0',
            opacity: labelOpacity,
          }}
        >
          {CARD.title}
        </span>
      </div>
      
      {/* Desktop: Badge (top right) */}
      {!isRow && (
        <div
          style={{
            position: 'absolute',
            top: padding,
            right: padding,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 10px',
            borderRadius: 12,
            background: COLORS.successMuted,
            opacity: badgeOpacity,
          }}
        >
          <TrendingUp size={12} color={COLORS.success} />
          <span
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              fontWeight: 600,
              color: COLORS.success,
            }}
          >
            +{CARD.change}%
          </span>
        </div>
      )}
      
      {/* Right side (mobile): Sparkline + Change */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: isRow ? 16 : 0,
          marginTop: isRow ? 0 : sparklineMarginTop,
          width: isRow ? 'auto' : '100%',
        }}
      >
        <Sparkline
          data={CARD.trend}
          width={sparklineWidth}
          height={sparklineHeight}
          strokeWidth={progress > 0.5 ? 1.5 : 2}
        />
        
        {/* Mobile: Inline change text */}
        {isRow && (
          <span
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 12,
              fontWeight: 500,
              color: COLORS.success,
              opacity: changeTextOpacity,
            }}
          >
            +{CARD.change}%
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Main composition
 */
export const TufteMorph: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  
  // Timeline:
  // 0-90: Desktop card at rest (3s)
  // 90-270: Zoom in + morph (6s)
  // 270-360: Mobile card at rest, zoomed (3s)
  // 360-450: Zoom out to reveal (3s)
  
  const HOLD_1_END = 90;
  const MORPH_END = 270;
  const HOLD_2_END = 360;
  
  // Morph progress (0 = desktop, 1 = mobile)
  const morphProgress = interpolate(
    frame,
    [HOLD_1_END, MORPH_END],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.inOut(Easing.cubic),
    }
  );
  
  // Camera zoom (1 → 1.8 → 1)
  const zoomIn = interpolate(
    frame,
    [HOLD_1_END, MORPH_END],
    [1, 1.8],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.inOut(Easing.cubic),
    }
  );
  
  const zoomOut = interpolate(
    frame,
    [HOLD_2_END, durationInFrames],
    [1.8, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    }
  );
  
  const zoom = frame < HOLD_2_END ? zoomIn : zoomOut;
  
  // Subtle Y drift during morph (camera movement)
  const yDrift = interpolate(
    frame,
    [HOLD_1_END, MORPH_END, HOLD_2_END, durationInFrames],
    [0, -20, -20, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Fade in/out
  const opacity = interpolate(
    frame,
    [0, 30, durationInFrames - 30, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity,
        }}
      >
        {/* Camera container */}
        <div
          style={{
            transform: `scale(${zoom}) translateY(${yDrift}px)`,
            transformOrigin: 'center center',
          }}
        >
          <MorphCard progress={morphProgress} />
        </div>
      </div>
      
      {/* Phase indicator (subtle) */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11,
          color: COLORS.fgTertiary,
          letterSpacing: '0.1em',
          opacity: interpolate(frame, [60, 90, MORPH_END, MORPH_END + 30], [0, 0.6, 0.6, 0]),
        }}
      >
        {morphProgress < 0.5 ? 'DESKTOP' : 'MOBILE (TUFTE)'}
      </div>
    </AbsoluteFill>
  );
};

export default TufteMorph;
