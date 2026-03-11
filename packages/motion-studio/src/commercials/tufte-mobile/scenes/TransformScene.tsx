/**
 * TransformScene - Tufte principles applied one by one
 *
 * The frame needs to show the contrast between "decorated dashboard"
 * and "compressed, legible mobile dashboard" at the same time.
 */
import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { DashboardCard } from '../components/DashboardCard';
import { PhoneFrame } from '../components/PhoneFrame';
import { TUFTE_MOBILE_SPEC } from '../spec';

const PRINCIPLE_STARTS = [0, 72, 144, 216, 288] as const;

export const TransformScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colors, cards, scenes, tuftePrinciples, fonts } = TUFTE_MOBILE_SPEC;
  const { phases } = scenes.tufteTransform;

  const sceneReveal = spring({
    frame: frame - 4,
    fps,
    config: { damping: 20, stiffness: 90, mass: 0.95 },
  });

  const phoneReveal = spring({
    frame: frame - 10,
    fps,
    config: { damping: 18, stiffness: 88, mass: 1 },
  });

  const tufteProgress = interpolate(
    frame,
    [0, phases.smallMultiples.start + phases.smallMultiples.duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const currentPrincipleIndex = (() => {
    if (frame < phases.sparklines.start) return 0;
    if (frame < phases.directLabeling.start) return 1;
    if (frame < phases.informationDensity.start) return 2;
    if (frame < phases.smallMultiples.start) return 3;
    return 4;
  })();

  const currentPrinciple = tuftePrinciples[currentPrincipleIndex];

  const layoutProgress = interpolate(
    frame,
    [phases.informationDensity.start, phases.informationDensity.start + phases.informationDensity.duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const beforeOpacity = interpolate(tufteProgress, [0, 1], [1, 0.24]);
  const beforeShift = interpolate(tufteProgress, [0, 1], [0, -70]);
  const phoneY = interpolate(phoneReveal, [0, 1], [70, 0]);
  const phoneScale = interpolate(phoneReveal, [0, 1], [0.92, 1]);
  const haloScale = interpolate(tufteProgress, [0, 1], [0.88, 1.06]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: colors.bgBase,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 72% 42%, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 20%, transparent 48%), radial-gradient(circle at 24% 68%, rgba(255,255,255,0.06) 0%, transparent 42%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 88,
          left: 96,
          right: 96,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: fonts.mono,
          fontSize: 12,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: colors.fgMuted,
        }}
      >
        <span>Responsive transformation</span>
        <span>{`Step 0${currentPrincipleIndex + 1} / 05`}</span>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 112,
          bottom: 96,
          left: '50%',
          width: 1,
          background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.08) 16%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.08) 84%, transparent 100%)',
          opacity: 0.6,
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: '140px 96px 90px',
          display: 'flex',
          gap: 64,
        }}
      >
        <div
          style={{
            width: 590,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            opacity: sceneReveal,
            transform: `translateX(${interpolate(sceneReveal, [0, 1], [-70, 0])}px)`,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div
              style={{
                fontFamily: fonts.mono,
                fontSize: 13,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: colors.fgMuted,
              }}
            >
              Before the edit
            </div>
            <div
              style={{
                fontFamily: fonts.sans,
                fontSize: 92,
                fontWeight: 700,
                lineHeight: 0.94,
                letterSpacing: '-0.05em',
                color: colors.fgPrimary,
              }}
            >
              Remove everything
              <br />
              that isn&apos;t data.
            </div>
            <div
              style={{
                fontFamily: fonts.sans,
                fontSize: 28,
                lineHeight: 1.35,
                color: colors.fgSecondary,
                maxWidth: 500,
              }}
            >
              The dashboard starts decorated, roomy, and desktop-first. Then each
              Tufte principle compresses it into something mobile can actually read.
            </div>
          </div>

          <div
            style={{
              padding: '28px 28px 24px',
              borderRadius: 28,
              border: `1px solid ${colors.borderDefault}`,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
              boxShadow: '0 24px 80px rgba(0, 0, 0, 0.32)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 18,
                fontFamily: fonts.mono,
                fontSize: 12,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: colors.fgMuted,
              }}
            >
              <span>Desktop expression</span>
              <span style={{ color: colors.fgTertiary }}>Excess fades first</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {cards.map((card, index) => (
                <div
                  key={card.id}
                  style={{
                    opacity: beforeOpacity * (1 - index * 0.1),
                    transform: `translateX(${beforeShift + index * 16}px) translateY(${index * -4}px)`,
                  }}
                >
                  <DashboardCard
                    card={card}
                    embodiment={1}
                    viewport="desktop"
                    tufteLevel={0}
                    scale={0.86}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: '120px 110px 90px 140px',
              borderRadius: 48,
              border: `1px solid ${colors.borderSubtle}`,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.015) 100%)',
              opacity: 0.7,
            }}
          />

          <div
            style={{
              position: 'absolute',
              width: 640,
              height: 640,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 34%, transparent 68%)',
              transform: `translate(140px, -10px) scale(${haloScale})`,
              opacity: 0.8,
            }}
          />

          <div
            style={{
              position: 'absolute',
              top: 42,
              left: 80,
              width: 420,
              padding: '24px 26px',
              borderRadius: 24,
              border: `1px solid ${colors.borderDefault}`,
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.24)',
              opacity: sceneReveal,
              transform: `translateY(${interpolate(sceneReveal, [0, 1], [30, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: fonts.mono,
                fontSize: 12,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: colors.fgMuted,
                marginBottom: 12,
              }}
            >
              Current principle
            </div>
            <div
              style={{
                fontFamily: fonts.sans,
                fontSize: 34,
                fontWeight: 650,
                color: colors.fgPrimary,
                marginBottom: 8,
              }}
            >
              {currentPrinciple.name}
            </div>
            <div
              style={{
                fontFamily: fonts.sans,
                fontSize: 18,
                lineHeight: 1.45,
                color: colors.fgSecondary,
              }}
            >
              {currentPrinciple.description}
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              left: 80,
              bottom: 48,
              width: 430,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {tuftePrinciples.map((principle, index) => {
              const progress = interpolate(
                frame,
                [PRINCIPLE_STARTS[index], PRINCIPLE_STARTS[index] + 44],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              );
              const isActive = index === currentPrincipleIndex;
              const isComplete = index < currentPrincipleIndex;

              return (
                <div
                  key={principle.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 18,
                    background: isActive ? colors.bgSurface : colors.bgSubtle,
                    border: `1px solid ${isActive ? colors.borderEmphasis : colors.borderSubtle}`,
                    opacity: isComplete ? 0.65 : 1,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 10,
                      fontFamily: fonts.sans,
                      fontSize: 17,
                      fontWeight: 600,
                      color: colors.fgPrimary,
                    }}
                  >
                    <span>{principle.name}</span>
                    <span
                      style={{
                        fontFamily: fonts.mono,
                        fontSize: 11,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: isComplete ? colors.success : colors.fgMuted,
                      }}
                    >
                      {isComplete ? 'Applied' : isActive ? 'Applying' : 'Queued'}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      borderRadius: 999,
                      background: colors.bgElevated,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.max(0.06, isComplete ? 1 : progress) * 100}%`,
                        height: '100%',
                        borderRadius: 999,
                        background: isComplete
                          ? colors.success
                          : 'linear-gradient(90deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.92) 100%)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              position: 'relative',
              zIndex: 2,
              transform: `translate(160px, ${phoneY}px) scale(${phoneScale})`,
            }}
          >
            <PhoneFrame scale={1.95}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: interpolate(layoutProgress, [0, 1], [8, 10]),
                  padding: 8,
                }}
              >
                {cards.map((card, index) => {
                  const cardTufteProgress = interpolate(
                    tufteProgress,
                    [index * 0.08, 0.74 + index * 0.07],
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
                      scale={0.74}
                    />
                  );
                })}
              </div>
            </PhoneFrame>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransformScene;
