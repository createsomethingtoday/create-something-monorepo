/**
 * Welcome email template for new Founding Members
 * Sent after successful Stripe checkout
 */

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

	return {
		subject: '🎉 Welcome to Outerfields - Your Founding Member Access',

		html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #ffffff; background-color: #000000; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 40px; }
    .logo { font-size: 24px; font-weight: bold; color: #ffffff; margin-bottom: 10px; }
    .content { background-color: #1a1a1a; border-radius: 12px; padding: 32px; border: 1px solid rgba(255, 255, 255, 0.1); }
    h1 { color: #ffffff; font-size: 28px; margin-top: 0; }
    .greeting { font-size: 18px; margin-bottom: 24px; color: rgba(255, 255, 255, 0.8); }
    .section { margin-bottom: 32px; }
    .section h2 { color: #ffffff; font-size: 20px; margin-bottom: 16px; }
    .section p { color: rgba(255, 255, 255, 0.8); margin-bottom: 12px; }
    .cta-button { display: inline-block; padding: 16px 32px; background-color: #ffffff; color: #000000; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 16px 0; }
    .cta-button:hover { background-color: rgba(255, 255, 255, 0.9); }
    .benefits { list-style: none; padding: 0; }
    .benefits li { padding: 12px 0; padding-left: 32px; position: relative; color: rgba(255, 255, 255, 0.8); }
    .benefits li:before { content: "✓"; position: absolute; left: 0; color: #44aa44; font-weight: bold; font-size: 18px; }
    .footer { text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.6); font-size: 14px; }
    .divider { height: 1px; background-color: rgba(255, 255, 255, 0.1); margin: 32px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">OUTERFIELDS</div>
      <p style="color: rgba(255, 255, 255, 0.6); margin: 0;">Building Outerfields: The Odyssey</p>
    </div>

    <div class="content">
      <h1>🎉 Welcome, Founding Member!</h1>
      <p class="greeting">Hi ${userName || userEmail.split('@')[0]},</p>

      <div class="section">
        <p>Thank you for becoming a Founding Member of Outerfields! You're now part of an exclusive community with lifetime access to our platform for just $99.</p>
        <p style="font-weight: 600; color: #ffffff;">This price will NOT last forever — you've locked in founding member pricing permanently.</p>
      </div>

      <div class="divider"></div>

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

      <div class="divider"></div>

      <div class="section">
        <h2>📅 Schedule Your Discovery Call</h2>
        <p>As a Founding Member, you get a complimentary discovery call with our team. Let's talk about your goals, answer your questions, and explore how Outerfields can support your journey.</p>
        <p style="text-align: center; margin-top: 24px;">
          <a href="${calendlyLink}" class="cta-button">Schedule Your Call Now</a>
        </p>
        <p style="font-size: 14px; color: rgba(255, 255, 255, 0.6); text-align: center;">This discovery call is INCLUDED with your membership — no extra cost.</p>
      </div>

      <div class="divider"></div>

      <div class="section">
        <h2>🚀 Get Started</h2>
        <p>Your Outerfields platform access is now live! Log in to start exploring:</p>
        <p style="text-align: center; margin-top: 24px;">
          <a href="https://outerfields.com/login" class="cta-button">Access the Platform</a>
        </p>
      </div>

      <div class="section">
        <p style="color: rgba(255, 255, 255, 0.6); font-size: 14px; margin-top: 32px;">Questions? Just reply to this email — we're here to help!</p>
      </div>
    </div>

    <div class="footer">
      <p><strong>OUTERFIELDS</strong></p>
      <p>Founding Member | Pre-Sale Phase</p>
      <p style="margin-top: 16px; font-size: 12px;">You're receiving this because you purchased Outerfields Founding Membership.</p>
    </div>
  </div>
</body>
</html>
    `,

		text: `
Welcome to Outerfields, Founding Member!

Hi ${userName || userEmail.split('@')[0]},

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

As a Founding Member, you get a complimentary discovery call with our team. Let's talk about your goals, answer your questions, and explore how Outerfields can support your journey.

Schedule here: ${calendlyLink}

This discovery call is INCLUDED with your membership — no extra cost.

GET STARTED

Your Outerfields platform access is now live! Log in to start exploring:
https://outerfields.com/login

Questions? Just reply to this email — we're here to help!

---
OUTERFIELDS
Founding Member | Pre-Sale Phase

You're receiving this because you purchased Outerfields Founding Membership.
    `
	};
}
