/**
 * KineticText - Animated typography primitive
 * 
 * Supports both Vox-style reveals AND Canon-aligned reveals:
 * 
 * VOX STYLE:
 * - word-by-word: Words pop in with spring physics
 * - letter-by-letter: Characters reveal sequentially
 * - line-by-line: Lines reveal sequentially
 * 
 * CANON STYLE (Subtractive):
 * - unconcealment: Text emerges from noise (Heidegger - truth was always there)
 * - typewriter: Character-by-character with cursor (terminal-first)
 * - threshold: Binary snap, no animation (Rams - less, but better)
 * - decode: Random chars resolve to meaning (cipher → text)
 * - mask: Horizontal wipe reveal (text always present, just unveiled)
 * 
 * @example
 * <KineticText
 *   text="Creation is the discipline of removing what obscures."
 *   reveal="unconcealment"
 *   startFrame={0}
 *   style="headline"
 * />
 */
import React, { useMemo } from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
  random,
} from 'remotion';
import { colors, typography, animation } from '../styles';
import type { TextRevealStyle } from '../types';

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

// Characters for decode effect
const DECODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';

export const KineticText: React.FC<KineticTextProps> = ({
  text,
  reveal = 'word-by-word',
  startFrame = 0,
  duration = animation.frames.complex * 2,
  style = 'headline',
  fontSize,
  color = colors.neutral[50],
  accentColor = colors.neutral[400],
  highlightWords = [],
  align = 'center',
  useSpring: useSpringPhysics = true,
  className = '',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const preset = stylePresets[style];
  const effectiveFontSize = fontSize || preset.fontSize;
  
  // Check if this is a Canon-style reveal
  const isCanonStyle = ['unconcealment', 'typewriter', 'threshold', 'decode', 'mask'].includes(reveal);
  
  // ============================================
  // CANON STYLE REVEALS (Subtractive Philosophy)
  // ============================================
  
  if (isCanonStyle) {
    const localFrame = frame - startFrame;
    const progress = interpolate(localFrame, [0, duration], [0, 1], { 
      extrapolateLeft: 'clamp', 
      extrapolateRight: 'clamp' 
    });
    
    // UNCONCEALMENT: Text emerges from noise (Heidegger)
    if (reveal === 'unconcealment') {
      // Noise reduces as progress increases
      const noiseAmount = interpolate(progress, [0, 0.7, 1], [1, 0.3, 0]);
      const clarity = interpolate(progress, [0, 0.5, 1], [0, 0.5, 1]);
      
      return (
        <div
          className={className}
          style={{
            fontFamily: typography.fontFamily.sans,
            fontSize: effectiveFontSize,
            fontWeight: preset.fontWeight,
            lineHeight: preset.lineHeight,
            textAlign: align,
            position: 'relative',
          }}
        >
          {/* The actual text */}
          <span style={{ 
            opacity: clarity,
            filter: `blur(${noiseAmount * 4}px)`,
            color,
          }}>
            {text}
          </span>
          {/* Noise overlay that fades out */}
          {noiseAmount > 0.1 && (
            <span style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              opacity: noiseAmount * 0.5,
              color: colors.neutral[500],
              filter: 'blur(1px)',
              userSelect: 'none',
            }}>
              {text.split('').map((char, i) => 
                char === ' ' ? ' ' : DECODE_CHARS[Math.floor(random(`noise-${i}-${Math.floor(frame / 2)}`) * DECODE_CHARS.length)]
              ).join('')}
            </span>
          )}
        </div>
      );
    }
    
    // TYPEWRITER: Character-by-character with cursor (Terminal-first)
    if (reveal === 'typewriter') {
      const charsToShow = Math.floor(progress * text.length);
      const showCursor = frame % 30 < 15; // Blink every 0.5s at 30fps
      
      return (
        <div
          className={className}
          style={{
            fontFamily: typography.fontFamily.mono, // Monospace for terminal feel
            fontSize: effectiveFontSize,
            fontWeight: preset.fontWeight,
            lineHeight: preset.lineHeight,
            textAlign: align,
            color,
          }}
        >
          <span>{text.slice(0, charsToShow)}</span>
          <span style={{ 
            opacity: showCursor && charsToShow < text.length ? 1 : 0,
            color: colors.neutral[400],
          }}>▌</span>
        </div>
      );
    }
    
    // THRESHOLD: Binary snap - present or not (Rams - less, but better)
    if (reveal === 'threshold') {
      const isVisible = progress >= 0.5; // Snap at 50%
      
      return (
        <div
          className={className}
          style={{
            fontFamily: typography.fontFamily.sans,
            fontSize: effectiveFontSize,
            fontWeight: preset.fontWeight,
            lineHeight: preset.lineHeight,
            textAlign: align,
            opacity: isVisible ? 1 : 0,
            color,
          }}
        >
          {text}
        </div>
      );
    }
    
    // DECODE: Random characters resolve to meaning
    if (reveal === 'decode') {
      const resolvedChars = Math.floor(progress * text.length);
      
      const displayText = text.split('').map((char, i) => {
        if (char === ' ') return ' ';
        if (i < resolvedChars) return char;
        // Show random char that changes less frequently as we get closer
        const changeRate = Math.max(2, Math.floor((1 - progress) * 6));
        return DECODE_CHARS[Math.floor(random(`decode-${i}-${Math.floor(frame / changeRate)}`) * DECODE_CHARS.length)];
      }).join('');
      
      return (
        <div
          className={className}
          style={{
            fontFamily: typography.fontFamily.mono,
            fontSize: effectiveFontSize,
            fontWeight: preset.fontWeight,
            lineHeight: preset.lineHeight,
            textAlign: align,
            color,
            letterSpacing: typography.letterSpacing?.wide || '0.05em',
          }}
        >
          {displayText}
        </div>
      );
    }
    
    // MASK: Horizontal wipe reveal (text always present, just unveiled)
    if (reveal === 'mask') {
      const clipWidth = interpolate(progress, [0, 1], [0, 100]);
      
      return (
        <div
          className={className}
          style={{
            fontFamily: typography.fontFamily.sans,
            fontSize: effectiveFontSize,
            fontWeight: preset.fontWeight,
            lineHeight: preset.lineHeight,
            textAlign: align,
            color,
            clipPath: `inset(0 ${100 - clipWidth}% 0 0)`,
          }}
        >
          {text}
        </div>
      );
    }
  }
  
  // ============================================
  // VOX STYLE REVEALS (Motion-forward)
  // ============================================
  
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
