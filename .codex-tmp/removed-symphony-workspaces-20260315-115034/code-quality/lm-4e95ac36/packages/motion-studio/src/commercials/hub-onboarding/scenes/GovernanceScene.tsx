import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Ban, CheckCircle2, ShieldQuestion } from 'lucide-react';

import { HUB_ONBOARDING_SPEC } from '../spec';
import {
  ConnectorLine,
  Panel,
  Pill,
  SceneFrame,
  SectionLabel,
  bodyCopyStyle,
  hubOnboardingColors,
} from '../shared';

const { governance } = HUB_ONBOARDING_SPEC;

export const GovernanceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const leftProgress = spring({
    frame: frame - 2,
    fps,
    config: { damping: 18, stiffness: 105, mass: 0.95 },
  });
  const graphProgress = spring({
    frame: frame - 12,
    fps,
    config: { damping: 20, stiffness: 72, mass: 1.1 },
  });

  return (
    <SceneFrame
      step="06"
      kicker="What The Hub Is Doing"
      title={
        <>
          The Hub is making
          <br />
          judgment calls for you.
        </>
      }
      subtitle="This is the simple policy model to remember: safe actions run fast, risky actions ask for review, and disallowed actions stop with a reason."
      progress={0.78}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '0.88fr 1.12fr', gap: 28, height: '100%' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            transform: `translateX(${interpolate(leftProgress, [0, 1], [-54, 0])}px)`,
          }}
        >
          <Panel accent="success" style={{ padding: 24 }}>
            <CheckCircle2 size={26} color={hubOnboardingColors.success} />
            <div style={{ marginTop: 16, fontSize: '1.55rem', fontWeight: 700, letterSpacing: '-0.03em' }}>
              {governance.safe.title}
            </div>
            <div style={{ ...bodyCopyStyle, marginTop: 10 }}>{governance.safe.copy}</div>
            <Pill tone="success" style={{ marginTop: 18 }}>
              Example: {governance.safe.example}
            </Pill>
          </Panel>

          <Panel accent="warning" style={{ padding: 24 }}>
            <ShieldQuestion size={26} color={hubOnboardingColors.warning} />
            <div style={{ marginTop: 16, fontSize: '1.55rem', fontWeight: 700, letterSpacing: '-0.03em' }}>
              {governance.review.title}
            </div>
            <div style={{ ...bodyCopyStyle, marginTop: 10 }}>{governance.review.copy}</div>
            <Pill tone="warning" style={{ marginTop: 18 }}>
              Example: {governance.review.example}
            </Pill>
          </Panel>

          <Panel accent="error" style={{ padding: 24 }}>
            <Ban size={26} color={hubOnboardingColors.error} />
            <div style={{ marginTop: 16, fontSize: '1.55rem', fontWeight: 700, letterSpacing: '-0.03em' }}>
              {governance.blocked.title}
            </div>
            <div style={{ ...bodyCopyStyle, marginTop: 10 }}>{governance.blocked.copy}</div>
            <Pill tone="error" style={{ marginTop: 18 }}>
              Example: {governance.blocked.example}
            </Pill>
          </Panel>
        </div>

        <Panel
          style={{
            padding: 28,
            position: 'relative',
            transform: `translateX(${interpolate(graphProgress, [0, 1], [70, 0])}px)`,
          }}
        >
          <SectionLabel style={{ marginBottom: 10 }}>Governed execution flow</SectionLabel>

          <div style={{ position: 'relative', height: '100%' }}>
            <div
              style={{
                position: 'absolute',
                left: 46,
                top: 148,
                width: 210,
                padding: 22,
                borderRadius: 24,
                border: `1px solid ${hubOnboardingColors.borderStrong}`,
                background: 'rgba(255, 255, 255, 0.04)',
              }}
            >
              <SectionLabel>Prompt</SectionLabel>
              <div style={{ ...bodyCopyStyle, marginTop: 14, color: hubOnboardingColors.fgPrimary }}>
                “Update the tool state.”
              </div>
            </div>

            <div
              style={{
                position: 'absolute',
                left: 314,
                top: 130,
                width: 214,
                padding: 24,
                borderRadius: 24,
                border: `1px solid ${hubOnboardingColors.borderStrong}`,
                background: 'rgba(7, 17, 28, 0.95)',
                boxShadow: `0 0 26px ${hubOnboardingColors.glow}`,
              }}
            >
              <SectionLabel>Hub policy layer</SectionLabel>
              <div style={{ ...bodyCopyStyle, marginTop: 14 }}>
                Checks who you are, what the tool can do, and whether the action is safe to run now.
              </div>
            </div>

            <div
              style={{
                position: 'absolute',
                right: 42,
                top: 46,
                width: 230,
                padding: 22,
                borderRadius: 22,
                border: `1px solid ${hubOnboardingColors.border}`,
                background: hubOnboardingColors.successSoft,
              }}
            >
              <SectionLabel>Safe</SectionLabel>
              <div style={{ ...bodyCopyStyle, marginTop: 12 }}>Runs now and writes a clear trace.</div>
            </div>

            <div
              style={{
                position: 'absolute',
                right: 42,
                top: 190,
                width: 230,
                padding: 22,
                borderRadius: 22,
                border: `1px solid ${hubOnboardingColors.border}`,
                background: hubOnboardingColors.warningSoft,
              }}
            >
              <SectionLabel>Review</SectionLabel>
              <div style={{ ...bodyCopyStyle, marginTop: 12 }}>Pauses and asks a person to approve the risky part.</div>
            </div>

            <div
              style={{
                position: 'absolute',
                right: 42,
                bottom: 52,
                width: 230,
                padding: 22,
                borderRadius: 22,
                border: `1px solid ${hubOnboardingColors.border}`,
                background: hubOnboardingColors.errorSoft,
              }}
            >
              <SectionLabel>Blocked</SectionLabel>
              <div style={{ ...bodyCopyStyle, marginTop: 12 }}>Stops and explains what policy line you hit.</div>
            </div>

            <ConnectorLine x1={256} y1={199} x2={314} y2={199} progress={graphProgress} />
            <ConnectorLine
              x1={528}
              y1={165}
              x2={682}
              y2={98}
              progress={interpolate(graphProgress, [0, 1], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })}
              color={hubOnboardingColors.success}
            />
            <ConnectorLine
              x1={528}
              y1={196}
              x2={682}
              y2={243}
              progress={interpolate(graphProgress, [0, 1], [0, 1.04], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })}
              color={hubOnboardingColors.warning}
            />
            <ConnectorLine
              x1={528}
              y1={226}
              x2={682}
              y2={380}
              progress={interpolate(graphProgress, [0, 1], [0, 1.08], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })}
              color={hubOnboardingColors.error}
            />
          </div>
        </Panel>
      </div>
    </SceneFrame>
  );
};

export default GovernanceScene;
