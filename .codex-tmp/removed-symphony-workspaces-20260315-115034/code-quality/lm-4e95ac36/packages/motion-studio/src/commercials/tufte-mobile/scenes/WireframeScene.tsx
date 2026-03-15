/**
 * WireframeScene - Three dashboard card wireframes appear
 * 
 * "This is a dashboard card. Before it has color. Before it has type."
 */
import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { DashboardCard } from '../components/DashboardCard';
import { TUFTE_MOBILE_SPEC } from '../spec';

export const WireframeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colors, cards, scenes } = TUFTE_MOBILE_SPEC;
  const { phases } = scenes.wireframeIntro;
  
  // Scene fade in
  const sceneOpacity = interpolate(
    frame,
    [phases.silenceIn.start, phases.silenceIn.start + 30],
    [0, 1],
    { extrapolateRight: 'clamp' }
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
        opacity: sceneOpacity,
      }}
    >
      {cards.map((card, index) => {
        // Staggered reveal for each card
        const cardStartFrame = phases.cardsReveal.start + (index * phases.cardsReveal.stagger);
        
        const revealSpring = spring({
          frame: frame - cardStartFrame,
          fps,
          config: { damping: 20, stiffness: 80, mass: 1 },
        });
        
        const cardOpacity = interpolate(revealSpring, [0, 1], [0, 1]);
        const cardScale = interpolate(revealSpring, [0, 1], [0.9, 1]);
        const cardY = interpolate(revealSpring, [0, 1], [20, 0]);
        
        return (
          <div
            key={card.id}
            style={{
              opacity: cardOpacity,
              transform: `scale(${cardScale}) translateY(${cardY}px)`,
            }}
          >
            <DashboardCard
              card={card}
              embodiment={0} // Pure wireframe
              viewport="desktop"
              tufteLevel={0}
              scale={1.2}
            />
          </div>
        );
      })}
    </div>
  );
};

export default WireframeScene;
