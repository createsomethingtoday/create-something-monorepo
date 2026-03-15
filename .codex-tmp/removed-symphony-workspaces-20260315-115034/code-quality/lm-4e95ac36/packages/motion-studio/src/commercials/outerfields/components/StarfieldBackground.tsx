/**
 * StarfieldBackground - Cinematic starfield with parallax depth
 * 
 * Multi-layered parallax starfield with:
 * - 3 depth layers moving at different speeds
 * - Nebula clouds with gradient blurs
 * - Central galaxy glow that pulses
 * - Shooting stars for visual interest
 */
import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { SPEC } from '../spec';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  baseOpacity: number;
  twinkleOffset: number;
  twinkleSpeed: number;
  layer: number; // 0 = far, 1 = mid, 2 = near
}

interface ShootingStar {
  id: number;
  startX: number;
  startY: number;
  angle: number;
  speed: number;
  length: number;
  startFrame: number;
  duration: number;
}

interface NebulaCloud {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  opacity: number;
  rotation: number;
}

interface StarfieldBackgroundProps {
  fadeInStart?: number;
  fadeInDuration?: number;
  intensity?: number;
  showGalaxy?: boolean;
  galaxyStart?: number;
  showShootingStars?: boolean;
  showNebula?: boolean;
}

// Seeded random for deterministic generation
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

export const StarfieldBackground: React.FC<StarfieldBackgroundProps> = ({
  fadeInStart = 0,
  fadeInDuration = 45,
  intensity = 1,
  showGalaxy = true,
  galaxyStart = 45,
  showShootingStars = true,
  showNebula = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colors } = SPEC;
  
  // Generate multi-layer stars
  const stars = useMemo<Star[]>(() => {
    const result: Star[] = [];
    const layerCounts = [120, 60, 30]; // Far, mid, near
    const layerSizes = [[0.5, 1.5], [1, 2.5], [2, 4]];
    
    let id = 0;
    layerCounts.forEach((count, layer) => {
      for (let i = 0; i < count; i++) {
        const seed = id * 7 + 42;
        result.push({
          id: id++,
          x: seededRandom(seed) * 100,
          y: seededRandom(seed + 1) * 100,
          size: layerSizes[layer][0] + seededRandom(seed + 2) * (layerSizes[layer][1] - layerSizes[layer][0]),
          baseOpacity: 0.3 + seededRandom(seed + 3) * 0.7,
          twinkleOffset: seededRandom(seed + 4) * Math.PI * 2,
          twinkleSpeed: 0.015 + seededRandom(seed + 5) * 0.025,
          layer,
        });
      }
    });
    
    return result;
  }, []);
  
  // Generate shooting stars
  const shootingStars = useMemo<ShootingStar[]>(() => {
    if (!showShootingStars) return [];
    return Array.from({ length: 4 }, (_, i) => ({
      id: i,
      startX: 20 + seededRandom(i * 10 + 100) * 60,
      startY: 10 + seededRandom(i * 10 + 101) * 30,
      angle: Math.PI * 0.15 + seededRandom(i * 10 + 102) * Math.PI * 0.2,
      speed: 2 + seededRandom(i * 10 + 103) * 2,
      length: 8 + seededRandom(i * 10 + 104) * 12,
      startFrame: 30 + i * 35,
      duration: 20 + seededRandom(i * 10 + 105) * 15,
    }));
  }, [showShootingStars]);
  
  // Generate nebula clouds
  const nebulaClouds = useMemo<NebulaCloud[]>(() => {
    if (!showNebula) return [];
    return [
      { id: 0, x: 15, y: 25, width: 40, height: 30, color: colors.lavender, opacity: 0.08, rotation: -15 },
      { id: 1, x: 70, y: 60, width: 35, height: 25, color: colors.sun, opacity: 0.05, rotation: 20 },
      { id: 2, x: 40, y: 70, width: 50, height: 35, color: '#4a3a8a', opacity: 0.06, rotation: -5 },
    ];
  }, [showNebula, colors.lavender, colors.sun]);
  
  // Overall scene fade in
  const sceneFade = interpolate(
    frame,
    [fadeInStart, fadeInStart + fadeInDuration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Galaxy formation with spring physics
  const galaxyProgress = showGalaxy ? spring({
    frame: Math.max(0, frame - galaxyStart),
    fps,
    config: { damping: 30, stiffness: 40, mass: 1.5 },
  }) : 0;
  
  // Galaxy pulse (after formation)
  const galaxyPulse = frame > galaxyStart + 60
    ? Math.sin((frame - galaxyStart - 60) * 0.03) * 0.1
    : 0;
  
  // Parallax drift speeds per layer (far = slow, near = fast)
  const layerDrifts = [0.005, 0.015, 0.03];
  
  return (
    <AbsoluteFill style={{ backgroundColor: colors.spaceBlack, overflow: 'hidden' }}>
      {/* Nebula clouds (deepest layer) */}
      {nebulaClouds.map((cloud) => {
        const cloudFade = interpolate(
          frame,
          [fadeInStart + 20, fadeInStart + fadeInDuration + 30],
          [0, cloud.opacity],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );
        
        return (
          <div
            key={cloud.id}
            style={{
              position: 'absolute',
              left: `${cloud.x}%`,
              top: `${cloud.y}%`,
              width: `${cloud.width}%`,
              height: `${cloud.height}%`,
              background: `radial-gradient(ellipse at center, ${cloud.color}, transparent 70%)`,
              opacity: cloudFade * intensity,
              filter: 'blur(60px)',
              transform: `rotate(${cloud.rotation}deg) translate(${Math.sin(frame * 0.005 + cloud.id) * 5}px, ${Math.cos(frame * 0.003 + cloud.id) * 3}px)`,
            }}
          />
        );
      })}
      
      {/* Galaxy glow (center layer) */}
      {showGalaxy && (
        <>
          {/* Outer glow */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '150%',
              height: '150%',
              background: `radial-gradient(ellipse at center, 
                rgba(218, 191, 255, ${0.15 * galaxyProgress * (1 + galaxyPulse)}) 0%, 
                rgba(124, 43, 238, ${0.08 * galaxyProgress}) 25%,
                transparent 55%
              )`,
              opacity: sceneFade * intensity,
            }}
          />
          
          {/* Inner bright core */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '40%',
              height: '40%',
              background: `radial-gradient(ellipse at center, 
                rgba(255, 255, 255, ${0.1 * galaxyProgress * (1 + galaxyPulse * 2)}) 0%, 
                rgba(218, 191, 255, ${0.15 * galaxyProgress}) 30%,
                transparent 70%
              )`,
              opacity: sceneFade * intensity,
              filter: 'blur(20px)',
            }}
          />
          
          {/* Galaxy spiral hint (subtle rotation) */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -50%) rotate(${frame * 0.1}deg)`,
              width: '80%',
              height: '80%',
              background: `conic-gradient(from ${frame * 0.05}deg at 50% 50%, 
                transparent 0deg,
                rgba(218, 191, 255, ${0.03 * galaxyProgress}) 60deg,
                transparent 120deg,
                rgba(124, 43, 238, ${0.02 * galaxyProgress}) 180deg,
                transparent 240deg,
                rgba(218, 191, 255, ${0.03 * galaxyProgress}) 300deg,
                transparent 360deg
              )`,
              opacity: sceneFade * intensity,
              filter: 'blur(40px)',
            }}
          />
        </>
      )}
      
      {/* Star layers with parallax */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0 }}
      >
        <defs>
          {/* Glow filter for brighter stars */}
          <filter id="starGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {stars.map((star) => {
          // Parallax drift
          const drift = frame * layerDrifts[star.layer];
          const driftedX = ((star.x + drift * (star.layer === 0 ? 0.3 : star.layer === 1 ? 0.6 : 1)) % 100 + 100) % 100;
          const driftedY = ((star.y + drift * 0.2) % 100 + 100) % 100;
          
          // Twinkle effect
          const twinkle = Math.sin(frame * star.twinkleSpeed + star.twinkleOffset);
          const twinkleOpacity = star.baseOpacity * (0.6 + twinkle * 0.4);
          
          // Staggered entrance per layer
          const entranceDelay = star.layer * 15 + (star.id % 10) * 2;
          const starFade = interpolate(
            frame,
            [fadeInStart + entranceDelay, fadeInStart + fadeInDuration + entranceDelay],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          
          const finalOpacity = twinkleOpacity * starFade * sceneFade * intensity;
          
          return (
            <circle
              key={star.id}
              cx={`${driftedX}%`}
              cy={`${driftedY}%`}
              r={star.size * 0.08}
              fill={colors.snow}
              opacity={finalOpacity}
              filter={star.layer === 2 && star.size > 3 ? 'url(#starGlow)' : undefined}
            />
          );
        })}
      </svg>
      
      {/* Shooting stars */}
      {shootingStars.map((star) => {
        const localFrame = frame - star.startFrame;
        if (localFrame < 0 || localFrame > star.duration) return null;
        
        const progress = localFrame / star.duration;
        const easeProgress = 1 - Math.pow(1 - progress, 2); // Ease out
        
        const currentX = star.startX + Math.cos(star.angle) * star.speed * localFrame;
        const currentY = star.startY + Math.sin(star.angle) * star.speed * localFrame;
        
        const tailOpacity = interpolate(progress, [0, 0.3, 1], [0, 1, 0]);
        
        return (
          <div
            key={star.id}
            style={{
              position: 'absolute',
              left: `${currentX}%`,
              top: `${currentY}%`,
              width: `${star.length}%`,
              height: 2,
              background: `linear-gradient(to right, transparent, ${colors.snow}, ${colors.lavender})`,
              opacity: tailOpacity * sceneFade * intensity,
              transform: `rotate(${star.angle * (180 / Math.PI)}deg)`,
              transformOrigin: 'right center',
              filter: 'blur(0.5px)',
            }}
          />
        );
      })}
      
      {/* Subtle vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at center, 
            transparent 30%, 
            rgba(0, 0, 0, 0.5) 100%
          )`,
          opacity: sceneFade,
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

export default StarfieldBackground;
