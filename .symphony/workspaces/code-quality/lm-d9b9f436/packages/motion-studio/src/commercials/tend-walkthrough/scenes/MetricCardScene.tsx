/**
 * MetricCardScene - Isolated MetricCard component walkthrough
 * 
 * Shows metric cards with animated counters.
 * Demonstrates outcome measurement - the payoff.
 */
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { WALKTHROUGH_SPEC } from '../spec';
import { MetricCard } from '../../tend/components/MetricCard';

export const MetricCardScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colors, scenes, animation, metrics } = WALKTHROUGH_SPEC;
  const { phases } = scenes.metricCard;
  
  // Scene fade in
  const sceneOpacity = interpolate(
    frame,
    [0, phases.silenceIn.duration],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  // Card reveal
  const revealSpring = spring({
    frame: frame - phases.wireframeReveal.start,
    fps,
    config: animation.springConfig,
  });
  
  const cardOpacity = interpolate(revealSpring, [0, 1], [0, 1]);
  const cardScale = interpolate(revealSpring, [0, 1], [0.9, 1]);
  
  // Embodiment progress
  const embodimentProgress = interpolate(
    frame,
    [phases.embodiment.start, phases.embodiment.start + phases.embodiment.duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Counter progress
  const countProgress = interpolate(
    frame,
    [phases.countUp.start, phases.countUp.start + phases.countUp.duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Show first metric card prominently
  const primaryMetric = metrics[0];
  
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: colors.bgBase,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: sceneOpacity,
      }}
    >
      {/* Single prominent metric card - scaled 2.5x for 4K visibility */}
      <div
        style={{
          transform: `scale(${cardScale * 2.5})`, // 2.5x scale for 4K
          opacity: cardOpacity,
        }}
      >
        <MetricCard
          label={primaryMetric.label}
          value={primaryMetric.value}
          suffix={'suffix' in primaryMetric ? (primaryMetric as { suffix: string }).suffix : undefined}
          color={primaryMetric.color as 'success' | 'default'}
          embodiment={embodimentProgress}
          countProgress={countProgress}
        />
      </div>
    </div>
  );
};

export default MetricCardScene;
