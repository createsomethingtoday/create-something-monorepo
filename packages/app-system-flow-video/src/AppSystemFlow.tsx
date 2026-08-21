import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  useCurrentFrame,
} from 'remotion';
import {
  AS_OF,
  FPS,
  branchScenes,
  copy,
  palette as P,
  scenes,
  stations,
  statusGroups,
  statusesHeading,
  statusesSub,
  type Branch,
  type BranchSceneCopy,
} from './flow';

const t = (sec: number) => Math.round(sec * FPS);

const SANS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const MONO =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';

const KIND_COLOR: Record<Branch['kind'], string> = {
  proceed: P.green,
  hold: P.amber,
  warn: P.amber,
  block: P.red,
  info: P.blue,
};

const LEGEND_COLOR = {
  blue: P.blue,
  green: P.green,
  red: P.red,
  amber: P.amber,
  faint: P.faint,
} as const;

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

const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      fontFamily: MONO,
      fontSize: 22,
      letterSpacing: 4,
      textTransform: 'uppercase',
      color: P.faint,
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
  <div style={{ position: 'absolute', top: 72, left: 120, right: 120 }}>
    <div style={enter(frame, 0.2)}>
      {step ? <Eyebrow>{step}</Eyebrow> : null}
      <div
        style={{
          fontFamily: SANS,
          fontSize: 52,
          fontWeight: 600,
          color: P.text,
          marginTop: 12,
          letterSpacing: -0.5,
        }}
      >
        {title}
      </div>
      {sub ? (
        <div
          style={{
            fontFamily: SANS,
            fontSize: 26,
            color: P.muted,
            marginTop: 10,
            maxWidth: 1400,
            lineHeight: 1.45,
          }}
        >
          {sub}
        </div>
      ) : null}
    </div>
  </div>
);

// Where we are in the pipeline — persistent breadcrumb at the bottom of every stage scene.
const StationStrip: React.FC<{ active: number; frame: number }> = ({
  active,
  frame,
}) => (
  <div
    style={{
      ...enter(frame, 0.4),
      position: 'absolute',
      bottom: 44,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      gap: 14,
      alignItems: 'center',
    }}
  >
    {stations.map((s, i) => (
      <React.Fragment key={s}>
        {i > 0 ? (
          <div style={{ color: P.faint, fontFamily: MONO, fontSize: 18 }}>→</div>
        ) : null}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 19,
            letterSpacing: 1,
            color: i === active ? P.blue : P.faint,
            background: i === active ? P.blue + '1a' : 'transparent',
            border: `1px solid ${i === active ? P.blue + '66' : P.border}`,
            borderRadius: 999,
            padding: '6px 18px',
          }}
        >
          {s}
        </div>
      </React.Fragment>
    ))}
  </div>
);

// One documented branch: IF condition → THEN outcome, colored by consequence.
const BranchRow: React.FC<{ branch: Branch; frame: number; atSec: number }> = ({
  branch,
  frame,
  atSec,
}) => {
  const color = KIND_COLOR[branch.kind];
  return (
    <div
      style={{
        ...enter(frame, atSec),
        background: P.surface,
        border: `1.5px solid ${P.border}`,
        borderLeft: `5px solid ${color}`,
        borderRadius: 14,
        padding: '18px 28px',
        display: 'flex',
        alignItems: 'center',
        gap: 26,
      }}
    >
      <div style={{ flex: '0 0 44%', display: 'flex', gap: 14, alignItems: 'baseline' }}>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 17,
            letterSpacing: 2,
            color: P.faint,
            flexShrink: 0,
          }}
        >
          IF
        </span>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 24,
            color: P.text,
            lineHeight: 1.35,
          }}
        >
          {branch.cond}
        </span>
      </div>
      <div style={{ fontFamily: MONO, fontSize: 26, color, flexShrink: 0 }}>→</div>
      <div
        style={{
          flex: 1,
          fontFamily: SANS,
          fontSize: 23,
          color: P.muted,
          lineHeight: 1.4,
        }}
      >
        {branch.then}
      </div>
    </div>
  );
};

// Generic stage scene: heading + staggered branch rows + station breadcrumb.
const BranchScene: React.FC<{ sceneCopy: BranchSceneCopy; durSec: number }> = ({
  sceneCopy,
  durSec,
}) => {
  const frame = useCurrentFrame();
  return (
    <SceneFade durSec={durSec}>
      <Heading
        step={sceneCopy.step}
        title={sceneCopy.heading}
        sub={sceneCopy.sub}
        frame={frame}
      />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start' }}>
        <div
          style={{
            marginTop: 300,
            width: 1640,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {sceneCopy.branches.map((b, i) => (
            <BranchRow key={i} branch={b} frame={frame} atSec={1.4 + i * 1.3} />
          ))}
        </div>
      </AbsoluteFill>
      <StationStrip active={sceneCopy.station} frame={frame} />
    </SceneFade>
  );
};

/* ------------------------------ bespoke scenes ------------------------------ */

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

const MapScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <SceneFade durSec={scenes.map.dur}>
      <Heading step="00 / The map" title={copy.mapHeading} sub={copy.mapSub} frame={frame} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ marginTop: 80 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            {stations.map((s, i) => (
              <React.Fragment key={s}>
                {i > 0 ? (
                  <div
                    style={{
                      ...enter(frame, 1 + i * 0.7 - 0.25),
                      fontFamily: MONO,
                      fontSize: 34,
                      color: P.faint,
                    }}
                  >
                    →
                  </div>
                ) : null}
                <div
                  style={{
                    ...enter(frame, 1 + i * 0.7),
                    background: P.surface,
                    border: `1.5px solid ${P.borderStrong}`,
                    borderRadius: 16,
                    padding: '26px 34px',
                    fontFamily: SANS,
                    fontSize: 30,
                    fontWeight: 600,
                    color: P.text,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ fontFamily: MONO, fontSize: 19, color: P.blue, marginRight: 14 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {s}
                </div>
              </React.Fragment>
            ))}
          </div>
          <div
            style={{
              ...enter(frame, 6),
              marginTop: 56,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 1100,
                height: 60,
                borderLeft: `2px dashed ${P.amber}88`,
                borderRight: `2px dashed ${P.amber}88`,
                borderBottom: `2px dashed ${P.amber}88`,
                borderBottomLeftRadius: 26,
                borderBottomRightRadius: 26,
              }}
            />
            <div
              style={{
                fontFamily: MONO,
                fontSize: 23,
                color: P.amber,
              }}
            >
              ↩ {copy.mapLoopLabel}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
};

const StatusesScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <SceneFade durSec={scenes.statuses.dur}>
      <Heading
        step="09 / The state space"
        title={statusesHeading}
        sub={statusesSub}
        frame={frame}
      />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start' }}>
        <div
          style={{
            marginTop: 320,
            width: 1680,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 24,
          }}
        >
          {statusGroups.map((g, gi) => {
            const color = LEGEND_COLOR[g.color];
            return (
              <div
                key={g.group}
                style={{
                  ...enter(frame, 1 + gi * 0.6),
                  background: P.surface,
                  border: `1.5px solid ${P.border}`,
                  borderTop: `4px solid ${color}`,
                  borderRadius: 14,
                  padding: '18px 22px',
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 18,
                    letterSpacing: 3,
                    textTransform: 'uppercase',
                    color,
                    marginBottom: 14,
                  }}
                >
                  {g.group}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {g.items.map((item) => (
                    <div
                      key={item}
                      style={{
                        fontFamily: MONO,
                        fontSize: 18,
                        color: P.text,
                        background: P.surface2,
                        border: `1px solid ${P.borderStrong}`,
                        borderRadius: 999,
                        padding: '7px 16px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
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

/* ------------------------------ composition ------------------------------ */

const stageOrder = [
  'preflight',
  'submit',
  'intake',
  'review',
  'exceptions',
  'gatesApprove',
  'gatesReject',
  'market',
] as const;

export const AppSystemFlow: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: P.bg }}>
    <Sequence durationInFrames={t(scenes.title.dur)}>
      <TitleScene />
    </Sequence>
    <Sequence from={t(scenes.map.start)} durationInFrames={t(scenes.map.dur)}>
      <MapScene />
    </Sequence>
    {stageOrder.map((key) => (
      <Sequence
        key={key}
        from={t(scenes[key].start)}
        durationInFrames={t(scenes[key].dur)}
      >
        <BranchScene sceneCopy={branchScenes[key]} durSec={scenes[key].dur} />
      </Sequence>
    ))}
    <Sequence from={t(scenes.statuses.start)} durationInFrames={t(scenes.statuses.dur)}>
      <StatusesScene />
    </Sequence>
    <Sequence from={t(scenes.close.start)} durationInFrames={t(scenes.close.dur)}>
      <CloseScene />
    </Sequence>
  </AbsoluteFill>
);
