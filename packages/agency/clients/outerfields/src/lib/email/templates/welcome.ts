/**
 * Welcome email template for new Founding Members
 * Sent after successful Stripe checkout
 */

import { ctaButton, divider, escapeHtml, renderEmailLayout } from '../layout';

export interface WelcomeEmailData {
	userName: string;
	userEmail: string;
	calendlyLink: string;
}

export function generateWelcomeEmail(data: WelcomeEmailData): {
	subject: string;
	html: string;
	text: string;
} {
	const { userName, userEmail, calendlyLink } = data;
	const displayName = userName || userEmail.split('@')[0] || 'there';

	const subject = '🎉 Welcome to Outerfields - Your Founding Member Access';

	const bodyHtml = `
<p class="muted" style="font-size: 18px; margin-bottom: 24px;">Hi ${escapeHtml(displayName)},</p>

<div class="section">
  <p>Thank you for becoming a Founding Member of Outerfields! You're now part of an exclusive community with lifetime access to our platform for just $99.</p>
  <p style="font-weight: 600; color: #ffffff;">This price will NOT last forever — you've locked in founding member pricing permanently.</p>
</div>

${divider()}

<div class="section">
  <h2>Your Membership Includes:</h2>
  <ul class="benefits">
    <li><strong>Lifetime Platform Access</strong> — All current and future content</li>
    <li><strong>Behind-the-Scenes Content</strong> — Exclusive BTS footage and insights</li>
    <li><strong>Educational Resources</strong> — Learn from our journey</li>
    <li><strong>Community Access</strong> — Connect with fellow creators</li>
    <li><strong>Discovery Call (INCLUDED)</strong> — Schedule your free 1-on-1 call below</li>
    <li><strong>Exclusive Merchandise</strong> — Founding member swag</li>
  </ul>
</div>

${divider()}

<div class="section">
  <h2>📅 Schedule Your Discovery Call</h2>
  <p>As a Founding Member, you get a complimentary discovery call with our team. Let's talk about your goals, answer your questions, and explore how Outerfields can support your journey.</p>
  <div class="cta">
    ${ctaButton(calendlyLink, 'Schedule Your Call Now')}
  </div>
  <p class="muted" style="text-align: center;">This discovery call is INCLUDED with your membership — no extra cost.</p>
</div>

${divider()}

<div class="section">
  <h2>🚀 Get Started</h2>
  <p>Your Outerfields platform access is now live! Log in to start exploring:</p>
  <div class="cta">
    ${ctaButton('https://outerfields.com/login', 'Access the Platform')}
  </div>
</div>

<div class="section">
  <p class="muted" style="margin-top: 32px;">Questions? Just reply to this email — we're here to help!</p>
</div>
`;

	const html = renderEmailLayout({
		title: '🎉 Welcome, Founding Member!',
		bodyHtml,
		options: {
			preheader: 'Your founding member access is live — here’s how to get started.',
			headerSubtitle: 'Building Outerfields: The Odyssey',
			footerHtml: `<p>Founding Member | Pre-Sale Phase</p>
<p style="margin-top: 16px; font-size: 12px; color: rgba(255, 255, 255, 0.6);">You're receiving this because you purchased Outerfields Founding Membership.</p>`
		}
	});

	const text = `
Welcome to Outerfields, Founding Member!

Hi ${displayName},

Thank you for becoming a Founding Member of Outerfields! You're now part of an exclusive community with lifetime access to our platform for just $99.

This price will NOT last forever — you've locked in founding member pricing permanently.

YOUR MEMBERSHIP INCLUDES:

✓ Lifetime Platform Access — All current and future content
✓ Behind-the-Scenes Content — Exclusive BTS footage and insights
✓ Educational Resources — Learn from our journey
✓ Community Access — Connect with fellow creators
✓ Discovery Call (INCLUDED) — Schedule your free 1-on-1 call
✓ Exclusive Merchandise — Founding member swag

SCHEDULE YOUR DISCOVERY CALL

Schedule here: ${calendlyLink}

GET STARTED

Log in: https://outerfields.com/login

Questions? Just reply to this email — we're here to help!

---
OUTERFIELDS
Founding Member | Pre-Sale Phase
You're receiving this because you purchased Outerfields Founding Membership.
    `;

	return { subject, html, text };
}

