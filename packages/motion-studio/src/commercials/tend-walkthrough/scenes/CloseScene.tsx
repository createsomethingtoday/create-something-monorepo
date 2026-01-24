/**
 * CloseScene - Brand reveal closing
 * 
 * The walkthrough concludes with the brand.
 * "Tend to what matters."
 */
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { WALKTHROUGH_SPEC } from '../spec';

export const CloseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colors, scenes, animation, product } = WALKTHROUGH_SPEC;
  const { phases } = scenes.close;
  
  // Scene fade in
  const sceneOpacity = interpolate(
    frame,
    [0, phases.silenceIn.duration],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  // Logo reveal
  const logoSpring = spring({
    frame: frame - phases.logoReveal.start,
    fps,
    config: animation.springConfig,
  });
  
  const logoOpacity = interpolate(logoSpring, [0, 1], [0, 1]);
  const logoScale = interpolate(logoSpring, [0, 1], [0.95, 1]);
  
  // Tagline reveal
  const taglineSpring = spring({
    frame: frame - phases.taglineReveal.start,
    fps,
    config: animation.springConfig,
  });
  
  const taglineOpacity = interpolate(taglineSpring, [0, 1], [0, 1]);
  const taglineY = interpolate(taglineSpring, [0, 1], [20, 0]);
  
  // URL reveal (subtle)
  const urlOpacity = interpolate(
    frame,
    [phases.taglineReveal.start + 60, phases.taglineReveal.start + 90],
    [0, 0.5],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Final fade out
  const fadeOut = interpolate(
    frame,
    [phases.silenceOut.start + phases.silenceOut.duration - 60, phases.silenceOut.start + phases.silenceOut.duration],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: colors.bgBase,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        opacity: sceneOpacity * fadeOut,
      }}
    >
      {/* Logo - scaled for 4K */}
      <div
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 144, // 2x for 4K
          fontWeight: 700,
          color: colors.fgPrimary,
          letterSpacing: '0.1em',
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
        }}
      >
        {product.name}
      </div>
      
      {/* Tagline - scaled for 4K */}
      <div
        style={{
          fontFamily: 'Stack Sans Notch, system-ui, sans-serif',
          fontSize: 48, // 2x for 4K
          fontWeight: 400,
          color: colors.fgSecondary,
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
        }}
      >
        {product.tagline}
      </div>
      
      {/* URL - scaled for 4K */}
      <div
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 28, // 2x for 4K
          fontWeight: 400,
          color: colors.fgMuted,
          opacity: urlOpacity,
          marginTop: 80,
        }}
      >
        {product.url}
      </div>
    </div>
  );
};

export default CloseScene;
