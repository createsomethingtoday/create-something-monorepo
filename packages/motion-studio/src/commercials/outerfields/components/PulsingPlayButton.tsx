/**
 * PulsingPlayButton - Cinematic glassmorphism play button
 * 
 * Enhanced with:
 * - Multiple ripple rings expanding outward
 * - Glow that breathes with the pulse
 * - Smooth spring-based entrance
 * - Inner light that intensifies
 */
import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { Play } from 'lucide-react';
import { SPEC } from '../spec';

interface PulsingPlayButtonProps {
  appearFrame?: number;
  size?: number;
  showPulse?: boolean;
  glowColor?: string;
}

export const PulsingPlayButton: React.FC<PulsingPlayButtonProps> = ({
  appearFrame = 0,
  size = 80,
  showPulse = true,
  glowColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colors } = SPEC;
  
  const actualGlowColor = glowColor || colors.lavender;
  
  // Spring-based entrance with overshoot
  const entranceProgress = spring({
    frame: Math.max(0, frame - appearFrame),
    fps,
    config: {
      damping: 12,
      stiffness: 100,
      mass: 0.8,
    },
  });
  
  const scale = interpolate(entranceProgress, [0, 1], [0.3, 1]);
  const opacity = interpolate(entranceProgress, [0, 1], [0, 1]);
  const rotation = interpolate(entranceProgress, [0, 1], [-20, 0]);
  
  // Multiple pulse phases for layered ripples
  const time = (frame - appearFrame) / fps;
  const pulse1 = (time * 0.8) % 1;
  const pulse2 = ((time * 0.8) + 0.33) % 1;
  const pulse3 = ((time * 0.8) + 0.66) % 1;
  
  // Breathing glow
  const breathe = Math.sin(time * Math.PI * 1.5) * 0.5 + 0.5;
  const glowIntensity = 0.3 + breathe * 0.3;
  
  // Inner light pulse
  const innerGlow = 0.15 + breathe * 0.1;
  
  if (frame < appearFrame) {
    return null;
  }
  
  const renderRipple = (phase: number, index: number) => {
    const rippleScale = 1 + phase * 0.6;
    const rippleOpacity = Math.max(0, 1 - phase) * 0.4;
    
    return (
      <div
        key={index}
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: '50%',
          border: `1px solid ${actualGlowColor}`,
          opacity: showPulse ? rippleOpacity * entranceProgress : 0,
          transform: `scale(${rippleScale})`,
        }}
      />
    );
  };
  
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size * 2,
        height: size * 2,
      }}
    >
      {/* Outer glow */}
      <div
        style={{
          position: 'absolute',
          width: size * 1.5,
          height: size * 1.5,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${actualGlowColor}40, transparent 70%)`,
          opacity: glowIntensity * entranceProgress,
          filter: 'blur(20px)',
        }}
      />
      
      {/* Ripple rings */}
      {showPulse && (
        <>
          {renderRipple(pulse1, 0)}
          {renderRipple(pulse2, 1)}
          {renderRipple(pulse3, 2)}
        </>
      )}
      
      {/* Main button */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `radial-gradient(circle at 30% 30%, 
            rgba(255, 255, 255, ${innerGlow}), 
            ${colors.glass} 50%,
            rgba(0, 0, 0, 0.2) 100%
          )`,
          border: `2px solid rgba(255, 255, 255, ${0.2 + breathe * 0.15})`,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          color: colors.snow,
          transform: `scale(${scale}) rotate(${rotation}deg)`,
          opacity,
          boxShadow: `
            0 0 ${20 + breathe * 20}px rgba(218, 191, 255, ${glowIntensity * 0.5}),
            inset 0 0 20px rgba(255, 255, 255, ${innerGlow * 0.5})
          `,
        }}
      >
        <Play 
          size={size * 0.4} 
          fill={colors.snow}
          style={{ 
            marginLeft: size * 0.06,
            filter: `drop-shadow(0 0 8px rgba(255, 255, 255, ${0.3 + breathe * 0.3}))`,
          }}
        />
      </div>
    </div>
  );
};

export default PulsingPlayButton;
