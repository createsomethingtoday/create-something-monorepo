/**
 * CloseScene - Logo, URL
 * 
 * Minimal. Calm.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion';
import { SPEC } from '../spec';

export const CloseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { scenes, product, terminalStyle } = SPEC;
  
  // Simple fade in
  const progress = spring({
    fps,
    frame,
    config: {
      damping: 30,
      mass: 1,
      stiffness: 80,
    },
  });
  
  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: terminalStyle.backgroundColor,
        gap: '24px',
        opacity: progress,
      }}
    >
      {/* Logo */}
      <div
        style={{
          fontFamily: terminalStyle.fontFamily,
          fontSize: '3rem',
          fontWeight: 400,
          color: terminalStyle.textColor,
          letterSpacing: '0.1em',
        }}
      >
        {scenes.close.logo}
      </div>
      
      {/* URL */}
      <div
        style={{
          fontFamily: terminalStyle.fontFamily,
          fontSize: '1rem',
          fontWeight: 400,
          color: terminalStyle.dimColor,
        }}
      >
        {product.url}
      </div>
    </AbsoluteFill>
  );
};

export default CloseScene;
