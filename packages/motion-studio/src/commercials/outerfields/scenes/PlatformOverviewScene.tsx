/**
 * PlatformOverviewScene - Dashboard with breathing statistics
 * 
 * Enhanced with:
 * - Animated counting numbers with easing
 * - Mini chart animations in cards
 * - Breathing/pulsing glow effects
 * - Staggered card entrances
 * - Visual depth with layered cards
 * 
 * Duration: 5 seconds (150 frames)
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { TrendingUp, Users, Play, Eye, BarChart3 } from 'lucide-react';
import { VideoCard } from '../components/VideoCard';
import { GlassCard } from '../components/GlassCard';
import { StarfieldBackground } from '../components/StarfieldBackground';
import { SPEC } from '../spec';

// Animated counter with easing
const AnimatedCounter: React.FC<{
  value: number;
  startFrame: number;
  duration: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
}> = ({ value, startFrame, duration, suffix = '', prefix = '', decimals = 0 }) => {
  const frame = useCurrentFrame();
  
  const progress = interpolate(
    frame,
    [startFrame, startFrame + duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Ease out cubic for satisfying deceleration
  const easedProgress = 1 - Math.pow(1 - progress, 3);
  const currentValue = value * easedProgress;
  
  const formatted = decimals > 0 
    ? currentValue.toFixed(decimals)
    : Math.round(currentValue).toLocaleString();
  
  return (
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
      {prefix}{formatted}{suffix}
    </span>
  );
};

// Mini sparkline chart component
const MiniChart: React.FC<{
  data: number[];
  color: string;
  animationStart: number;
  width?: number;
  height?: number;
}> = ({ data, color, animationStart, width = 80, height = 30 }) => {
  const frame = useCurrentFrame();
  
  const progress = interpolate(
    frame,
    [animationStart, animationStart + 30],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  const max = Math.max(...data);
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (v / max) * height * 0.8;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`chartGrad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {/* Area fill */}
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#chartGrad-${color})`}
        style={{ 
          clipPath: `inset(0 ${100 - progress * 100}% 0 0)`,
        }}
      />
      
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: width * 3,
          strokeDashoffset: width * 3 * (1 - progress),
        }}
      />
    </svg>
  );
};

// Enhanced stat card
const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  chartData?: number[];
  chartColor?: string;
  startFrame: number;
  delay: number;
  trend?: number;
}> = ({ icon, label, value, suffix = '', prefix = '', chartData, chartColor, startFrame, delay, trend }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colors, fonts } = SPEC;
  
  // Card entrance spring
  const entranceSpring = spring({
    frame: Math.max(0, frame - startFrame - delay),
    fps,
    config: { damping: 14, stiffness: 100 },
  });
  
  const translateY = interpolate(entranceSpring, [0, 1], [50, 0]);
  const scale = interpolate(entranceSpring, [0, 1], [0.9, 1]);
  const opacity = interpolate(entranceSpring, [0, 1], [0, 1]);
  
  // Breathing glow effect
  const breathe = Math.sin((frame - startFrame - delay) * 0.04) * 0.5 + 0.5;
  const glowIntensity = 0.1 + breathe * 0.1;
  
  return (
    <div
      style={{
        transform: `translateY(${translateY}px) scale(${scale})`,
        opacity,
      }}
    >
      <div
        style={{
          background: `linear-gradient(135deg, ${colors.glass}, rgba(255, 255, 255, 0.05))`,
          border: `1px solid rgba(255, 255, 255, ${0.1 + breathe * 0.05})`,
          borderRadius: 16,
          padding: 24,
          minWidth: 220,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: `
            0 0 30px rgba(218, 191, 255, ${glowIntensity}),
            inset 0 1px 0 rgba(255, 255, 255, 0.1)
          `,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: colors.slate,
            }}
          >
            {icon}
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontFamily: fonts.sansFallback,
              }}
            >
              {label}
            </span>
          </div>
          
          {/* Trend indicator */}
          {trend && (
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: trend > 0 ? '#44aa44' : '#cc4444',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <TrendingUp size={12} style={{ transform: trend < 0 ? 'rotate(180deg)' : 'none' }} />
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        
        {/* Value */}
        <div
          style={{
            fontSize: 40,
            fontWeight: 700,
            color: colors.snow,
            fontFamily: fonts.sansFallback,
            lineHeight: 1,
            marginBottom: chartData ? 12 : 0,
          }}
        >
          <AnimatedCounter
            value={value}
            startFrame={startFrame + delay + 15}
            duration={45}
            suffix={suffix}
            prefix={prefix}
          />
        </div>
        
        {/* Mini chart */}
        {chartData && chartColor && (
          <MiniChart
            data={chartData}
            color={chartColor}
            animationStart={startFrame + delay + 20}
          />
        )}
      </div>
    </div>
  );
};

export const PlatformOverviewScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { scenes, colors, videoCards, fonts } = SPEC;
  const { platformOverview } = scenes;
  
  // Scene fade
  const sceneFade = interpolate(
    frame,
    [0, 25],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Sample chart data
  const chartData1 = [3, 5, 4, 8, 6, 9, 7, 12, 10, 15];
  const chartData2 = [8, 12, 10, 15, 18, 16, 22, 20, 28, 25];
  const chartData3 = [60, 65, 70, 75, 80, 82, 85, 88, 92, 94];
  
  // Category rows entrance
  const rowsSpring = spring({
    frame: Math.max(0, frame - platformOverview.categoryRowsAppear),
    fps,
    config: { damping: 18, stiffness: 60 },
  });
  
  const rowsOpacity = interpolate(rowsSpring, [0, 1], [0, 0.6]);
  const rowsY = interpolate(rowsSpring, [0, 1], [60, 0]);
  
  return (
    <AbsoluteFill style={{ backgroundColor: colors.spaceBlack }}>
      {/* Subtle starfield */}
      <StarfieldBackground
        fadeInStart={0}
        fadeInDuration={1}
        intensity={0.12}
        showGalaxy={false}
        showShootingStars={false}
        showNebula={true}
      />
      
      <AbsoluteFill style={{ opacity: sceneFade }}>
        {/* Stats row */}
        <div
          style={{
            position: 'absolute',
            top: 100,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 28,
            padding: '0 60px',
          }}
        >
          <StatCard
            icon={<Users size={18} />}
            label="Subscribers"
            value={12847}
            startFrame={platformOverview.statsCountStart}
            delay={0}
            chartData={chartData1}
            chartColor={colors.lavender}
            trend={23}
          />
          <StatCard
            icon={<Play size={18} />}
            label="Total Views"
            value={847293}
            startFrame={platformOverview.statsCountStart}
            delay={10}
            chartData={chartData2}
            chartColor={colors.sun}
            trend={18}
          />
          <StatCard
            icon={<BarChart3 size={18} />}
            label="Engagement"
            value={94}
            suffix="%"
            startFrame={platformOverview.statsCountStart}
            delay={20}
            chartData={chartData3}
            chartColor="#44aa44"
            trend={5}
          />
          <StatCard
            icon={<Eye size={18} />}
            label="Watch Time"
            value={2847}
            suffix="h"
            startFrame={platformOverview.statsCountStart}
            delay={30}
            trend={31}
          />
        </div>
        
        {/* Content rows */}
        <div
          style={{
            position: 'absolute',
            bottom: 140,
            left: 60,
            right: 60,
            opacity: rowsOpacity,
            transform: `translateY(${rowsY}px)`,
          }}
        >
          {/* Row 1 */}
          <div
            style={{
              display: 'flex',
              gap: 20,
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 4,
                height: 50,
                backgroundColor: colors.sun,
                borderRadius: 2,
                boxShadow: `0 0 15px ${colors.sun}60`,
              }}
            />
            <div style={{ display: 'flex', gap: 16 }}>
              {videoCards.thumbnails.slice(0, 5).map((thumb, i) => (
                <VideoCard
                  key={thumb}
                  thumbnail={thumb}
                  width={180}
                  appearFrame={platformOverview.categoryRowsAppear}
                  entranceDelay={i * 5}
                  showHover={false}
                  entranceDirection="up"
                />
              ))}
            </div>
          </div>
          
          {/* Row 2 (offset, smaller, adds depth) */}
          <div
            style={{
              display: 'flex',
              gap: 16,
              alignItems: 'center',
              marginLeft: 120,
              opacity: 0.5,
            }}
          >
            <div
              style={{
                width: 4,
                height: 40,
                backgroundColor: colors.lavender,
                borderRadius: 2,
                boxShadow: `0 0 12px ${colors.lavender}40`,
              }}
            />
            <div style={{ display: 'flex', gap: 14 }}>
              {videoCards.thumbnails.slice(3, 7).map((thumb, i) => (
                <VideoCard
                  key={`row2-${thumb}`}
                  thumbnail={thumb}
                  width={150}
                  appearFrame={platformOverview.categoryRowsAppear + 20}
                  entranceDelay={i * 5}
                  showHover={false}
                  entranceDirection="up"
                />
              ))}
            </div>
          </div>
        </div>
        
        {/* Edge gradients */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: `linear-gradient(to right, 
              ${colors.spaceBlack} 0%, 
              transparent 5%, 
              transparent 95%, 
              ${colors.spaceBlack} 100%
            )`,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default PlatformOverviewScene;
