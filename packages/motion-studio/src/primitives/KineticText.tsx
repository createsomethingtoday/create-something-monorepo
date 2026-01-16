/**
 * KineticText - Animated typography primitive
 * 
 * The signature Vox move: text that reveals with purpose.
 * Word-by-word, letter-by-letter, or full reveals.
 * 
 * @example
 * <KineticText
 *   text="The Subtractive Triad"
 *   reveal="word-by-word"
 *   startFrame={0}
 *   style="headline"
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
import { colors, typography, animation, getEasing } from '../styles/index.js';
import type { TextRevealStyle } from '../types.js';

interface KineticTextProps {
  /** The text to animate */
  text: string;
  
  /** How the text reveals */
  reveal?: TextRevealStyle;
  
  /** Frame when animation starts */
  startFrame?: number;
  
  /** Duration of the full reveal in frames */
  duration?: number;
  
  /** Text style preset */
  style?: 'headline' | 'subhead' | 'body' | 'caption' | 'display';
  
  /** Custom font size override */
  fontSize?: string | number;
  
  /** Text color */
  color?: string;
  
  /** Accent color for highlights */
  accentColor?: string;
  
  /** Words to highlight with accent color */
  highlightWords?: string[];
  
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  
  /** Whether to use spring physics */
  useSpring?: boolean;
  
  /** Custom className */
  className?: string;
}

const stylePresets = {
  display: {
    fontSize: typography.fontSize['7xl'],
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.lineHeight.tight,
  },
  headline: {
    fontSize: typography.fontSize['5xl'],
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.lineHeight.tight,
  },
  subhead: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.snug,
  },
  body: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.normal,
    lineHeight: typography.lineHeight.normal,
  },
  caption: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.normal,
  },
};

export const KineticText: React.FC<KineticTextProps> = ({
  text,
  reveal = 'word-by-word',
  startFrame = 0,
  duration = animation.frames.complex * 2,
  style = 'headline',
  fontSize,
  color = colors.neutral[50],
  accentColor = colors.vox.accent,
  highlightWords = [],
  align = 'center',
  useSpring: useSpringPhysics = true,
  className = '',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const preset = stylePresets[style];
  const effectiveFontSize = fontSize || preset.fontSize;
  
  // Split text based on reveal style
  const units = reveal === 'letter-by-letter' 
    ? text.split('')
    : reveal === 'line-by-line'
    ? text.split('\n')
    : text.split(' ');
  
  // Calculate stagger delay per unit
  const staggerDelay = duration / units.length;
  
  const renderUnit = (unit: string, index: number) => {
    const unitStartFrame = startFrame + (index * staggerDelay);
    const localFrame = frame - unitStartFrame;
    
    // Calculate opacity and transform
    let opacity: number;
    let translateY: number;
    let scale: number;
    
    if (useSpringPhysics) {
      const springConfig = {
        fps,
        frame: localFrame,
        config: {
          damping: 15,
          mass: 0.5,
          stiffness: 100,
        },
      };
      
      const progress = spring(springConfig);
      opacity = progress;
      translateY = interpolate(progress, [0, 1], [20, 0]);
      scale = interpolate(progress, [0, 1], [0.9, 1]);
    } else {
      const progress = interpolate(
        localFrame,
        [0, animation.frames.standard],
        [0, 1],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
      );
      
      opacity = progress;
      translateY = interpolate(progress, [0, 1], [20, 0]);
      scale = interpolate(progress, [0, 1], [0.95, 1]);
    }
    
    // Check if this word should be highlighted
    const isHighlighted = highlightWords.some(
      hw => unit.toLowerCase().includes(hw.toLowerCase())
    );
    
    const unitColor = isHighlighted ? accentColor : color;
    
    // Add space after each unit (except for letters and last unit)
    const separator = reveal === 'letter-by-letter' ? '' : ' ';
    
    return (
      <span
        key={index}
        style={{
          display: 'inline-block',
          opacity: Math.max(0, opacity),
          transform: `translateY(${translateY}px) scale(${scale})`,
          color: unitColor,
          marginRight: reveal === 'word-by-word' ? '0.25em' : 0,
          whiteSpace: reveal === 'line-by-line' ? 'pre-wrap' : 'nowrap',
        }}
      >
        {unit}
        {reveal === 'line-by-line' && index < units.length - 1 && <br />}
      </span>
    );
  };
  
  return (
    <div
      className={className}
      style={{
        fontFamily: typography.fontFamily.sans,
        fontSize: effectiveFontSize,
        fontWeight: preset.fontWeight,
        lineHeight: preset.lineHeight,
        textAlign: align,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
        gap: reveal === 'line-by-line' ? '0.5em' : 0,
      }}
    >
      {units.map(renderUnit)}
    </div>
  );
};
