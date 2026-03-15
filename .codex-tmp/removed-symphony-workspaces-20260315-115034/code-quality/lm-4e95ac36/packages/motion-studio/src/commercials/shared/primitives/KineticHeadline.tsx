/**
 * KineticHeadline - Large bold text with motion-based entrance/exit
 * 
 * Vox-style: Motion transitions (slide, scale, push), NEVER fade.
 * Typography IS the visual.
 * 
 * @example
 * <KineticHeadline
 *   text="Same logic in three places."
 *   entrance="slide-left"
 *   exit="push-up"
 *   startFrame={0}
 *   holdFrames={60}
 * />
 */
import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from 'remotion';
import { typography, colors } from '../../../styles';

type MotionType = 
  | 'slide-left' 
  | 'slide-right' 
  | 'slide-up' 
  | 'slide-down'
  | 'scale-up'
  | 'scale-down'
  | 'push-left'
  | 'push-right'
  | 'push-up'
  | 'push-down'
  | 'none';

interface KineticHeadlineProps {
  /** The text to display */
  text: string;
  
  /** How the text enters */
  entrance?: MotionType;
  
  /** How the text exits */
  exit?: MotionType;
  
  /** Frame when animation starts */
  startFrame?: number;
  
  /** Duration of entrance animation in frames */
  entranceDuration?: number;
  
  /** Frames to hold before exit */
  holdFrames?: number;
  
  /** Duration of exit animation in frames */
  exitDuration?: number;
  
  /** Text size: 'display' (huge), 'headline', 'subhead' */
  size?: 'display' | 'headline' | 'subhead' | 'body';
  
  /** Text color */
  color?: string;
  
  /** Font family override */
  fontFamily?: 'sans' | 'mono';
  
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  
  /** Subtext to show below main text */
  subtext?: string;
  
  /** Subtext entrance delay (frames after main text) */
  subtextDelay?: number;
}

const sizePresets = {
  display: {
    fontSize: '5rem',
    fontWeight: 700,
    lineHeight: 1.1,
  },
  headline: {
    fontSize: '3.5rem',
    fontWeight: 700,
    lineHeight: 1.2,
  },
  subhead: {
    fontSize: '2.25rem',
    fontWeight: 600,
    lineHeight: 1.3,
  },
  body: {
    fontSize: '1.5rem',
    fontWeight: 500,
    lineHeight: 1.5,
  },
};

/**
 * Calculate motion transform based on type and progress
 */
function getMotionTransform(
  type: MotionType,
  progress: number, // 0 = start state, 1 = end state
  isEntrance: boolean
): { transform: string; opacity: number } {
  // For entrance: progress 0→1 means appearing
  // For exit: progress 0→1 means disappearing
  const t = isEntrance ? progress : 1 - progress;
  
  switch (type) {
    case 'slide-left':
      return {
        transform: `translateX(${interpolate(t, [0, 1], [-100, 0])}%)`,
        opacity: 1,
      };
    case 'slide-right':
      return {
        transform: `translateX(${interpolate(t, [0, 1], [100, 0])}%)`,
        opacity: 1,
      };
    case 'slide-up':
      return {
        transform: `translateY(${interpolate(t, [0, 1], [50, 0])}%)`,
        opacity: 1,
      };
    case 'slide-down':
      return {
        transform: `translateY(${interpolate(t, [0, 1], [-50, 0])}%)`,
        opacity: 1,
      };
    case 'scale-up':
      return {
        transform: `scale(${interpolate(t, [0, 1], [0.5, 1])})`,
        opacity: 1,
      };
    case 'scale-down':
      return {
        transform: `scale(${interpolate(t, [0, 1], [1.5, 1])})`,
        opacity: 1,
      };
    case 'push-left':
      return {
        transform: `translateX(${interpolate(t, [0, 1], [-120, 0])}%)`,
        opacity: 1,
      };
    case 'push-right':
      return {
        transform: `translateX(${interpolate(t, [0, 1], [120, 0])}%)`,
        opacity: 1,
      };
    case 'push-up':
      return {
        transform: `translateY(${interpolate(t, [0, 1], [-120, 0])}%)`,
        opacity: 1,
      };
    case 'push-down':
      return {
        transform: `translateY(${interpolate(t, [0, 1], [120, 0])}%)`,
        opacity: 1,
      };
    case 'none':
    default:
      return {
        transform: 'none',
        opacity: 1,
      };
  }
}

export const KineticHeadline: React.FC<KineticHeadlineProps> = ({
  text,
  entrance = 'slide-left',
  exit = 'push-up',
  startFrame = 0,
  entranceDuration = 15,
  holdFrames = 60,
  exitDuration = 12,
  size = 'display',
  color = colors.neutral[50],
  fontFamily = 'sans',
  align = 'center',
  subtext,
  subtextDelay = 10,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const preset = sizePresets[size];
  const localFrame = frame - startFrame;
  
  // Timeline:
  // [0, entranceDuration] - entrance animation
  // [entranceDuration, entranceDuration + holdFrames] - hold
  // [entranceDuration + holdFrames, end] - exit animation
  
  const entranceEnd = entranceDuration;
  const holdEnd = entranceEnd + holdFrames;
  const exitEnd = holdEnd + exitDuration;
  
  let transform = 'none';
  let opacity = 1;
  
  if (localFrame < 0) {
    // Before start - hidden
    opacity = 0;
  } else if (localFrame < entranceEnd) {
    // Entrance phase
    const progress = spring({
      fps,
      frame: localFrame,
      config: {
        damping: 20,
        mass: 0.8,
        stiffness: 100,
      },
    });
    const motion = getMotionTransform(entrance, progress, true);
    transform = motion.transform;
    opacity = motion.opacity;
  } else if (localFrame < holdEnd) {
    // Hold phase - fully visible
    transform = 'none';
    opacity = 1;
  } else if (localFrame < exitEnd) {
    // Exit phase
    const exitProgress = (localFrame - holdEnd) / exitDuration;
    const easedProgress = Easing.inOut(Easing.ease)(exitProgress);
    const motion = getMotionTransform(exit, easedProgress, false);
    transform = motion.transform;
    opacity = motion.opacity;
  } else {
    // After exit - hidden
    opacity = 0;
  }
  
  // Subtext animation (delayed)
  const subtextLocalFrame = localFrame - subtextDelay;
  let subtextTransform = 'translateY(20px)';
  let subtextOpacity = 0;
  
  if (subtext && subtextLocalFrame >= 0 && subtextLocalFrame < entranceEnd + holdFrames - subtextDelay) {
    const subtextProgress = spring({
      fps,
      frame: subtextLocalFrame,
      config: {
        damping: 25,
        mass: 0.6,
        stiffness: 120,
      },
    });
    subtextTransform = `translateY(${interpolate(subtextProgress, [0, 1], [20, 0])}px) scale(${interpolate(subtextProgress, [0, 1], [0.8, 1])})`;
    subtextOpacity = subtextProgress;
  }
  
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
    justifyContent: 'center',
    textAlign: align,
  };
  
  const textStyle: React.CSSProperties = {
    fontFamily: fontFamily === 'mono' ? typography.fontFamily.mono : typography.fontFamily.sans,
    fontSize: preset.fontSize,
    fontWeight: preset.fontWeight,
    lineHeight: preset.lineHeight,
    color,
    textAlign: align,
    transform,
    opacity,
    maxWidth: '90%',
  };
  
  const subtextStyle: React.CSSProperties = {
    fontFamily: typography.fontFamily.mono,
    fontSize: '1.25rem',
    fontWeight: 500,
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
    color: colors.neutral[400],
    marginTop: '24px',
    transform: subtextTransform,
    opacity: subtextOpacity,
  };
  
  return (
    <div style={containerStyle}>
      <div style={textStyle}>{text}</div>
      {subtext && <div style={subtextStyle}>{subtext}</div>}
    </div>
  );
};

export default KineticHeadline;
