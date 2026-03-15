import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Play, Search, Wrench } from 'lucide-react';

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

const { firstAction } = HUB_ONBOARDING_SPEC;

const ICONS = [Search, Wrench, Play] as const;
const TONES = ['accent', 'warning', 'success'] as const;

export const FirstActionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const promptProgress = spring({
    frame: frame - 2,
    fps,
    config: { damping: 18, stiffness: 100, mass: 0.95 },
  });
  const cardsProgress = firstAction.steps.map((_, index) =>
    spring({
      frame: frame - 14 - index * 8,
      fps,
      config: { damping: 20, stiffness: 80, mass: 1 },
    })
  );
  const lineProgress = spring({
    frame: frame - 42,
    fps,
    config: { damping: 16, stiffness: 64, mass: 1.1 },
  });

  return (
    <SceneFrame
      step="05"
      kicker="First Safe Action"
      title={
        <>
          Start with one safe question,
          <br />
          then follow the path.
        </>
      }
      subtitle="The easiest first move is to ask what tools you can see. The Hub follows a plain order: search, inspect, then run."
      progress={0.62}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28, height: '100%' }}>
        <Panel
          style={{
            padding: 28,
            transform: `translateY(${interpolate(promptProgress, [0, 1], [30, 0])}px)`,
          }}
        >
          <SectionLabel style={{ marginBottom: 16 }}>Low-risk first prompt</SectionLabel>
          <div
            style={{
              borderRadius: 22,
              padding: '24px 28px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: `1px solid ${hubOnboardingColors.borderStrong}`,
              color: hubOnboardingColors.fgPrimary,
              fontSize: '1.7rem',
              lineHeight: 1.2,
              fontWeight: 600,
              letterSpacing: '-0.03em',
            }}
          >
            “{firstAction.prompt}”
          </div>
        </Panel>

        <div style={{ position: 'relative', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, height: '100%' }}>
            {firstAction.steps.map((step, index) => {
              const Icon = ICONS[index];
              const tone = TONES[index];

              return (
                <Panel
                  key={step.tool}
                  accent={tone}
                  style={{
                    padding: 26,
                    transform: `
                      translateY(${interpolate(cardsProgress[index], [0, 1], [40, 0])}px)
                      scale(${interpolate(cardsProgress[index], [0, 1], [0.96, 1])})
                    `,
                  }}
                >
                  <Icon size={28} color={hubOnboardingColors.fgPrimary} />
                  <SectionLabel style={{ marginTop: 18 }}>{step.tool}</SectionLabel>
                  <div
                    style={{
                      marginTop: 14,
                      fontSize: '1.5rem',
                      lineHeight: 1.06,
                      fontWeight: 700,
                      letterSpacing: '-0.035em',
                    }}
                  >
                    {step.label}
                  </div>
                  <div style={{ ...bodyCopyStyle, marginTop: 14 }}>{step.detail}</div>
                </Panel>
              );
            })}
          </div>

          <ConnectorLine x1={318} y1={248} x2={650} y2={248} progress={lineProgress} />
          <ConnectorLine
            x1={970}
            y1={248}
            x2={1302}
            y2={248}
            progress={interpolate(lineProgress, [0, 1], [0, 1.05], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })}
            color={hubOnboardingColors.success}
          />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <Pill tone="success">Safe starting point</Pill>
          <Pill>Learn the tool before you run it</Pill>
        </div>
      </div>
    </SceneFrame>
  );
};

export default FirstActionScene;
