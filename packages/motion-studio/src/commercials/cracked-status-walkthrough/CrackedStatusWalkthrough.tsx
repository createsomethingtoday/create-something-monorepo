import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {
  ArrowRight,
  Check,
  CirclePause,
  FileInput,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { typography } from '../../styles';

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;
const DURATION = 1950;

const palette = {
  background: '#090909',
  surface: '#121212',
  elevated: '#191919',
  border: '#2b2b2b',
  borderStrong: '#444444',
  foreground: '#f7f7f5',
  secondary: '#b8b8b2',
  muted: '#777772',
  orange: '#ff7a1a',
  orangeSoft: 'rgba(255, 122, 26, 0.14)',
  green: '#68d391',
  red: '#ff7c70',
};

const sceneFrames = {
  intro: { from: 0, duration: 255 },
  flow: { from: 255, duration: 390 },
  mapping: { from: 645, duration: 510 },
  noWrite: { from: 1155, duration: 180 },
  distinction: { from: 1335, duration: 135 },
  safeAgent: { from: 1470, duration: 225 },
  close: { from: 1695, duration: 255 },
};

const fadeThrough = (frame: number, duration: number) =>
  interpolate(frame, [0, 14, duration - 18, duration], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const Scene: React.FC<{
  duration: number;
  children: React.ReactNode;
  align?: 'center' | 'start';
}> = ({ duration, children, align = 'start' }) => {
  const frame = useCurrentFrame();
  const entrance = spring({
    frame,
    fps: FPS,
    config: { damping: 24, stiffness: 130, mass: 0.85 },
  });

  return (
    <AbsoluteFill
      style={{
        padding: '120px 140px 110px',
        opacity: fadeThrough(frame, duration),
        transform: `translateY(${interpolate(entrance, [0, 1], [22, 0])}px)`,
        justifyContent: align === 'center' ? 'center' : 'flex-start',
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      color: palette.orange,
      fontFamily: typography.fontFamily.mono,
      fontSize: 20,
      fontWeight: 500,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      marginBottom: 22,
    }}
  >
    {children}
  </div>
);

const Title: React.FC<{ children: React.ReactNode; maxWidth?: number }> = ({
  children,
  maxWidth = 1380,
}) => (
  <h1
    style={{
      color: palette.foreground,
      fontFamily: typography.fontFamily.sans,
      fontSize: 76,
      fontWeight: 500,
      letterSpacing: '-0.04em',
      lineHeight: 1.04,
      margin: 0,
      maxWidth,
    }}
  >
    {children}
  </h1>
);

const Body: React.FC<{ children: React.ReactNode; maxWidth?: number }> = ({
  children,
  maxWidth = 1180,
}) => (
  <p
    style={{
      color: palette.secondary,
      fontFamily: typography.fontFamily.sans,
      fontSize: 30,
      fontWeight: 400,
      lineHeight: 1.45,
      margin: '30px 0 0',
      maxWidth,
    }}
  >
    {children}
  </p>
);

const SystemCard: React.FC<{
  label: string;
  title: string;
  detail: string;
  icon: React.ReactNode;
  active?: boolean;
  width?: number;
}> = ({ label, title, detail, icon, active = false, width = 420 }) => (
  <div
    style={{
      width,
      minHeight: 250,
      padding: 36,
      borderRadius: 24,
      border: `1px solid ${active ? palette.orange : palette.border}`,
      background: active ? palette.orangeSoft : palette.surface,
      boxShadow: active ? '0 0 70px rgba(255, 122, 26, 0.12)' : 'none',
    }}
  >
    <div style={{ color: active ? palette.orange : palette.muted, marginBottom: 34 }}>{icon}</div>
    <div
      style={{
        color: palette.muted,
        fontFamily: typography.fontFamily.mono,
        fontSize: 16,
        letterSpacing: '0.11em',
        textTransform: 'uppercase',
        marginBottom: 12,
      }}
    >
      {label}
    </div>
    <div
      style={{
        color: palette.foreground,
        fontFamily: typography.fontFamily.sans,
        fontSize: 34,
        fontWeight: 500,
        marginBottom: 12,
      }}
    >
      {title}
    </div>
    <div
      style={{
        color: palette.secondary,
        fontFamily: typography.fontFamily.sans,
        fontSize: 22,
        lineHeight: 1.4,
      }}
    >
      {detail}
    </div>
  </div>
);

const MappingRow: React.FC<{
  from: string;
  to: string;
  delay: number;
  grouped?: boolean;
}> = ({ from, to, delay, grouped = false }) => {
  const frame = useCurrentFrame();
  const progress = spring({
    frame: frame - delay,
    fps: FPS,
    config: { damping: 22, stiffness: 150 },
  });

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 78px 1fr',
        alignItems: 'center',
        gap: 18,
        opacity: progress,
        transform: `translateX(${interpolate(progress, [0, 1], [-28, 0])}px)`,
      }}
    >
      <div
        style={{
          padding: '22px 28px',
          borderRadius: 15,
          border: `1px solid ${palette.border}`,
          background: palette.surface,
          color: palette.foreground,
          fontFamily: typography.fontFamily.sans,
          fontSize: grouped ? 22 : 25,
          lineHeight: 1.25,
        }}
      >
        {from}
      </div>
      <ArrowRight size={30} color={palette.muted} style={{ margin: '0 auto' }} />
      <div
        style={{
          padding: '22px 28px',
          borderRadius: 15,
          border: `1px solid ${palette.orange}`,
          background: palette.orangeSoft,
          color: palette.foreground,
          fontFamily: typography.fontFamily.sans,
          fontSize: 25,
          fontWeight: 500,
        }}
      >
        {to}
      </div>
    </div>
  );
};

const Step: React.FC<{
  number: string;
  title: string;
  icon: React.ReactNode;
  delay: number;
}> = ({ number, title, icon, delay }) => {
  const frame = useCurrentFrame();
  const progress = spring({
    frame: frame - delay,
    fps: FPS,
    config: { damping: 20, stiffness: 120 },
  });

  return (
    <div
      style={{
        flex: 1,
        minHeight: 190,
        padding: 28,
        borderRadius: 20,
        border: `1px solid ${palette.border}`,
        background: palette.surface,
        opacity: progress,
        transform: `translateY(${interpolate(progress, [0, 1], [25, 0])}px)`,
      }}
    >
      <div style={{ color: palette.orange, marginBottom: 30 }}>{icon}</div>
      <div
        style={{
          color: palette.muted,
          fontFamily: typography.fontFamily.mono,
          fontSize: 15,
          letterSpacing: '0.12em',
          marginBottom: 10,
        }}
      >
        {number}
      </div>
      <div
        style={{
          color: palette.foreground,
          fontFamily: typography.fontFamily.sans,
          fontSize: 26,
          fontWeight: 500,
          lineHeight: 1.25,
        }}
      >
        {title}
      </div>
    </div>
  );
};

const Background: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundColor: palette.background,
      backgroundImage:
        'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
      backgroundSize: '72px 72px',
    }}
  />
);

const ProgressRail: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const width = interpolate(frame, [0, durationInFrames], [0, 100], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: 140,
        right: 140,
        bottom: 58,
        height: 3,
        background: palette.border,
      }}
    >
      <div style={{ height: '100%', width: `${width}%`, background: palette.orange }} />
    </div>
  );
};

const CornerLabel: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      top: 54,
      right: 70,
      color: palette.muted,
      fontFamily: typography.fontFamily.mono,
      fontSize: 15,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
    }}
  >
    Half Dozen × Cracked Live
  </div>
);

export const CrackedStatusWalkthrough: React.FC = () => (
  <AbsoluteFill style={{ background: palette.background }}>
    <Background />
    <Audio src={staticFile('audio/cracked-status-walkthrough/voiceover-mark-v3.mp3')} volume={1} />
    <Sequence from={sceneFrames.intro.from} durationInFrames={sceneFrames.intro.duration} name="Intro">
      <Scene duration={sceneFrames.intro.duration} align="center">
        <Eyebrow>Ticket status sync</Eyebrow>
        <Title maxWidth={1320}>How the Cracked Live ticket sync works</Title>
        <Body>Cracked Live sends us the ticket. Half Dozen works it. The sync sends the progress back.</Body>
      </Scene>
    </Sequence>

    <Sequence from={sceneFrames.flow.from} durationInFrames={sceneFrames.flow.duration} name="Ticket flow">
      <Scene duration={sceneFrames.flow.duration}>
        <Eyebrow>Three simple steps</Eyebrow>
        <Title>Send it. Match it. Work it.</Title>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 42,
            marginTop: 72,
          }}
        >
          <SystemCard
            label="Client workspace"
            title="Cracked Live"
            detail="Sends the request."
            icon={<FileInput size={42} strokeWidth={1.6} />}
          />
          <ArrowRight size={42} color={palette.orange} />
          <SystemCard
            label="Sync"
            title="Find the match"
            detail="Keeps one ticket connected in both places."
            icon={<RefreshCw size={42} strokeWidth={1.6} />}
            active
          />
          <ArrowRight size={42} color={palette.orange} />
          <SystemCard
            label="Internal workspace"
            title="Half Dozen"
            detail="Assigns and works the ticket."
            icon={<Users size={42} strokeWidth={1.6} />}
          />
        </div>
      </Scene>
    </Sequence>

    <Sequence from={sceneFrames.mapping.from} durationInFrames={sceneFrames.mapping.duration} name="Status map">
      <Scene duration={sceneFrames.mapping.duration}>
        <Eyebrow>The status map</Eyebrow>
        <Title>Half Dozen says it. Cracked Live sees it.</Title>
        <div style={{ display: 'grid', gap: 16, marginTop: 55, maxWidth: 1420 }}>
          <MappingRow from="Not Started" to="Submitted" delay={12} />
          <MappingRow
            from="Responded · Client Action · Assigned · Needs Review"
            to="Under Review"
            delay={26}
            grouped
          />
          <MappingRow from="In Progress" to="In Progress" delay={40} />
          <MappingRow from="Roadblock" to="Roadblock" delay={54} />
          <MappingRow from="Complete" to="Complete" delay={68} />
        </div>
      </Scene>
    </Sequence>

    <Sequence from={sceneFrames.noWrite.from} durationInFrames={sceneFrames.noWrite.duration} name="No-write states">
      <Scene duration={sceneFrames.noWrite.duration} align="center">
        <Eyebrow>Rule one</Eyebrow>
        <Title>Backburner and Archive mean no change.</Title>
        <Body>Cracked Live keeps its current status. Archive does not map to Archive.</Body>
        <div style={{ display: 'flex', gap: 20, marginTop: 45 }}>
          {['Backburner', 'Archive'].map((status) => (
            <div
              key={status}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '18px 24px',
                borderRadius: 999,
                border: `1px solid ${palette.borderStrong}`,
                background: palette.surface,
                color: palette.foreground,
                fontFamily: typography.fontFamily.mono,
                fontSize: 20,
              }}
            >
              <CirclePause size={24} color={palette.muted} />
              {status} · no change
            </div>
          ))}
        </div>
      </Scene>
    </Sequence>

    <Sequence
      from={sceneFrames.distinction.from}
      durationInFrames={sceneFrames.distinction.duration}
      name="Client Action distinction"
    >
      <Scene duration={sceneFrames.distinction.duration}>
        <Eyebrow>Rule two</Eyebrow>
        <Title>Client Action is not Action Required.</Title>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30, marginTop: 65 }}>
          <SystemCard
            label="Half Dozen"
            title="Client Action"
            detail="Cracked Live sees Under Review."
            icon={<Users size={42} strokeWidth={1.6} />}
            active
            width={720}
          />
          <SystemCard
            label="Cracked Live"
            title="Action Required"
            detail="The client needs to do something. No HD status sets this automatically."
            icon={<ShieldCheck size={42} strokeWidth={1.6} />}
            width={720}
          />
        </div>
        <Body>The agent reports a mismatch. It does not guess which status is right.</Body>
      </Scene>
    </Sequence>

    <Sequence from={sceneFrames.safeAgent.from} durationInFrames={sceneFrames.safeAgent.duration} name="Safe agent use">
      <Scene duration={sceneFrames.safeAgent.duration}>
        <Eyebrow>If something looks wrong</Eyebrow>
        <Title>Check before you change anything.</Title>
        <div style={{ display: 'flex', gap: 20, marginTop: 70 }}>
          <Step number="01" title="Check the connection" icon={<ShieldCheck size={38} />} delay={10} />
          <Step number="02" title="Compare the ticket in both places" icon={<Search size={38} />} delay={25} />
          <Step number="03" title="Fix only what is wrong" icon={<RefreshCw size={38} />} delay={40} />
          <Step number="04" title="Check again" icon={<Check size={38} />} delay={55} />
        </div>
        <Body maxWidth={1400}>
          Stop if there are two possible matches or if it is not clear which team owns a field.
        </Body>
      </Scene>
    </Sequence>

    <Sequence from={sceneFrames.close.from} durationInFrames={sceneFrames.close.duration} name="Close">
      <Scene duration={sceneFrames.close.duration} align="center">
        <Eyebrow>That is the whole flow</Eyebrow>
        <Title maxWidth={1200}>One ticket. Clear progress.</Title>
        <Body>Cracked Live sends it. Half Dozen works it. The sync sends the progress back.</Body>
      </Scene>
    </Sequence>

    <CornerLabel />
    <ProgressRail />
  </AbsoluteFill>
);

export const CRACKED_STATUS_WALKTHROUGH_CONFIG = {
  id: 'CrackedStatusWalkthrough',
  component: CrackedStatusWalkthrough,
  durationInFrames: DURATION,
  fps: FPS,
  width: WIDTH,
  height: HEIGHT,
};

export default CrackedStatusWalkthrough;
