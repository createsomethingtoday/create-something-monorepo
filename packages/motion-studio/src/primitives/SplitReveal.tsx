/**
 * SplitReveal - Directional reveal transition
 * 
 * The classic Vox comparison: A/B reveals, before/after,
 * concepts sliding into view.
 * 
 * @example
 * <SplitReveal
 *   direction="horizontal"
 *   startFrame={0}
 * >
 *   <LeftContent />
 *   <RightContent />
 * </SplitReveal>
 */
import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { colors, animation } from '../styles/index.js';

interface SplitRevealProps {
  /** Children (exactly 2 for split) */
  children: [React.ReactNode, React.ReactNode];
  
  /** Split direction */
  direction?: 'horizontal' | 'vertical';
  
  /** Frame when animation starts */
  startFrame?: number;
  
  /** Animation duration in frames */
  duration?: number;
  
  /** Gap between panels */
  gap?: number;
  
  /** Container dimensions */
  width?: number;
  height?: number;
  
  /** Background color */
  backgroundColor?: string;
  
  /** Reveal style */
  revealStyle?: 'slide' | 'wipe' | 'scale';
  
  /** Custom className */
  className?: string;
}

export const SplitReveal: React.FC<SplitRevealProps> = ({
  children,
  direction = 'horizontal',
  startFrame = 0,
  duration = animation.frames.complex * 2,
  gap = 0,
  width = 1920,
  height = 1080,
  backgroundColor = colors.neutral[950],
  revealStyle = 'slide',
  className = '',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const [firstChild, secondChild] = children;
  
  // Animation progress for each panel
  const firstProgress = spring({
    fps,
    frame: frame - startFrame,
    config: {
      damping: 20,
      mass: 0.8,
      stiffness: 80,
    },
  });
  
  const secondProgress = spring({
    fps,
    frame: frame - startFrame - animation.frames.micro,
    config: {
      damping: 20,
      mass: 0.8,
      stiffness: 80,
    },
  });
  
  // Calculate panel dimensions
  const isHorizontal = direction === 'horizontal';
  const panelWidth = isHorizontal ? (width - gap) / 2 : width;
  const panelHeight = isHorizontal ? height : (height - gap) / 2;
  
  // Calculate transforms based on reveal style
  const getFirstTransform = () => {
    switch (revealStyle) {
      case 'slide':
        return isHorizontal
          ? `translateX(${interpolate(firstProgress, [0, 1], [-panelWidth, 0])}px)`
          : `translateY(${interpolate(firstProgress, [0, 1], [-panelHeight, 0])}px)`;
      case 'wipe':
        return 'none';
      case 'scale':
        return `scale(${interpolate(firstProgress, [0, 1], [0.8, 1])})`;
      default:
        return 'none';
    }
  };
  
  const getSecondTransform = () => {
    switch (revealStyle) {
      case 'slide':
        return isHorizontal
          ? `translateX(${interpolate(secondProgress, [0, 1], [panelWidth, 0])}px)`
          : `translateY(${interpolate(secondProgress, [0, 1], [panelHeight, 0])}px)`;
      case 'wipe':
        return 'none';
      case 'scale':
        return `scale(${interpolate(secondProgress, [0, 1], [0.8, 1])})`;
      default:
        return 'none';
    }
  };
  
  const getClipPath = (progress: number, isFirst: boolean) => {
    if (revealStyle !== 'wipe') return 'none';
    
    if (isHorizontal) {
      const clipProgress = interpolate(progress, [0, 1], [0, 100]);
      return isFirst
        ? `inset(0 ${100 - clipProgress}% 0 0)`
        : `inset(0 0 0 ${100 - clipProgress}%)`;
    } else {
      const clipProgress = interpolate(progress, [0, 1], [0, 100]);
      return isFirst
        ? `inset(0 0 ${100 - clipProgress}% 0)`
        : `inset(${100 - clipProgress}% 0 0 0)`;
    }
  };
  
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width,
        height,
        backgroundColor,
        display: 'flex',
        flexDirection: isHorizontal ? 'row' : 'column',
        gap,
        overflow: 'hidden',
      }}
    >
      {/* First panel */}
      <div
        style={{
          width: panelWidth,
          height: panelHeight,
          transform: getFirstTransform(),
          opacity: interpolate(firstProgress, [0, 0.5, 1], [0, 1, 1]),
          clipPath: getClipPath(firstProgress, true),
          overflow: 'hidden',
        }}
      >
        {firstChild}
      </div>
      
      {/* Second panel */}
      <div
        style={{
          width: panelWidth,
          height: panelHeight,
          transform: getSecondTransform(),
          opacity: interpolate(secondProgress, [0, 0.5, 1], [0, 1, 1]),
          clipPath: getClipPath(secondProgress, false),
          overflow: 'hidden',
        }}
      >
        {secondChild}
      </div>
    </div>
  );
};
