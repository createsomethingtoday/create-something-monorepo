/**
 * HeatmapScene - Main contribution visualization
 * 
 * Animated GitHub contribution heatmap with progressive reveal.
 * Left-to-right wave mimics time progression.
 * Highlights busiest day with glow effect.
 */
import React from 'react';
import { useCurrentFrame, AbsoluteFill, interpolate, spring, useVideoConfig } from 'remotion';
import { ContributionHeatmap } from '../components';
import type { ContributionWeek, RepositoryContribution } from '../spec';
import { colors, typography } from '../../../styles';
import { SPEC } from '../spec';

interface HeatmapSceneProps {
  weeks: ContributionWeek[];
  totalContributions: number;
  username: string;
  busiestDay?: { date: string; contributionCount: number };
  topRepos?: RepositoryContribution[];
}

export const HeatmapScene: React.FC<HeatmapSceneProps> = ({
  weeks,
  totalContributions,
  username,
  busiestDay,
  topRepos = [],
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { heatmap: heatmapScene } = SPEC.scenes;
  
  // Container entrance
  const containerProgress = spring({
    frame,
    fps,
    config: {
      damping: 30,
      stiffness: 100,
      mass: 1,
    },
  });
  
  // Top repos animation (appears early-mid)
  const reposStartFrame = heatmapScene.duration * 0.35;
  const reposProgress = spring({
    frame: frame - reposStartFrame,
    fps,
    config: {
      damping: 25,
      stiffness: 120,
      mass: 0.7,
    },
  });
  
  // Counter animation (appears mid-way through)
  const counterStartFrame = heatmapScene.duration * 0.6;
  const counterProgress = spring({
    frame: frame - counterStartFrame,
    fps,
    config: {
      damping: 25,
      stiffness: 150,
      mass: 0.6,
    },
  });
  
  // Animated contribution count
  const countProgress = interpolate(
    frame - counterStartFrame,
    [0, 60],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const easedCount = 1 - Math.pow(1 - countProgress, 3);
  const displayCount = Math.floor(totalContributions * easedCount);
  
  // Exit animation - smoother scale-down fade
  const exitStart = heatmapScene.duration - 35;
  const exitProgress = interpolate(
    frame,
    [exitStart, heatmapScene.duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Ease out for smoother exit
  const easedExit = exitProgress * exitProgress * (3 - 2 * exitProgress);
  
  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        opacity: interpolate(easedExit, [0, 1], [1, 0]),
        transform: `scale(${interpolate(easedExit, [0, 1], [1, 0.95])})`,
      }}
    >
      {/* Heatmap container */}
      <div
        style={{
          transform: `scale(${interpolate(containerProgress, [0, 1], [0.9, 1])})`,
          opacity: containerProgress,
        }}
      >
        <ContributionHeatmap
          weeks={weeks}
          startFrame={15}
          animationDuration={heatmapScene.duration * 0.7}
          staggerDirection="left-right"
          busiestDay={busiestDay}
        />
      </div>
      
      {/* Top repositories - appears before counter */}
      {topRepos.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 80,
            right: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 8,
            transform: `translateX(${interpolate(Math.max(0, reposProgress), [0, 1], [40, 0])}px)`,
            opacity: Math.max(0, reposProgress) * interpolate(easedExit, [0, 0.5], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}
        >
          <div
            style={{
              fontFamily: typography.fontFamily.mono,
              fontSize: '0.75rem',
              color: colors.neutral[600],
              letterSpacing: typography.letterSpacing.wider,
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Top Repositories
          </div>
          {topRepos.slice(0, 3).map((repo, index) => (
            <div
              key={repo.repository.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transform: `translateX(${interpolate(
                  spring({ frame: frame - reposStartFrame - index * 6, fps, config: { damping: 20, stiffness: 150, mass: 0.5 } }),
                  [0, 1],
                  [20, 0]
                )}px)`,
                opacity: Math.max(0, spring({ frame: frame - reposStartFrame - index * 6, fps, config: { damping: 20, stiffness: 150, mass: 0.5 } })),
              }}
            >
              <span
                style={{
                  fontFamily: typography.fontFamily.mono,
                  fontSize: '0.875rem',
                  color: colors.neutral[400],
                  maxWidth: 180,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {repo.repository.name}
              </span>
              <span
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontSize: '0.875rem',
                  fontWeight: typography.fontWeight.medium,
                  color: colors.neutral[0],
                }}
              >
                {repo.contributions.totalCount.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
      
      {/* Contribution counter - appears after heatmap builds */}
      <div
        style={{
          position: 'absolute',
          bottom: 120,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transform: `translateY(${interpolate(Math.max(0, counterProgress), [0, 1], [30, 0])}px)`,
          opacity: Math.max(0, counterProgress),
        }}
      >
        <div
          style={{
            fontFamily: typography.fontFamily.sans,
            fontSize: '4rem',
            fontWeight: typography.fontWeight.bold,
            color: colors.neutral[0],
            letterSpacing: typography.letterSpacing.tight,
          }}
        >
          {displayCount.toLocaleString()}
        </div>
        <div
          style={{
            fontFamily: typography.fontFamily.mono,
            fontSize: '1rem',
            fontWeight: typography.fontWeight.normal,
            color: colors.neutral[500],
            letterSpacing: typography.letterSpacing.wider,
            textTransform: 'uppercase',
            marginTop: 8,
          }}
        >
          CONTRIBUTIONS
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default HeatmapScene;
