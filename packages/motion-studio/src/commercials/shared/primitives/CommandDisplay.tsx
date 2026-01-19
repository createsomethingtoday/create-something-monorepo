/**
 * CommandDisplay - Terminal commands as kinetic typography
 * 
 * Large monospace text for showing installation/usage commands.
 * Used in CTA section of commercials.
 * 
 * @example
 * <CommandDisplay
 *   commands={[
 *     "npm install -g @google/gemini-cli",
 *     "gemini extensions install @createsomething/seeing",
 *     "/lesson what-is-creation"
 *   ]}
 *   startFrame={0}
 * />
 */
import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { typography, colors } from '../../../styles';

interface CommandDisplayProps {
  /** Commands to display */
  commands: readonly string[];
  
  /** Frame when animation starts */
  startFrame?: number;
  
  /** Frames between each command appearing */
  staggerDelay?: number;
  
  /** Whether to show typing animation */
  typeAnimation?: boolean;
  
  /** Typing speed (chars per frame) */
  typingSpeed?: number;
  
  /** Prompt character */
  prompt?: string;
  
  /** Text color */
  color?: string;
  
  /** Prompt color */
  promptColor?: string;
  
  /** Font size */
  fontSize?: string;
  
  /** Entrance animation type */
  entrance?: 'slide-up' | 'slide-left' | 'scale' | 'none';
}

export const CommandDisplay: React.FC<CommandDisplayProps> = ({
  commands,
  startFrame = 0,
  staggerDelay = 25,
  typeAnimation = false,
  typingSpeed = 2,
  prompt = '$',
  color = colors.neutral[50],
  promptColor = colors.neutral[500],
  fontSize = '2rem',
  entrance = 'slide-up',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = frame - startFrame;
  
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '16px',
    padding: '40px 60px',
    backgroundColor: `${colors.neutral[950]}ee`,
    borderRadius: '12px',
    border: `1px solid ${colors.neutral[800]}`,
    maxWidth: '90%',
  };
  
  return (
    <div style={containerStyle}>
      {commands.map((command, index) => {
        const commandStartFrame = index * staggerDelay;
        const commandLocalFrame = localFrame - commandStartFrame;
        
        // Calculate entrance animation
        let transform = 'none';
        let opacity = 1;
        
        if (commandLocalFrame < 0) {
          opacity = 0;
        } else {
          const progress = spring({
            fps,
            frame: commandLocalFrame,
            config: {
              damping: 20,
              mass: 0.6,
              stiffness: 120,
            },
          });
          
          switch (entrance) {
            case 'slide-up':
              transform = `translateY(${interpolate(progress, [0, 1], [30, 0])}px)`;
              opacity = progress;
              break;
            case 'slide-left':
              transform = `translateX(${interpolate(progress, [0, 1], [50, 0])}px)`;
              opacity = progress;
              break;
            case 'scale':
              transform = `scale(${interpolate(progress, [0, 1], [0.9, 1])})`;
              opacity = progress;
              break;
            case 'none':
            default:
              opacity = commandLocalFrame >= 0 ? 1 : 0;
          }
        }
        
        // Calculate typing animation if enabled
        let displayCommand = command;
        let showCursor = false;
        
        if (typeAnimation && commandLocalFrame >= 0) {
          const charsToShow = Math.floor(commandLocalFrame * typingSpeed);
          if (charsToShow < command.length) {
            displayCommand = command.slice(0, charsToShow);
            showCursor = Math.floor(frame / 15) % 2 === 0; // Blink cursor
          }
        }
        
        const lineStyle: React.CSSProperties = {
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontFamily: typography.fontFamily.mono,
          fontSize,
          fontWeight: 500,
          transform,
          opacity: Math.max(0, opacity),
        };
        
        const promptStyle: React.CSSProperties = {
          color: promptColor,
          userSelect: 'none',
        };
        
        const commandStyle: React.CSSProperties = {
          color,
        };
        
        const cursorStyle: React.CSSProperties = {
          color: promptColor,
          opacity: showCursor ? 1 : 0,
        };
        
        return (
          <div key={index} style={lineStyle}>
            <span style={promptStyle}>{prompt}</span>
            <span style={commandStyle}>{displayCommand}</span>
            {typeAnimation && showCursor && <span style={cursorStyle}>▌</span>}
          </div>
        );
      })}
    </div>
  );
};

export default CommandDisplay;
