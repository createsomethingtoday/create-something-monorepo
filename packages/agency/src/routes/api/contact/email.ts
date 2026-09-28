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
  service?: string;
  intent: string;
  lane: string;
}

interface ContactNotificationInput extends ContactResponseInput {
  email: string;
  company?: string;
  leadStage: string;
  campaign?: string;
  submittedAt: string;
}

/** HTML only: recipient, sender, subject and delivery remain in the route. */
export function renderContactResponse(input: ContactResponseInput): string {
  const { name, message, service, intent, lane } = input;
  return renderPerformanceEmail({
    preheader: 'Thanks for reaching out',
    status: 'CONTACT',
    title: 'Thanks for reaching out',
    contentHtml: `<p style="${paragraph}">Hi ${escapeHtml(name)},</p>
      <p style="${paragraph}">I've received your inquiry${service ? ` about ${escapeHtml(service)}` : ''} and will get back to you within 24 hours to scope your first outcome stack.</p>
      <div style="${messageBox}">
        ${service ? `<p style="${label}">Service: ${escapeHtml(service)}</p>` : ''}
        <p style="${label}">Next step: ${escapeHtml(intent)} / ${escapeHtml(lane)}</p>
        <p style="${label}">Your Message:</p>
        <p style="margin:0;color:${tokens.color.inkSoft};">${escapeHtml(message).replace(/\n/g, '<br>')}</p>
      </div>`,
    footerHtml: '— Micah Johnson<br>CREATE SOMETHING Agency'
  });
}

export function renderContactNotification(input: ContactNotificationInput): string {
  const { name, email, message, service, company, intent, lane, leadStage, campaign, submittedAt } =
    input;
  return renderPerformanceEmail({
    preheader: service ? `Service Inquiry: ${service}` : 'New Contact Form Submission',
    status: 'CONTACT',
    title: service ? `Service Inquiry: ${service}` : 'New Contact Form Submission',
    contentHtml: `<p style="${paragraph}"><strong>From:</strong> ${escapeHtml(name)} (${escapeHtml(email)})</p>
      ${company ? `<p style="${paragraph}"><strong>Company:</strong> ${escapeHtml(company)}</p>` : ''}
      ${service ? `<p style="${paragraph}"><strong>Service:</strong> ${escapeHtml(service)}</p>` : ''}
      <p style="${paragraph}"><strong>Intent:</strong> ${escapeHtml(intent)}</p>
      <p style="${paragraph}"><strong>Lane:</strong> ${escapeHtml(lane)}</p>
      <p style="${paragraph}"><strong>Lead stage:</strong> ${escapeHtml(leadStage)}</p>
      ${campaign ? `<p style="${paragraph}"><strong>Campaign:</strong> ${escapeHtml(campaign)}</p>` : ''}
      <p style="${paragraph}"><strong>Message:</strong><br>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`,
    footerHtml: `<strong>Submitted:</strong> ${escapeHtml(submittedAt)}`
  });
}
