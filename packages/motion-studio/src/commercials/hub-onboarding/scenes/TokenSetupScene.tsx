import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { KeyRound, LockKeyhole, ShieldEllipsis } from 'lucide-react';

import { HUB_ONBOARDING_SPEC } from '../spec';
import {
  Panel,
  Pill,
  SceneFrame,
  SectionLabel,
  bodyCopyStyle,
  createTwoColumnLayout,
  hubOnboardingColors,
} from '../shared';

const { credentials } = HUB_ONBOARDING_SPEC;

export const TokenSetupScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardA = spring({
    frame: frame - 2,
    fps,
    config: { damping: 18, stiffness: 90, mass: 0.9 },
  });
  const cardB = spring({
    frame: frame - 8,
    fps,
    config: { damping: 18, stiffness: 90, mass: 0.9 },
  });
  const cardC = spring({
    frame: frame - 14,
    fps,
    config: { damping: 18, stiffness: 90, mass: 0.9 },
  });

  return (
    <SceneFrame
      step="03"
      kicker="Your Credentials"
      title={
        <>
          The bearer token
          <br />
          is the key that moves.
        </>
      }
      subtitle="This is the secret that goes into your AI host. It is not your portal sign-in and it is not the ChatGPT authorize password."
      progress={0.33}
    >
      <div style={createTwoColumnLayout()}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <Panel style={{ padding: 30 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <KeyRound size={28} color={hubOnboardingColors.accentStrong} />
              <SectionLabel>Keep these separate</SectionLabel>
            </div>
            <div style={{ ...bodyCopyStyle, fontSize: '1.08rem' }}>
              A good onboarding handoff makes each secret easy to place. One signs you into the
              portal. One goes in the host. One is only for the ChatGPT authorize screen.
            </div>
          </Panel>

          <div style={{ display: 'flex', gap: 12 }}>
            <Pill tone="accent">Prefix {credentials.tokenPrefix}</Pill>
            <Pill tone="warning">Reveal once for copy</Pill>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, alignItems: 'stretch' }}>
          <Panel
            style={{
              padding: 24,
              transform: `translateY(${interpolate(cardA, [0, 1], [36, 0])}px)`,
            }}
          >
            <LockKeyhole size={24} color={hubOnboardingColors.fgMuted} />
            <SectionLabel style={{ marginTop: 18 }}>Portal sign-in</SectionLabel>
            <div style={{ ...bodyCopyStyle, marginTop: 14, color: hubOnboardingColors.fgPrimary }}>
              Opens `.agency`
            </div>
            <div style={{ ...bodyCopyStyle, marginTop: 10, fontSize: '1rem' }}>
              Good for the website. Not reused anywhere else.
            </div>
          </Panel>

          <Panel
            accent="accent"
            style={{
              padding: 24,
              transform: `translateY(${interpolate(cardB, [0, 1], [36, 0])}px) scale(${interpolate(cardB, [0, 1], [0.98, 1])})`,
            }}
          >
            <KeyRound size={24} color={hubOnboardingColors.accentStrong} />
            <SectionLabel style={{ marginTop: 18 }}>Bearer token</SectionLabel>
            <div style={{ ...bodyCopyStyle, marginTop: 14, color: hubOnboardingColors.fgPrimary }}>
              Goes in {credentials.boundHost}
            </div>
            <div
              style={{
                marginTop: 16,
                borderRadius: 16,
                padding: '14px 16px',
                background: hubOnboardingColors.accentSoft,
                border: `1px solid ${hubOnboardingColors.borderStrong}`,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.95rem',
                color: hubOnboardingColors.accentStrong,
              }}
            >
              Bearer {credentials.tokenPrefix}...
            </div>
          </Panel>

          <Panel
            style={{
              padding: 24,
              transform: `translateY(${interpolate(cardC, [0, 1], [36, 0])}px)`,
            }}
          >
            <ShieldEllipsis size={24} color={hubOnboardingColors.warning} />
            <SectionLabel style={{ marginTop: 18 }}>Authorize password</SectionLabel>
            <div style={{ ...bodyCopyStyle, marginTop: 14, color: hubOnboardingColors.fgPrimary }}>
              ChatGPT only
            </div>
            <div style={{ ...bodyCopyStyle, marginTop: 10, fontSize: '1rem' }}>
              Separate secret path for the auth screen.
            </div>
          </Panel>
        </div>
      </div>
    </SceneFrame>
  );
};

export default TokenSetupScene;
