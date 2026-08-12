import { escapePerformanceEmailAttribute, renderPerformanceEmail } from '../performance/email.js';

const PLAYBOOK_MEDIA = {
  src: 'https://createsomething.agency/images/performance-lab/playbook-home-agent-macro.webp',
  alt: 'Macro-real Playbook court with an ivory AI-agent marker inside a control ring and an amber workflow route.',
  width: 640,
  height: 427
} as const;

export interface SubscriberReengagementEmailInput {
  checkInUrl: string;
  unsubscribeUrl: string;
}

export interface SubscriberReengagementEmail {
  subject: string;
  preheader: string;
  html: string;
  text: string;
}

export function buildSubscriberReengagementEmail(
  input: SubscriberReengagementEmailInput
): SubscriberReengagementEmail {
  const subject = 'Can I ask why you subscribed?';
  const preheader = 'A short check-in about what CREATE SOMETHING should send next.';
  const checkInUrl = escapePerformanceEmailAttribute(input.checkInUrl);
  const unsubscribeUrl = escapePerformanceEmailAttribute(input.unsubscribeUrl);

  const html = renderPerformanceEmail({
    preheader,
    status: 'SUBSCRIBER CHECK-IN',
    title: 'What brought you here?',
    media: PLAYBOOK_MEDIA,
    contentHtml: `<p style="margin:0 0 16px;font-size:17px;line-height:1.6;">You subscribed to CREATE SOMETHING. I have not done a good job of following up.</p>
          <p style="margin:0 0 16px;font-size:17px;line-height:1.6;">The work has moved since then. We are showing more of how we map a workflow, decide where AI helps, and keep the approvals and proof in view.</p>
          <p style="margin:0 0 24px;font-size:17px;line-height:1.6;">Before I send anything else, I would like to know why you joined, whether this still interests you, what you have seen, and what would be useful next.</p>
          <p style="margin:0 0 24px;"><a href="${checkInUrl}" style="display:inline-block;padding:13px 18px;border-radius:8px;background:#181713;color:#fffdf7;font-weight:650;text-decoration:none;">Tell me what would help</a></p>
          <p style="margin:0;font-size:15px;line-height:1.6;">If you would rather leave, that is completely fine. Either answer is useful.</p>
          <p style="margin:24px 0 0;font-size:15px;line-height:1.6;">Micah<br />CREATE SOMETHING</p>`,
    footerHtml: `You received this because you confirmed a CREATE SOMETHING email subscription. <a href="${unsubscribeUrl}" style="color:inherit;text-decoration:underline;">Unsubscribe</a>.`
  });

  const text = `What brought you here?

You subscribed to CREATE SOMETHING. I have not done a good job of following up.

The work has moved since then. We are showing more of how we map a workflow, decide where AI helps, and keep the approvals and proof in view.

Before I send anything else, I would like to know why you joined, whether this still interests you, what you have seen, and what would be useful next.

Tell me what would help: ${input.checkInUrl}

If you would rather leave, that is completely fine. Either answer is useful.

Micah
CREATE SOMETHING

Unsubscribe: ${input.unsubscribeUrl}`;

  return { subject, preheader, html, text };
}
