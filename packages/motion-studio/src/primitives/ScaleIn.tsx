/**
 * ScaleIn - Scale animation with optional fade
 * 
 * Pop-in effect for emphasis.
 * "Draw attention without demanding it."
 */
import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { animation } from '../styles/index.js';

interface ScaleInProps {
  /** Content to animate */
  children: React.ReactNode;
  
  /** Frame when animation starts */
  startFrame?: number;
  
  /** Animation duration in frames */
  duration?: number;
  
  /** Starting scale (0-1) */
  initialScale?: number;
  
  /** Also fade in */
  withFade?: boolean;
  
  /** Transform origin */
  origin?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  
  /** Custom className */
  className?: string;
  
  /** Style overrides */
  style?: React.CSSProperties;
}

const originMap: Record<string, string> = {
  center: '50% 50%',
  top: '50% 0%',
  bottom: '50% 100%',
  left: '0% 50%',
  right: '100% 50%',
  'top-left': '0% 0%',
  'top-right': '100% 0%',
  'bottom-left': '0% 100%',
  'bottom-right': '100% 100%',
};

export const ScaleIn: React.FC<ScaleInProps> = ({
  children,
  startFrame = 0,
  duration = animation.frames.standard,
  initialScale = 0.8,
  withFade = true,
  origin = 'center',
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
      damping: 15,
      mass: 0.5,
      stiffness: 120,
    },
  });
  
  const scale = interpolate(progress, [0, 1], [initialScale, 1]);
  const opacity = withFade ? progress : 1;
  
  return (
    <div
      className={className}
      style={{
        transform: `scale(${scale})`,
        transformOrigin: originMap[origin],
        opacity: Math.max(0, opacity),
        ...style,
      }}
    >
      {children}
    </div>
  );
};
