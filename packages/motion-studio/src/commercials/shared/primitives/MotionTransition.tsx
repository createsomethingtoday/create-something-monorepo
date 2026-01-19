/**
 * MotionTransition - Vox-style transitions between elements
 * 
 * Motion-based, NOT opacity-based. Elements slide, scale, wipe, push.
 * NEVER crossfade.
 * 
 * @example
 * <MotionTransition
 *   type="wipe-left"
 *   startFrame={60}
 *   duration={15}
 * >
 *   <NextScene />
 * </MotionTransition>
 */
import React from 'react';
import {
  useCurrentFrame,
  interpolate,
  Easing,
} from 'remotion';

type TransitionType =
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'wipe-left'
  | 'wipe-right'
  | 'wipe-up'
  | 'wipe-down'
  | 'scale-in'
  | 'scale-out'
  | 'push-left'
  | 'push-right';

interface MotionTransitionProps {
  /** The content to transition in */
  children: React.ReactNode;
  
  /** Type of transition */
  type?: TransitionType;
  
  /** Frame when transition starts */
  startFrame?: number;
  
  /** Duration of transition in frames */
  duration?: number;
  
  /** Whether this is an exit transition (reverses direction) */
  isExit?: boolean;
}

export const MotionTransition: React.FC<MotionTransitionProps> = ({
  children,
  type = 'slide-left',
  startFrame = 0,
  duration = 15,
  isExit = false,
}) => {
  const frame = useCurrentFrame();
  const localFrame = frame - startFrame;
  
  // Calculate progress (0 to 1)
  const rawProgress = interpolate(
    localFrame,
    [0, duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Apply easing
  const progress = isExit 
    ? Easing.in(Easing.ease)(rawProgress)
    : Easing.out(Easing.ease)(rawProgress);
  
  // For exit, we want 1→0 instead of 0→1
  const t = isExit ? 1 - progress : progress;
  
  let transform = 'none';
  let clipPath = 'none';
  let opacity = 1;
  
  switch (type) {
    case 'slide-left':
      transform = `translateX(${interpolate(t, [0, 1], [100, 0])}%)`;
      break;
    case 'slide-right':
      transform = `translateX(${interpolate(t, [0, 1], [-100, 0])}%)`;
      break;
    case 'slide-up':
      transform = `translateY(${interpolate(t, [0, 1], [100, 0])}%)`;
      break;
    case 'slide-down':
      transform = `translateY(${interpolate(t, [0, 1], [-100, 0])}%)`;
      break;
    case 'wipe-left':
      clipPath = `inset(0 ${interpolate(t, [0, 1], [100, 0])}% 0 0)`;
      break;
    case 'wipe-right':
      clipPath = `inset(0 0 0 ${interpolate(t, [0, 1], [100, 0])}%)`;
      break;
    case 'wipe-up':
      clipPath = `inset(${interpolate(t, [0, 1], [100, 0])}% 0 0 0)`;
      break;
    case 'wipe-down':
      clipPath = `inset(0 0 ${interpolate(t, [0, 1], [100, 0])}% 0)`;
      break;
    case 'scale-in':
      transform = `scale(${interpolate(t, [0, 1], [0.8, 1])})`;
      // Slight opacity for scale to avoid harsh pop
      opacity = interpolate(t, [0, 0.3, 1], [0, 1, 1]);
      break;
    case 'scale-out':
      transform = `scale(${interpolate(t, [0, 1], [1.2, 1])})`;
      opacity = interpolate(t, [0, 0.3, 1], [0, 1, 1]);
      break;
    case 'push-left':
      transform = `translateX(${interpolate(t, [0, 1], [120, 0])}%)`;
      break;
    case 'push-right':
      transform = `translateX(${interpolate(t, [0, 1], [-120, 0])}%)`;
      break;
  }
  
  // Before transition starts, hide content (for entrance)
  if (!isExit && localFrame < 0) {
    opacity = 0;
  }
  
  // After transition ends for exit, hide content
  if (isExit && localFrame > duration) {
    opacity = 0;
  }
  
  const style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    transform,
    clipPath,
    opacity,
  };
  
  return <div style={style}>{children}</div>;
};

export default MotionTransition;
