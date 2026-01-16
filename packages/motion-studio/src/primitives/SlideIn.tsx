/**
 * SlideIn - Directional slide animation
 * 
 * Content entering from off-screen.
 * "Guide the eye, don't chase it."
 */
import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { animation } from '../styles/index.js';

interface SlideInProps {
  /** Content to animate */
  children: React.ReactNode;
  
  /** Frame when animation starts */
  startFrame?: number;
  
  /** Animation duration in frames */
  duration?: number;
  
  /** Direction to slide from */
  direction?: 'left' | 'right' | 'top' | 'bottom';
  
  /** Distance to slide (in pixels) */
  distance?: number;
  
  /** Also fade in */
  withFade?: boolean;
  
  /** Custom className */
  className?: string;
  
  /** Style overrides */
  style?: React.CSSProperties;
}

export const SlideIn: React.FC<SlideInProps> = ({
  children,
  startFrame = 0,
  duration = animation.frames.standard,
  direction = 'bottom',
  distance = 40,
  withFade = true,
  className = '',
  style = {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const localFrame = frame - startFrame;
  
  const progress = spring({
    fps,
    frame: localFrame,
    config: {
      damping: 20,
      mass: 0.5,
      stiffness: 100,
    },
  });
  
  // Calculate initial position based on direction
  const getTransform = () => {
    const offset = interpolate(progress, [0, 1], [distance, 0]);
    
    switch (direction) {
      case 'left':
        return `translateX(${-offset}px)`;
      case 'right':
        return `translateX(${offset}px)`;
      case 'top':
        return `translateY(${-offset}px)`;
      case 'bottom':
        return `translateY(${offset}px)`;
      default:
        return 'none';
    }
  };
  
  const opacity = withFade ? progress : 1;
  
  return (
    <div
      className={className}
      style={{
        transform: getTransform(),
        opacity: Math.max(0, opacity),
        ...style,
      }}
    >
      {children}
    </div>
  );
};
