import { performanceEmailTokens } from './scheduler-email.js';

export { performanceEmailTokens } from './scheduler-email.js';

export interface PerformanceEmailInput {
  preheader: string;
  status: string;
  title: string;
  contentHtml: string;
  footerHtml: string;
  media?: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
  };
}

export function escapePerformanceEmailHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export const escapePerformanceEmailAttribute = escapePerformanceEmailHtml;

export function renderPerformanceEmail(input: PerformanceEmailInput): string {
  const tokens = performanceEmailTokens;
  const media = input.media
    ? `<tr><td style="padding:0;line-height:0;">
          <img src="${escapePerformanceEmailAttribute(input.media.src)}" alt="${escapePerformanceEmailAttribute(input.media.alt)}"${input.media.width ? ` width="${input.media.width}"` : ''}${input.media.height ? ` height="${input.media.height}"` : ''} style="display:block;width:100%;height:auto;border:0;max-width:${tokens.layout.maxWidth};background-color:${tokens.color.ink};" />
        </td></tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapePerformanceEmailHtml(input.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${tokens.color.paper};color:${tokens.color.ink};font-family:${escapePerformanceEmailAttribute(tokens.font.display)};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapePerformanceEmailHtml(input.preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:${tokens.color.paper};">
    <tr><td align="center" style="padding:${tokens.layout.spaceLg} ${tokens.layout.spaceMd};">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:${tokens.layout.maxWidth};background-color:${tokens.color.panel};border:1px solid ${tokens.color.line};border-radius:${tokens.layout.radius};">
        <tr><td style="padding:${tokens.layout.spaceMd} ${tokens.layout.spaceLg};border-bottom:1px solid ${tokens.color.line};font-family:${escapePerformanceEmailAttribute(tokens.font.mono)};font-size:12px;line-height:1.5;letter-spacing:.08em;color:${tokens.color.muted};">CREATE SOMETHING&nbsp;&nbsp;/&nbsp;&nbsp;PERFORMANCE LAB&nbsp;&nbsp;/&nbsp;&nbsp;${escapePerformanceEmailHtml(input.status)}</td></tr>
        ${media}
        <tr><td style="padding:${tokens.layout.spaceXl} ${tokens.layout.spaceLg} ${tokens.layout.spaceLg};">
          <h1 style="margin:0 0 ${tokens.layout.spaceMd};font-family:${escapePerformanceEmailAttribute(tokens.font.display)};font-size:36px;line-height:1.08;letter-spacing:-.02em;color:${tokens.color.ink};">${escapePerformanceEmailHtml(input.title)}</h1>
          ${input.contentHtml}
        </td></tr>
        <tr><td style="padding:${tokens.layout.spaceMd} ${tokens.layout.spaceLg};border-top:1px solid ${tokens.color.line};font-family:${escapePerformanceEmailAttribute(tokens.font.mono)};font-size:11px;line-height:1.55;color:${tokens.color.muted};">${input.footerHtml}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
