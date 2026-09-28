import {
  escapePerformanceEmailHtml as escapeHtml,
  performanceEmailTokens as tokens,
  renderPerformanceEmail
} from '@create-something/canon/performance/email';

const paragraph = `margin:0 0 ${tokens.layout.spaceMd};color:${tokens.color.inkSoft};`;
const label = `margin:0 0 ${tokens.layout.spaceSm};color:${tokens.color.muted};font-family:${escapeHtml(tokens.font.mono)};font-size:12px;line-height:1.55;`;
const messageBox = `margin:${tokens.layout.spaceLg} 0;padding:${tokens.layout.spaceMd} 0;border-top:1px solid ${tokens.color.line};border-bottom:1px solid ${tokens.color.line};`;

interface ContactResponseInput {
  name: string;
  message: string;
}

interface ContactNotificationInput extends ContactResponseInput {
  email: string;
  submittedAt: string;
}

/** HTML only: recipient, sender, subject and delivery remain in the route. */
export function renderContactResponse(input: ContactResponseInput): string {
  return renderPerformanceEmail({
    preheader: 'Thanks for reaching out',
    status: 'CONTACT',
    title: 'Thanks for reaching out',
    contentHtml: `<p style="${paragraph}">Hi ${escapeHtml(input.name)},</p>
      <p style="${paragraph}">I've received your message and will get back to you as soon as possible — typically within 24-48 hours.</p>
      <div style="${messageBox}">
        <p style="${label}">Your Message:</p>
        <p style="margin:0;color:${tokens.color.inkSoft};">${escapeHtml(input.message)}</p>
      </div>`,
    footerHtml: '— Micah Johnson'
  });
}

export function renderContactNotification(input: ContactNotificationInput): string {
  return renderPerformanceEmail({
    preheader: 'New Contact Form Submission',
    status: 'CONTACT',
    title: 'New Contact Form Submission',
    contentHtml: `<p style="${paragraph}"><strong>From:</strong> ${escapeHtml(input.name)} (${escapeHtml(input.email)})</p>
      <p style="${paragraph}"><strong>Message:</strong><br>${escapeHtml(input.message).replace(/\n/g, '<br>')}</p>`,
    footerHtml: `<strong>Submitted:</strong> ${escapeHtml(input.submittedAt)}`
  });
}
