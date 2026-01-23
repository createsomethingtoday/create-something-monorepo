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
  const { colors } = SPEC;
  
  // Press animation
  const scale = interpolate(pressProgress, [0, 0.3, 1], [1, 0.9, 1], { extrapolateRight: 'clamp' });
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
        gap: 8,
      }}
    >
      <div
        style={{
          position: 'relative',
          transform: `scale(${scale})`,
        }}
      >
        {/* Glow effect */}
        <div
          style={{
            position: 'absolute',
            inset: -4,
            borderRadius: 10,
            background: getGlowColor(),
            opacity: glowOpacity * 0.3,
            filter: 'blur(8px)',
          }}
        />
        
        {/* Key */}
        <div
          style={{
            minWidth: 32,
            height: 32,
            padding: '0 10px',
            borderRadius: 6,
            background: 'rgba(255, 255, 255, 0.1)',
            border: `1px solid ${colors.borderDefault}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: fontFamily.mono,
            fontSize: 14,
            fontWeight: 500,
            color: colors.fgPrimary,
            boxShadow: isPressed 
              ? `0 0 12px ${getGlowColor()}40`
              : '0 2px 4px rgba(0, 0, 0, 0.3)',
          }}
        >
          {keyLabel}
        </div>
      </div>
      
      {action && (
        <span
          style={{
            fontFamily: fontFamily.sans,
            fontSize: 12,
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
