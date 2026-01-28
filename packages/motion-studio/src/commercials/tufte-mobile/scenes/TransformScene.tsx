/**
 * TransformScene - Tufte principles applied one by one
 * 
 * "Edward Tufte asked a question: What if we removed everything that isn't data?"
 */
import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { DashboardCard } from '../components/DashboardCard';
import { PhoneFrame } from '../components/PhoneFrame';
import { TufteAnnotation } from '../components/TufteAnnotation';
import { TUFTE_MOBILE_SPEC } from '../spec';

export const TransformScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { colors, cards, scenes, tuftePrinciples } = TUFTE_MOBILE_SPEC;
  const { phases } = scenes.tufteTransform;
  
  // Overall tufte level progress (0 → 1 across all phases)
  const tufteProgress = interpolate(
    frame,
    [0, phases.smallMultiples.start + phases.smallMultiples.duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Calculate which principle is currently active
  const getCurrentPrincipleIndex = () => {
    if (frame < phases.sparklines.start) return 0;
    if (frame < phases.directLabeling.start) return 1;
    if (frame < phases.informationDensity.start) return 2;
    if (frame < phases.smallMultiples.start) return 3;
    return 4;
  };
  
  const currentPrincipleIndex = getCurrentPrincipleIndex();
  const currentPrinciple = tuftePrinciples[currentPrincipleIndex];
  
  // Card layout interpolation (horizontal → vertical)
  const layoutProgress = interpolate(
    frame,
    [phases.informationDensity.start, phases.informationDensity.start + phases.informationDensity.duration],
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
      }}
    >
      <PhoneFrame scale={1.4}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: interpolate(layoutProgress, [0, 1], [6, 8]),
            padding: 8,
          }}
        >
          {cards.map((card, index) => {
            // Stagger the tufte transformation per card
            const cardTufteProgress = interpolate(
              tufteProgress,
              [index * 0.1, 0.8 + index * 0.05],
              [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            );
            
            return (
              <DashboardCard
                key={card.id}
                card={card}
                embodiment={1}
                viewport="mobile"
                tufteLevel={cardTufteProgress}
                scale={phone.scale * 1.4}
              />
            );
          })}
        </div>
      </PhoneFrame>
      
      {/* Tufte principle annotation */}
      <TufteAnnotation
        principle={currentPrinciple}
        startFrame={currentPrinciple.frame - scenes.tufteTransform.start}
        duration={65}
      />
    </div>
  );
};

// Need to reference phone from spec
const { phone } = TUFTE_MOBILE_SPEC;

export default TransformScene;
