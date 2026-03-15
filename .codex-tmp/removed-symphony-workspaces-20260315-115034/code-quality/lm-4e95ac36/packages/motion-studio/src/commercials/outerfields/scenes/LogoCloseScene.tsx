/**
 * LogoCloseScene - Elegant logo reveal finale
 * 
 * Clean, brand-aligned reveal without particle explosion:
 * - Smooth mask wipe from center outward
 * - Soft orange glow that breathes
 * - Galaxy background intensifies
 * - Typography-focused (Space Grotesk)
 * 
 * Duration: 5 seconds (150 frames)
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { StarfieldBackground } from '../components/StarfieldBackground';
import { SPEC } from '../spec';

export const LogoCloseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { scenes, colors, fonts } = SPEC;
  const { logoClose } = scenes;
  
  const logoText = 'OUTERFIELDS';
  
  // Galaxy intensity ramp up
  const galaxyIntensity = interpolate(
    frame,
    [0, logoClose.logoRevealStart],
    [0.25, 0.5],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Logo reveal - spring-based for organic feel
  const revealSpring = spring({
    frame: Math.max(0, frame - logoClose.logoRevealStart),
    fps,
    config: { damping: 25, stiffness: 60, mass: 1 },
  });
  
  // Mask reveal from center outward (0 = hidden, 1 = fully visible)
  const revealProgress = interpolate(revealSpring, [0, 1], [0, 1]);
  
  // Logo scale - subtle grow as it reveals
  const logoScale = interpolate(revealProgress, [0, 1], [0.95, 1]);
  
  // Logo opacity
  const logoOpacity = interpolate(revealProgress, [0, 0.3, 1], [0, 0.8, 1]);
  
  // Glow breathing after reveal
  const glowBreath = frame > logoClose.glowPulseStart
    ? Math.sin((frame - logoClose.glowPulseStart) * 0.06) * 0.15 + 0.85
    : interpolate(revealProgress, [0, 1], [0, 0.85]);
  
  const glowIntensity = revealProgress * glowBreath;
  
  // Subtle vertical drift for organic feel
  const driftY = Math.sin(frame * 0.02) * 2;
  
  return (
    <AbsoluteFill style={{ backgroundColor: colors.spaceBlack, overflow: 'hidden' }}>
      {/* Intensifying starfield */}
      <StarfieldBackground
        fadeInStart={0}
        fadeInDuration={1}
        intensity={galaxyIntensity}
        showGalaxy={true}
        galaxyStart={0}
        showShootingStars={false}
        showNebula={true}
      />
      
      {/* Soft orange glow behind logo */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 900,
          height: 300,
          background: `radial-gradient(ellipse at center, 
            rgba(244, 81, 38, ${glowIntensity * 0.35}) 0%, 
            rgba(244, 81, 38, ${glowIntensity * 0.15}) 40%,
            transparent 70%
          )`,
          filter: 'blur(60px)',
          opacity: revealProgress,
        }}
      />
      
      {/* Secondary lavender accent glow */}
      <div
        style={{
          position: 'absolute',
          top: '48%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          height: 200,
          background: `radial-gradient(ellipse at center, 
            rgba(218, 191, 255, ${glowIntensity * 0.2}) 0%, 
            transparent 60%
          )`,
          filter: 'blur(40px)',
          opacity: revealProgress,
        }}
      />
      
      {/* Logo container */}
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Logo with center-outward mask reveal */}
        <div
          style={{
            position: 'relative',
            transform: `scale(${logoScale}) translateY(${driftY}px)`,
            opacity: logoOpacity,
          }}
        >
          {/* Mask container - reveals from center */}
          <div
            style={{
              position: 'relative',
              overflow: 'hidden',
              // Clip from center outward using clip-path
              clipPath: `inset(0 ${50 - revealProgress * 50}% 0 ${50 - revealProgress * 50}%)`,
            }}
          >
            <h1
              style={{
                fontSize: 100,
                fontWeight: 700,
                fontFamily: fonts.sansFallback,
                color: colors.snow,
                letterSpacing: '0.02em',
                margin: 0,
                whiteSpace: 'nowrap',
                textShadow: `
                  0 0 60px rgba(244, 81, 38, ${glowIntensity * 0.5}),
                  0 0 120px rgba(244, 81, 38, ${glowIntensity * 0.25})
                `,
              }}
            >
              {logoText}
            </h1>
          </div>
          
          {/* Subtle underline that grows with reveal */}
          <div
            style={{
              position: 'absolute',
              bottom: -20,
              left: '50%',
              transform: 'translateX(-50%)',
              height: 3,
              width: `${revealProgress * 60}%`,
              background: `linear-gradient(to right, 
                transparent, 
                ${colors.sun}80, 
                transparent
              )`,
              borderRadius: 2,
              opacity: glowIntensity,
            }}
          />
        </div>
      </AbsoluteFill>
      
      {/* Soft vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at center, 
            transparent 30%, 
            rgba(0, 0, 0, 0.5) 100%
          )`,
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

export default LogoCloseScene;
