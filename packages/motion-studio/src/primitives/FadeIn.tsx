/**
 * FadeIn - Simple opacity animation
 * 
 * The foundation of all reveals.
 * "Make it visible, then make it meaningful."
 */
import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { animation } from '../styles/index.js';

interface FadeInProps {
  /** Content to fade in */
  children: React.ReactNode;
  
  /** Frame when animation starts */
  startFrame?: number;
  
  /** Animation duration in frames */
  duration?: number;
  
  /** Use spring physics */
  useSpring?: boolean;
  
  /** Custom className */
  className?: string;
  
  /** Style overrides */
  style?: React.CSSProperties;
}

export const FadeIn: React.FC<FadeInProps> = ({
  children,
  startFrame = 0,
  duration = animation.frames.standard,
  useSpring: useSpringPhysics = false,
  className = '',
  style = {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const localFrame = frame - startFrame;
  
  let opacity: number;
  
  if (useSpringPhysics) {
    opacity = spring({
      fps,
      frame: localFrame,
      config: {
        damping: 20,
        mass: 0.5,
        stiffness: 100,
      },
    });
  } else {
    opacity = interpolate(
      localFrame,
      [0, duration],
      [0, 1],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
  }
  
  return (
    <div
      className={className}
      style={{
        opacity: Math.max(0, opacity),
        ...style,
      }}
    >
      {children}
    </div>
  );
};
