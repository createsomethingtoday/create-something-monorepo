/**
 * Terminal - Animated terminal window with typing effect
 * 
 * The core visual for showing Ground in action.
 * Features:
 * - Realistic typing animation
 * - Calm, steady cursor (no jittery blinking)
 * - Line-by-line output reveal
 * - Color-coded output (success green, error red)
 */
import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { SPEC } from '../spec';

interface TerminalLine {
  text: string;
  type?: 'command' | 'output' | 'error' | 'success' | 'dim';
  delay?: number; // Additional delay before this line appears
}

interface TerminalProps {
  /** Lines to display */
  lines: TerminalLine[];
  
  /** Frame when terminal starts animating */
  startFrame?: number;
  
  /** Whether to show typing animation for commands */
  typeCommands?: boolean;
  
  /** Typing speed (chars per frame) */
  typingSpeed?: number;
  
  /** Frames between each output line */
  outputStagger?: number;
  
  /** Prompt character */
  prompt?: string;
  
  /** Whether terminal window is visible */
  visible?: boolean;
  
  /** Show trailing prompt after all lines complete */
  showTrailingPrompt?: boolean;
}

export const Terminal: React.FC<TerminalProps> = ({
  lines,
  startFrame = 0,
  typeCommands = true,
  typingSpeed = 2,
  outputStagger = 8,
  prompt = '$',
  visible = true,
  showTrailingPrompt = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = frame - startFrame;
  const style = SPEC.terminalStyle;
  
  if (!visible || localFrame < 0) {
    return null;
  }
  
  // Terminal entrance animation
  const entranceProgress = spring({
    fps,
    frame: localFrame,
    config: {
      damping: 20,
      mass: 0.8,
      stiffness: 100,
    },
  });
  
  const terminalOpacity = interpolate(entranceProgress, [0, 1], [0, 1]);
  const terminalScale = interpolate(entranceProgress, [0, 1], [0.95, 1]);
  
  // Calculate which lines are visible and how much of each
  let currentOffset = 0;
  const lineStates = lines.map((line, index) => {
    const lineDelay = line.delay || 0;
    const lineStart = currentOffset + lineDelay;
    
    if (line.type === 'command' && typeCommands) {
      // Typing animation for commands
      const typingDuration = Math.ceil(line.text.length / typingSpeed);
      const lineLocalFrame = localFrame - lineStart;
      const charsToShow = Math.max(0, Math.floor(lineLocalFrame * typingSpeed));
      const displayText = line.text.slice(0, Math.min(charsToShow, line.text.length));
      const isTyping = lineLocalFrame >= 0 && charsToShow < line.text.length;
      const isDone = charsToShow >= line.text.length;
      
      currentOffset = lineStart + typingDuration + 10; // Small pause after typing
      
      return {
        ...line,
        displayText,
        visible: lineLocalFrame >= 0,
        isTyping,
        isDone,
      };
    } else {
      // Instant reveal for output lines
      const lineLocalFrame = localFrame - lineStart;
      currentOffset = lineStart + outputStagger;
      
      return {
        ...line,
        displayText: line.text,
        visible: lineLocalFrame >= 0,
        isTyping: false,
        isDone: true,
      };
    }
  });
  
  // Find the active typing line (for cursor placement)
  const activeTypingIndex = lineStates.findIndex(l => l.isTyping);
  const allDone = lineStates.every(l => l.isDone);
  
  const getLineColor = (type?: string) => {
    switch (type) {
      case 'error': return style.errorColor;
      case 'success': return style.successColor;
      case 'dim': return style.dimColor;
      case 'command': return style.textColor;
      default: return style.textColor;
    }
  };
  
  // Cursor style - steady bar, like WezTerm SteadyBar
  const cursorStyle: React.CSSProperties = {
    backgroundColor: style.textColor,
    width: '2px',
    height: '1.1em',
    display: 'inline-block',
    marginLeft: '1px',
  };
  
  return (
    <div
      style={{
        backgroundColor: style.backgroundColor,
        padding: style.padding,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        opacity: terminalOpacity,
        transform: `scale(${terminalScale})`,
        maxWidth: '80%',
        minWidth: '60%',
      }}
    >
      {/* Terminal content - no decoration, just the work */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {lineStates.map((line, index) => {
          if (!line.visible) return null;
          
          const isCommand = line.type === 'command';
          const showCursor = index === activeTypingIndex;
          
          return (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                color: getLineColor(line.type),
                whiteSpace: 'pre-wrap',
              }}
            >
              {isCommand && (
                <span style={{ color: style.promptColor, marginRight: '12px' }}>
                  {prompt}
                </span>
              )}
              <span>{line.displayText}</span>
              {showCursor && <span style={cursorStyle} />}
            </div>
          );
        })}
        
        {/* Trailing prompt after all lines done */}
        {showTrailingPrompt && allDone && lineStates.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ color: style.promptColor, marginRight: '12px' }}>
              {prompt}
            </span>
            <span style={cursorStyle} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Terminal;
