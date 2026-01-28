/**
 * Webinar Email Templates
 *
 * Four-stage drip campaign for CREATE SOMETHING workshops:
 * 1. Registration confirmation (immediate)
 * 2. Warmup email (Day -3) - "Why Cloudflare?"
 * 3. Reminder email (Day -1) - Meeting details
 * 4. Recording + survey email (Day 0 post)
 *
 * All templates follow Canon design: black background, white text, minimal.
 */

// Base styles shared across all templates
const baseStyles = `
  body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #000000; color: #ffffff; }
  .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
  .header { margin-bottom: 40px; }
  .logo { font-size: 14px; font-weight: 500; color: rgba(255, 255, 255, 0.5); letter-spacing: 0.1em; text-transform: uppercase; }
  .content { line-height: 1.8; }
  .content p { color: rgba(255, 255, 255, 0.7); margin-bottom: 20px; }
  .title { font-size: 24px; color: #ffffff; margin-bottom: 20px; font-weight: 600; }
  .subtitle { font-size: 18px; color: #ffffff; margin-bottom: 15px; font-weight: 500; }
  .cta { display: inline-block; margin-top: 20px; padding: 14px 28px; background: #ffffff; color: #000000; text-decoration: none; font-weight: 600; border-radius: 4px; }
  .cta:hover { background: rgba(255, 255, 255, 0.9); }
  .muted { color: rgba(255, 255, 255, 0.5); font-size: 14px; }
  .checklist { margin: 30px 0; padding: 20px; background: rgba(255, 255, 255, 0.05); border-radius: 8px; }
  .checklist-title { font-size: 14px; color: rgba(255, 255, 255, 0.5); margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.05em; }
  .checklist-item { color: rgba(255, 255, 255, 0.8); margin-bottom: 10px; padding-left: 24px; position: relative; }
  .checklist-item:before { content: "✓"; position: absolute; left: 0; color: rgba(255, 255, 255, 0.4); }
  .resource-box { margin: 25px 0; padding: 20px; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; }
  .resource-title { font-size: 14px; color: rgba(255, 255, 255, 0.5); margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
  .resource-link { color: #ffffff; text-decoration: underline; }
  .footer { margin-top: 60px; padding-top: 30px; border-top: 1px solid rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.3); font-size: 13px; }
  .footer a { color: rgba(255, 255, 255, 0.4); }
`;

/**
 * Wrap content in the standard email template
 */
function emailTemplate(content: string, footerText = 'Building toward WORKWAY — the automation layer.'): string {
	return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">CREATE SOMETHING</div>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>CREATE SOMETHING</p>
      <p>${footerText}</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * 1. Registration Confirmation Email
 * Sent immediately after registration
 */
export function generateConfirmationEmail(name: string, webinarTitle: string): string {
	return emailTemplate(`
      <p class="title">You're in, ${name}.</p>
      <p>You're registered for <strong>${webinarTitle}</strong>.</p>
      <p>We'll send the meeting link and final details 24 hours before the workshop.</p>
      
      <div class="checklist">
        <div class="checklist-title">What to have ready</div>
        <div class="checklist-item">A laptop with VS Code or Cursor installed</div>
        <div class="checklist-item">A credit card (for Cloudflare account — it's free tier)</div>
        <div class="checklist-item">30 minutes of focused time</div>
      </div>

      <p class="muted">Questions? Reply to this email.</p>
	`);
}

/**
 * 2. Warmup Email - "Why Cloudflare?"
 * Sent 3 days before the webinar
 */
export function generateWarmupEmail(name: string, webinarTitle: string): string {
	return emailTemplate(`
      <p class="title">Why Cloudflare?</p>
      
      <p>Hi ${name},</p>
      
      <p>Your workshop is coming up in a few days. Here's why we chose Cloudflare for this first step:</p>
      
      <p><strong>Edge deployment</strong> means your site loads in milliseconds from 300+ locations worldwide. Not from a single server in Virginia.</p>
      
      <p><strong>Free tier</strong> covers most use cases. No surprise bills. No credit card anxiety.</p>
      
      <p><strong>Foundation for more</strong>. Static sites today. Workers, databases, and automation tomorrow. Same platform, growing capabilities.</p>
      
      <p>This isn't about Cloudflare specifically. It's about owning your infrastructure instead of renting it. The same code that deploys a landing page can eventually power workflows that run while you sleep.</p>
      
      <p>That's what we're building toward with WORKWAY. This workshop is step one.</p>

      <p class="muted">See you soon.<br />— Micah</p>
	`, `You're registered for: ${webinarTitle}`);
}

/**
 * 3. Reminder Email
 * Sent 24 hours before the webinar
 */
export function generateReminderEmail(
	name: string,
	webinarTitle: string,
	meetingLink: string,
	dateTime: string,
	calendarLink?: string
): string {
	const calendarSection = calendarLink
		? `<p><a href="${calendarLink}" class="resource-link">Add to calendar</a></p>`
		: '';

	return emailTemplate(`
      <p class="title">Tomorrow: ${webinarTitle}</p>
      
      <p>Hi ${name},</p>
      
      <p>Quick reminder — the workshop is tomorrow.</p>
      
      <div class="resource-box">
        <div class="resource-title">Workshop Details</div>
        <p style="margin-bottom: 10px;"><strong>When:</strong> ${dateTime}</p>
        <p style="margin-bottom: 10px;"><strong>Where:</strong> <a href="${meetingLink}" class="resource-link">Join Meeting</a></p>
        ${calendarSection}
      </div>
      
      <div class="checklist">
        <div class="checklist-title">Quick Prep Checklist</div>
        <div class="checklist-item">VS Code or Cursor installed</div>
        <div class="checklist-item">Stable internet connection</div>
        <div class="checklist-item">30 minutes blocked off</div>
      </div>

      <a href="${meetingLink}" class="cta">Join Workshop</a>

      <p class="muted" style="margin-top: 30px;">Have a question you want answered? Reply to this email and I'll address it in the Q&A.</p>
	`);
}

/**
 * 4. Recording + Survey Email
 * Sent within 2 hours after the webinar
 */
export function generateRecordingEmail(
	name: string,
	webinarTitle: string,
	recordingLink: string,
	surveyLink: string,
	slidesLink?: string
): string {
	const slidesSection = slidesLink
		? `<p><a href="${slidesLink}" class="resource-link">Download Slides (PDF)</a></p>`
		: '';

	return emailTemplate(`
      <p class="title">Recording: ${webinarTitle}</p>
      
      <p>Hi ${name},</p>
      
      <p>Thanks for joining the workshop. Here's everything you need:</p>
      
      <div class="resource-box">
        <div class="resource-title">Workshop Resources</div>
        <p><a href="${recordingLink}" class="resource-link">Watch Recording</a></p>
        ${slidesSection}
      </div>
      
      <div class="checklist">
        <div class="checklist-title">Your Deployment Checklist</div>
        <div class="checklist-item">Create Cloudflare account at dash.cloudflare.com</div>
        <div class="checklist-item">Install Wrangler: <code style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 3px;">npm install -g wrangler</code></div>
        <div class="checklist-item">Create project folder with index.html, style.css, app.js</div>
        <div class="checklist-item">Deploy: <code style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 3px;">wrangler pages deploy .</code></div>
        <div class="checklist-item">Celebrate — you own infrastructure now</div>
      </div>

      <p class="subtitle">What's Next?</p>
      <p>I'd love to know what you want to learn next. Takes 30 seconds:</p>
      
      <a href="${surveyLink}" class="cta">Share Your Feedback</a>

      <p class="muted" style="margin-top: 30px;">Your feedback directly shapes our next workshop. Thank you.</p>
	`);
}

/**
 * Subject lines for each email
 */
export const emailSubjects = {
	confirmation: (webinarTitle: string) => `You're in: ${webinarTitle}`,
	warmup: () => `Why Cloudflare?`,
	reminder: (webinarTitle: string) => `Tomorrow: ${webinarTitle}`,
	recording: (webinarTitle: string) => `Recording: ${webinarTitle}`
};
