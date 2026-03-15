import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { AlertTriangle, CheckCircle2, Link2, RefreshCw } from 'lucide-react';

import { HUB_ONBOARDING_SPEC } from '../spec';
import {
  ConnectorLine,
  Panel,
  Pill,
  SceneFrame,
  SectionLabel,
  bodyCopyStyle,
  createTwoColumnLayout,
  hubOnboardingColors,
} from '../shared';

const { reconnect } = HUB_ONBOARDING_SPEC;

const STEP_ICONS = [AlertTriangle, Link2, RefreshCw, CheckCircle2] as const;

export const ReconnectScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const leftProgress = spring({
    frame: frame - 2,
    fps,
    config: { damping: 18, stiffness: 100, mass: 0.92 },
  });
  const rightProgress = spring({
    frame: frame - 12,
    fps,
    config: { damping: 20, stiffness: 82, mass: 1 },
  });
  const lineProgress = spring({
    frame: frame - 36,
    fps,
    config: { damping: 18, stiffness: 68, mass: 1.08 },
  });

  return (
    <SceneFrame
      step="07"
      kicker="When Auth Breaks"
      title={
        <>
          Repair the connection
          <br />
          in order.
        </>
      }
      subtitle="Do not guess and do not rotate random secrets. Check the connection, get the repair link, reconnect, then retry the same action."
      progress={0.91}
    >
      <div style={createTwoColumnLayout()}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            transform: `translateX(${interpolate(leftProgress, [0, 1], [-50, 0])}px)`,
          }}
        >
          <Panel accent="error" style={{ padding: 28 }}>
            <Pill tone="error">401 connection expired</Pill>
            <div
              style={{
                marginTop: 18,
                fontSize: '2.05rem',
                lineHeight: 1,
                fontWeight: 700,
                letterSpacing: '-0.04em',
              }}
            >
              {reconnect.title}
            </div>
            <div style={{ ...bodyCopyStyle, marginTop: 14 }}>{reconnect.detail}</div>
          </Panel>

          <Panel style={{ padding: 24 }}>
            <SectionLabel style={{ marginBottom: 16 }}>Plain-English rule</SectionLabel>
            <div style={bodyCopyStyle}>Check → repair → retry. The fix should come from the Hub, not from trial and error.</div>
          </Panel>

          <div style={{ display: 'flex', gap: 12 }}>
            <Pill tone="warning">Do not guess</Pill>
            <Pill tone="success">Retry after repair</Pill>
          </div>
        </div>

        <Panel
          style={{
            padding: 26,
            position: 'relative',
            transform: `translateX(${interpolate(rightProgress, [0, 1], [60, 0])}px)`,
          }}
        >
          <SectionLabel style={{ marginBottom: 18 }}>Repair flow</SectionLabel>
          <div style={{ position: 'relative', height: '100%' }}>
            <div style={{ display: 'grid', gridTemplateRows: 'repeat(4, 1fr)', gap: 14, height: '100%' }}>
              {reconnect.steps.map((step, index) => {
                const Icon = STEP_ICONS[index];
                const tone =
                  index === 0 ? 'warning' : index === reconnect.steps.length - 1 ? 'success' : 'accent';

                return (
                  <Panel key={step.tool} accent={tone as 'warning' | 'success' | 'accent'} style={{ padding: 20 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 14, alignItems: 'start' }}>
                      <Icon
                        size={24}
                        color={
                          index === 0
                            ? hubOnboardingColors.warning
                            : index === reconnect.steps.length - 1
                              ? hubOnboardingColors.success
                              : hubOnboardingColors.accentStrong
                        }
                      />
                      <div>
                        <SectionLabel>{step.tool}</SectionLabel>
                        <div style={{ ...bodyCopyStyle, marginTop: 8, color: hubOnboardingColors.fgPrimary }}>
                          {step.label}
                        </div>
                        <div style={{ ...bodyCopyStyle, marginTop: 8, fontSize: '0.98rem' }}>{step.detail}</div>
                      </div>
                    </div>
                  </Panel>
                );
              })}
            </div>

            <ConnectorLine x1={34} y1={114} x2={34} y2={248} progress={lineProgress} color={hubOnboardingColors.warning} />
            <ConnectorLine x1={34} y1={254} x2={34} y2={388} progress={lineProgress} />
            <ConnectorLine x1={34} y1={394} x2={34} y2={528} progress={lineProgress} color={hubOnboardingColors.success} />
          </div>
        </Panel>
      </div>
    </SceneFrame>
  );
};

export default ReconnectScene;
