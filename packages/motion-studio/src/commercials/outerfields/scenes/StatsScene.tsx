/**
 * StatsScene - Dashboard glimpse
 * 
 * Brief view of stats counting up. The platform is alive.
 * 
 * Duration: 4 seconds (120 frames)
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { Users, Play, TrendingUp, Eye } from 'lucide-react';
import { SPEC } from '../spec';

// Animated counter with easing
const Counter: React.FC<{
  value: number;
  startFrame: number;
  duration: number;
  suffix?: string;
  prefix?: string;
}> = ({ value, startFrame, duration, suffix = '', prefix = '' }) => {
  const frame = useCurrentFrame();
  
  const progress = interpolate(
    frame,
    [startFrame, startFrame + duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Ease out cubic
  const easedProgress = 1 - Math.pow(1 - progress, 3);
  const current = Math.round(value * easedProgress);
  
  return (
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
      {prefix}{current.toLocaleString()}{suffix}
    </span>
  );
};

// Mini bar chart for visual interest
const MiniChart: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const bars = [0.4, 0.6, 0.5, 0.8, 0.7, 0.9, 0.75];
  
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 24 }}>
      {bars.map((height, i) => {
        const barProgress = interpolate(
          frame,
          [delay + i * 3, delay + i * 3 + 20],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );
        
        return (
          <div
            key={i}
            style={{
              width: 4,
              height: `${height * 100 * barProgress}%`,
              backgroundColor: 'rgba(124, 43, 238, 0.6)',
              borderRadius: 2,
            }}
          />
        );
      })}
    </div>
  );
};

export const StatsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { scenes, colors, fonts } = SPEC;
  const { stats } = scenes;
  
  // Stats data
  const statsData = [
    { icon: <Users size={22} />, label: 'Subscribers', value: 12847, suffix: '', color: colors.sun },
    { icon: <Eye size={22} />, label: 'Views', value: 847293, suffix: '', color: colors.lavender },
    { icon: <TrendingUp size={22} />, label: 'Engagement', value: 94, suffix: '%', color: '#4ade80' },
  ];
  
  return (
    <AbsoluteFill style={{ backgroundColor: colors.spaceBlack }}>
      {/* Subtle gradient background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, rgba(124, 43, 238, 0.05) 0%, transparent 60%)',
        }}
      />
      
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 32,
        }}
      >
        {statsData.map((stat, index) => {
          const cardSpring = spring({
            frame: Math.max(0, frame - 5 - index * 6),
            fps,
            config: { damping: 18, stiffness: 90, mass: 1 },
          });
          
          const translateY = interpolate(cardSpring, [0, 1], [40, 0]);
          const opacity = interpolate(cardSpring, [0, 1], [0, 1]);
          const scale = interpolate(cardSpring, [0, 1], [0.95, 1]);
          
          return (
            <div
              key={stat.label}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: `1px solid rgba(255, 255, 255, 0.08)`,
                borderRadius: 16,
                padding: '32px 40px',
                minWidth: 220,
                textAlign: 'center',
                transform: `translateY(${translateY}px) scale(${scale})`,
                opacity,
              }}
            >
              {/* Icon and label */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div style={{ color: stat.color, opacity: 0.9 }}>
                  {stat.icon}
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: colors.slate,
                    fontFamily: fonts.sansFallback,
                  }}
                >
                  {stat.label}
                </span>
              </div>
              
              {/* Value */}
              <div
                style={{
                  fontSize: 48,
                  fontWeight: 700,
                  color: colors.snow,
                  fontFamily: fonts.sansFallback,
                  marginBottom: 12,
                }}
              >
                <Counter
                  value={stat.value}
                  startFrame={stats.countStart + index * 6}
                  duration={stats.countDuration}
                  suffix={stat.suffix}
                />
              </div>
              
              {/* Mini chart */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <MiniChart delay={stats.countStart + index * 6 + 15} />
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default StatsScene;
