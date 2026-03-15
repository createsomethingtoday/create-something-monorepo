/**
 * SpaceOpeningScene - Cinematic galaxy opening
 * 
 * Enhanced with:
 * - Dramatic camera zoom-out effect
 * - Layered parallax starfield with nebulas
 * - Shooting stars
 * - Smooth galaxy formation
 * - Centered pulsing play button with glow
 * 
 * Duration: 5 seconds (150 frames)
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { StarfieldBackground } from '../components/StarfieldBackground';
import { PulsingPlayButton } from '../components/PulsingPlayButton';
import { SPEC } from '../spec';

export const SpaceOpeningScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { scenes, colors } = SPEC;
  const { spaceOpening } = scenes;
  
  // Camera zoom out effect (starts zoomed in, pulls back)
  const zoomProgress = spring({
    frame,
    fps,
    config: { damping: 40, stiffness: 30, mass: 2 },
  });
  
  const zoom = interpolate(zoomProgress, [0, 1], [1.3, 1]);
  
  // Subtle camera drift
  const driftX = Math.sin(frame * 0.01) * 10;
  const driftY = Math.cos(frame * 0.008) * 5;
  
  // Play button entrance timing
  const playButtonVisible = frame >= spaceOpening.playButtonAppear;
  
  // Scene title fade (subtle "OUTERFIELDS" hint in the stars - actually just ambient glow)
  const titleHint = interpolate(
    frame,
    [spaceOpening.playButtonAppear + 10, spaceOpening.playButtonAppear + 40],
    [0, 0.15],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  return (
    <AbsoluteFill style={{ backgroundColor: colors.spaceBlack, overflow: 'hidden' }}>
      {/* Animated starfield layer with zoom and drift */}
      <div
        style={{
          position: 'absolute',
          inset: -100, // Extra space for zoom
          transform: `scale(${zoom}) translate(${driftX}px, ${driftY}px)`,
          transformOrigin: 'center center',
        }}
      >
        <StarfieldBackground
          fadeInStart={0}
          fadeInDuration={spaceOpening.starfieldFadeIn}
          showGalaxy={true}
          galaxyStart={spaceOpening.galaxyFormation}
          intensity={1}
          showShootingStars={true}
          showNebula={true}
        />
      </div>
      
      {/* Central title glow (subtle brand presence before play button) */}
      <div
        style={{
          position: 'absolute',
          top: '45%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          height: 200,
          background: `radial-gradient(ellipse at center, 
            rgba(244, 81, 38, ${titleHint}) 0%,
            transparent 60%
          )`,
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />
      
      {/* Centered pulsing play button */}
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: '8%',
        }}
      >
        {playButtonVisible && (
          <PulsingPlayButton
            appearFrame={spaceOpening.playButtonAppear}
            size={100}
            showPulse={true}
            glowColor={colors.lavender}
          />
        )}
      </AbsoluteFill>
      
      {/* Bottom gradient (prepares for transition to next scene) */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '20%',
          background: `linear-gradient(to top, ${colors.spaceBlack}, transparent)`,
          opacity: interpolate(frame, [120, 150], [0, 0.8], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}
      />
    </AbsoluteFill>
  );
};

export default SpaceOpeningScene;
