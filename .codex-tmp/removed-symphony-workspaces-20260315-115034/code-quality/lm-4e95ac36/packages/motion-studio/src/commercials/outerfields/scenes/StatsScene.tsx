/**
 * StatsScene - Dashboard glimpse
 *
 * Expands the metrics into a full-width publisher dashboard moment instead
 * of stacking them in a narrow column.
 */
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Users, TrendingUp, Eye } from 'lucide-react';
import { SPEC } from '../spec';

const Counter: React.FC<{
  value: number;
  startFrame: number;
  duration: number;
  suffix?: string;
}> = ({ value, startFrame, duration, suffix = '' }) => {
  const frame = useCurrentFrame();

  const progress = interpolate(
    frame,
    [startFrame, startFrame + duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const eased = 1 - Math.pow(1 - progress, 3);
  return <>{Math.round(value * eased).toLocaleString()}{suffix}</>;
};

const TrendRibbon: React.FC<{ color: string; startFrame: number }> = ({ color, startFrame }) => {
  const frame = useCurrentFrame();
  const values = [16, 24, 20, 38, 34, 46, 42, 58, 54];
  const progress = interpolate(frame, [startFrame, startFrame + 32], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 42 }}>
      {values.map((value, index) => (
        <div
          key={index}
          style={{
            width: 12,
            height: value * progress,
            borderRadius: 999,
            background: color,
            opacity: 0.45 + index * 0.06,
          }}
        />
      ))}
    </div>
  );
};

export const StatsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { scenes, colors, fonts } = SPEC;
  const { stats } = scenes;

  const statsData = [
    { icon: <Users size={20} />, label: 'Subscribers', value: 12847, color: colors.sun },
    { icon: <Eye size={20} />, label: 'Views', value: 847293, color: colors.lavender },
    { icon: <TrendingUp size={20} />, label: 'Engagement', value: 94, suffix: '%', color: '#4ade80' },
  ] as const;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.spaceBlack }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 50% 42%, rgba(124, 43, 238, 0.12) 0%, rgba(244, 81, 38, 0.04) 22%, transparent 62%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 110,
          left: 120,
          right: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: fonts.monoFallback,
          fontSize: 12,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: colors.slate,
        }}
      >
        <span>Publisher intelligence</span>
        <span>Outerfields platform</span>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 180,
          right: 180,
          top: '50%',
          height: 1,
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 18%, rgba(124,43,238,0.28) 50%, rgba(255,255,255,0.08) 82%, transparent 100%)',
        }}
      />

      <AbsoluteFill
        style={{
          padding: '0 120px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
        }}
      >
        {statsData.map((stat, index) => {
          const reveal = spring({
            frame: Math.max(0, frame - 4 - index * 6),
            fps,
            config: { damping: 18, stiffness: 90, mass: 0.95 },
          });

          return (
            <div
              key={stat.label}
              style={{
                flex: 1,
                maxWidth: 420,
                minHeight: 260,
                padding: '30px 32px',
                borderRadius: 28,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.025) 100%)',
                border: `1px solid rgba(255,255,255,${0.1 + index * 0.02})`,
                boxShadow: '0 28px 80px rgba(0,0,0,0.34)',
                opacity: reveal,
                transform: `translateY(${interpolate(reveal, [0, 1], [44, 0])}px) scale(${interpolate(reveal, [0, 1], [0.96, 1])})`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    fontFamily: fonts.monoFallback,
                    fontSize: 12,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: colors.slate,
                  }}
                >
                  <span style={{ color: stat.color }}>{stat.icon}</span>
                  <span>{stat.label}</span>
                </div>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: stat.color,
                    boxShadow: `0 0 24px ${stat.color}`,
                    opacity: 0.8,
                  }}
                />
              </div>

              <div
                style={{
                  fontFamily: fonts.sansFallback,
                  fontSize: 58,
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: '-0.05em',
                  color: colors.snow,
                  marginTop: 18,
                }}
              >
                <Counter
                  value={stat.value}
                  startFrame={stats.countStart + index * 6}
                  duration={stats.countDuration}
                  suffix={'suffix' in stat ? stat.suffix : undefined}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 24,
                }}
              >
                <div
                  style={{
                    fontFamily: fonts.sansFallback,
                    fontSize: 14,
                    color: colors.slate,
                  }}
                >
                  Last 30 days
                </div>
                <TrendRibbon color={stat.color} startFrame={stats.countStart + 12 + index * 6} />
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default StatsScene;
