/**
 * StatsScene - Summary statistics display
 * 
 * Shows key metrics: total contributions, longest streak, active days.
 * Includes "including X private" subtitle when applicable.
 * Vox kinetic typography with staggered entrance.
 */
import React from 'react';
import { useCurrentFrame, AbsoluteFill, spring, useVideoConfig, interpolate } from 'remotion';
import { StatCounter } from '../components';
import { colors, typography } from '../../../styles';
import { SPEC } from '../spec';

interface Stats {
  totalContributions: number;
  longestStreak: number;
  activeDays: number;
  avgContributions: number;
  mostActiveDay: string;
}

interface StatsSceneProps {
  stats: Stats;
  privateContributions?: number;
}

export const StatsScene: React.FC<StatsSceneProps> = ({ stats, privateContributions = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { stats: statsScene } = SPEC.scenes;
  
  // Staggered entrance for each stat
  const stat1Progress = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 180, mass: 0.6 },
  });
  
  const stat2Progress = spring({
    frame: frame - 10,
    fps,
    config: { damping: 20, stiffness: 180, mass: 0.6 },
  });
  
  const stat3Progress = spring({
    frame: frame - 20,
    fps,
    config: { damping: 20, stiffness: 180, mass: 0.6 },
  });
  
  // Private contributions badge (appears after stats)
  const privateProgress = spring({
    frame: frame - 35,
    fps,
    config: { damping: 25, stiffness: 150, mass: 0.5 },
  });
  
  // Exit animation - smoother push-up fade
  const exitStart = statsScene.duration - 30;
  const exitProgress = interpolate(
    frame,
    [exitStart, statsScene.duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Ease out for smoother exit
  const easedExit = exitProgress * exitProgress * (3 - 2 * exitProgress);
  
  const statItems = [
    {
      value: stats.totalContributions,
      label: 'Total Contributions',
      progress: stat1Progress,
      startFrame: 0,
    },
    {
      value: stats.longestStreak,
      label: 'Day Streak',
      suffix: '',
      progress: stat2Progress,
      startFrame: 10,
    },
    {
      value: stats.activeDays,
      label: 'Active Days',
      progress: stat3Progress,
      startFrame: 20,
    },
  ];
  
  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        opacity: interpolate(easedExit, [0, 1], [1, 0]),
        transform: `scale(${interpolate(easedExit, [0, 1], [1, 0.95])}) translateY(${interpolate(easedExit, [0, 1], [0, -20])}px)`,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 120,
        }}
      >
        {statItems.map((item, index) => (
          <div
            key={index}
            style={{
              transform: `translateY(${interpolate(item.progress, [0, 1], [40, 0])}px)`,
              opacity: Math.max(0, item.progress),
            }}
          >
            <StatCounter
              value={item.value}
              label={item.label}
              startFrame={item.startFrame}
              duration={50}
              suffix={item.suffix}
            />
          </div>
        ))}
      </div>
      
      {/* Private contributions callout */}
      {privateContributions > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 180,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transform: `translateY(${interpolate(Math.max(0, privateProgress), [0, 1], [20, 0])}px)`,
            opacity: Math.max(0, privateProgress),
          }}
        >
          <span
            style={{
              fontFamily: typography.fontFamily.mono,
              fontSize: '0.875rem',
              color: colors.neutral[600],
              letterSpacing: typography.letterSpacing.wider,
              textTransform: 'uppercase',
            }}
          >
            including
          </span>
          <span
            style={{
              fontFamily: typography.fontFamily.sans,
              fontSize: '1rem',
              fontWeight: typography.fontWeight.medium,
              color: colors.neutral[400],
              letterSpacing: typography.letterSpacing.wide,
            }}
          >
            {privateContributions.toLocaleString()}
          </span>
          <span
            style={{
              fontFamily: typography.fontFamily.mono,
              fontSize: '0.875rem',
              color: colors.neutral[600],
              letterSpacing: typography.letterSpacing.wider,
              textTransform: 'uppercase',
            }}
          >
            private
          </span>
        </div>
      )}
      
      {/* Most active day callout */}
      <div
        style={{
          position: 'absolute',
          bottom: 120,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          transform: `translateY(${interpolate(Math.max(0, stat3Progress), [0, 1], [20, 0])}px)`,
          opacity: Math.max(0, stat3Progress),
        }}
      >
        <span
          style={{
            fontFamily: typography.fontFamily.mono,
            fontSize: '0.875rem',
            color: colors.neutral[500],
            letterSpacing: typography.letterSpacing.wider,
            textTransform: 'uppercase',
          }}
        >
          Most active:
        </span>
        <span
          style={{
            fontFamily: typography.fontFamily.sans,
            fontSize: '1rem',
            fontWeight: typography.fontWeight.medium,
            color: colors.neutral[0],
            letterSpacing: typography.letterSpacing.wide,
          }}
        >
          {stats.mostActiveDay}s
        </span>
      </div>
    </AbsoluteFill>
  );
};

export default StatsScene;
