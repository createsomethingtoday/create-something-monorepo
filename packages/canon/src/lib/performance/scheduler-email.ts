/**
 * Canon-owned Performance values for transactional email documents.
 *
 * Email clients do not reliably resolve custom properties, hosted fonts, or
 * document-level styles. These literal values are intended for inline styles;
 * product copy and email composition remain owned by the consuming surface.
 */
export const PERFORMANCE_EMAIL_STYLE_VERSION = '1.0.0' as const;

export const performanceEmailTokens = {
  color: {
    paper: '#f3f3f0',
    panel: '#ffffff',
    ink: '#090909',
    inkSoft: '#262626',
    muted: '#5e6268',
    line: '#d7d7d2',
    lineStrong: '#9c9c96',
    signal: '#0057b8',
    signalSoft: '#dce8f5'
  },
  font: {
    display:
      'Satoshi, "Helvetica Neue", Helvetica, Arial, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono:
      '"IBM Plex Mono", "SFMono-Regular", "SF Mono", Menlo, Monaco, Consolas, monospace'
  },
  layout: {
    maxWidth: '640px',
    radius: '4px',
    spaceXs: '8px',
    spaceSm: '12px',
    spaceMd: '20px',
    spaceLg: '32px',
    spaceXl: '48px'
  }
} as const;

export type PerformanceEmailTokens = typeof performanceEmailTokens;
