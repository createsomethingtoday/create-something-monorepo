/**
 * ProgressiveErasure - Text that reveals through removal
 * 
 * Port of the text-revelation experiment. The medium embodies the message.
 * Words strike through, then collapse inward. Final state: only essential words remain.
 * 
 * "Show, don't tell" - the animation IS subtraction.
 * 
 * @example
 * <ProgressiveErasure
 *   text="We help businesses identify operational inefficiencies and implement solutions that remove what obscures."
 *   keepWords={["We", "remove", "what", "obscures"]}
 *   startFrame={0}
 * />
 */
import React, { useMemo } from 'react';
import {
  useCurrentFrame,
  interpolate,
  Easing,
} from 'remotion';
import { typography, colors } from '../../../styles';

interface ProgressiveErasureProps {
  /** The full text to process */
  text: string;

  /** Words to keep (everything else gets erased) */
  keepWords: readonly string[];
  
  /** Frame when animation starts */
  startFrame?: number;
  
  /** Total duration of the erasure animation */
  duration?: number;
  
  /** Frames to hold on final state */
  holdFrames?: number;
  
  /** Text color */
  color?: string;
  
  /** Strikethrough color */
  strikeColor?: string;
  
  /** Font size */
  fontSize?: string;
}

interface WordState {
  word: string;
  keep: boolean;
  strikeProgress: number; // 0 = no strike, 1 = full strike
  collapseProgress: number; // 0 = full width, 1 = collapsed
  opacity: number;
}

export const ProgressiveErasure: React.FC<ProgressiveErasureProps> = ({
  text,
  keepWords,
  startFrame = 0,
  duration = 90, // 3 seconds at 30fps
  holdFrames = 60,
  color = colors.neutral[50],
  strikeColor = colors.neutral[500],
  fontSize = '2.5rem',
}) => {
  const frame = useCurrentFrame();
  const localFrame = frame - startFrame;
  
  // Parse text into words with keep/remove status
  const words = useMemo(() => {
    const wordArray = text.split(/(\s+)/); // Keep whitespace
    return wordArray.map(word => {
      const trimmed = word.trim();
      const isWhitespace = trimmed === '';
      const keep = isWhitespace || keepWords.some(
        kw => trimmed.toLowerCase() === kw.toLowerCase() ||
              trimmed.toLowerCase().startsWith(kw.toLowerCase()) ||
              trimmed.toLowerCase().endsWith(kw.toLowerCase())
      );
      return { word, keep, isWhitespace };
    });
  }, [text, keepWords]);
  
  // Count non-kept words for staggered timing
  const nonKeptWords = words.filter(w => !w.keep && !w.isWhitespace);
  const totalNonKept = nonKeptWords.length;
  
  // Animation phases:
  // Phase 1 (0-40%): Strikethrough appears on words to remove
  // Phase 2 (40-70%): Struck words collapse
  // Phase 3 (70-100%): Final arrangement settles
  
  const progress = interpolate(
    localFrame,
    [0, duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Calculate state for each word
  const wordStates: WordState[] = words.map((wordInfo, index) => {
    if (wordInfo.isWhitespace) {
      // Whitespace collapses with adjacent removed words
      const prevWord = words[index - 1];
      const nextWord = words[index + 1];
      const shouldCollapse = 
        (prevWord && !prevWord.keep && !prevWord.isWhitespace) ||
        (nextWord && !nextWord.keep && !nextWord.isWhitespace);
      
      return {
        word: wordInfo.word,
        keep: !shouldCollapse,
        strikeProgress: 0,
        collapseProgress: shouldCollapse ? interpolate(progress, [0.4, 0.7], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0,
        opacity: 1,
      };
    }
    
    if (wordInfo.keep) {
      return {
        word: wordInfo.word,
        keep: true,
        strikeProgress: 0,
        collapseProgress: 0,
        opacity: 1,
      };
    }
    
    // Calculate staggered timing for this word
    const wordIndex = nonKeptWords.findIndex(w => w.word === wordInfo.word);
    const staggerOffset = wordIndex / totalNonKept;
    
    // Strikethrough timing (staggered)
    const strikeStart = 0 + staggerOffset * 0.2;
    const strikeEnd = 0.3 + staggerOffset * 0.2;
    const strikeProgress = interpolate(
      progress,
      [strikeStart, strikeEnd],
      [0, 1],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    // Collapse timing (after strikethrough)
    const collapseStart = 0.4;
    const collapseEnd = 0.7;
    const collapseProgress = interpolate(
      progress,
      [collapseStart, collapseEnd],
      [0, 1],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    // Opacity fades as collapse happens
    const opacity = interpolate(
      progress,
      [0.35, 0.5],
      [1, 0.3],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    
    return {
      word: wordInfo.word,
      keep: false,
      strikeProgress,
      collapseProgress,
      opacity,
    };
  });
  
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: '80%',
    margin: '0 auto',
    fontFamily: typography.fontFamily.sans,
    fontSize,
    fontWeight: 500,
    lineHeight: 1.6,
    color,
  };
  
  return (
    <div style={containerStyle}>
      {wordStates.map((state, index) => {
        const isWhitespace = state.word.trim() === '';
        
        if (isWhitespace) {
          // Whitespace that should collapse
          const width = state.collapseProgress > 0 
            ? `${interpolate(state.collapseProgress, [0, 1], [100, 0])}%`
            : 'auto';
          return (
            <span 
              key={index} 
              style={{ 
                display: 'inline-block',
                width: state.collapseProgress > 0 ? width : 'auto',
                overflow: 'hidden',
              }}
            >
              {state.collapseProgress < 1 ? ' ' : ''}
            </span>
          );
        }
        
        const wordStyle: React.CSSProperties = {
          display: 'inline-block',
          position: 'relative',
          opacity: state.keep ? 1 : state.opacity,
          maxWidth: state.keep ? 'none' : `${interpolate(state.collapseProgress, [0, 1], [100, 0])}%`,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          transition: 'none', // We control all animation via interpolate
        };
        
        const strikeStyle: React.CSSProperties = {
          position: 'absolute',
          top: '50%',
          left: 0,
          width: `${state.strikeProgress * 100}%`,
          height: '2px',
          backgroundColor: strikeColor,
          transform: 'translateY(-50%)',
        };
        
        return (
          <span key={index} style={wordStyle}>
            {state.word}
            {!state.keep && state.strikeProgress > 0 && (
              <span style={strikeStyle} />
            )}
          </span>
        );
      })}
    </div>
  );
};

export default ProgressiveErasure;
