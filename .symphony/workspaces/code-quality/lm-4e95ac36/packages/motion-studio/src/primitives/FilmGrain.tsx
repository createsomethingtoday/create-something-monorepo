/**
 * FilmGrain - Texture overlay for warmth
 * 
 * "Texture overlays (noise, film grain, retro effects) soften digital precision."
 * The Vox touch that makes motion graphics feel human.
 * 
 * @example
 * <FilmGrain intensity={0.15} animated />
 */
import React, { useMemo } from 'react';
import { useCurrentFrame, random } from 'remotion';

interface FilmGrainProps {
  /** Grain intensity (0-1) */
  intensity?: number;
  
  /** Whether grain animates each frame */
  animated?: boolean;
  
  /** Grain size */
  size?: 'fine' | 'medium' | 'coarse';
  
  /** Blend mode */
  blendMode?: 'overlay' | 'soft-light' | 'multiply' | 'screen';
  
  /** Container dimensions (defaults to full viewport) */
  width?: number | string;
  height?: number | string;
  
  /** Custom className */
  className?: string;
}

export const FilmGrain: React.FC<FilmGrainProps> = ({
  intensity = 0.1,
  animated = true,
  size = 'fine',
  blendMode = 'overlay',
  width = '100%',
  height = '100%',
  className = '',
}) => {
  const frame = useCurrentFrame();
  
  // Generate noise pattern
  const grainSize = {
    fine: 100,
    medium: 50,
    coarse: 25,
  }[size];
  
  // Create SVG noise filter
  const filterId = `grain-${animated ? frame : 'static'}`;
  const seed = animated ? frame : 0;
  
  // Generate random grain offsets for animation
  const baseFrequency = {
    fine: 0.8,
    medium: 0.5,
    coarse: 0.3,
  }[size];
  
  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height,
        pointerEvents: 'none',
        mixBlendMode: blendMode,
        opacity: intensity,
      }}
    >
      <svg
        width="100%"
        height="100%"
        style={{ display: 'block' }}
      >
        <defs>
          <filter id={filterId}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency={baseFrequency}
              numOctaves={3}
              seed={seed}
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
        <rect
          width="100%"
          height="100%"
          filter={`url(#${filterId})`}
        />
      </svg>
    </div>
  );
};

/**
 * Scanlines - CRT-style horizontal lines
 */
interface ScanlinesProps {
  /** Line spacing in pixels */
  spacing?: number;
  
  /** Line opacity (0-1) */
  opacity?: number;
  
  /** Line color */
  color?: string;
  
  /** Whether lines animate */
  animated?: boolean;
  
  /** Container dimensions */
  width?: number | string;
  height?: number | string;
  
  /** Custom className */
  className?: string;
}

export const Scanlines: React.FC<ScanlinesProps> = ({
  spacing = 4,
  opacity = 0.1,
  color = '#000000',
  animated = false,
  width = '100%',
  height = '100%',
  className = '',
}) => {
  const frame = useCurrentFrame();
  const offset = animated ? (frame % spacing) : 0;
  
  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height,
        pointerEvents: 'none',
        opacity,
        backgroundImage: `repeating-linear-gradient(
          0deg,
          ${color} 0px,
          ${color} 1px,
          transparent 1px,
          transparent ${spacing}px
        )`,
        backgroundPosition: `0 ${offset}px`,
      }}
    />
  );
};

/**
 * Vignette - Edge darkening effect
 */
interface VignetteProps {
  /** Vignette intensity (0-1) */
  intensity?: number;
  
  /** Vignette size (how far from edges) */
  size?: number;
  
  /** Vignette color */
  color?: string;
  
  /** Container dimensions */
  width?: number | string;
  height?: number | string;
  
  /** Custom className */
  className?: string;
}

export const Vignette: React.FC<VignetteProps> = ({
  intensity = 0.3,
  size = 50,
  color = '#000000',
  width = '100%',
  height = '100%',
  className = '',
}) => {
  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height,
        pointerEvents: 'none',
        background: `radial-gradient(
          ellipse at center,
          transparent 0%,
          transparent ${100 - size}%,
          ${color} 100%
        )`,
        opacity: intensity,
      }}
    />
  );
};
