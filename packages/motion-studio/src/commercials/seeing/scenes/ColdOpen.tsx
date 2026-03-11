/**
 * ColdOpen Scene - "Same logic in three places. Now they're different."
 *
 * Establishes drift visually with three near-identical snippets on the right
 * while the core problem statement lands on the left.
 */
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { colors, typography } from '../../../styles';

const SNIPPETS = [
  ['function hashString(input) {', '  return digest(input).slice(0, 8);', '}'],
  ['function hashString(source) {', '  return digest(source).substring(0, 8);', '}'],
  ['function hashString(value) {', '  return digest(value).slice(0, 7) + "x";', '}'],
] as const;

export const ColdOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const leftProgress = spring({
    frame: frame - 6,
    fps,
    config: { damping: 18, stiffness: 90, mass: 0.9 },
  });

  return (
    <AbsoluteFill
      style={{
        padding: '110px 110px 90px',
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'space-between',
        gap: 48,
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          opacity: leftProgress,
          transform: `translateX(${interpolate(leftProgress, [0, 1], [-80, 0])}px)`,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              fontFamily: typography.fontFamily.mono,
              fontSize: '0.95rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: colors.neutral[500],
            }}
          >
            Drift Starts Here
          </div>

          <div
            style={{
              fontFamily: typography.fontFamily.sans,
              fontSize: '5.6rem',
              fontWeight: 700,
              lineHeight: 0.96,
              letterSpacing: '-0.05em',
              color: colors.neutral[50],
              maxWidth: 760,
            }}
          >
            Same logic
            <br />
            in three places.
          </div>

          <div
            style={{
              fontFamily: typography.fontFamily.sans,
              fontSize: '2.2rem',
              fontWeight: 500,
              lineHeight: 1.15,
              color: colors.neutral[300],
              maxWidth: 620,
            }}
          >
            Now they&apos;re different.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            color: colors.neutral[500],
            fontFamily: typography.fontFamily.mono,
            fontSize: '0.92rem',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          <span>Copy</span>
          <div style={{ width: 56, height: 1, backgroundColor: colors.neutral[800] }} />
          <span>Paste</span>
          <div style={{ width: 56, height: 1, backgroundColor: colors.neutral[800] }} />
          <span>Diverge</span>
        </div>
      </div>

      <div
        style={{
          width: 560,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {SNIPPETS.map((snippet, index) => {
          const progress = spring({
            frame: frame - index * 8,
            fps,
            config: { damping: 20, stiffness: 100, mass: 0.85 },
          });

          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                inset: `${index * 40}px ${index * 18}px ${index * 12}px ${index * 30}px`,
                padding: '28px 30px',
                borderRadius: 20,
                background: `linear-gradient(180deg, ${colors.neutral[950]}ee 0%, ${colors.neutral[950]}c0 100%)`,
                border: `1px solid rgba(255, 255, 255, ${0.16 - index * 0.03})`,
                boxShadow: `0 28px 80px rgba(0, 0, 0, ${0.35 + index * 0.08})`,
                opacity: progress,
                transform: `
                  translateX(${interpolate(progress, [0, 1], [80 - index * 12, 0])}px)
                  translateY(${index * 4 - interpolate(progress, [0, 1], [30, 0])}px)
                  rotate(${index === 1 ? -2.2 : index === 2 ? 1.5 : -0.6}deg)
                `,
              }}
            >
              <div
                style={{
                  fontFamily: typography.fontFamily.mono,
                  fontSize: '0.92rem',
                  lineHeight: 1.8,
                  color: index === 2 ? colors.neutral[300] : colors.neutral[400],
                  whiteSpace: 'pre',
                }}
              >
                {snippet.join('\n')}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export default ColdOpen;
