/**
 * DesktopScene - Wireframes embody into full desktop cards
 * 
 * "On desktop, we have room. So we fill it."
 */
import React from 'react';
import { useCurrentFrame, interpolate, useVideoConfig } from 'remotion';
import { DashboardCard } from '../components/DashboardCard';
import { TUFTE_MOBILE_SPEC } from '../spec';

export const DesktopScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colors, cards, scenes, animation } = TUFTE_MOBILE_SPEC;
  const { phases } = scenes.desktopEmbodiment;
  
  // Embodiment progress (0 → 1)
  const embodimentProgress = interpolate(
    frame,
    [phases.embodimentStart.start, phases.embodimentStart.start + phases.embodimentStart.duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Value count-up progress
  const valueProgress = interpolate(
    frame,
    [phases.valuesCountUp.start, phases.valuesCountUp.start + phases.valuesCountUp.duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: colors.bgBase,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
      }}
    >
      {cards.map((card, index) => {
        // Stagger embodiment slightly per card
        const staggeredEmbodiment = interpolate(
          embodimentProgress,
          [index * 0.1, 1],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );
        
        return (
          <DashboardCard
            key={card.id}
            card={card}
            embodiment={staggeredEmbodiment}
            viewport="desktop"
            tufteLevel={0}
            valueProgress={valueProgress}
            scale={1.2}
          />
        );
      })}
    </div>
  );
};

export default DesktopScene;
