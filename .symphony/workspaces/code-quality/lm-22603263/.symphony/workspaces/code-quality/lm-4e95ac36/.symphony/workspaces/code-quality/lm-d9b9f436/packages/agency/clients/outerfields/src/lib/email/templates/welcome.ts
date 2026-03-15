/**
 * Welcome email template for new Founding Members
 * Sent after successful Stripe checkout
 *
 * Writing style: "Nicely Said" — direct, outcome-first, specific
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

	const subject = 'Your founding member access is live';

	const bodyHtml = `
<p style="font-size: 16px; margin-bottom: 24px; color: rgba(255,255,255,0.8);">Hi ${escapeHtml(displayName)},</p>

<div class="section">
  <p>You're in. Your founding member access is now live.</p>
  <p>This isn't just a content library — it's a front-row seat to how we're building a premium content network from scratch. Watch us work. Learn the framework. Build your own.</p>
</div>

${divider()}

<div class="section">
  <h2>What you now have access to</h2>
  <ul class="benefits">
    <li><strong>50+ videos across 7 series.</strong> Full episodes, behind-the-scenes footage, and exclusive content.</li>
    <li><strong>The complete framework.</strong> See exactly how we build, market, and distribute content.</li>
    <li><strong>Our systems and workflows.</strong> Templates, processes, and tools we actually use.</li>
    <li><strong>A personal discovery call.</strong> 1-on-1 consultation to see if you're ready to build your own PCN.</li>
    <li><strong>Founding member merch.</strong> Choose a shirt or hat — shipped free.</li>
  </ul>
</div>

${divider()}

<div class="section">
  <h2>Schedule your discovery call</h2>
  <p>Every founding member gets a personal consultation. We'll talk about your goals, assess whether building a PCN makes sense for you, and map out next steps if it does.</p>
  <div class="cta">
    ${ctaButton(calendlyLink, 'Book your call')}
  </div>
  <p class="muted" style="text-align: center; font-size: 14px;">Included with your membership. No extra cost.</p>
</div>

${divider()}

<div class="section">
  <h2>Start watching</h2>
  <p>Your platform access is live. Log in and start exploring the content library:</p>
  <div class="cta">
    ${ctaButton('https://outerfields.createsomething.agency', 'Go to OUTERFIELDS')}
  </div>
</div>

<div class="section">
  <p class="muted" style="margin-top: 32px; font-size: 14px;">Reply to this email anytime — we read every message.</p>
</div>
`;

	const html = renderEmailLayout({
		title: 'Welcome, Founding Member',
		bodyHtml,
		options: {
			preheader: 'Your access is live. Here is how to get started.',
			headerSubtitle: 'Building Outerfields: The Odyssey',
			footerHtml: `<p>Founding Member | Pre-Sale Phase</p>
<p style="margin-top: 16px; font-size: 12px; color: rgba(255, 255, 255, 0.6);">You're receiving this because you purchased Outerfields Founding Membership.</p>`
		}
	});

	const text = `Your founding member access is live

Hi ${displayName},

You're in. Your founding member access is now live.

This isn't just a content library — it's a front-row seat to how we're building a premium content network from scratch. Watch us work. Learn the framework. Build your own.

---

WHAT YOU NOW HAVE ACCESS TO

• 50+ videos across 7 series. Full episodes, behind-the-scenes footage, and exclusive content.

• The complete framework. See exactly how we build, market, and distribute content.

• Our systems and workflows. Templates, processes, and tools we actually use.

• A personal discovery call. 1-on-1 consultation to see if you're ready to build your own PCN.

• Founding member merch. Choose a shirt or hat — shipped free.

---

SCHEDULE YOUR DISCOVERY CALL

Every founding member gets a personal consultation. We'll talk about your goals, assess whether building a PCN makes sense for you, and map out next steps if it does.

Book here: ${calendlyLink}

---

START WATCHING

Your platform access is live:
https://outerfields.createsomething.agency

---

Reply to this email anytime — we read every message.

OUTERFIELDS
Founding Member | Pre-Sale Phase
`;

	return { subject, html, text };
}
