/**
 * TriadScene - The three questions with a strong editorial layout.
 *
 * Each beat gets a large stage on the left and a persistent progress rail
 * on the right so the viewer reads it as a system, not isolated headlines.
 */
import React from 'react';
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { MotionTransition } from '../../shared/primitives';
import { colors, typography } from '../../../styles';
import { SPEC } from '../spec';

type TriadItem = (typeof SPEC.triad)[number];

const QuestionPanel: React.FC<{
  item: TriadItem;
  index: number;
  items: readonly TriadItem[];
}> = ({ item, index, items }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const reveal = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 100, mass: 0.9 },
  });

  return (
    <AbsoluteFill
      style={{
        padding: '100px 120px',
        display: 'flex',
        gap: 48,
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 28,
          opacity: reveal,
          transform: `translateX(${interpolate(reveal, [0, 1], [-60, 0])}px)`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            fontFamily: typography.fontFamily.mono,
            fontSize: '0.88rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: colors.neutral[500],
          }}
        >
          <span>{`Question ${String(index + 1).padStart(2, '0')}`}</span>
          <div style={{ width: 72, height: 1, backgroundColor: colors.neutral[800] }} />
          <span>{item.command}</span>
        </div>

        <div
          style={{
            fontFamily: typography.fontFamily.sans,
            fontSize: '5.1rem',
            fontWeight: 700,
            lineHeight: 0.98,
            letterSpacing: '-0.05em',
            color: colors.neutral[50],
            maxWidth: 820,
          }}
        >
          {item.question}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            marginTop: 6,
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: `1px solid ${colors.neutral[800]}`,
              fontFamily: typography.fontFamily.mono,
              fontSize: '0.84rem',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: colors.neutral[400],
            }}
          >
            Action
          </div>
          <div
            style={{
              fontFamily: typography.fontFamily.sans,
              fontSize: '2.4rem',
              fontWeight: 600,
              color: colors.neutral[200],
            }}
          >
            {item.action}
          </div>
        </div>

        <div
          style={{
            fontFamily: typography.fontFamily.sans,
            fontSize: '1.2rem',
            lineHeight: 1.5,
            color: colors.neutral[500],
            maxWidth: 560,
          }}
        >
          The order matters. Ask this before you add another abstraction.
        </div>
      </div>

      <div
        style={{
          width: 430,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 18,
        }}
      >
        {items.map((entry, railIndex) => {
          const isActive = railIndex === index;
          const distance = Math.abs(railIndex - index);

          return (
            <div
              key={entry.command}
              style={{
                padding: '22px 24px',
                borderRadius: 20,
                background: isActive
                  ? 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)'
                  : 'rgba(255,255,255,0.025)',
                border: `1px solid rgba(255,255,255,${isActive ? 0.16 : 0.06})`,
                opacity: isActive ? 1 : 0.52 - distance * 0.08,
                transform: `translateX(${isActive ? 0 : distance * 16}px) scale(${isActive ? 1 : 0.97})`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 14,
                  fontFamily: typography.fontFamily.mono,
                  fontSize: '0.84rem',
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: isActive ? colors.neutral[300] : colors.neutral[600],
                }}
              >
                <span>{entry.command}</span>
                <span>{`0${railIndex + 1}`}</span>
              </div>
              <div
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontSize: '1.35rem',
                  fontWeight: 600,
                  color: colors.neutral[100],
                  marginBottom: 8,
                }}
              >
                {entry.action}
              </div>
              <div
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontSize: '1rem',
                  lineHeight: 1.4,
                  color: colors.neutral[500],
                }}
              >
                {entry.question}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const TriadScene: React.FC = () => {
  const triad = SPEC.triad;

  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={45}>
        <MotionTransition type="slide-up" startFrame={0} duration={15}>
          <AbsoluteFill
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 20,
            }}
          >
            <div
              style={{
                fontFamily: typography.fontFamily.mono,
                fontSize: '0.92rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: colors.neutral[500],
              }}
            >
              The Subtractive Triad
            </div>
            <div
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: '4.6rem',
                fontWeight: 700,
                letterSpacing: '-0.05em',
                color: colors.neutral[50],
              }}
            >
              Three questions.
            </div>
          </AbsoluteFill>
        </MotionTransition>
      </Sequence>

      <Sequence from={45} durationInFrames={85}>
        <MotionTransition type="wipe-left" startFrame={0} duration={14}>
          <QuestionPanel item={triad[0]} index={0} items={triad} />
        </MotionTransition>
      </Sequence>

      <Sequence from={130} durationInFrames={85}>
        <MotionTransition type="push-left" startFrame={0} duration={14}>
          <QuestionPanel item={triad[1]} index={1} items={triad} />
        </MotionTransition>
      </Sequence>

      <Sequence from={215} durationInFrames={85}>
        <MotionTransition type="push-left" startFrame={0} duration={14}>
          <QuestionPanel item={triad[2]} index={2} items={triad} />
        </MotionTransition>
      </Sequence>
    </AbsoluteFill>
  );
};

export default TriadScene;
