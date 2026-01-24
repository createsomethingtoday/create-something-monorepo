/**
 * CloseScene - Logo reveal with wireframe → styled transition
 * 
 * TEND logo and tagline materialize from wireframe placeholders.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion';
import { SPEC } from '../spec';
import { fontFamily } from '../../../fonts';

export const CloseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { product, colors, scenes, scale } = SPEC;
  const { wireframeIn, logoEmbodiment, taglineEmbodiment, urlReveal } = scenes.close;
  
  // Wireframe entrance
  const wireframeProgress = spring({
    frame: Math.max(0, frame - wireframeIn.start),
    fps,
    config: { damping: 20, stiffness: 80, mass: 1 },
  });
  
  // Logo embodiment
  const logoProgress = interpolate(
    frame,
    [logoEmbodiment.start, logoEmbodiment.start + logoEmbodiment.duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Tagline embodiment
  const taglineProgress = interpolate(
    frame,
    [taglineEmbodiment.start, taglineEmbodiment.start + taglineEmbodiment.duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // URL reveal
  const urlProgress = interpolate(
    frame,
    [urlReveal.start, urlReveal.start + urlReveal.duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Wireframe opacities (inverse of embodiment)
  const logoWireframeOpacity = interpolate(logoProgress, [0, 0.5], [1, 0], { extrapolateRight: 'clamp' });
  const taglineWireframeOpacity = interpolate(taglineProgress, [0, 0.5], [1, 0], { extrapolateRight: 'clamp' });
  
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgBase }}>
      
      {/* Content */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24 * scale,
          opacity: wireframeProgress,
        }}
      >
        {/* Logo area */}
        <div style={{ position: 'relative' }}>
          {/* Wireframe placeholder */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 200 * scale,
              height: 60 * scale,
              borderRadius: 8 * scale,
              background: colors.wireframe,
              opacity: logoWireframeOpacity,
            }}
          />
          
          {/* Styled logo */}
          <div
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 64 * scale,
              fontWeight: 400,
              color: colors.fgPrimary,
              letterSpacing: '0.15em',
              opacity: logoProgress,
            }}
          >
            {product.name}
          </div>
        </div>
        
        {/* Tagline area */}
        <div style={{ position: 'relative', marginTop: 8 * scale }}>
          {/* Wireframe placeholder */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 180 * scale,
              height: 16 * scale,
              borderRadius: 4 * scale,
              background: colors.wireframe,
              opacity: taglineWireframeOpacity,
            }}
          />
          
          {/* Styled tagline */}
          <div
            style={{
              fontFamily: fontFamily.sans,
              fontSize: 20 * scale,
              fontWeight: 400,
              color: colors.fgMuted,
              letterSpacing: '0.02em',
              opacity: taglineProgress,
            }}
          >
            {product.tagline}
          </div>
        </div>
        
        {/* URL */}
        <div
          style={{
            marginTop: 32 * scale,
            fontFamily: fontFamily.mono,
            fontSize: 14 * scale,
            color: colors.fgTertiary,
            opacity: urlProgress,
          }}
        >
          {product.url}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default CloseScene;
