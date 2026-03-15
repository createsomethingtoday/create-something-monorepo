/**
 * MobileScene - Final mobile cards shown at phone scale
 * 
 * "Look at it now. The same three metrics. The same intent. But legible."
 */
import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { DashboardCard } from '../components/DashboardCard';
import { PhoneFrame } from '../components/PhoneFrame';
import { TUFTE_MOBILE_SPEC } from '../spec';

export const MobileScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colors, cards, scenes, phone } = TUFTE_MOBILE_SPEC;
  const { phases } = scenes.mobileEmbodiment;
  
  // Reveal spring
  const revealSpring = spring({
    frame: frame - phases.reveal.start,
    fps,
    config: { damping: 20, stiffness: 80, mass: 1 },
  });
  
  const phoneScale = interpolate(revealSpring, [0, 1], [0.95, 1]);
  const phoneOpacity = interpolate(revealSpring, [0, 1], [0.8, 1]);
  
  // Scan animation - subtle highlight moving down cards
  const scanProgress = interpolate(
    frame,
    [phases.scanAnimation.start, phases.scanAnimation.start + phases.scanAnimation.duration],
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
      <div
        style={{
          transform: `scale(${phoneScale})`,
          opacity: phoneOpacity,
        }}
      >
        <PhoneFrame scale={1.4}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: 8,
            }}
          >
            {cards.map((card, index) => {
              // Scan highlight per card
              const cardScanStart = index / cards.length;
              const cardScanEnd = (index + 1) / cards.length;
              const isScanning = scanProgress >= cardScanStart && scanProgress < cardScanEnd;
              
              return (
                <div
                  key={card.id}
                  style={{
                    position: 'relative',
                  }}
                >
                  <DashboardCard
                    card={card}
                    embodiment={1}
                    viewport="mobile"
                    tufteLevel={1}
                    scale={phone.scale * 1.4}
                  />
                  
                  {/* Scan highlight */}
                  {isScanning && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: -2,
                        borderRadius: 10,
                        border: `2px solid ${colors.fgTertiary}`,
                        opacity: 0.5,
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Success indicator */}
          <div
            style={{
              position: 'absolute',
              bottom: 80 * phone.scale * 1.4,
              left: '50%',
              transform: 'translateX(-50%)',
              opacity: interpolate(frame, [phases.hold.start, phases.hold.start + 15], [0, 1], { extrapolateRight: 'clamp' }),
            }}
          >
            <span
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 11,
                fontWeight: 500,
                color: colors.success,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Readable
            </span>
          </div>
        </PhoneFrame>
      </div>
    </div>
  );
};

export default MobileScene;
