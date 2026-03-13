import React from 'react';
import { AbsoluteFill } from 'remotion';

import { typography } from '../../styles';
import { HUB_ONBOARDING_SPEC } from './spec';

const colors = HUB_ONBOARDING_SPEC.colors;

export const scenePadding = 86;

export const Backdrop: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
        background: `radial-gradient(circle at 18% 18%, rgba(103, 212, 255, 0.14), transparent 28%),
          radial-gradient(circle at 82% 22%, rgba(121, 247, 174, 0.09), transparent 20%),
          radial-gradient(circle at 70% 78%, rgba(255, 202, 99, 0.08), transparent 22%),
          linear-gradient(180deg, ${colors.bgTop} 0%, ${colors.bgBase} 56%, ${colors.bgBottom} 100%)`,
      }}
    >
      <AbsoluteFill
        style={{
          backgroundImage: `
            linear-gradient(${colors.grid} 1px, transparent 1px),
            linear-gradient(90deg, ${colors.grid} 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
          maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.75), rgba(0,0,0,0.18))',
          opacity: 0.95,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(circle at center, transparent 40%, rgba(0, 0, 0, 0.38) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};

export const Panel: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
  accent?: 'accent' | 'success' | 'warning' | 'error';
}> = ({ children, style, accent = 'accent' }) => {
  const accentMap = {
    accent: colors.accent,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
  } as const;

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 28,
        border: `1px solid ${colors.border}`,
        background: `linear-gradient(180deg, rgba(255, 255, 255, 0.04), ${colors.panel})`,
        boxShadow: `0 24px 80px rgba(0, 0, 0, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.04)`,
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: '0 auto auto 0',
          width: '100%',
          height: 1,
          background: `linear-gradient(90deg, transparent, ${accentMap[accent]}, transparent)`,
          opacity: 0.7,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: -120,
          right: -120,
          width: 240,
          height: 240,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentMap[accent]}33 0%, transparent 70%)`,
        }}
      />
      {children}
    </div>
  );
};

export const Pill: React.FC<{
  children: React.ReactNode;
  tone?: 'default' | 'accent' | 'success' | 'warning' | 'error';
  style?: React.CSSProperties;
}> = ({ children, tone = 'default', style }) => {
  const toneMap = {
    default: {
      background: 'rgba(255, 255, 255, 0.06)',
      border: colors.border,
      color: colors.fgSecondary,
    },
    accent: {
      background: colors.accentSoft,
      border: 'rgba(103, 212, 255, 0.35)',
      color: colors.accentStrong,
    },
    success: {
      background: colors.successSoft,
      border: 'rgba(121, 247, 174, 0.35)',
      color: colors.success,
    },
    warning: {
      background: colors.warningSoft,
      border: 'rgba(255, 202, 99, 0.35)',
      color: colors.warning,
    },
    error: {
      background: colors.errorSoft,
      border: 'rgba(255, 135, 135, 0.35)',
      color: colors.error,
    },
  } as const;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 16px',
        borderRadius: 999,
        border: `1px solid ${toneMap[tone].border}`,
        background: toneMap[tone].background,
        color: toneMap[tone].color,
        fontFamily: typography.fontFamily.mono,
        fontSize: '0.82rem',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const SectionLabel: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => {
  return (
    <div
      style={{
        fontFamily: typography.fontFamily.mono,
        fontSize: '0.85rem',
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: colors.fgQuiet,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const FactRow: React.FC<{
  label: string;
  value: string;
  highlight?: boolean;
}> = ({ label, value, highlight = false }) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '160px 1fr',
        gap: 18,
        alignItems: 'center',
        padding: '14px 0',
        borderTop: `1px solid ${colors.border}`,
      }}
    >
      <div
        style={{
          fontFamily: typography.fontFamily.mono,
          fontSize: '0.8rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: colors.fgQuiet,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: highlight ? typography.fontFamily.mono : typography.fontFamily.sans,
          fontSize: highlight ? '1.02rem' : '1.04rem',
          fontWeight: highlight ? 500 : 550,
          letterSpacing: highlight ? '0.02em' : '-0.01em',
          color: highlight ? colors.accentStrong : colors.fgPrimary,
          wordBreak: 'break-word',
        }}
      >
        {value}
      </div>
    </div>
  );
};

export const CodeWindow: React.FC<{
  title: string;
  lines: Array<{ text: string; highlight?: boolean }>;
  footer?: string;
}> = ({ title, lines, footer }) => {
  return (
    <Panel
      style={{
        padding: 28,
        minHeight: 460,
      }}
      accent="accent"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {[colors.error, colors.warning, colors.success].map((color) => (
            <div
              key={color}
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: color,
                opacity: 0.8,
              }}
            />
          ))}
        </div>
        <SectionLabel>{title}</SectionLabel>
      </div>

      <div
        style={{
          borderRadius: 22,
          border: `1px solid ${colors.border}`,
          background: 'rgba(1, 5, 10, 0.88)',
          padding: '22px 0',
        }}
      >
        {lines.map((line, index) => (
          <div
            key={`${title}-${index}-${line.text}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '56px 1fr',
              gap: 12,
              padding: '10px 24px',
              background: line.highlight ? colors.accentSoft : 'transparent',
            }}
          >
            <div
              style={{
                textAlign: 'right',
                color: colors.fgQuiet,
                fontFamily: typography.fontFamily.mono,
                fontSize: '0.92rem',
              }}
            >
              {index + 1}
            </div>
            <div
              style={{
                color: line.highlight ? colors.accentStrong : colors.fgSecondary,
                fontFamily: typography.fontFamily.mono,
                fontSize: '0.95rem',
                whiteSpace: 'pre-wrap',
              }}
            >
              {line.text}
            </div>
          </div>
        ))}
      </div>

      {footer ? (
        <div
          style={{
            marginTop: 18,
            color: colors.fgMuted,
            fontFamily: typography.fontFamily.sans,
            fontSize: '1rem',
            lineHeight: 1.35,
          }}
        >
          {footer}
        </div>
      ) : null}
    </Panel>
  );
};

export const SceneFrame: React.FC<{
  step: string;
  kicker: string;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  progress: number;
  children: React.ReactNode;
}> = ({ step, kicker, title, subtitle, progress, children }) => {
  return (
    <AbsoluteFill
      style={{
        color: colors.fgPrimary,
        overflow: 'hidden',
        fontFamily: typography.fontFamily.sans,
      }}
    >
      <Backdrop />
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          height: '100%',
          padding: `${scenePadding - 12}px ${scenePadding}px ${scenePadding}px`,
          display: 'flex',
          flexDirection: 'column',
          gap: 26,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto auto 1fr',
            alignItems: 'center',
            gap: 18,
          }}
        >
          <Pill tone="accent">{step}</Pill>
          <SectionLabel>{kicker}</SectionLabel>
          <div
            style={{
              justifySelf: 'stretch',
              height: 1,
              background: `linear-gradient(90deg, ${colors.accent} 0%, ${colors.line} ${Math.max(
                18,
                progress * 100
              )}%, transparent 100%)`,
            }}
          />
        </div>

        <div style={{ maxWidth: 980, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            style={{
              fontFamily: typography.fontFamily.sans,
              fontSize: '4.9rem',
              lineHeight: 0.95,
              fontWeight: 700,
              letterSpacing: '-0.055em',
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontFamily: typography.fontFamily.sans,
              fontSize: '1.48rem',
              lineHeight: 1.35,
              color: colors.fgSecondary,
              maxWidth: 900,
            }}
          >
            {subtitle}
          </div>
        </div>

        <div style={{ flex: 1, position: 'relative' }}>{children}</div>
      </div>
    </AbsoluteFill>
  );
};

export const bulletListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  color: colors.fgSecondary,
  fontFamily: typography.fontFamily.sans,
  fontSize: '1.12rem',
  lineHeight: 1.35,
};

export const bodyCopyStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily.sans,
  fontSize: '1.16rem',
  lineHeight: 1.42,
  color: colors.fgSecondary,
};

export function createTwoColumnLayout(): React.CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: '0.95fr 1.05fr',
    gap: 32,
    height: '100%',
    alignItems: 'stretch',
  };
}

export function renderBullet(text: string, accentColor = colors.accent): React.ReactNode {
  return (
    <div
      key={text}
      style={{
        display: 'grid',
        gridTemplateColumns: '18px 1fr',
        gap: 12,
        alignItems: 'start',
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          marginTop: 8,
          borderRadius: '50%',
          backgroundColor: accentColor,
          boxShadow: `0 0 18px ${accentColor}66`,
        }}
      />
      <div>{text}</div>
    </div>
  );
}

export const ConnectorLine: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  progress: number;
  color?: string;
}> = ({ x1, y1, x2, y2, progress, color = colors.accent }) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const clampedProgress = Math.max(0, Math.min(1, progress));

  return (
    <div
      style={{
        position: 'absolute',
        left: x1,
        top: y1,
        width: length,
        height: 2,
        transform: `rotate(${angle}deg)`,
        transformOrigin: '0 50%',
        background: `linear-gradient(90deg, ${color} 0%, ${color} ${clampedProgress * 100}%, ${colors.line} ${
          clampedProgress * 100
        }%, ${colors.line} 100%)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: Math.max(0, clampedProgress * length - 8),
          top: -5,
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 20px ${color}`,
        }}
      />
    </div>
  );
};

export const metricValueStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily.sans,
  fontWeight: 700,
  fontSize: '2rem',
  lineHeight: 1,
  letterSpacing: '-0.04em',
  color: colors.fgPrimary,
};

export const hubOnboardingColors = colors;
