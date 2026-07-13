import { performanceEmailTokens as tokens } from '@create-something/canon/performance/scheduler-email';

export type BookingEmailKind = 'confirmation' | 'reminder' | 'rescheduled';

export type BookingEmailInput = {
  kind: BookingEmailKind;
  recipientName: string;
  slot: { start: string; end: string };
  meetUrl: string;
  manageUrl: string;
  timezone: string;
};

export type RenderedBookingEmail = {
  subject: string;
  text: string;
  html: string;
};

const subjects: Record<BookingEmailKind, string> = {
  confirmation: 'Your CREATE SOMETHING meeting is booked',
  reminder: 'Your CREATE SOMETHING meeting starts in one hour',
  rescheduled: 'Your CREATE SOMETHING meeting has moved'
};

const headings: Record<BookingEmailKind, string> = {
  confirmation: 'Meeting booked.',
  reminder: 'Your meeting starts soon.',
  rescheduled: 'Meeting updated.'
};

export function renderBookingEmail(input: BookingEmailInput): RenderedBookingEmail {
  const name = plainText(input.recipientName);
  const htmlName = input.recipientName.replace(/[\r\n]+/g, ' ').trim();
  const date = formatDate(input.slot.start, input.timezone);
  const time = formatTimeRange(input.slot.start, input.slot.end, input.timezone);
  const subject = subjects[input.kind];
  const status = input.kind === 'reminder' ? 'STARTS IN ONE HOUR' : input.kind.toUpperCase();
  const intro = input.kind === 'rescheduled'
    ? 'Your meeting with Micah has a new time.'
    : 'Your meeting with Micah is ready.';

  const text = [
    `Hi ${name},`,
    '',
    headings[input.kind],
    intro,
    '',
    date,
    time,
    '',
    `Join with Google Meet: ${input.meetUrl}`,
    `Manage this meeting: ${input.manageUrl}`,
    '',
    'Use the manage link to choose another time or cancel this meeting.',
    '',
    'CREATE SOMETHING'
  ].join('\n');

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background-color:${tokens.color.paper};color:${tokens.color.ink};font-family:${escapeAttribute(tokens.font.display)};">
  <div role="article" aria-roledescription="email" style="width:100%;background-color:${tokens.color.paper};padding:${tokens.layout.spaceLg} 0;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding:0 ${tokens.layout.spaceMd};">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:${tokens.layout.maxWidth};background-color:${tokens.color.panel};border:1px solid ${tokens.color.line};border-radius:${tokens.layout.radius};">
        <tr><td style="padding:${tokens.layout.spaceMd} ${tokens.layout.spaceLg};border-bottom:1px solid ${tokens.color.line};font-family:${escapeAttribute(tokens.font.mono)};font-size:12px;line-height:1.5;letter-spacing:.08em;color:${tokens.color.muted};">CREATE SOMETHING&nbsp;&nbsp;/&nbsp;&nbsp;${status}</td></tr>
        <tr><td style="padding:${tokens.layout.spaceXl} ${tokens.layout.spaceLg} ${tokens.layout.spaceLg};">
          <p style="margin:0 0 ${tokens.layout.spaceMd};font-size:16px;line-height:1.55;color:${tokens.color.inkSoft};">Hi ${escapeHtml(htmlName)},</p>
          <h1 style="margin:0 0 ${tokens.layout.spaceSm};font-family:${escapeAttribute(tokens.font.display)};font-size:38px;line-height:.98;letter-spacing:-.03em;font-weight:500;color:${tokens.color.ink};">${escapeHtml(headings[input.kind])}</h1>
          <p style="margin:0 0 ${tokens.layout.spaceLg};font-size:17px;line-height:1.55;color:${tokens.color.muted};">${escapeHtml(intro)}</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-top:2px solid ${tokens.color.ink};border-bottom:1px solid ${tokens.color.line};">
            <tr><td style="padding:${tokens.layout.spaceMd} 0 ${tokens.layout.spaceXs};font-family:${escapeAttribute(tokens.font.mono)};font-size:12px;line-height:1.5;letter-spacing:.06em;color:${tokens.color.muted};">DATE</td></tr>
            <tr><td style="padding:0 0 ${tokens.layout.spaceSm};font-size:20px;line-height:1.35;font-weight:500;color:${tokens.color.ink};">${escapeHtml(date)}</td></tr>
            <tr><td style="padding:${tokens.layout.spaceSm} 0 ${tokens.layout.spaceXs};border-top:1px solid ${tokens.color.line};font-family:${escapeAttribute(tokens.font.mono)};font-size:12px;line-height:1.5;letter-spacing:.06em;color:${tokens.color.muted};">TIME</td></tr>
            <tr><td style="padding:0 0 ${tokens.layout.spaceMd};font-size:20px;line-height:1.35;font-weight:500;color:${tokens.color.ink};">${escapeHtml(time)}</td></tr>
          </table>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:${tokens.layout.spaceLg} 0 ${tokens.layout.spaceSm};"><tr><td bgcolor="${tokens.color.ink}" style="border-radius:${tokens.layout.radius};"><a href="${escapeAttribute(input.meetUrl)}" style="display:inline-block;padding:14px 20px;border:1px solid ${tokens.color.ink};border-radius:${tokens.layout.radius};background-color:${tokens.color.ink};color:${tokens.color.panel};font-family:${escapeAttribute(tokens.font.mono)};font-size:13px;line-height:1.2;letter-spacing:.04em;text-decoration:none;">Join with Google Meet</a></td></tr></table>
          <p style="margin:${tokens.layout.spaceLg} 0 ${tokens.layout.spaceSm};font-size:15px;line-height:1.55;color:${tokens.color.inkSoft};">Need a different time?</p>
          <a href="${escapeAttribute(input.manageUrl)}" style="display:inline-block;padding:13px 19px;border:1px solid ${tokens.color.signal};border-radius:${tokens.layout.radius};color:${tokens.color.signal};font-family:${escapeAttribute(tokens.font.mono)};font-size:13px;line-height:1.2;letter-spacing:.04em;text-decoration:none;">Manage this meeting</a>
          <p style="margin:${tokens.layout.spaceSm} 0 0;font-size:13px;line-height:1.55;color:${tokens.color.muted};">Choose another time or cancel from the secure meeting page.</p>
        </td></tr>
        <tr><td style="padding:${tokens.layout.spaceMd} ${tokens.layout.spaceLg};border-top:1px solid ${tokens.color.line};font-family:${escapeAttribute(tokens.font.mono)};font-size:11px;line-height:1.5;letter-spacing:.04em;color:${tokens.color.muted};">CONTROLLED SCHEDULING&nbsp;&nbsp;/&nbsp;&nbsp;CREATESOMETHING.AGENCY</td></tr>
      </table>
    </td></tr></table>
  </div>
</body>
</html>`;

  return { subject, text, html };
}

function formatDate(value: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(value));
}

function formatTimeRange(start: string, end: string, timezone: string): string {
  const startText = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(start));
  const endText = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  }).format(new Date(end));
  return `${startText}–${endText}`;
}

function plainText(value: string): string {
  return value.replace(/[<>]/g, '').replace(/[\r\n]+/g, ' ').trim();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}
