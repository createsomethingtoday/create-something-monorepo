/**
 * CloseScene - Brand reveal closing
 *
 * The walkthrough concludes with the brand.
 * "Tend to what matters."
 */
import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { WALKTHROUGH_SPEC } from '../spec';

export const CloseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colors, scenes, animation, product, sources, metrics, inboxItems, fonts } = WALKTHROUGH_SPEC;
  const { phases } = scenes.close;

  const sceneOpacity = interpolate(
    frame,
    [0, phases.silenceIn.duration],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );

  const logoSpring = spring({
    frame: frame - phases.logoReveal.start,
    fps,
    config: animation.springConfig,
  });

  const logoOpacity = interpolate(logoSpring, [0, 1], [0, 1]);
  const logoScale = interpolate(logoSpring, [0, 1], [0.95, 1]);

  const taglineSpring = spring({
    frame: frame - phases.taglineReveal.start,
    fps,
    config: animation.springConfig,
  });

  const taglineOpacity = interpolate(taglineSpring, [0, 1], [0, 1]);
  const taglineY = interpolate(taglineSpring, [0, 1], [20, 0]);

  const urlOpacity = interpolate(
    frame,
    [phases.taglineReveal.start + 60, phases.taglineReveal.start + 90],
    [0, 0.5],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const fadeOut = interpolate(
    frame,
    [phases.silenceOut.start + phases.silenceOut.duration - 60, phases.silenceOut.start + phases.silenceOut.duration],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const panelReveal = spring({
    frame: frame - 10,
    fps,
    config: { damping: 18, stiffness: 86, mass: 0.95 },
  });

  const systemPulse = interpolate(frame, [0, phases.silenceOut.start], [0.7, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const closeOpacity = sceneOpacity * fadeOut;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: colors.bgBase,
        position: 'relative',
        overflow: 'hidden',
        opacity: closeOpacity,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 24% 32%, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 18%, transparent 46%), radial-gradient(circle at 78% 54%, rgba(68,170,68,0.10) 0%, rgba(68,170,68,0.03) 22%, transparent 48%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 172,
          left: 240,
          right: 240,
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: fonts.mono,
          fontSize: 24,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: colors.fgMuted,
        }}
      >
        <span>Operational clarity</span>
        <span>{`${sources.length} sources connected`}</span>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 220,
          bottom: 180,
          left: '50%',
          width: 1,
          background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.08) 14%, rgba(255,255,255,0.18) 48%, rgba(255,255,255,0.08) 82%, transparent 100%)',
          opacity: 0.65,
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: '260px 240px 190px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 140,
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 34,
          }}
        >
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 24,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: colors.fgMuted,
              opacity: logoOpacity,
            }}
          >
            Tend to what matters
          </div>

          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 230,
              fontWeight: 700,
              lineHeight: 0.9,
              letterSpacing: '0.08em',
              color: colors.fgPrimary,
              opacity: logoOpacity,
              transform: `scale(${logoScale})`,
              transformOrigin: 'left center',
            }}
          >
            {product.name}
          </div>

          <div
            style={{
              fontFamily: fonts.sans,
              fontSize: 74,
              fontWeight: 400,
              lineHeight: 1.04,
              color: colors.fgSecondary,
              opacity: taglineOpacity,
              transform: `translateY(${taglineY}px)`,
              maxWidth: 840,
            }}
          >
            {product.tagline}
          </div>

          <div
            style={{
              fontFamily: fonts.sans,
              fontSize: 38,
              lineHeight: 1.3,
              color: colors.fgMuted,
              opacity: taglineOpacity * 0.9,
              maxWidth: 860,
            }}
          >
            Sources sync. Agents surface what needs judgment. The team only sees
            what deserves attention.
          </div>

          <div style={{ display: 'flex', gap: 16, marginTop: 18, flexWrap: 'wrap' }}>
            {[`${sources.length} live connectors`, `${metrics[0].value} automations handled`, `${inboxItems.length} items waiting`].map((badge) => (
              <div
                key={badge}
                style={{
                  padding: '16px 22px',
                  borderRadius: 999,
                  border: `1px solid ${colors.borderDefault}`,
                  background: 'rgba(255,255,255,0.04)',
                  fontFamily: fonts.mono,
                  fontSize: 22,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: colors.fgSecondary,
                  opacity: taglineOpacity * 0.92,
                }}
              >
                {badge}
              </div>
            ))}
          </div>

          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 30,
              fontWeight: 400,
              color: colors.fgMuted,
              opacity: urlOpacity,
              marginTop: 28,
            }}
          >
            {product.url}
          </div>
        </div>

        <div
          style={{
            width: 980,
            padding: '38px 40px 34px',
            borderRadius: 40,
            border: `1px solid ${colors.borderDefault}`,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.02) 100%)',
            boxShadow: '0 34px 120px rgba(0,0,0,0.34)',
            backdropFilter: 'blur(12px)',
            opacity: panelReveal,
            transform: `translateY(${interpolate(panelReveal, [0, 1], [36, 0])}px) scale(${interpolate(panelReveal, [0, 1], [0.98, 1])})`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 28,
            }}
          >
            <div
              style={{
                fontFamily: fonts.mono,
                fontSize: 22,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: colors.fgMuted,
              }}
            >
              System settled
            </div>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                backgroundColor: colors.success,
                boxShadow: `0 0 28px ${colors.success}`,
                opacity: 0.75 + systemPulse * 0.15,
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
            {sources.slice(0, 6).map((source, index) => (
              <div
                key={source.id}
                style={{
                  padding: '18px 20px',
                  borderRadius: 20,
                  border: `1px solid ${colors.borderSubtle}`,
                  background: 'rgba(255,255,255,0.025)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  opacity: 0.72 + index * 0.03,
                }}
              >
                <div
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 26,
                    color: colors.fgSecondary,
                  }}
                >
                  {source.name}
                </div>
                <div
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: 18,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: colors.fgTertiary,
                  }}
                >
                  Live
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              height: 1,
              margin: '28px 0 24px',
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 12%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.08) 88%, transparent 100%)',
            }}
          />

          <div
            style={{
              padding: '24px 26px',
              borderRadius: 28,
              border: `1px solid ${colors.highlightBorder}`,
              background: 'rgba(255,255,255,0.035)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 24,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 18,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: colors.fgMuted,
                }}
              >
                Inbox focus
              </div>
              <div
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 34,
                  fontWeight: 600,
                  lineHeight: 1.15,
                  color: colors.fgPrimary,
                  maxWidth: 560,
                }}
              >
                {inboxItems[0].title}
              </div>
            </div>
            <div
              style={{
                padding: '18px 20px',
                borderRadius: 20,
                background: 'rgba(68,170,68,0.16)',
                border: '1px solid rgba(68,170,68,0.28)',
                fontFamily: fonts.mono,
                fontSize: 42,
                fontWeight: 600,
                color: colors.success,
              }}
            >
              {inboxItems[0].score}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
            {metrics.map((metric) => (
              <div
                key={metric.label}
                style={{
                  padding: '20px 22px',
                  borderRadius: 22,
                  background: 'rgba(255,255,255,0.025)',
                  border: `1px solid ${colors.borderSubtle}`,
                }}
              >
                <div
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: 17,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: colors.fgMuted,
                    marginBottom: 12,
                  }}
                >
                  {metric.label}
                </div>
                <div
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 54,
                    fontWeight: 650,
                    lineHeight: 1,
                    color: metric.color === 'success' ? colors.success : colors.fgPrimary,
                  }}
                >
                  {metric.value}
                  {metric.suffix ?? ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CloseScene;
