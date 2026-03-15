import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

import { HUB_ONBOARDING_SPEC } from '../spec';
import {
  Panel,
  Pill,
  SceneFrame,
  SectionLabel,
  bodyCopyStyle,
  hubOnboardingColors,
} from '../shared';

const { product } = HUB_ONBOARDING_SPEC;

export const CloseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const contentProgress = spring({
    frame: frame - 4,
    fps,
    config: { damping: 18, stiffness: 100, mass: 0.92 },
  });

  return (
    <SceneFrame
      step="08"
      kicker="Ready To Start"
      title={
        <>
          Connect once.
          <br />
          Start with one safe workflow.
        </>
      }
      subtitle="The Hub keeps the path understandable: approved tools when things are clear, review when risk goes up, and a repair path when auth breaks."
      progress={1}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '0.92fr 1.08fr',
          gap: 28,
          height: '100%',
          transform: `translateY(${interpolate(contentProgress, [0, 1], [28, 0])}px)`,
        }}
      >
        <Panel style={{ padding: 28 }}>
          <SectionLabel style={{ marginBottom: 20 }}>Keep these three rules</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {[
              'Start with a safe question so you can see the path before you act.',
              'If the Hub asks for review, stop and use the approval flow.',
              'If auth breaks, repair it in order and retry the same request.',
            ].map((item) => (
              <div key={item} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: 14 }}>
                <CheckCircle2 size={22} color={hubOnboardingColors.success} />
                <div style={bodyCopyStyle}>{item}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          accent="success"
          style={{
            padding: 30,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <SectionLabel>.agency Hub</SectionLabel>
            <div
              style={{
                marginTop: 18,
                fontSize: '3.3rem',
                lineHeight: 0.94,
                fontWeight: 700,
                letterSpacing: '-0.055em',
              }}
            >
              {product.tagline}
            </div>
            <div style={{ ...bodyCopyStyle, marginTop: 14, maxWidth: 520 }}>
              You do not need to memorize the control plane. You just need the first safe move and
              the next correct step.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <Pill tone="accent">Open `.agency`</Pill>
            <ArrowRight size={18} color={hubOnboardingColors.fgQuiet} />
            <Pill tone="success">Connect {product.host}</Pill>
            <ArrowRight size={18} color={hubOnboardingColors.fgQuiet} />
            <Pill>Start safe</Pill>
          </div>

          <div
            style={{
              marginTop: 24,
              borderTop: `1px solid ${hubOnboardingColors.border}`,
              paddingTop: 22,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ ...bodyCopyStyle, color: hubOnboardingColors.fgPrimary }}>Hub MCP onboarding</div>
            <div
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.95rem',
                color: hubOnboardingColors.accentStrong,
              }}
            >
              {product.url}
            </div>
          </div>
        </Panel>
      </div>
    </SceneFrame>
  );
};

export default CloseScene;
