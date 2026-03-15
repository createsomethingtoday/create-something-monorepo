/**
 * VoxTreatment - Global adjustment layer for Vox analog feel
 * 
 * Applies the full Vox visual treatment stack:
 * - Warm background tint (no pure white/black)
 * - Film grain overlay
 * - Chromatic aberration (subtle)
 * - Vignette (guide eye to center)
 * - Posterize time (cutting on twos at 12fps)
 * 
 * Wrap your composition with this for authentic Vox aesthetic.
 * 
 * @example
 * <VoxTreatment posterizeFrameRate={12} grainIntensity={0.08}>
 *   <YourComposition />
 * </VoxTreatment>
 */
import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  AbsoluteFill,
  random,
} from 'remotion';
import { colors } from '../../../styles';

interface VoxTreatmentProps {
  children: React.ReactNode;
  
  /** Frame rate for posterize effect (12 = cutting on twos, 8 = cutting on threes) */
  posterizeFrameRate?: number;
  
  /** Grain intensity (0-1) */
  grainIntensity?: number;
  
  /** Vignette intensity (0-1) */
  vignetteIntensity?: number;
  
  /** Chromatic aberration amount in pixels */
  chromaticAberration?: number;
  
  /** Background tint color */
  backgroundTint?: string;
  
  /** Whether to apply film grain */
  showGrain?: boolean;
  
  /** Whether to apply vignette */
  showVignette?: boolean;
}

/**
 * Film Grain Overlay
 * Creates animated noise texture
 */
const FilmGrain: React.FC<{ intensity: number; frame: number }> = ({ intensity, frame }) => {
  // Generate pseudo-random grain pattern based on frame
  // Using canvas would be ideal but SVG filter works for Remotion
  const grainOpacity = intensity;
  
  return (
    <AbsoluteFill
      style={{
        mixBlendMode: 'overlay',
        opacity: grainOpacity,
        pointerEvents: 'none',
      }}
    >
      <svg width="100%" height="100%">
        <filter id={`grain-${frame}`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency={0.8}
            numOctaves={4}
            seed={frame}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect
          width="100%"
          height="100%"
          filter={`url(#grain-${frame})`}
        />
      </svg>
    </AbsoluteFill>
  );
};

/**
 * Vignette Overlay
 * Darkens edges, guides eye to center
 */
const Vignette: React.FC<{ intensity: number }> = ({ intensity }) => {
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(
          ellipse at center,
          transparent 0%,
          transparent 50%,
          rgba(0, 0, 0, ${intensity * 0.6}) 100%
        )`,
        pointerEvents: 'none',
      }}
    />
  );
};

/**
 * Chromatic Aberration Effect
 * Subtle RGB channel offset for analog feel
 * 
 * Note: True chromatic aberration would require WebGL.
 * This creates a subtle color fringe effect using CSS.
 */
const ChromaticAberration: React.FC<{ amount: number; children: React.ReactNode }> = ({ 
  amount, 
  children 
}) => {
  if (amount === 0) {
    return <>{children}</>;
  }
  
  // We'll use a subtle text-shadow approach for the effect
  // Real chromatic aberration would need shader-based rendering
  return (
    <AbsoluteFill
      style={{
        filter: `drop-shadow(${amount}px 0 0 rgba(255, 0, 0, 0.1)) drop-shadow(-${amount}px 0 0 rgba(0, 255, 255, 0.1))`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

export const VoxTreatment: React.FC<VoxTreatmentProps> = ({
  children,
  posterizeFrameRate = 12,
  grainIntensity = 0.06,
  vignetteIntensity = 0.25,
  chromaticAberration = 0.8,
  backgroundTint = '#0a0a0a', // Slightly warm black, not pure black
  showGrain = true,
  showVignette = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Posterize time - snap to lower frame rate
  // This creates the "cutting on twos" effect
  const posterizedFrame = Math.floor(frame / (fps / posterizeFrameRate)) * (fps / posterizeFrameRate);
  
  // Use posterized frame for grain animation
  const grainFrame = Math.floor(posterizedFrame);
  
  return (
    <AbsoluteFill style={{ backgroundColor: backgroundTint }}>
      {/* Main content with chromatic aberration */}
      <ChromaticAberration amount={chromaticAberration}>
        {children}
      </ChromaticAberration>
      
      {/* Film grain overlay */}
      {showGrain && <FilmGrain intensity={grainIntensity} frame={grainFrame} />}
      
      {/* Vignette overlay */}
      {showVignette && <Vignette intensity={vignetteIntensity} />}
    </AbsoluteFill>
  );
};

export default VoxTreatment;
