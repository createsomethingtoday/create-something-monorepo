/**
 * EngagementHeatmap - Cinematic "Most Replayed" visualization
 * 
 * Enhanced with:
 * - Glowing gradient that pulses
 * - Smooth bezier curve path
 * - Animated particles rising from peaks
 * - Progressive reveal with anticipation
 * - Peak highlight with radial glow
 */
import React, { useMemo } from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { SPEC } from '../spec';

interface EngagementHeatmapProps {
  buildStart?: number;
  buildDuration?: number;
  data?: number[];
  height?: number;
  width?: number;
  showParticles?: boolean;
  showPeakGlow?: boolean;
}

// Generate smooth bezier path through data points
const generateSmoothPath = (data: number[], svgWidth: number, svgHeight: number): string => {
  const points = data.map((value, i) => ({
    x: (i / (data.length - 1)) * svgWidth,
    y: svgHeight - value * svgHeight * 0.85,
  }));
  
  let path = `M 0 ${svgHeight}`;
  path += ` L ${points[0].x} ${points[0].y}`;
  
  // Catmull-Rom to Bezier conversion for smooth curves
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[Math.min(points.length - 1, i + 1)];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  
  path += ` L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`;
  return path;
};

// Generate top line path (for stroke)
const generateLinePath = (data: number[], svgWidth: number, svgHeight: number): string => {
  const points = data.map((value, i) => ({
    x: (i / (data.length - 1)) * svgWidth,
    y: svgHeight - value * svgHeight * 0.85,
  }));
  
  let path = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[Math.min(points.length - 1, i + 1)];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  
  return path;
};

export const EngagementHeatmap: React.FC<EngagementHeatmapProps> = ({
  buildStart = 0,
  buildDuration = 120,
  data: propData,
  height = 60,
  width = 800,
  showParticles = true,
  showPeakGlow = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colors, engagementHeatmap } = SPEC;
  
  // Use provided data or default, ensuring it's a mutable array
  const data = propData ?? [...engagementHeatmap.data];
  
  // Find peak index
  const peakIndex = data.indexOf(Math.max(...data));
  const peakPosition = (peakIndex / (data.length - 1)) * 100;
  
  // Build progress with spring for organic feel
  const buildSpring = spring({
    frame: Math.max(0, frame - buildStart),
    fps,
    config: { damping: 40, stiffness: 30, mass: 1 },
  });
  
  const buildProgress = interpolate(
    buildSpring,
    [0, 1],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Pulse effect after build completes
  const pulsePhase = frame > buildStart + buildDuration
    ? Math.sin((frame - buildStart - buildDuration) * 0.05)
    : 0;
  
  const glowIntensity = 0.8 + pulsePhase * 0.2;
  
  // Generate paths
  const svgPath = useMemo(() => generateSmoothPath(data, 100, 100), [data]);
  const linePath = useMemo(() => generateLinePath(data, 100, 100), [data]);
  
  // Reveal mask width
  const revealWidth = buildProgress * 100;
  
  // Particle generation for peaks
  const particles = useMemo(() => {
    if (!showParticles) return [];
    
    const result: { x: number; y: number; delay: number; speed: number; size: number }[] = [];
    data.forEach((value, i) => {
      if (value > 0.7) {
        const x = (i / (data.length - 1)) * 100;
        for (let j = 0; j < 3; j++) {
          result.push({
            x: x + (Math.random() - 0.5) * 5,
            y: 100 - value * 85,
            delay: Math.random() * 60,
            speed: 0.3 + Math.random() * 0.4,
            size: 1 + Math.random() * 2,
          });
        }
      }
    });
    return result;
  }, [data, showParticles]);
  
  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {/* Peak glow effect */}
      {showPeakGlow && buildProgress > 0.4 && (
        <div
          style={{
            position: 'absolute',
            left: `${peakPosition}%`,
            top: '20%',
            width: 60,
            height: 60,
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, rgba(124, 43, 238, ${0.4 * glowIntensity * (buildProgress - 0.4) / 0.6}), transparent 70%)`,
            filter: 'blur(15px)',
            pointerEvents: 'none',
          }}
        />
      )}
      
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          {/* Enhanced gradient with glow */}
          <linearGradient id="heatmapGradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="rgba(124, 43, 238, 0)" />
            <stop offset="30%" stopColor={`rgba(124, 43, 238, ${0.3 * glowIntensity})`} />
            <stop offset="60%" stopColor={`rgba(124, 43, 238, ${0.6 * glowIntensity})`} />
            <stop offset="100%" stopColor={`rgba(156, 81, 255, ${0.9 * glowIntensity})`} />
          </linearGradient>
          
          {/* Glow filter */}
          <filter id="heatmapGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          {/* Reveal mask */}
          <clipPath id="revealClip">
            <rect x="0" y="0" width={revealWidth} height="100" />
          </clipPath>
        </defs>
        
        {/* Main heatmap fill */}
        <path
          d={svgPath}
          fill="url(#heatmapGradient)"
          clipPath="url(#revealClip)"
          style={{ opacity: 0.9 }}
        />
        
        {/* Top edge glow line */}
        <path
          d={linePath}
          fill="none"
          stroke={`rgba(180, 130, 255, ${glowIntensity})`}
          strokeWidth="1"
          clipPath="url(#revealClip)"
          filter="url(#heatmapGlow)"
        />
        
        {/* Bright top edge */}
        <path
          d={linePath}
          fill="none"
          stroke={`rgba(220, 180, 255, ${glowIntensity * 0.8})`}
          strokeWidth="0.5"
          clipPath="url(#revealClip)"
        />
      </svg>
      
      {/* Rising particles from peaks */}
      {showParticles && particles.map((particle, i) => {
        const particleFrame = frame - buildStart - buildDuration * (particle.x / 100) - particle.delay;
        if (particleFrame < 0) return null;
        
        const particleY = particle.y - particleFrame * particle.speed;
        const particleOpacity = Math.max(0, 1 - particleFrame / 60);
        
        if (particleOpacity <= 0) return null;
        
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${particle.x}%`,
              top: `${particleY}%`,
              width: particle.size,
              height: particle.size,
              borderRadius: '50%',
              backgroundColor: `rgba(180, 130, 255, ${particleOpacity * 0.8})`,
              boxShadow: `0 0 ${particle.size * 2}px rgba(124, 43, 238, ${particleOpacity * 0.5})`,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
            }}
          />
        );
      })}
      
      {/* Background bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 4,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: 2,
        }}
      />
    </div>
  );
};

export default EngagementHeatmap;
