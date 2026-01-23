/**
 * IntroScene - Opening title for GitHub History commercial
 * 
 * "A YEAR IN CODE" with username, avatar, and year reveal.
 * Vox kinetic typography style.
 */
import React from 'react';
import { useCurrentFrame, spring, useVideoConfig, AbsoluteFill, interpolate, Img } from 'remotion';
import { colors, typography } from '../../../styles';
import { SPEC } from '../spec';

interface IntroSceneProps {
  username: string;
  avatarUrl?: string;
  yearRange?: string;
}

export const IntroScene: React.FC<IntroSceneProps> = ({ 
  username, 
  avatarUrl,
  yearRange = '2025',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { intro } = SPEC.scenes;
  
  // Avatar entrance (first)
  const avatarProgress = spring({
    frame,
    fps,
    config: {
      damping: 25,
      stiffness: 200,
      mass: 0.5,
    },
  });
  
  // Title entrance animation
  const titleProgress = spring({
    frame: frame - 8,
    fps,
    config: {
      damping: 20,
      stiffness: 180,
      mass: 0.8,
    },
  });
  
  // Year entrance (with title)
  const yearProgress = spring({
    frame: frame - 12,
    fps,
    config: {
      damping: 22,
      stiffness: 160,
      mass: 0.6,
    },
  });
  
  // Subtitle entrance (delayed)
  const subtitleProgress = spring({
    frame: frame - 20,
    fps,
    config: {
      damping: 25,
      stiffness: 150,
      mass: 0.6,
    },
  });
  
  // Username entrance (more delayed)
  const usernameProgress = spring({
    frame: frame - 28,
    fps,
    config: {
      damping: 20,
      stiffness: 200,
      mass: 0.5,
    },
  });
  
  // Exit animation - smoother push-up fade
  const exitStart = intro.duration - 25;
  const exitProgress = interpolate(
    frame,
    [exitStart, intro.duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Ease out cubic for smoother exit
  const easedExit = exitProgress * exitProgress * (3 - 2 * exitProgress);
  const exitScale = interpolate(easedExit, [0, 1], [1, 0.92]);
  const exitOpacity = interpolate(easedExit, [0, 1], [1, 0]);
  const exitY = interpolate(easedExit, [0, 1], [0, -30]);
  
  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        transform: `scale(${exitScale}) translateY(${exitY}px)`,
        opacity: exitOpacity,
      }}
    >
      {/* Avatar */}
      {avatarUrl && (
        <div
          style={{
            marginBottom: 32,
            transform: `scale(${interpolate(avatarProgress, [0, 1], [0.5, 1])})`,
            opacity: Math.max(0, avatarProgress),
          }}
        >
          <Img
            src={avatarUrl}
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              border: `2px solid ${colors.neutral[700]}`,
            }}
          />
        </div>
      )}
      
      {/* Year badge */}
      <div
        style={{
          fontFamily: typography.fontFamily.mono,
          fontSize: '0.875rem',
          fontWeight: typography.fontWeight.normal,
          color: colors.neutral[500],
          letterSpacing: typography.letterSpacing.wider,
          textTransform: 'uppercase',
          marginBottom: 16,
          transform: `translateY(${interpolate(yearProgress, [0, 1], [20, 0])}px)`,
          opacity: Math.max(0, yearProgress),
        }}
      >
        {yearRange}
      </div>
      
      {/* Main title */}
      <div
        style={{
          fontFamily: typography.fontFamily.sans,
          fontSize: '6rem',
          fontWeight: typography.fontWeight.bold,
          color: colors.neutral[0],
          letterSpacing: typography.letterSpacing.tight,
          transform: `translateY(${interpolate(Math.max(0, titleProgress), [0, 1], [40, 0])}px)`,
          opacity: Math.max(0, titleProgress),
        }}
      >
        {intro.content.title}
      </div>
      
      {/* Subtitle with username */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginTop: 24,
          transform: `translateY(${interpolate(Math.max(0, subtitleProgress), [0, 1], [30, 0])}px)`,
          opacity: Math.max(0, subtitleProgress),
        }}
      >
        <span
          style={{
            fontFamily: typography.fontFamily.mono,
            fontSize: '1.5rem',
            fontWeight: typography.fontWeight.normal,
            color: colors.neutral[500],
            letterSpacing: typography.letterSpacing.wide,
          }}
        >
          {intro.content.subtitle}
        </span>
        <span
          style={{
            fontFamily: typography.fontFamily.mono,
            fontSize: '1.5rem',
            fontWeight: typography.fontWeight.medium,
            color: colors.neutral[0],
            letterSpacing: typography.letterSpacing.wide,
            transform: `translateX(${interpolate(Math.max(0, usernameProgress), [0, 1], [20, 0])}px)`,
            opacity: Math.max(0, usernameProgress),
          }}
        >
          {username}
        </span>
      </div>
    </AbsoluteFill>
  );
};

export default IntroScene;
