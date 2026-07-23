import React from 'react';
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame } from 'remotion';
import {
  Bot,
  Check,
  Code2,
  Pause,
  Play,
  Radio,
  ReceiptText,
  ShieldCheck,
  Square,
  UserRoundCheck
} from 'lucide-react';

import { performance } from '../workflow-reel/performance';
import type {
  WorkflowActor,
  WorkflowFilmEvent,
  WorkflowFilmScene,
  WorkflowFilmSpec,
  WorkflowRunState
} from './schema';

const { color, font, motion } = performance;

type IconComponent = React.ComponentType<{
  size?: number;
  strokeWidth?: number;
  color?: string;
}>;

const actorMeta: Record<
  WorkflowActor,
  { label: string; mode: string; icon: IconComponent; foreground: string; background: string }
> = {
  system: {
    label: 'System',
    mode: 'Observed state',
    icon: Radio,
    foreground: color.signal,
    background: color.signalSoft
  },
  agent: {
    label: 'Agent',
    mode: 'MCP-connected work',
    icon: Bot,
    foreground: color.signal,
    background: color.signalSoft
  },
  function: {
    label: 'Function',
    mode: 'Programmatic work',
    icon: Code2,
    foreground: color.growth,
    background: color.growthSoft
  },
  human: {
    label: 'Human',
    mode: 'Judgment boundary',
    icon: UserRoundCheck,
    foreground: color.review,
    background: color.reviewSoft
  }
};

const stateMeta: Record<
  WorkflowRunState,
  { label: string; icon: IconComponent; foreground: string; background: string }
> = {
  signal: {
    label: 'Signal',
    icon: Radio,
    foreground: color.signal,
    background: color.signalSoft
  },
  running: {
    label: 'Running',
    icon: Play,
    foreground: color.growth,
    background: color.growthSoft
  },
  waiting: {
    label: 'Waiting',
    icon: Pause,
    foreground: color.review,
    background: color.reviewSoft
  },
  continued: {
    label: 'Continued',
    icon: Play,
    foreground: color.growth,
    background: color.growthSoft
  },
  stopped: {
    label: 'Stopped',
    icon: Square,
    foreground: color.risk,
    background: color.riskSoft
  },
  completed: {
    label: 'Completed',
    icon: Check,
    foreground: color.growth,
    background: color.growthSoft
  }
};

const labelStyle: React.CSSProperties = {
  fontFamily: font.mono,
  fontSize: 20,
  lineHeight: 1,
  letterSpacing: '0.13em',
  textTransform: 'uppercase',
  fontWeight: 650
};

const enter = (frame: number, delay = 0, distance = 32): React.CSSProperties => {
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

const formatClock = (minute: number, startMinuteOfDay: number): string => {
  const absolute = startMinuteOfDay + Math.max(0, Math.round(minute));
  const day = Math.floor(absolute / 1440);
  const withinDay = absolute % 1440;
  const hours = Math.floor(withinDay / 60);
  const minutes = withinDay % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}${day > 0 ? ' +1' : ''}`;
};

const formatSpan = (minute: number): string => {
  const hours = Math.floor(minute / 60);
  const minutes = Math.round(minute % 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const minuteAtFrame = (spec: WorkflowFilmSpec, frame: number): number => {
  const scene =
    spec.scenes.find(
      (candidate) => frame >= candidate.start && frame < candidate.start + candidate.duration
    ) ?? spec.scenes.at(-1)!;
  const events = scene.eventIds.map((id) => {
    const event = spec.events.find((candidate) => candidate.id === id);
    if (!event) throw new Error(`Unknown workflow event ${id}`);
    return event;
  });
  const localFrame = Math.max(0, frame - scene.start);
  const activeIndex = Math.min(
    events.length - 1,
    Math.floor(
      interpolate(localFrame, [0, Math.max(1, scene.duration - 1)], [0, events.length], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp'
      })
    )
  );
  return events[Math.max(0, activeIndex)]?.minute ?? 0;
};

export const WorkflowFilmTimeRail: React.FC<{ spec: WorkflowFilmSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const minute = minuteAtFrame(spec, frame);
  const progress = minute / spec.workflow.spanMinutes;
  const receiptCount = spec.events.filter((event) => event.minute <= minute).length;
  const dark = frame >= spec.scenes.at(-1)!.start;
  const railLine = dark ? 'rgba(255,255,255,0.24)' : color.lineStrong;
  return (
    <div
      style={{
        position: 'absolute',
        top: 222,
        left: spec.safeArea.left,
        right: spec.safeArea.right,
        zIndex: 20
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div
          style={{
            fontFamily: font.mono,
            fontSize: 42,
            fontWeight: 650,
            letterSpacing: '-0.04em',
            color: dark ? color.panel : color.ink
          }}
        >
          {formatClock(minute, spec.workflow.startMinuteOfDay)}
        </div>
        <div style={{ ...labelStyle, color: dark ? 'rgba(255,255,255,0.58)' : color.muted }}>
          {String(receiptCount).padStart(2, '0')} / {spec.events.length} receipts
        </div>
      </div>
      <div
        style={{
          position: 'relative',
          height: 4,
          background: railLine,
          marginTop: 18
        }}
      >
        <div style={{ width: `${progress * 100}%`, height: '100%', background: color.signal }} />
        {[0, 0.25, 0.5, 0.75, 1].map((position) => (
          <div
            key={position}
            style={{
              position: 'absolute',
              left: `${position * 100}%`,
              top: -5,
              width: 2,
              height: 14,
              background: position <= progress ? color.signal : railLine
            }}
          />
        ))}
      </div>
      <div
        style={{
          marginTop: 10,
          display: 'flex',
          justifyContent: 'space-between',
          ...labelStyle,
          fontSize: 14,
          color: dark ? 'rgba(255,255,255,0.58)' : color.muted
        }}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((position) => (
          <span key={position}>
            {formatClock(spec.workflow.spanMinutes * position, spec.workflow.startMinuteOfDay)}
          </span>
        ))}
      </div>
    </div>
  );
};

const Header: React.FC<{ spec: WorkflowFilmSpec; label: string; dark?: boolean }> = ({
  spec,
  label,
  dark = false
}) => (
  <div
    style={{
      position: 'absolute',
      top: spec.safeArea.top,
      left: spec.safeArea.left,
      right: spec.safeArea.right,
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      color: dark ? color.panel : color.ink,
      zIndex: 20
    }}
  >
    <div style={{ ...labelStyle, whiteSpace: 'nowrap' }}>CREATE SOMETHING</div>
    <div
      style={{
        height: 1,
        background: dark ? 'rgba(255,255,255,0.25)' : color.lineStrong,
        flex: 1
      }}
    />
    <div style={{ ...labelStyle, color: dark ? 'rgba(255,255,255,0.62)' : color.muted }}>
      {label}
    </div>
  </div>
);

const Caption: React.FC<{
  spec: WorkflowFilmSpec;
  children: React.ReactNode;
  dark?: boolean;
}> = ({ spec, children, dark = false }) => (
  <div
    style={{
      position: 'absolute',
      left: spec.safeArea.left,
      right: spec.safeArea.right,
      bottom: spec.safeArea.bottom,
      minHeight: 112,
      borderTop: `2px solid ${dark ? 'rgba(255,255,255,0.3)' : color.ink}`,
      paddingTop: 24,
      color: dark ? color.panel : color.ink,
      fontFamily: font.sans,
      fontSize: 30,
      lineHeight: 1.25,
      fontWeight: 600,
      letterSpacing: '-0.018em'
    }}
  >
    {children}
  </div>
);

const Signature: React.FC<{ event: WorkflowFilmEvent }> = ({ event }) => {
  const actor = actorMeta[event.actor];
  const state = stateMeta[event.state];
  const ActorIcon = actor.icon;
  const StateIcon = state.icon;
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          padding: '12px 16px',
          border: `1px solid ${actor.foreground}`,
          color: actor.foreground,
          background: actor.background,
          ...labelStyle,
          fontSize: 16
        }}
      >
        <ActorIcon size={20} strokeWidth={2} />
        {actor.label} · {actor.mode}
      </div>
      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          padding: '12px 16px',
          border: `1px solid ${state.foreground}`,
          color: state.foreground,
          background: state.background,
          ...labelStyle,
          fontSize: 16
        }}
      >
        <StateIcon size={20} strokeWidth={2} />
        {state.label}
      </div>
    </div>
  );
};

const EventCard: React.FC<{ event: WorkflowFilmEvent; frame: number }> = ({ event, frame }) => {
  const actor = actorMeta[event.actor];
  const Icon = actor.icon;
  const progress = spring({
    fps: 30,
    frame,
    config: { damping: 22, stiffness: 125, mass: 0.9 },
    durationInFrames: motion.slow
  });
  return (
    <div
      style={{
        border: `2px solid ${actor.foreground}`,
        background: color.panel,
        padding: 34,
        opacity: progress,
        transform: `translateY(${interpolate(progress, [0, 1], [30, 0])}px)`,
        boxShadow: '0 22px 60px rgba(20,24,28,0.07)'
      }}
    >
      <Signature event={event} />
      <div style={{ display: 'flex', gap: 22, alignItems: 'flex-start', marginTop: 30 }}>
        <div style={{ padding: 15, background: actor.background, color: actor.foreground }}>
          <Icon size={34} strokeWidth={1.9} />
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: font.display,
              fontSize: 54,
              lineHeight: 1,
              letterSpacing: '-0.04em',
              color: color.ink
            }}
          >
            {event.title}
          </div>
          <div
            style={{
              marginTop: 20,
              fontFamily: font.sans,
              fontSize: 28,
              lineHeight: 1.28,
              letterSpacing: '-0.018em',
              color: color.inkSoft
            }}
          >
            {event.summary}
          </div>
        </div>
      </div>
      {event.capability ? (
        <div
          style={{
            marginTop: 28,
            paddingTop: 22,
            borderTop: `1px solid ${color.lineStrong}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 20
          }}
        >
          <span style={{ ...labelStyle, fontSize: 15, color: color.muted }}>Capability</span>
          <span
            style={{
              fontFamily: font.mono,
              fontSize: 20,
              color: actor.foreground,
              textAlign: 'right'
            }}
          >
            {event.capability}
          </span>
        </div>
      ) : null}
    </div>
  );
};

const ActivityRail: React.FC<{
  events: readonly WorkflowFilmEvent[];
  activeIndex: number;
}> = ({ events, activeIndex }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${events.length}, 1fr)`, gap: 10 }}>
    {events.map((event, index) => {
      const actor = actorMeta[event.actor];
      return (
        <div
          key={event.id}
          style={{
            borderTop: `4px solid ${index <= activeIndex ? actor.foreground : color.lineStrong}`,
            paddingTop: 12,
            opacity: index <= activeIndex ? 1 : 0.42,
            minWidth: 0
          }}
        >
          <div style={{ ...labelStyle, color: actor.foreground, fontSize: 13 }}>{event.clock}</div>
          <div
            style={{
              marginTop: 8,
              fontFamily: font.sans,
              fontSize: 17,
              lineHeight: 1.12,
              color: color.ink,
              overflow: 'hidden'
            }}
          >
            {event.title}
          </div>
        </div>
      );
    })}
  </div>
);

const ReceiptStrip: React.FC<{
  receipts: readonly WorkflowFilmEvent[];
  activeIndex: number;
}> = ({ receipts, activeIndex }) => {
  const visible = receipts.slice(0, activeIndex + 1).slice(-3);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {visible.map((event) => {
        const meta = stateMeta[event.state];
        return (
          <div
            key={event.receipt.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '90px 1fr auto',
              gap: 18,
              alignItems: 'center',
              padding: '14px 16px',
              border: `1px solid ${color.lineStrong}`,
              background: 'rgba(255,255,255,0.84)'
            }}
          >
            <div style={{ ...labelStyle, fontSize: 14, color: meta.foreground }}>
              {event.receipt.id}
            </div>
            <div
              style={{
                fontFamily: font.sans,
                fontSize: 20,
                fontWeight: 600,
                color: color.ink
              }}
            >
              {event.receipt.label}
            </div>
            <ReceiptText size={21} strokeWidth={1.8} color={meta.foreground} />
          </div>
        );
      })}
    </div>
  );
};

const GatePanel: React.FC<{
  gateEvent: WorkflowFilmEvent;
  safeEvent?: WorkflowFilmEvent;
  frame: number;
}> = ({ gateEvent, safeEvent, frame }) => {
  const gate = gateEvent.gate;
  if (!gate) return null;
  const safeVisible = interpolate(frame, [70, 105], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });
  return (
    <div
      style={{
        border: `2px solid ${color.review}`,
        background: color.panel,
        padding: 32,
        boxShadow: '0 22px 60px rgba(20,24,28,0.07)'
      }}
    >
      <Signature event={gateEvent} />
      <div
        style={{
          marginTop: 28,
          fontFamily: font.display,
          fontSize: 50,
          lineHeight: 1,
          letterSpacing: '-0.04em',
          color: color.ink
        }}
      >
        {gate.prompt}
      </div>
      <div style={{ marginTop: 26, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div
          style={{
            border: `1px solid ${color.growth}`,
            background: color.growthSoft,
            padding: 20
          }}
        >
          <div style={{ ...labelStyle, fontSize: 14, color: color.growth }}>Approve</div>
          <div style={{ marginTop: 10, fontFamily: font.sans, fontSize: 24, color: color.ink }}>
            Continue from checkpoint
          </div>
        </div>
        <div style={{ border: `1px solid ${color.risk}`, background: color.riskSoft, padding: 20 }}>
          <div style={{ ...labelStyle, fontSize: 14, color: color.risk }}>Reject / timeout</div>
          <div style={{ marginTop: 10, fontFamily: font.sans, fontSize: 24, color: color.ink }}>
            Stop mutation · keep checkpoint
          </div>
        </div>
      </div>
      <div
        style={{
          marginTop: 20,
          borderTop: `1px solid ${color.lineStrong}`,
          paddingTop: 20,
          opacity: safeVisible,
          transform: `translateY(${(1 - safeVisible) * 16}px)`
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Play size={22} color={color.growth} />
          <div style={{ ...labelStyle, fontSize: 15, color: color.growth }}>
            Safe work still running
          </div>
        </div>
        <div
          style={{
            marginTop: 12,
            fontFamily: font.sans,
            fontSize: 24,
            color: color.inkSoft
          }}
        >
          {safeEvent?.title ?? gate.safeWorkWhileWaiting.join(' · ')}
        </div>
      </div>
    </div>
  );
};

const ProofClose: React.FC<{ spec: WorkflowFilmSpec; frame: number }> = ({ spec, frame }) => (
  <div style={{ ...enter(frame, 0, 26) }}>
    <div style={{ ...labelStyle, color: color.signal }}>{spec.closingLabel}</div>
    <div
      style={{
        marginTop: 30,
        fontFamily: font.display,
        fontSize: 82,
        lineHeight: 0.94,
        letterSpacing: '-0.052em',
        color: color.panel
      }}
    >
      {spec.closingLines.map((line) => (
        <React.Fragment key={line}>
          {line}
          <br />
        </React.Fragment>
      ))}
    </div>
    <div
      style={{
        marginTop: 44,
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12
      }}
    >
      {[
        [`${spec.events.length}`, 'receipts'],
        [
          String(spec.events.filter((event) => event.actor === 'human').length).padStart(2, '0'),
          'human decision'
        ],
        [formatSpan(spec.workflow.spanMinutes), 'governed run']
      ].map(([value, label]) => (
        <div
          key={label}
          style={{ borderTop: `2px solid ${color.signal}`, paddingTop: 16, color: color.panel }}
        >
          <div style={{ fontFamily: font.mono, fontSize: 30, color: color.signal }}>{value}</div>
          <div style={{ ...labelStyle, fontSize: 12, marginTop: 8, color: color.muted }}>
            {label}
          </div>
        </div>
      ))}
    </div>
    <div
      style={{
        marginTop: 44,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: `2px solid ${color.signal}`,
        paddingTop: 20,
        color: color.panel
      }}
    >
      <div>
        <div style={{ fontFamily: font.sans, fontSize: 30 }}>{spec.callToAction}</div>
        <div style={{ ...labelStyle, fontSize: 12, color: color.muted, marginTop: 9 }}>
          {spec.destination}
        </div>
      </div>
      <div style={{ background: color.signal, padding: 16 }}>
        <ShieldCheck size={28} color={color.panel} strokeWidth={1.8} />
      </div>
    </div>
  </div>
);

const WorkflowScene: React.FC<{
  spec: WorkflowFilmSpec;
  scene: WorkflowFilmScene;
  sceneIndex: number;
}> = ({ spec, scene, sceneIndex }) => {
  const frame = useCurrentFrame();
  const events = scene.eventIds.map((id) => {
    const event = spec.events.find((candidate) => candidate.id === id);
    if (!event) throw new Error(`Unknown workflow event ${id}`);
    return event;
  });
  const activeIndex = Math.min(
    events.length - 1,
    Math.floor(
      interpolate(frame, [0, Math.max(1, scene.duration - 1)], [0, events.length], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp'
      })
    )
  );
  const activeEvent = events[Math.max(0, activeIndex)];
  const gateEvent = events.find((event) => event.gate);
  const isClose = sceneIndex === spec.scenes.length - 1;

  return (
    <AbsoluteFill>
      <GridBackground dark={isClose} />
      <Header spec={spec} label={scene.label} dark={isClose} />
      {!isClose ? (
        <div
          style={{
            position: 'absolute',
            top: 342,
            left: spec.safeArea.left,
            right: spec.safeArea.right
          }}
        >
          <div style={{ ...labelStyle, color: color.signal, ...enter(frame, 0) }}>
            {scene.title}
          </div>
          <div style={{ marginTop: 26 }}>
            <ActivityRail events={events} activeIndex={activeIndex} />
          </div>
          <div style={{ marginTop: 34 }}>
            {gateEvent ? (
              <GatePanel
                gateEvent={gateEvent}
                safeEvent={events.find((event) => event.id !== gateEvent.id)}
                frame={frame}
              />
            ) : (
              <EventCard key={activeEvent.id} event={activeEvent} frame={frame % 70} />
            )}
          </div>
          <div style={{ marginTop: 26 }}>
            <ReceiptStrip receipts={events} activeIndex={activeIndex} />
          </div>
        </div>
      ) : (
        <div
          style={{
            position: 'absolute',
            top: 330,
            left: spec.safeArea.left,
            right: spec.safeArea.right
          }}
        >
          <ProofClose spec={spec} frame={frame} />
        </div>
      )}
      <Caption spec={spec} dark={isClose}>
        {scene.caption}
      </Caption>
    </AbsoluteFill>
  );
};

const ProductFilmAccent: React.FC<{ spec: WorkflowFilmSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const strength = Object.values(spec.music.hitFrames).reduce<number>((strongest, hitFrame) => {
    const delta = frame - hitFrame;
    if (delta < -4 || delta > 20) return strongest;
    const value =
      delta < 0
        ? interpolate(delta, [-4, 0], [0, 0.35])
        : interpolate(delta, [0, 20], [1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp'
          });
    return Math.max(strongest, value);
  }, 0);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 18 }}>
      <div
        style={{
          position: 'absolute',
          inset: 22,
          border: `1px solid ${color.signal}`,
          opacity: strength * 0.2
        }}
      />
    </AbsoluteFill>
  );
};

export const WorkflowFilm: React.FC<{ spec: WorkflowFilmSpec }> = ({ spec }) => (
  <AbsoluteFill style={{ backgroundColor: color.paper }}>
    {spec.scenes.map((scene, sceneIndex) => (
      <Sequence
        key={scene.id}
        from={scene.start}
        durationInFrames={scene.duration}
        premountFor={30}
      >
        <WorkflowScene spec={spec} scene={scene} sceneIndex={sceneIndex} />
      </Sequence>
    ))}
    <WorkflowFilmTimeRail spec={spec} />
    <ProductFilmAccent spec={spec} />
  </AbsoluteFill>
);
