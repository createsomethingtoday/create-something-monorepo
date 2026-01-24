/**
 * KeyboardHint - Keyboard shortcut display
 * 
 * Shows a keyboard key with optional pressed state.
 * Always styled (no wireframe transition).
 */
import React from 'react';
import { interpolate } from 'remotion';
import { SPEC } from '../spec';
import { fontFamily } from '../../../fonts';

interface KeyboardHintProps {
  keyLabel: string;
  action?: string;
  isPressed: boolean;
  pressProgress?: number; // 0-1 for press animation
  color?: 'default' | 'success' | 'warning';
}

export const KeyboardHint: React.FC<KeyboardHintProps> = ({
  keyLabel,
  action,
  isPressed,
  pressProgress = 0,
  color = 'default',
}) => {
  const { colors, scale } = SPEC;
  
  // Press animation
  const scaleAnim = interpolate(pressProgress, [0, 0.3, 1], [1, 0.9, 1], { extrapolateRight: 'clamp' });
  const glowOpacity = interpolate(pressProgress, [0, 0.3, 1], [0, 0.8, 0], { extrapolateRight: 'clamp' });
  
  // Color based on action type
  const getGlowColor = () => {
    switch (color) {
      case 'success': return colors.success;
      case 'warning': return colors.warning;
      default: return colors.fgPrimary;
    }
  };
  
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8 * scale,
      }}
    >
      <div
        style={{
          position: 'relative',
          transform: `scale(${scaleAnim})`,
        }}
      >
        {/* Glow effect */}
        <div
          style={{
            position: 'absolute',
            inset: -4 * scale,
            borderRadius: 10 * scale,
            background: getGlowColor(),
            opacity: glowOpacity * 0.3,
            filter: `blur(${8 * scale}px)`,
          }}
        />
        
        {/* Key */}
        <div
          style={{
            minWidth: 32 * scale,
            height: 32 * scale,
            padding: `0 ${10 * scale}px`,
            borderRadius: 6 * scale,
            background: 'rgba(255, 255, 255, 0.1)',
            border: `${scale}px solid ${colors.borderDefault}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: fontFamily.mono,
            fontSize: 14 * scale,
            fontWeight: 500,
            color: colors.fgPrimary,
            boxShadow: isPressed 
              ? `0 0 ${12 * scale}px ${getGlowColor()}40`
              : `0 ${2 * scale}px ${4 * scale}px rgba(0, 0, 0, 0.3)`,
          }}
        >
          {keyLabel}
        </div>
      </div>
      
      {action && (
        <span
          style={{
            fontFamily: fontFamily.sans,
            fontSize: 12 * scale,
            color: colors.fgMuted,
          }}
        >
          {action}
        </span>
      )}
    </div>
  );
};

export default KeyboardHint;
