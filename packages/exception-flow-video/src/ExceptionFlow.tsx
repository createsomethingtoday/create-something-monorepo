import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  useCurrentFrame,
} from 'remotion';
import { AS_OF, FPS, automations, copy, palette as P, scenes } from './flow';

const t = (sec: number) => Math.round(sec * FPS);

const SANS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const MONO =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';

// Entrance: fade + small rise, cubic ease-out. One motion rule for the whole piece.
const enter = (frame: number, startSec: number, durFrames = 14) => {
  const f = frame - t(startSec);
  const p = interpolate(f, [0, durFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  return { opacity: p, transform: `translateY(${(1 - p) * 16}px)` };
};

const fadeAt = (frame: number, startSec: number, durFrames = 12) =>
  interpolate(frame - t(startSec), [0, durFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

// Every scene fades in over 10 frames and out over its last 12.
const SceneFade: React.FC<{ durSec: number; children: React.ReactNode }> = ({
  durSec,
  children,
}) => {
  const frame = useCurrentFrame();
  const total = t(durSec);
  const opacity =
    interpolate(frame, [0, 10], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }) *
    interpolate(frame, [total - 12, total - 2], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  return (
    <AbsoluteFill style={{ backgroundColor: P.bg, opacity }}>
      {children}
    </AbsoluteFill>
  );
};

const Eyebrow: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <div
    style={{
      fontFamily: MONO,
      fontSize: 22,
      letterSpacing: 4,
      textTransform: 'uppercase',
      color: P.faint,
      ...style,
    }}
  >
    {children}
  </div>
);

const Heading: React.FC<{
  step?: string;
  title: string;
  sub?: string;
  frame: number;
}> = ({ step, title, sub, frame }) => (
  <div style={{ position: 'absolute', top: 96, left: 120, right: 120 }}>
    <div style={enter(frame, 0.2)}>
      {step ? <Eyebrow>{step}</Eyebrow> : null}
      <div
        style={{
          fontFamily: SANS,
          fontSize: 56,
          fontWeight: 600,
          color: P.text,
          marginTop: 14,
          letterSpacing: -0.5,
        }}
      >
        {title}
      </div>
      {sub ? (
        <div
          style={{
            fontFamily: SANS,
            fontSize: 28,
            color: P.muted,
            marginTop: 12,
            maxWidth: 1100,
            lineHeight: 1.45,
          }}
        >
          {sub}
        </div>
      ) : null}
    </div>
  </div>
);

const Chip: React.FC<{ label: string; color: string; big?: boolean }> = ({
  label,
  color,
  big,
}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      fontFamily: MONO,
      fontSize: big ? 34 : 24,
      color,
      background: color + '1f',
      border: `1.5px solid ${color}55`,
      borderRadius: 999,
      padding: big ? '14px 30px' : '9px 20px',
      whiteSpace: 'nowrap',
    }}
  >
    {label}
  </div>
);

// The version record — the protagonist. Status chip crossfades between states.
const VersionCard: React.FC<{
  frame: number;
  chipA: { label: string; color: string };
  chipB?: { label: string; color: string };
  morphAtSec?: number;
}> = ({ frame, chipA, chipB, morphAtSec }) => {
  const morph = chipB && morphAtSec !== undefined ? fadeAt(frame, morphAtSec, 14) : 0;
  return (
    <div
      style={{
        width: 1060,
        background: P.surface,
        border: `1.5px solid ${P.border}`,
        borderRadius: 18,
        padding: '34px 40px',
        display: 'flex',
        alignItems: 'center',
        gap: 28,
      }}
    >
      <div
        style={{
          width: 84,
          height: 84,
          borderRadius: 18,
          background: P.surface2,
          border: `1.5px solid ${P.borderStrong}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: SANS,
          fontSize: 40,
          fontWeight: 700,
          color: P.blue,
        }}
      >
        A
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: SANS, fontSize: 36, fontWeight: 600, color: P.text }}>
          {copy.appName}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 22, color: P.muted, marginTop: 6 }}>
          {copy.appVersion}
        </div>
      </div>
      <div style={{ position: 'relative', height: 52, minWidth: 480, flexShrink: 0 }}>
        <div style={{ position: 'absolute', right: 0, top: 0, opacity: 1 - morph }}>
          <Chip label={chipA.label} color={chipA.color} />
        </div>
        {chipB ? (
          <div style={{ position: 'absolute', right: 0, top: 0, opacity: morph }}>
            <Chip label={chipB.label} color={chipB.color} />
          </div>
        ) : null}
      </div>
    </div>
  );
};

const AutomationBanner: React.FC<{ label: string; frame: number; atSec: number }> = ({
  label,
  frame,
  atSec,
}) => (
  <div style={{ ...enter(frame, atSec), display: 'flex', justifyContent: 'center' }}>
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 16,
        fontFamily: MONO,
        fontSize: 26,
        color: P.blue,
        background: P.blue + '14',
        border: `1.5px solid ${P.blue}44`,
        borderRadius: 12,
        padding: '14px 26px',
      }}
    >
      {label}
      <span
        style={{
          fontSize: 17,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: P.faint,
          border: `1px solid ${P.border}`,
          borderRadius: 999,
          padding: '3px 12px',
        }}
      >
        automation
      </span>
    </div>
  </div>
);

const Toast: React.FC<{ text: string; frame: number; atSec: number; width?: number }> = ({
  text,
  frame,
  atSec,
  width = 720,
}) => (
  <div
    style={{
      ...enter(frame, atSec),
      width,
      background: P.surface2,
      border: `1.5px solid ${P.borderStrong}`,
      borderRadius: 14,
      padding: '20px 26px',
      display: 'flex',
      gap: 18,
      alignItems: 'flex-start',
      boxShadow: '0 18px 50px rgba(0,0,0,.45)',
    }}
  >
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 10,
        background: P.blue,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 24,
      }}
    >
      👛
    </div>
    <div>
      <div style={{ fontFamily: SANS, fontSize: 21, fontWeight: 600, color: P.text }}>
        Marketplace Asset Bot
      </div>
      <div
        style={{
          fontFamily: SANS,
          fontSize: 22,
          color: P.muted,
          marginTop: 6,
          lineHeight: 1.45,
        }}
      >
        {text}
      </div>
    </div>
  </div>
);

/* ------------------------------ scenes ------------------------------ */

const TitleScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <SceneFade durSec={scenes.title.dur}>
      <AbsoluteFill
        style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
      >
        <div style={enter(frame, 0.2)}>
          <Eyebrow>App Review / Governance</Eyebrow>
        </div>
        <div
          style={{
            ...enter(frame, 0.7),
            fontFamily: SANS,
            fontSize: 104,
            fontWeight: 650,
            color: P.text,
            marginTop: 30,
            letterSpacing: -2,
          }}
        >
          {copy.title}
        </div>
        <div
          style={{
            ...enter(frame, 1.4),
            fontFamily: SANS,
            fontSize: 34,
            color: P.muted,
            marginTop: 24,
          }}
        >
          {copy.subtitle}
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
};

const ArriveScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <SceneFade durSec={scenes.arrive.dur}>
      <Heading step="01 / Intake" title={copy.arriveHeading} frame={frame} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34, marginTop: 60 }}>
          <AutomationBanner label={copy.holdAutomation} frame={frame} atSec={3.6} />
          <div style={enter(frame, 0.6)}>
            <VersionCard
              frame={frame}
              chipA={{ label: '🆕 Ready for Review', color: P.blue }}
              chipB={{ label: '⏸️ On Hold · exception decision', color: P.amber }}
              morphAtSec={4.8}
            />
          </div>
          <div style={enter(frame, 2)}>
            <Chip label={copy.undecidedBadge} color={P.amber} />
          </div>
          <div
            style={{
              ...enter(frame, 5.6),
              fontFamily: SANS,
              fontSize: 26,
              color: P.muted,
              maxWidth: 900,
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            {copy.holdExplain}
          </div>
          <Toast text={copy.dmHold} frame={frame} atSec={7.2} />
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
};

const DecideScene: React.FC = () => {
  const frame = useCurrentFrame();
  const decideTimes = [5, 8.5, 12];
  return (
    <SceneFade durSec={scenes.decide.dur}>
      <Heading
        step="02 / Decide"
        title={copy.decideHeading}
        sub={copy.decideExplain}
        frame={frame}
      />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 1400, marginTop: 130, display: 'flex', flexDirection: 'column', gap: 26 }}>
          {copy.items.map((item, i) => {
            const decided = fadeAt(frame, decideTimes[i], 14);
            const color = item.ruling === 'granted' ? P.green : P.amber;
            return (
              <div
                key={i}
                style={{
                  ...enter(frame, 1.4 + i * 0.5),
                  background: P.surface,
                  border: `1.5px solid ${P.border}`,
                  borderLeft: `5px solid ${decided > 0.5 ? color : P.borderStrong}`,
                  borderRadius: 14,
                  padding: '26px 34px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 30,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: MONO, fontSize: 26, color: P.text }}>
                    {item.technical}
                  </div>
                  <div
                    style={{
                      fontFamily: SANS,
                      fontSize: 23,
                      color: P.muted,
                      marginTop: 8,
                    }}
                  >
                    {item.plain}
                  </div>
                </div>
                <div style={{ position: 'relative', minWidth: 320, height: 46 }}>
                  <div style={{ position: 'absolute', right: 0, opacity: 1 - decided }}>
                    <Chip label="Undecided" color={P.faint} />
                  </div>
                  <div style={{ position: 'absolute', right: 0, opacity: decided }}>
                    <Chip label={item.rulingLabel} color={color} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
};

const DenyScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <SceneFade durSec={scenes.deny.dur}>
      <Heading step="03 / If an item is denied" title={copy.denyHeading} frame={frame} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 36, marginTop: 60 }}>
          <AutomationBanner label="⚖️ Exception Status → #app-review-exceptions" frame={frame} atSec={0.6} />
          <div style={enter(frame, 1.6)}>
            <Chip label={copy.denyChip} color={P.red} big />
          </div>
          <div
            style={{
              ...enter(frame, 2.2),
              width: 860,
              background: P.surface,
              border: `1.5px solid ${P.border}`,
              borderRadius: 14,
              padding: '26px 32px',
              display: 'flex',
              gap: 22,
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: 40 }}>✉️</div>
            <div style={{ fontFamily: SANS, fontSize: 26, color: P.text, lineHeight: 1.5 }}>
              {copy.denyEmail}
            </div>
          </div>
          <div
            style={{
              ...enter(frame, 4),
              fontFamily: SANS,
              fontSize: 24,
              color: P.muted,
            }}
          >
            {copy.denySweep}
          </div>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
};

const ReleaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <SceneFade durSec={scenes.release.dur}>
      <Heading step="04 / Release" title={copy.releaseHeading} frame={frame} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34, marginTop: 60 }}>
          <AutomationBanner label={copy.releaseAutomation} frame={frame} atSec={1} />
          <div style={enter(frame, 0.4)}>
            <VersionCard
              frame={frame}
              chipA={{ label: '⏸️ On Hold · exception decision', color: P.amber }}
              chipB={{ label: '🆕 Ready for Review', color: P.green }}
              morphAtSec={2.4}
            />
          </div>
          <div
            style={{
              ...enter(frame, 3.6),
              fontFamily: SANS,
              fontSize: 26,
              color: P.muted,
              maxWidth: 900,
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            {copy.releaseExplain}
          </div>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
};

const BriefScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <SceneFade durSec={scenes.brief.dur}>
      <Heading step="05 / Next time" title={copy.briefHeading} frame={frame} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34, marginTop: 40 }}>
          <AutomationBanner label="⚖️ Prior-exemptions briefing → reviewer DM" frame={frame} atSec={0.6} />
          <Toast text={copy.briefDm} frame={frame} atSec={1.8} width={920} />
          <div
            style={{
              ...enter(frame, 2.8),
              fontFamily: SANS,
              fontSize: 26,
              color: P.muted,
            }}
          >
            {copy.briefExplain}
          </div>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
};

const RosterScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <SceneFade durSec={scenes.roster.dur}>
      <Heading
        step="06 / The machinery"
        title={copy.rosterHeading}
        sub={copy.rosterExplain}
        frame={frame}
      />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start' }}>
        <div
          style={{
            marginTop: 330,
            width: 1660,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 20,
          }}
        >
          {automations.map((a, i) => (
            <div
              key={i}
              style={{
                ...enter(frame, 1 + i * 0.45),
                background: P.surface,
                border: `1.5px solid ${P.border}`,
                borderRadius: 14,
                padding: '20px 24px',
              }}
            >
              <div style={{ fontFamily: MONO, fontSize: 20, color: P.text, lineHeight: 1.4 }}>
                {a.name}
              </div>
              <div
                style={{
                  fontFamily: SANS,
                  fontSize: 19,
                  color: P.muted,
                  marginTop: 10,
                  lineHeight: 1.45,
                }}
              >
                {a.role}
              </div>
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
};

const CloseScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <SceneFade durSec={scenes.close.dur}>
      <AbsoluteFill
        style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
      >
        <div
          style={{
            ...enter(frame, 0.5),
            fontFamily: SANS,
            fontSize: 92,
            fontWeight: 650,
            color: P.text,
            letterSpacing: -1.5,
          }}
        >
          {copy.closeTakeaway}
        </div>
        <div
          style={{
            ...enter(frame, 1.6),
            fontFamily: SANS,
            fontSize: 38,
            color: P.muted,
            marginTop: 26,
          }}
        >
          {copy.closeLine}
        </div>
        <div
          style={{
            ...enter(frame, 3),
            position: 'absolute',
            bottom: 70,
            fontFamily: MONO,
            fontSize: 22,
            color: P.faint,
          }}
        >
          {AS_OF}
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
};

export const ExceptionFlow: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: P.bg }}>
    <Sequence durationInFrames={t(scenes.title.dur)}>
      <TitleScene />
    </Sequence>
    <Sequence from={t(scenes.arrive.start)} durationInFrames={t(scenes.arrive.dur)}>
      <ArriveScene />
    </Sequence>
    <Sequence from={t(scenes.decide.start)} durationInFrames={t(scenes.decide.dur)}>
      <DecideScene />
    </Sequence>
    <Sequence from={t(scenes.deny.start)} durationInFrames={t(scenes.deny.dur)}>
      <DenyScene />
    </Sequence>
    <Sequence from={t(scenes.release.start)} durationInFrames={t(scenes.release.dur)}>
      <ReleaseScene />
    </Sequence>
    <Sequence from={t(scenes.brief.start)} durationInFrames={t(scenes.brief.dur)}>
      <BriefScene />
    </Sequence>
    <Sequence from={t(scenes.roster.start)} durationInFrames={t(scenes.roster.dur)}>
      <RosterScene />
    </Sequence>
    <Sequence from={t(scenes.close.start)} durationInFrames={t(scenes.close.dur)}>
      <CloseScene />
    </Sequence>
  </AbsoluteFill>
);
