import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Boxes, ShieldCheck, Sparkles, UserRound } from 'lucide-react';

import {
  ConnectorLine,
  Panel,
  Pill,
  SceneFrame,
  SectionLabel,
  bodyCopyStyle,
  bulletListStyle,
  createTwoColumnLayout,
  hubOnboardingColors,
  renderBullet,
} from '../shared';

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const leftProgress = spring({
    frame: frame - 2,
    fps,
    config: { damping: 18, stiffness: 100, mass: 0.9 },
  });
  const rightProgress = spring({
    frame: frame - 10,
    fps,
    config: { damping: 20, stiffness: 90, mass: 1 },
  });
  const flowProgress = spring({
    frame: frame - 28,
    fps,
    config: { damping: 18, stiffness: 70, mass: 1.1 },
  });

  return (
    <SceneFrame
      step="01"
      kicker="What You're Receiving"
      title={
        <>
          A secure bridge
          <br />
          for approved AI work.
        </>
      }
      subtitle={
        <>
          An MCP is a secure bridge that lets your AI app use approved tools. This handoff gives
          you a lane, a token, and a host-ready path.
        </>
      }
      progress={0.125}
    >
      <div style={createTwoColumnLayout()}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transform: `translateX(${interpolate(leftProgress, [0, 1], [-60, 0])}px)`,
          }}
        >
          <Panel style={{ padding: 30, minHeight: 320 }}>
            <SectionLabel style={{ marginBottom: 18 }}>Why this matters</SectionLabel>
            <div style={bulletListStyle}>
              {[
                'Your host only sees the tools your team is allowed to use.',
                'The Hub keeps a clear policy line between safe, reviewed, and blocked work.',
                'If auth breaks, there is a repair path instead of random guessing.',
              ].map((text) => renderBullet(text))}
            </div>
          </Panel>

          <div
            style={{
              display: 'flex',
              gap: 14,
              transform: `translateY(${interpolate(leftProgress, [0, 1], [36, 0])}px)`,
            }}
          >
            <Pill tone="accent">Approved tools</Pill>
            <Pill tone="success">Clear review path</Pill>
            <Pill tone="warning">Repairable auth</Pill>
          </div>
        </div>

        <Panel
          style={{
            padding: 30,
            position: 'relative',
            transform: `
              translateX(${interpolate(rightProgress, [0, 1], [80, 0])}px)
              scale(${interpolate(rightProgress, [0, 1], [0.96, 1])})
            `,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <SectionLabel>.agency Access Report</SectionLabel>
            <Pill tone="success">Access granted</Pill>
          </div>

          <div
            style={{
              position: 'relative',
              height: 390,
              marginTop: 24,
              borderRadius: 24,
              border: `1px solid ${hubOnboardingColors.border}`,
              background: 'rgba(255, 255, 255, 0.03)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 28,
                top: 38,
                width: 168,
                padding: 22,
                borderRadius: 22,
                border: `1px solid ${hubOnboardingColors.border}`,
                background: 'rgba(8, 15, 24, 0.92)',
              }}
            >
              <UserRound size={28} color={hubOnboardingColors.accentStrong} />
              <div style={{ ...bodyCopyStyle, marginTop: 18, fontSize: '1.05rem', color: hubOnboardingColors.fgPrimary }}>
                New user
              </div>
              <div style={{ ...bodyCopyStyle, fontSize: '0.98rem' }}>
                Receives the lane, token, and connection steps.
              </div>
            </div>

            <div
              style={{
                position: 'absolute',
                left: 250,
                top: 118,
                width: 228,
                padding: 24,
                borderRadius: 24,
                border: `1px solid ${hubOnboardingColors.borderStrong}`,
                background: 'rgba(7, 16, 27, 0.96)',
                boxShadow: `0 0 28px ${hubOnboardingColors.glow}`,
              }}
            >
              <ShieldCheck size={30} color={hubOnboardingColors.accentStrong} />
              <div style={{ ...bodyCopyStyle, marginTop: 18, fontSize: '1.08rem', color: hubOnboardingColors.fgPrimary }}>
                Hub MCP
              </div>
              <div style={{ ...bodyCopyStyle, fontSize: '0.98rem' }}>
                Filters access, checks policy, and keeps the path traceable.
              </div>
            </div>

            <div
              style={{
                position: 'absolute',
                right: 28,
                top: 52,
                width: 200,
                padding: 22,
                borderRadius: 22,
                border: `1px solid ${hubOnboardingColors.border}`,
                background: 'rgba(8, 15, 24, 0.92)',
              }}
            >
              <Boxes size={28} color={hubOnboardingColors.success} />
              <div style={{ ...bodyCopyStyle, marginTop: 18, fontSize: '1.05rem', color: hubOnboardingColors.fgPrimary }}>
                Approved tools
              </div>
              <div style={{ ...bodyCopyStyle, fontSize: '0.98rem' }}>
                Only what your lane is meant to touch.
              </div>
            </div>

            <div
              style={{
                position: 'absolute',
                right: 54,
                bottom: 40,
                width: 220,
                padding: 20,
                borderRadius: 20,
                background: 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${hubOnboardingColors.border}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Sparkles size={20} color={hubOnboardingColors.warning} />
                <SectionLabel>Plain English promise</SectionLabel>
              </div>
              <div style={{ ...bodyCopyStyle, fontSize: '1rem' }}>
                Safe work moves quickly. Risky work gets reviewed. Broken auth has a repair path.
              </div>
            </div>

            <ConnectorLine x1={196} y1={120} x2={250} y2={170} progress={flowProgress} />
            <ConnectorLine
              x1={478}
              y1={170}
              x2={664}
              y2={120}
              progress={interpolate(flowProgress, [0, 1], [0, 1.1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })}
              color={hubOnboardingColors.success}
            />
          </div>
        </Panel>
      </div>
    </SceneFrame>
  );
};

export default IntroScene;
