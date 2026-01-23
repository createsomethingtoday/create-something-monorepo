/**
 * LogoScene - Clean logo reveal
 * 
 * Simple, confident: OUTERFIELDS on dark.
 * Subtle orange glow. That's it.
 * 
 * Duration: 2 seconds (60 frames)
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { SPEC } from '../spec';

export const LogoScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { scenes, colors, fonts } = SPEC;
  const { logo } = scenes;
  
  // Logo reveal spring
  const revealSpring = spring({
    frame: Math.max(0, frame - 5),
    fps,
    config: { damping: 22, stiffness: 70, mass: 1 },
  });
  
  const logoOpacity = interpolate(revealSpring, [0, 1], [0, 1]);
  const logoScale = interpolate(revealSpring, [0, 1], [0.92, 1]);
  const logoY = interpolate(revealSpring, [0, 1], [20, 0]);
  
  // Glow reveal (slightly delayed)
  const glowOpacity = interpolate(
    frame,
    [10, 30],
    [0, 0.35],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Underline reveal
  const underlineWidth = interpolate(
    frame,
    [20, 45],
    [0, 100],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  return (
    <AbsoluteFill style={{ backgroundColor: colors.spaceBlack }}>
      {/* Subtle radial glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 700,
          height: 300,
          background: `radial-gradient(ellipse at center, 
            rgba(244, 81, 38, ${glowOpacity}) 0%, 
            transparent 60%
          )`,
          filter: 'blur(60px)',
        }}
      />
      
      {/* Logo container */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Logo text */}
        <h1
          style={{
            fontSize: 96,
            fontWeight: 700,
            fontFamily: fonts.sansFallback,
            color: colors.snow,
            letterSpacing: '0.03em',
            margin: 0,
            opacity: logoOpacity,
            transform: `translateY(${logoY}px) scale(${logoScale})`,
          }}
        >
          OUTERFIELDS
        </h1>
        
        {/* Subtle underline */}
        <div
          style={{
            marginTop: 16,
            height: 3,
            width: 200,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: 2,
            overflow: 'hidden',
            opacity: logoOpacity,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${underlineWidth}%`,
              background: `linear-gradient(to right, ${colors.sun}, ${colors.lavender})`,
              borderRadius: 2,
            }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default LogoScene;
