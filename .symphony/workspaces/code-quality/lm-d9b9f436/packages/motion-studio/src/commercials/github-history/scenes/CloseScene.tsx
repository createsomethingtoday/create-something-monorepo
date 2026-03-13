/**
 * CloseScene - Closing tagline and logo
 * 
 * Personalized with contribution count: "4,980 commits. Every one tells a story."
 * Clean Vox ending.
 */
import React from 'react';
import { useCurrentFrame, AbsoluteFill, spring, useVideoConfig, interpolate } from 'remotion';
import { colors, typography } from '../../../styles';
import { SPEC } from '../spec';

interface CloseSceneProps {
  totalContributions?: number;
}

export const CloseScene: React.FC<CloseSceneProps> = ({ totalContributions }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { close } = SPEC.scenes;
  
  // Count entrance (first)
  const countProgress = spring({
    frame,
    fps,
    config: {
      damping: 20,
      stiffness: 180,
      mass: 0.6,
    },
  });
  
  // Tagline entrance (delayed)
  const taglineProgress = spring({
    frame: frame - 12,
    fps,
    config: {
      damping: 25,
      stiffness: 150,
      mass: 0.8,
    },
  });
  
  // Logo entrance (more delayed)
  const logoProgress = spring({
    frame: frame - 24,
    fps,
    config: {
      damping: 20,
      stiffness: 180,
      mass: 0.6,
    },
  });
  
  // Format contribution count
  const formattedCount = totalContributions?.toLocaleString() || '0';
  
  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
      }}
    >
      {/* Contribution count */}
      {totalContributions && totalContributions > 0 && (
        <div
          style={{
            fontFamily: typography.fontFamily.sans,
            fontSize: '5rem',
            fontWeight: typography.fontWeight.bold,
            color: colors.neutral[0],
            letterSpacing: typography.letterSpacing.tight,
            marginBottom: 8,
            transform: `translateY(${interpolate(countProgress, [0, 1], [30, 0])}px) scale(${interpolate(countProgress, [0, 1], [0.9, 1])})`,
            opacity: countProgress,
          }}
        >
          {formattedCount}
        </div>
      )}
      
      {/* "contributions" label */}
      {totalContributions && totalContributions > 0 && (
        <div
          style={{
            fontFamily: typography.fontFamily.mono,
            fontSize: '1rem',
            fontWeight: typography.fontWeight.normal,
            color: colors.neutral[500],
            letterSpacing: typography.letterSpacing.wider,
            textTransform: 'uppercase',
            marginBottom: 40,
            transform: `translateY(${interpolate(countProgress, [0, 1], [20, 0])}px)`,
            opacity: Math.max(0, countProgress - 0.3),
          }}
        >
          contributions
        </div>
      )}
      
      {/* Tagline */}
      <div
        style={{
          fontFamily: typography.fontFamily.sans,
          fontSize: '2.5rem',
          fontWeight: typography.fontWeight.medium,
          color: colors.neutral[300],
          letterSpacing: typography.letterSpacing.tight,
          transform: `translateY(${interpolate(Math.max(0, taglineProgress), [0, 1], [30, 0])}px)`,
          opacity: Math.max(0, taglineProgress),
        }}
      >
        {close.tagline}
      </div>
      
      {/* Logo */}
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          fontFamily: typography.fontFamily.mono,
          fontSize: '0.875rem',
          fontWeight: typography.fontWeight.normal,
          color: colors.neutral[600],
          letterSpacing: typography.letterSpacing.wider,
          textTransform: 'uppercase',
          transform: `translateY(${interpolate(Math.max(0, logoProgress), [0, 1], [20, 0])}px)`,
          opacity: Math.max(0, logoProgress),
        }}
      >
        {close.logo}
      </div>
    </AbsoluteFill>
  );
};

export default CloseScene;
