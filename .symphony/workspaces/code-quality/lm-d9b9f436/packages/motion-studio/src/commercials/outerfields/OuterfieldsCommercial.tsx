/**
 * OuterfieldsCommercial - 30-second "Show Don't Tell" video
 * 
 * Clean, focused, story-driven - like Ground commercial.
 * No distracting space visuals. The product speaks.
 * 
 * Story:
 * 1. Cards (0-8s) - Your content library
 * 2. Player (8-16s) - Video player opens
 * 3. Heatmap (16-24s) - Engagement data builds (HERO)
 * 4. Stats (24-28s) - Dashboard glimpse
 * 5. Logo (28-30s) - Clean reveal
 */
import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from 'remotion';
import { VoxTreatment } from '../shared/primitives';
import {
  CardsScene,
  PlayerScene,
  HeatmapScene,
  StatsScene,
  LogoScene,
} from './scenes';
import { SPEC } from './spec';

export const OuterfieldsCommercial: React.FC = () => {
  const frame = useCurrentFrame();
  const { scenes, voxTreatment, colors } = SPEC;
  
  // Simple crossfade using global frame
  const getSceneOpacity = (sceneStart: number, sceneDuration: number, fadeIn = 15, fadeOut = 15) => {
    const sceneEnd = sceneStart + sceneDuration;
    
    // Not yet started
    if (frame < sceneStart) return 0;
    // Already ended
    if (frame > sceneEnd) return 0;
    
    const fadeInOpacity = fadeIn > 0
      ? interpolate(
          frame,
          [sceneStart, sceneStart + fadeIn],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        )
      : 1;
    
    const fadeOutOpacity = fadeOut > 0
      ? interpolate(
          frame,
          [sceneEnd - fadeOut, sceneEnd],
          [1, 0],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        )
      : 1;
    
    return Math.min(fadeInOpacity, fadeOutOpacity);
  };
  
  return (
    <VoxTreatment
      posterizeFrameRate={voxTreatment.posterizeFrameRate}
      grainIntensity={voxTreatment.grainIntensity}
      vignetteIntensity={voxTreatment.vignetteIntensity}
      chromaticAberration={voxTreatment.chromaticAberration}
      backgroundTint={voxTreatment.backgroundTint}
    >
      {/* Base background */}
      <AbsoluteFill style={{ backgroundColor: colors.spaceBlack }} />
      
      {/* Scene 1: Cards (0-8s) */}
      <Sequence
        from={scenes.cards.start}
        durationInFrames={scenes.cards.duration}
        name="Cards"
      >
        <AbsoluteFill
          style={{
            opacity: getSceneOpacity(scenes.cards.start, scenes.cards.duration, 0, 20),
          }}
        >
          <CardsScene />
        </AbsoluteFill>
      </Sequence>
      
      {/* Scene 2: Player (8-16s) */}
      <Sequence
        from={scenes.player.start}
        durationInFrames={scenes.player.duration}
        name="Player"
      >
        <AbsoluteFill
          style={{
            opacity: getSceneOpacity(scenes.player.start, scenes.player.duration, 20, 20),
          }}
        >
          <PlayerScene />
        </AbsoluteFill>
      </Sequence>
      
      {/* Scene 3: Heatmap (16-24s) - HERO */}
      <Sequence
        from={scenes.heatmap.start}
        durationInFrames={scenes.heatmap.duration}
        name="Heatmap"
      >
        <AbsoluteFill
          style={{
            opacity: getSceneOpacity(scenes.heatmap.start, scenes.heatmap.duration, 20, 20),
          }}
        >
          <HeatmapScene />
        </AbsoluteFill>
      </Sequence>
      
      {/* Scene 4: Stats (24-28s) */}
      <Sequence
        from={scenes.stats.start}
        durationInFrames={scenes.stats.duration}
        name="Stats"
      >
        <AbsoluteFill
          style={{
            opacity: getSceneOpacity(scenes.stats.start, scenes.stats.duration, 15, 15),
          }}
        >
          <StatsScene />
        </AbsoluteFill>
      </Sequence>
      
      {/* Scene 5: Logo (28-30s) */}
      <Sequence
        from={scenes.logo.start}
        durationInFrames={scenes.logo.duration}
        name="Logo"
      >
        <AbsoluteFill
          style={{
            opacity: getSceneOpacity(scenes.logo.start, scenes.logo.duration, 15, 0),
          }}
        >
          <LogoScene />
        </AbsoluteFill>
      </Sequence>
    </VoxTreatment>
  );
};

export const OUTERFIELDS_COMMERCIAL_CONFIG = {
  id: 'OuterfieldsCommercial',
  component: OuterfieldsCommercial,
  durationInFrames: SPEC.durationInFrames,
  fps: SPEC.fps,
  width: SPEC.width,
  height: SPEC.height,
};

export default OuterfieldsCommercial;
