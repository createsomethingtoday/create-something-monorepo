/**
 * DemonstrationScene - Progressive erasure showing subtraction in action.
 *
 * The copy starts as consultancy mush and resolves into a sharp verb.
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { ProgressiveErasure } from '../../shared/primitives';
import { colors, typography } from '../../../styles';
import { SPEC } from '../spec';

export const DemonstrationScene: React.FC = () => {
  const scene = SPEC.scenes.demonstration;

  return (
    <AbsoluteFill
      style={{
        padding: '100px 110px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 56,
      }}
    >
      <div
        style={{
          width: 320,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
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
          Show It
        </div>
        <div
          style={{
            fontFamily: typography.fontFamily.sans,
            fontSize: '3.1rem',
            fontWeight: 700,
            lineHeight: 1.02,
            letterSpacing: '-0.04em',
            color: colors.neutral[100],
          }}
        >
          Remove the fluff.
        </div>
        <div
          style={{
            fontFamily: typography.fontFamily.sans,
            fontSize: '1.1rem',
            lineHeight: 1.55,
            color: colors.neutral[500],
          }}
        >
          What remains is the actual promise.
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            marginTop: 10,
          }}
        >
          {scene.keepWords.map((word) => (
            <div
              key={word}
              style={{
                padding: '10px 14px',
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: `1px solid ${colors.neutral[800]}`,
                fontFamily: typography.fontFamily.mono,
                fontSize: '0.8rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: colors.neutral[300],
              }}
            >
              {word}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          borderRadius: 28,
          border: `1px solid rgba(255,255,255,0.08)`,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
          padding: '54px 50px',
          minHeight: 420,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ProgressiveErasure
          text={scene.fullText}
          keepWords={scene.keepWords}
          startFrame={12}
          duration={126}
          holdFrames={38}
          color={colors.neutral[50]}
          strikeColor={colors.neutral[600]}
          fontSize="2.9rem"
        />
      </div>
    </AbsoluteFill>
  );
};

export default DemonstrationScene;
