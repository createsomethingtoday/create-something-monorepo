import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { TerminalSquare } from 'lucide-react';

import { HUB_ONBOARDING_SPEC } from '../spec';
import {
  CodeWindow,
  Panel,
  Pill,
  SceneFrame,
  SectionLabel,
  bodyCopyStyle,
  createTwoColumnLayout,
  hubOnboardingColors,
} from '../shared';

const { credentials } = HUB_ONBOARDING_SPEC;

const CODEX_LINES = [
  { text: '[mcp_servers.create_something]' },
  { text: `url = "${credentials.hubUrl}"`, highlight: true },
  { text: `bearer_token = "${credentials.tokenPrefix}..."`, highlight: true },
];

export const HostConfigScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const leftProgress = spring({
    frame: frame - 2,
    fps,
    config: { damping: 20, stiffness: 90, mass: 0.9 },
  });
  const codeProgress = spring({
    frame: frame - 12,
    fps,
    config: { damping: 22, stiffness: 85, mass: 0.95 },
  });

  return (
    <SceneFrame
      step="04"
      kicker="Connect It"
      title={
        <>
          Put the Hub URL and token
          <br />
          into your host config.
        </>
      }
      subtitle="This example uses Codex. Claude Desktop and Cursor follow the same pattern: point the host at your lane, then add the bearer token."
      progress={0.47}
    >
      <div style={createTwoColumnLayout()}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            transform: `translateX(${interpolate(leftProgress, [0, 1], [-54, 0])}px)`,
          }}
        >
          <Panel style={{ padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <TerminalSquare size={26} color={hubOnboardingColors.accentStrong} />
              <SectionLabel>Codex setup</SectionLabel>
            </div>
            <div style={{ ...bodyCopyStyle, fontSize: '1.08rem' }}>
              Keep it boring. Use the exact lane URL. Paste the current bearer token. Save once,
              then let the host talk to the Hub.
            </div>
          </Panel>

          <Panel style={{ padding: 24 }}>
            <SectionLabel style={{ marginBottom: 16 }}>Three simple checks</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={bodyCopyStyle}>1. URL points to your lane.</div>
              <div style={bodyCopyStyle}>2. Token is current and copied exactly.</div>
              <div style={bodyCopyStyle}>3. Host is one of the approved apps.</div>
            </div>
          </Panel>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Pill tone="accent">Codex</Pill>
            <Pill>Claude Desktop</Pill>
            <Pill>Cursor</Pill>
          </div>
        </div>

        <div
          style={{
            transform: `
              translateX(${interpolate(codeProgress, [0, 1], [60, 0])}px)
              scale(${interpolate(codeProgress, [0, 1], [0.96, 1])})
            `,
          }}
        >
          <CodeWindow
            title="codex.toml"
            lines={CODEX_LINES}
            footer="The same shape shows up in other hosts. The important part is simple: your lane URL plus your bearer token."
          />
        </div>
      </div>
    </SceneFrame>
  );
};

export default HostConfigScene;
