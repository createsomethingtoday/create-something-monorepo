/**
 * ConstraintScene - Phone frame appears, cards are cramped
 * 
 * "Now put it on a phone. Three hundred and seventy-five pixels wide."
 */
import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { DashboardCard } from '../components/DashboardCard';
import { PhoneFrame } from '../components/PhoneFrame';
import { TUFTE_MOBILE_SPEC } from '../spec';

export const ConstraintScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colors, cards, scenes, phone } = TUFTE_MOBILE_SPEC;
  const { phases } = scenes.constraint;
  
  // Phone appears
  const phoneSpring = spring({
    frame: frame - phases.phoneAppear.start,
    fps,
    config: { damping: 20, stiffness: 60, mass: 1 },
  });
  
  const phoneOpacity = interpolate(phoneSpring, [0, 1], [0, 1]);
  const phoneScale = interpolate(phoneSpring, [0, 1], [0.8, 1]);
  
  // Cards squish into phone
  const squishProgress = interpolate(
    frame,
    [phases.cardsSquish.start, phases.cardsSquish.start + phases.cardsSquish.duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Problem reveal (red tint or indicator)
  const problemOpacity = interpolate(
    frame,
    [phases.problemReveal.start, phases.problemReveal.start + 30],
    [0, 0.3],
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
      <div
        style={{
          opacity: phoneOpacity,
          transform: `scale(${phoneScale})`,
        }}
      >
        <PhoneFrame scale={1.4}>
          {/* Cards cramped inside phone */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              transform: `scale(${interpolate(squishProgress, [0, 1], [0.6, 0.45])})`,
              transformOrigin: 'top center',
            }}
          >
            {cards.map((card) => (
              <DashboardCard
                key={card.id}
                card={card}
                embodiment={1}
                viewport="desktop" // Still desktop layout, cramped
                tufteLevel={0}
                scale={0.8}
              />
            ))}
          </div>
          
          {/* Problem overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `rgba(204, 68, 68, ${problemOpacity})`,
              pointerEvents: 'none',
            }}
          />
        </PhoneFrame>
      </div>
      
      {/* Constraint label */}
      <div
        style={{
          position: 'absolute',
          bottom: 100,
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: interpolate(frame, [phases.problemReveal.start, phases.problemReveal.start + 30], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 14,
            color: colors.fgMuted,
            letterSpacing: '0.05em',
          }}
        >
          375px width
        </span>
      </div>
    </div>
  );
};

export default ConstraintScene;
