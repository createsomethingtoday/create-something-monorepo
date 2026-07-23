import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame
} from 'remotion';
import {
  ArrowDown,
  Check,
  CircleAlert,
  ClipboardList,
  Database,
  FileCheck2,
  Fingerprint,
  Mail,
  MessageSquare,
  Route,
  ShieldCheck,
  UserRoundCheck
} from 'lucide-react';

import { SoundCues } from '../shared/audio/SoundCues';
import { performance } from './performance';
import { WORKFLOW_REEL_SPEC } from './spec';

const { color, font, motion } = performance;
const { safeArea, scenes } = WORKFLOW_REEL_SPEC;

type IconComponent = React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;

const labelStyle: React.CSSProperties = {
  fontFamily: font.mono,
  fontSize: 21,
  lineHeight: 1,
  letterSpacing: '0.13em',
  textTransform: 'uppercase',
  fontWeight: 600
};

const headlineStyle: React.CSSProperties = {
  fontFamily: font.display,
  fontSize: 92,
  lineHeight: 0.96,
  letterSpacing: '-0.045em',
  fontWeight: font.displayWeight,
  color: color.ink,
  margin: 0
};

const bodyStyle: React.CSSProperties = {
  fontFamily: font.sans,
  fontSize: 32,
  lineHeight: 1.3,
  letterSpacing: '-0.02em',
  color: color.inkSoft,
  margin: 0
};

const enter = (frame: number, delay = 0, distance = 36): React.CSSProperties => {
  const progress = interpolate(frame - delay, [0, motion.complex], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: motion.enterEase
  });
  return {
    opacity: progress,
    transform: `translateY(${(1 - progress) * distance}px)`
  };
};

const scaleIn = (frame: number, delay = 0): React.CSSProperties => {
  const progress = spring({
    fps: WORKFLOW_REEL_SPEC.fps,
    frame: frame - delay,
    config: { damping: 22, stiffness: 130, mass: 0.9 },
    durationInFrames: motion.slow
  });
  return {
    opacity: interpolate(progress, [0, 1], [0, 1]),
    transform: `scale(${interpolate(progress, [0, 1], [0.94, 1])})`
  };
};

const GridBackground: React.FC<{ dark?: boolean }> = ({ dark = false }) => (
  <AbsoluteFill
    style={{
      backgroundColor: dark ? color.ink : color.paper,
      backgroundImage: dark
        ? 'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)'
        : `linear-gradient(${color.grid} 1px, transparent 1px), linear-gradient(90deg, ${color.grid} 1px, transparent 1px)`,
      backgroundSize: '72px 72px'
    }}
  />
);

const Header: React.FC<{ step: string; dark?: boolean }> = ({ step, dark = false }) => (
  <div
    style={{
      position: 'absolute',
      top: safeArea.top,
      left: safeArea.left,
      right: safeArea.right,
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      color: dark ? color.panel : color.ink
    }}
  >
    <div style={{ ...labelStyle, whiteSpace: 'nowrap' }}>CREATE SOMETHING</div>
    <div
      style={{ height: 1, background: dark ? 'rgba(255,255,255,0.25)' : color.lineStrong, flex: 1 }}
    />
    <div style={{ ...labelStyle, color: dark ? 'rgba(255,255,255,0.62)' : color.muted }}>
      {step}
    </div>
  </div>
);

const Caption: React.FC<{ children: React.ReactNode; dark?: boolean }> = ({
  children,
  dark = false
}) => (
  <div
    style={{
      position: 'absolute',
      left: safeArea.left,
      right: safeArea.right,
      bottom: safeArea.bottom,
      minHeight: 112,
      borderTop: `2px solid ${dark ? 'rgba(255,255,255,0.3)' : color.ink}`,
      paddingTop: 24,
      color: dark ? color.panel : color.ink,
      fontFamily: font.sans,
      fontSize: 31,
      lineHeight: 1.25,
      fontWeight: 600,
      letterSpacing: '-0.018em'
    }}
  >
    {children}
  </div>
);

const SceneShell: React.FC<{
  step: string;
  caption: string;
  dark?: boolean;
  children: React.ReactNode;
}> = ({ step, caption, dark = false, children }) => (
  <AbsoluteFill>
    <GridBackground dark={dark} />
    <Header step={step} dark={dark} />
    {children}
    <Caption dark={dark}>{caption}</Caption>
  </AbsoluteFill>
);

const StatusPill: React.FC<{
  label: string;
  foreground: string;
  background: string;
  icon?: IconComponent;
}> = ({ label, foreground, background, icon: Icon }) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 11,
      padding: '14px 18px',
      color: foreground,
      background,
      border: `1px solid ${foreground}`,
      borderRadius: 4,
      ...labelStyle,
      fontSize: 18
    }}
  >
    {Icon ? <Icon size={21} strokeWidth={2} /> : null}
    {label}
  </div>
);

const SignalScene: React.FC = () => {
  const frame = useCurrentFrame();
  const cardProgress = spring({
    fps: 30,
    frame: frame - motion.standard,
    config: { damping: 20, stiffness: 110, mass: 0.9 },
    durationInFrames: motion.slow
  });
  const pulse = interpolate(Math.sin(frame / 7), [-1, 1], [0.55, 1]);

  return (
    <SceneShell step="01 / SIGNAL" caption={scenes.signal.caption}>
      <div style={{ position: 'absolute', top: 300, left: safeArea.left, right: safeArea.right }}>
        <div style={{ ...labelStyle, color: color.signal, ...enter(frame, 0) }}>
          Every workflow starts here
        </div>
        <h1 style={{ ...headlineStyle, marginTop: 30, ...enter(frame, motion.micro) }}>
          A customer asks
          <br />
          for one thing.
        </h1>

        <div
          style={{
            marginTop: 96,
            border: `2px solid ${color.signal}`,
            background: color.panel,
            padding: 38,
            position: 'relative',
            transform: `translateY(${interpolate(cardProgress, [0, 1], [65, 0])}px) scale(${interpolate(cardProgress, [0, 1], [0.96, 1])})`,
            opacity: cardProgress
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 34,
              right: 34,
              width: 17,
              height: 17,
              borderRadius: '50%',
              background: color.signal,
              boxShadow: `0 0 ${20 * pulse}px ${color.signal}`
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ padding: 14, background: color.signalSoft, color: color.signal }}>
              <Mail size={32} strokeWidth={1.8} />
            </div>
            <div>
              <div style={{ ...labelStyle, color: color.signal }}>New customer request</div>
              <div style={{ ...bodyStyle, fontSize: 25, color: color.muted, marginTop: 10 }}>
                Inbox · 09:42
              </div>
            </div>
          </div>
          <div
            style={{
              fontFamily: font.display,
              fontSize: 47,
              lineHeight: 1.12,
              letterSpacing: '-0.035em',
              color: color.ink,
              marginTop: 45
            }}
          >
            “Can we move Friday’s launch?”
          </div>
          <div style={{ marginTop: 42 }}>
            <StatusPill
              label="Signal received"
              foreground={color.signal}
              background={color.signalSoft}
              icon={Route}
            />
          </div>
        </div>
      </div>
    </SceneShell>
  );
};

const scatterNodes: Array<{
  label: string;
  detail: string;
  x: number;
  y: number;
  icon: IconComponent;
  tone: 'neutral' | 'pressure' | 'risk';
}> = [
  { label: 'Inbox', detail: 'Request copied', x: 0, y: 80, icon: Mail, tone: 'neutral' },
  { label: 'CRM', detail: 'Owner blank', x: 500, y: 10, icon: Database, tone: 'pressure' },
  {
    label: 'Team chat',
    detail: 'Approval asked',
    x: 80,
    y: 435,
    icon: MessageSquare,
    tone: 'pressure'
  },
  {
    label: 'Project board',
    detail: 'Status unknown',
    x: 520,
    y: 520,
    icon: ClipboardList,
    tone: 'risk'
  }
];

const ScatterScene: React.FC = () => {
  const frame = useCurrentFrame();
  const pathProgress = interpolate(frame, [motion.standard, 105], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: motion.standardEase
  });

  return (
    <SceneShell step="02 / FRICTION" caption={scenes.scatter.caption}>
      <div style={{ position: 'absolute', top: 285, left: safeArea.left, right: safeArea.right }}>
        <div style={{ ...labelStyle, color: color.pressure, ...enter(frame) }}>
          The hidden cost is the handoff
        </div>
        <h1 style={{ ...headlineStyle, marginTop: 28, ...enter(frame, motion.micro) }}>
          Then the work
          <br />
          scatters.
        </h1>

        <div style={{ position: 'relative', height: 820, marginTop: 42 }}>
          <svg
            viewBox="0 0 920 820"
            width="920"
            height="820"
            style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
          >
            {[
              'M220 180 C480 150 500 135 665 115',
              'M665 185 C610 320 420 430 245 540',
              'M250 585 C430 610 555 640 675 630',
              'M210 210 C255 340 520 405 650 560'
            ].map((path, index) => (
              <path
                key={path}
                d={path}
                fill="none"
                stroke={index === 3 ? color.risk : color.pressure}
                strokeWidth={3}
                strokeDasharray="12 14"
                strokeDashoffset={(1 - pathProgress) * 700}
                opacity={0.72}
              />
            ))}
          </svg>

          {scatterNodes.map((node, index) => {
            const Icon = node.icon;
            const foreground =
              node.tone === 'risk'
                ? color.risk
                : node.tone === 'pressure'
                  ? color.pressure
                  : color.ink;
            const background =
              node.tone === 'risk'
                ? color.riskSoft
                : node.tone === 'pressure'
                  ? color.pressureSoft
                  : color.panel;
            const drift = Math.sin((frame + index * 13) / 14) * 5;
            return (
              <div
                key={node.label}
                style={{
                  position: 'absolute',
                  left: node.x,
                  top: node.y,
                  width: 330,
                  minHeight: 178,
                  padding: 28,
                  background,
                  border: `2px solid ${foreground}`,
                  color: foreground,
                  boxSizing: 'border-box',
                  ...scaleIn(frame, motion.micro + index * motion.micro),
                  transform: `${scaleIn(frame, motion.micro + index * motion.micro).transform} translateY(${drift}px)`
                }}
              >
                <Icon size={30} strokeWidth={1.8} />
                <div
                  style={{
                    fontFamily: font.display,
                    fontSize: 35,
                    marginTop: 25,
                    letterSpacing: '-0.03em'
                  }}
                >
                  {node.label}
                </div>
                <div style={{ ...labelStyle, fontSize: 17, marginTop: 14 }}>{node.detail}</div>
              </div>
            );
          })}

          <div
            style={{
              position: 'absolute',
              left: 255,
              top: 350,
              width: 410,
              padding: '20px 28px',
              background: color.ink,
              color: color.panel,
              textAlign: 'center',
              ...enter(frame, 95, 18),
              ...labelStyle,
              fontSize: 19
            }}
          >
            Who owns the next decision?
          </div>
        </div>
      </div>
    </SceneShell>
  );
};

const mapRows = [
  { label: 'Signal', value: 'Customer launch request', tone: 'signal' as const },
  { label: 'Owner', value: 'Operations lead', tone: 'ink' as const },
  { label: 'Constraint', value: 'Manager approval required', tone: 'review' as const },
  { label: 'Outcome', value: 'Launch plan updated', tone: 'pressure' as const },
  { label: 'Proof', value: 'Decision receipt attached', tone: 'growth' as const }
];

const MapScene: React.FC = () => {
  const frame = useCurrentFrame();
  const toneColor = (tone: (typeof mapRows)[number]['tone']) => {
    if (tone === 'signal') return color.signal;
    if (tone === 'review') return color.review;
    if (tone === 'pressure') return color.pressure;
    if (tone === 'growth') return color.growth;
    return color.ink;
  };

  return (
    <SceneShell step="03 / MAP" caption={scenes.map.caption}>
      <div style={{ position: 'absolute', top: 285, left: safeArea.left, right: safeArea.right }}>
        <div style={{ ...labelStyle, color: color.signal, ...enter(frame) }}>
          Make the operating system visible
        </div>
        <h1 style={{ ...headlineStyle, marginTop: 28, ...enter(frame, motion.micro) }}>
          Map the work.
          <br />
          Name the owner.
        </h1>

        <div
          style={{
            position: 'relative',
            marginTop: 64,
            background: color.panel,
            border: `2px solid ${color.ink}`,
            padding: '24px 34px',
            ...scaleIn(frame, motion.standard)
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 58,
              bottom: 58,
              left: 68,
              width: 3,
              background: color.line
            }}
          />
          {mapRows.map((row, index) => {
            const accent = toneColor(row.tone);
            const rowProgress = interpolate(
              frame - (motion.standard + index * motion.micro),
              [0, motion.complex],
              [0, 1],
              {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: motion.enterEase
              }
            );
            return (
              <div
                key={row.label}
                style={{
                  position: 'relative',
                  display: 'grid',
                  gridTemplateColumns: '52px 190px 1fr',
                  alignItems: 'center',
                  gap: 20,
                  minHeight: 132,
                  borderBottom:
                    index === mapRows.length - 1 ? undefined : `1px solid ${color.line}`,
                  opacity: rowProgress,
                  transform: `translateX(${(1 - rowProgress) * 34}px)`
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: accent,
                    border: `7px solid ${color.panel}`,
                    boxShadow: `0 0 0 2px ${accent}`,
                    zIndex: 1
                  }}
                />
                <div style={{ ...labelStyle, fontSize: 18, color: accent }}>{row.label}</div>
                <div
                  style={{
                    fontFamily: font.display,
                    fontSize: 34,
                    color: color.ink,
                    letterSpacing: '-0.03em'
                  }}
                >
                  {row.value}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SceneShell>
  );
};

const DecisionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const gateProgress = interpolate(frame, [35, 90], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: motion.standardEase
  });
  const approved = frame >= 88;

  return (
    <SceneShell step="04 / DECISION" caption={scenes.decision.caption}>
      <div style={{ position: 'absolute', top: 285, left: safeArea.left, right: safeArea.right }}>
        <div style={{ ...labelStyle, color: color.review, ...enter(frame) }}>
          Authority is part of the workflow
        </div>
        <h1 style={{ ...headlineStyle, marginTop: 28, ...enter(frame, motion.micro) }}>
          Route the decision.
        </h1>

        <div style={{ position: 'relative', marginTop: 72, height: 810 }}>
          <div
            style={{
              position: 'absolute',
              left: 250,
              top: 0,
              width: 420,
              padding: 30,
              background: color.signalSoft,
              border: `2px solid ${color.signal}`,
              textAlign: 'center',
              ...scaleIn(frame, motion.standard)
            }}
          >
            <div style={{ ...labelStyle, color: color.signal }}>Signal</div>
            <div
              style={{ fontFamily: font.display, fontSize: 34, color: color.ink, marginTop: 14 }}
            >
              Move Friday’s launch
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              top: 147,
              left: 446,
              color: color.lineStrong,
              opacity: gateProgress
            }}
          >
            <ArrowDown size={30} strokeWidth={1.6} />
          </div>

          <div
            style={{
              position: 'absolute',
              left: 210,
              top: 205,
              width: 500,
              padding: 35,
              background: color.panel,
              border: `3px solid ${color.ink}`,
              textAlign: 'center',
              opacity: gateProgress,
              transform: `scale(${interpolate(gateProgress, [0, 1], [0.96, 1])})`
            }}
          >
            <ShieldCheck size={40} strokeWidth={1.7} color={color.ink} />
            <div style={{ ...labelStyle, color: color.ink, marginTop: 17 }}>Policy boundary</div>
            <div style={{ ...bodyStyle, fontSize: 27, marginTop: 14 }}>
              Does this change need approval?
            </div>
          </div>

          <svg
            viewBox="0 0 920 810"
            width="920"
            height="810"
            style={{ position: 'absolute', inset: 0 }}
          >
            <path
              d="M460 395 C460 455 250 450 250 515"
              fill="none"
              stroke={color.growth}
              strokeWidth={3}
              opacity={gateProgress}
            />
            <path
              d="M460 395 C460 455 675 450 675 515"
              fill="none"
              stroke={color.review}
              strokeWidth={3}
              opacity={gateProgress}
            />
          </svg>

          <div
            style={{
              position: 'absolute',
              top: 505,
              left: 25,
              width: 400,
              minHeight: 205,
              padding: 30,
              boxSizing: 'border-box',
              border: `2px solid ${color.growth}`,
              background: color.growthSoft,
              ...enter(frame, 62)
            }}
          >
            <Check size={34} strokeWidth={2} color={color.growth} />
            <div style={{ ...labelStyle, color: color.growth, marginTop: 18 }}>Clear work</div>
            <div
              style={{ fontFamily: font.display, fontSize: 34, marginTop: 14, color: color.ink }}
            >
              Runs inside policy
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              top: 505,
              right: 25,
              width: 400,
              minHeight: 205,
              padding: 30,
              boxSizing: 'border-box',
              border: `2px solid ${color.review}`,
              background: color.reviewSoft,
              ...enter(frame, 72)
            }}
          >
            <UserRoundCheck size={34} strokeWidth={1.8} color={color.review} />
            <div style={{ ...labelStyle, color: color.review, marginTop: 18 }}>Risky work</div>
            <div
              style={{ fontFamily: font.display, fontSize: 34, marginTop: 14, color: color.ink }}
            >
              {approved ? 'Approved by owner' : 'Waits for review'}
            </div>
          </div>

          {approved ? (
            <div style={{ position: 'absolute', top: 745, right: 88, ...enter(frame, 90, 14) }}>
              <StatusPill
                label="Decision recorded"
                foreground={color.growth}
                background={color.growthSoft}
                icon={Fingerprint}
              />
            </div>
          ) : null}
        </div>
      </div>
    </SceneShell>
  );
};

const receiptRows = [
  ['Signal', 'Customer launch request'],
  ['Owner', 'Operations lead'],
  ['Decision', 'Manager approved'],
  ['Action', 'Launch plan updated'],
  ['Outcome', 'Team notified']
] as const;

const ProofScene: React.FC = () => {
  const frame = useCurrentFrame();
  const stampProgress = spring({
    fps: 30,
    frame: frame - 62,
    config: { damping: 16, stiffness: 180, mass: 0.8 },
    durationInFrames: motion.slow
  });

  return (
    <SceneShell step="05 / PROOF" caption={scenes.proof.caption}>
      <div style={{ position: 'absolute', top: 285, left: safeArea.left, right: safeArea.right }}>
        <div style={{ ...labelStyle, color: color.growth, ...enter(frame) }}>
          A completed action leaves a trace
        </div>
        <h1 style={{ ...headlineStyle, marginTop: 28, ...enter(frame, motion.micro) }}>
          Proof travels
          <br />
          with the work.
        </h1>

        <div
          style={{
            position: 'relative',
            marginTop: 58,
            background: color.panel,
            border: `2px solid ${color.ink}`,
            padding: '38px 42px 44px',
            ...scaleIn(frame, motion.standard)
          }}
        >
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
          >
            <div>
              <div style={{ ...labelStyle, color: color.muted }}>Workflow receipt</div>
              <div
                style={{
                  fontFamily: font.display,
                  fontSize: 46,
                  letterSpacing: '-0.035em',
                  marginTop: 17
                }}
              >
                Launch change / 001
              </div>
            </div>
            <FileCheck2 size={52} strokeWidth={1.5} color={color.growth} />
          </div>

          <div style={{ marginTop: 36, borderTop: `1px solid ${color.line}` }}>
            {receiptRows.map(([label, value], index) => (
              <div
                key={label}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '190px 1fr',
                  gap: 24,
                  alignItems: 'center',
                  minHeight: 94,
                  borderBottom: `1px solid ${color.line}`,
                  ...enter(frame, motion.standard + index * motion.micro, 20)
                }}
              >
                <div style={{ ...labelStyle, fontSize: 17, color: color.muted }}>{label}</div>
                <div
                  style={{ fontFamily: font.sans, fontSize: 29, fontWeight: 600, color: color.ink }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              marginTop: 34
            }}
          >
            <div>
              <div style={{ ...labelStyle, color: color.muted, fontSize: 16 }}>Trace</div>
              <div style={{ fontFamily: font.mono, fontSize: 22, color: color.ink, marginTop: 12 }}>
                signal → decision → outcome
              </div>
            </div>
            <div
              style={{
                border: `3px solid ${color.growth}`,
                color: color.growth,
                padding: '18px 22px',
                transform: `rotate(-3deg) scale(${interpolate(stampProgress, [0, 1], [1.35, 1])})`,
                opacity: stampProgress,
                ...labelStyle,
                fontSize: 18
              }}
            >
              Completed · trace saved
            </div>
          </div>
        </div>
      </div>
    </SceneShell>
  );
};

const CloseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const lineProgress = interpolate(frame, [motion.standard, 70], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: motion.standardEase
  });

  return (
    <SceneShell step="PERFORMANCE LAB" caption={scenes.close.caption} dark>
      <div
        style={{
          position: 'absolute',
          top: 365,
          left: safeArea.left,
          right: safeArea.right,
          color: color.panel
        }}
      >
        <div style={{ ...labelStyle, color: color.signal, ...enter(frame) }}>
          Workflow systems for real work
        </div>
        <h1
          style={{
            ...headlineStyle,
            color: color.panel,
            fontSize: 104,
            marginTop: 44,
            ...enter(frame, motion.micro)
          }}
        >
          Less chasing.
          <br />
          Clear decisions.
          <br />
          Proof that
          <br />
          work moved.
        </h1>

        <div
          style={{
            width: `${lineProgress * 100}%`,
            height: 4,
            background: color.signal,
            marginTop: 70
          }}
        />

        <div
          style={{
            marginTop: 58,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 30,
            ...enter(frame, 66, 20)
          }}
        >
          <div>
            <div style={{ fontFamily: font.display, fontSize: 51, letterSpacing: '-0.035em' }}>
              {WORKFLOW_REEL_SPEC.callToAction}
            </div>
            <div
              style={{
                ...labelStyle,
                fontSize: 17,
                color: 'rgba(255,255,255,0.58)',
                marginTop: 18
              }}
            >
              {WORKFLOW_REEL_SPEC.destination}
            </div>
          </div>
          <div
            style={{
              width: 88,
              height: 88,
              display: 'grid',
              placeItems: 'center',
              color: color.panel,
              background: color.signal
            }}
          >
            <ArrowDown size={42} strokeWidth={1.8} style={{ transform: 'rotate(-90deg)' }} />
          </div>
        </div>
      </div>
    </SceneShell>
  );
};

const ProgressRail: React.FC = () => {
  const frame = useCurrentFrame();
  const progress = frame / (WORKFLOW_REEL_SPEC.durationInFrames - 1);
  return (
    <div
      style={{
        position: 'absolute',
        right: 32,
        top: safeArea.top,
        bottom: safeArea.bottom,
        width: 3,
        background: 'rgba(94,98,104,0.2)',
        zIndex: 20
      }}
    >
      <div style={{ width: '100%', height: `${progress * 100}%`, background: color.signal }} />
    </div>
  );
};

export const WorkflowReel: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: color.paper }}>
    <Audio src={staticFile('sounds/ambient-drone.wav')} volume={0.035} loop />
    <SoundCues
      masterVolume={0.42}
      cues={[
        { frame: 18, sound: 'focus', volume: 0.28 },
        { frame: scenes.scatter.start, sound: 'whoosh-soft', volume: 0.25 },
        { frame: scenes.map.start, sound: 'resolve', volume: 0.25 },
        { frame: scenes.decision.start + 88, sound: 'select', volume: 0.24 },
        { frame: scenes.proof.start + 62, sound: 'success-soft', volume: 0.28 },
        { frame: scenes.close.start, sound: 'success-chime', volume: 0.22 }
      ]}
    />

    <Sequence from={scenes.signal.start} durationInFrames={scenes.signal.duration} premountFor={30}>
      <SignalScene />
    </Sequence>
    <Sequence
      from={scenes.scatter.start}
      durationInFrames={scenes.scatter.duration}
      premountFor={30}
    >
      <ScatterScene />
    </Sequence>
    <Sequence from={scenes.map.start} durationInFrames={scenes.map.duration} premountFor={30}>
      <MapScene />
    </Sequence>
    <Sequence
      from={scenes.decision.start}
      durationInFrames={scenes.decision.duration}
      premountFor={30}
    >
      <DecisionScene />
    </Sequence>
    <Sequence from={scenes.proof.start} durationInFrames={scenes.proof.duration} premountFor={30}>
      <ProofScene />
    </Sequence>
    <Sequence from={scenes.close.start} durationInFrames={scenes.close.duration} premountFor={30}>
      <CloseScene />
    </Sequence>

    <ProgressRail />
  </AbsoluteFill>
);

export const WORKFLOW_REEL_CONFIG = {
  durationInFrames: WORKFLOW_REEL_SPEC.durationInFrames,
  fps: WORKFLOW_REEL_SPEC.fps,
  width: WORKFLOW_REEL_SPEC.width,
  height: WORKFLOW_REEL_SPEC.height
} as const;
