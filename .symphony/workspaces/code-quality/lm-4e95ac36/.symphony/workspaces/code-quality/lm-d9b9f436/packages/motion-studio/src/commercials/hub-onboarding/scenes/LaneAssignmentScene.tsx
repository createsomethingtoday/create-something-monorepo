import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { BadgeCheck, Compass, Link2 } from 'lucide-react';

import { HUB_ONBOARDING_SPEC } from '../spec';
import {
  FactRow,
  Panel,
  Pill,
  SceneFrame,
  SectionLabel,
  bodyCopyStyle,
  createTwoColumnLayout,
  hubOnboardingColors,
} from '../shared';

const { credentials } = HUB_ONBOARDING_SPEC;

export const LaneAssignmentScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const leftProgress = spring({
    frame: frame - 2,
    fps,
    config: { damping: 18, stiffness: 110, mass: 0.85 },
  });
  const rightProgress = spring({
    frame: frame - 6,
    fps,
    config: { damping: 20, stiffness: 80, mass: 0.95 },
  });

  return (
    <SceneFrame
      step="02"
      kicker="Your Lane"
      title={
        <>
          You get your own lane,
          <br />
          URL, and host.
        </>
      }
      subtitle="Think of the lane as a marked path for your team. It tells the Hub where your work belongs and which host is allowed to use your token."
      progress={0.24}
    >
      <div style={createTwoColumnLayout()}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 22,
            transform: `translateX(${interpolate(leftProgress, [0, 1], [-42, 0])}px)`,
          }}
        >
          <Panel style={{ padding: 30 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              <Compass size={28} color={hubOnboardingColors.accentStrong} />
              <SectionLabel>What the lane does</SectionLabel>
            </div>
            <div style={{ ...bodyCopyStyle, fontSize: '1.08rem' }}>
              Your lane keeps access organized. It gives you one Hub URL, one clear identity path,
              and one approved host setup.
            </div>
          </Panel>

          <div style={{ display: 'flex', gap: 12 }}>
            <Pill tone="accent">{credentials.displayName}</Pill>
            <Pill tone="success">Bound host: {credentials.boundHost}</Pill>
          </div>

          <Panel style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Link2 size={22} color={hubOnboardingColors.warning} />
              <div style={{ ...bodyCopyStyle, color: hubOnboardingColors.fgPrimary }}>
                One lane. One Hub URL. One approved path into the tools.
              </div>
            </div>
          </Panel>
        </div>

        <Panel
          style={{
            padding: 28,
            transform: `translateX(${interpolate(rightProgress, [0, 1], [54, 0])}px)`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <SectionLabel>Lane assignment</SectionLabel>
            <BadgeCheck size={22} color={hubOnboardingColors.success} />
          </div>

          <div
            style={{
              marginTop: 22,
              padding: 24,
              borderRadius: 24,
              border: `1px solid ${hubOnboardingColors.borderStrong}`,
              background: 'rgba(255, 255, 255, 0.03)',
            }}
          >
            <div
              style={{
                fontFamily: 'inherit',
                fontSize: '2rem',
                fontWeight: 700,
                letterSpacing: '-0.04em',
                color: hubOnboardingColors.fgPrimary,
              }}
            >
              {credentials.displayName}
            </div>
            <div style={{ ...bodyCopyStyle, marginTop: 8 }}>
              The clean handoff is a few facts, not a maze of setup screens.
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <FactRow label="Lane key" value={credentials.laneKey} highlight />
            <FactRow label="Hub URL" value={credentials.hubUrl} highlight />
            <FactRow label="Bound host" value={credentials.boundHost} />
            <FactRow label="Access mode" value={credentials.accessMode} />
          </div>
        </Panel>
      </div>
    </SceneFrame>
  );
};

export default LaneAssignmentScene;
