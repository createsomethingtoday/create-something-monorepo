/**
 * MetricsScene - Final stats reveal with wireframe → styled transition
 * 
 * Shows 3 metric cards with animated counters.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion';
import { MetricCard } from '../components';
import { SPEC } from '../spec';

export const MetricsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { metrics, colors, scenes } = SPEC;
  const { wireframeIn, embodimentCascade, countUp } = scenes.metrics;
  
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgBase }}>
      
      {/* Metrics cards */}
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 32,
        }}
      >
        {metrics.map((metric, index) => {
          // Entrance spring
          const entranceDelay = wireframeIn.start + index * 8;
          const entranceProgress = spring({
            frame: Math.max(0, frame - entranceDelay),
            fps,
            config: { damping: 18, stiffness: 90, mass: 1 },
          });
          
          const translateY = interpolate(entranceProgress, [0, 1], [40, 0]);
          const opacity = interpolate(entranceProgress, [0, 1], [0, 1]);
          
          // Embodiment
          const embodimentStart = embodimentCascade.start + index * embodimentCascade.stagger;
          const embodiment = interpolate(
            frame,
            [embodimentStart, embodimentStart + 45],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          
          // Count up
          const countStart = countUp.start + index * 10;
          const countProgress = interpolate(
            frame,
            [countStart, countStart + countUp.duration],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          
          return (
            <div
              key={metric.label}
              style={{
                transform: `translateY(${translateY}px)`,
                opacity,
              }}
            >
              <MetricCard
                label={metric.label}
                value={metric.value}
                suffix={'suffix' in metric ? metric.suffix : undefined}
                color={metric.color as 'success' | 'default'}
                embodiment={embodiment}
                countProgress={countProgress}
              />
            </div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default MetricsScene;
