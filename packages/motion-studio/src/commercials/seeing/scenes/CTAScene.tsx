/**
 * CTAScene - Installation commands with stronger hierarchy.
 */
import React from 'react';
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { CommandDisplay } from '../../shared/primitives';
import { colors, typography } from '../../../styles';
import { SPEC } from '../spec';

const badges = ['Free', '1,000 requests/day', 'Gemini CLI extension'] as const;

export const CTAScene: React.FC = () => {
  const scene = SPEC.scenes.cta;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const badgeReveal = spring({
    frame: frame - 84,
    fps,
    config: { damping: 18, stiffness: 100, mass: 0.9 },
  });

  return (
    <AbsoluteFill
      style={{
        padding: '96px 108px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 54,
          flex: 1,
        }}
      >
        <div
          style={{
            width: 420,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          <div
            style={{
              fontFamily: typography.fontFamily.mono,
              fontSize: '0.9rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: colors.neutral[500],
            }}
          >
            Install The Lens
          </div>
          <div
            style={{
              fontFamily: typography.fontFamily.sans,
              fontSize: '4.8rem',
              fontWeight: 700,
              lineHeight: 0.96,
              letterSpacing: '-0.05em',
              color: colors.neutral[50],
            }}
          >
            Put the
            <br />
            questions
            <br />
            in your shell.
          </div>
          <div
            style={{
              fontFamily: typography.fontFamily.sans,
              fontSize: '1.15rem',
              lineHeight: 1.55,
              color: colors.neutral[500],
              maxWidth: 360,
            }}
          >
            Install once. Ask in order. Keep the default stack from making decisions for you.
          </div>
        </div>

        <Sequence from={0} durationInFrames={scene.duration}>
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
            }}
          >
            <CommandDisplay
              commands={SPEC.commands}
              startFrame={0}
              staggerDelay={scene.commandStagger}
              entrance="slide-left"
              typeAnimation={true}
              typingSpeed={2.6}
              fontSize="1.45rem"
            />
          </div>
        </Sequence>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 16,
          opacity: badgeReveal,
          transform: `translateY(${interpolate(badgeReveal, [0, 1], [24, 0])}px)`,
        }}
      >
        {badges.map((badge) => (
          <div
            key={badge}
            style={{
              padding: '12px 18px',
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.04)',
              border: `1px solid ${colors.neutral[800]}`,
              fontFamily: typography.fontFamily.mono,
              fontSize: '0.82rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: colors.neutral[300],
            }}
          >
            {badge}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export default CTAScene;
