/**
 * OUTERFIELDS Email Layout
 *
 * Shared, branded email shell to keep templates consistent.
 * Style matches the dark OUTERFIELDS welcome email.
 *
 * Goals:
 * - DRY: templates supply content; layout supplies structure + CSS
 * - Safe-by-default: basic HTML escaping helper
 */

export interface EmailLayoutOptions {
	preheader?: string;
	headerSubtitle?: string;
	/**
	 * Optional raw HTML for the footer (use when you need multiple lines).
	 * If provided, takes precedence over `footerNote`.
	 */
	footerHtml?: string;
	footerNote?: string;
}

export function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

export function divider(): string {
	return `<div class="divider"></div>`;
}

export function ctaButton(href: string, label: string): string {
	return `<a href="${href}" class="cta-button">${escapeHtml(label)}</a>`;
}

export function renderEmailLayout(params: {
	title: string;
	bodyHtml: string;
	options?: EmailLayoutOptions;
}): string {
	const { title, bodyHtml, options } = params;
	const headerSubtitle = options?.headerSubtitle ?? 'Building Outerfields: The Odyssey';
	const footerNote =
		options?.footerNote ??
		`You're receiving this email because you have an account or relationship with OUTERFIELDS.`;

	// `preheader` helps inbox preview snippets; keep it hidden in-body.
	const preheader = options?.preheader ?? '';
	const preheaderSafe = escapeHtml(preheader);
	const footerHtml = options?.footerHtml;

	return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #ffffff; background-color: #000000; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 32px; }
    .logo { font-size: 24px; font-weight: bold; color: #ffffff; margin-bottom: 10px; }
    .header-subtitle { color: rgba(255, 255, 255, 0.6); margin: 0; font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; }
    .content { background-color: #1a1a1a; border-radius: 12px; padding: 32px; border: 1px solid rgba(255, 255, 255, 0.1); }
    h1 { color: #ffffff; font-size: 26px; margin-top: 0; margin-bottom: 16px; }
    h2 { color: #ffffff; font-size: 18px; margin: 0 0 12px 0; }
    p { color: rgba(255, 255, 255, 0.8); margin: 0 0 12px 0; }
    .muted { color: rgba(255, 255, 255, 0.6); font-size: 14px; }
    .divider { height: 1px; background-color: rgba(255, 255, 255, 0.1); margin: 24px 0; }
    .cta { text-align: center; margin-top: 18px; }
    .cta-button { display: inline-block; padding: 16px 32px; background-color: #ffffff; color: #000000; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 8px 0; }
    .cta-button:hover { background-color: rgba(255, 255, 255, 0.9); }
    .hint { font-size: 14px; color: rgba(255, 255, 255, 0.6); text-align: center; margin: 8px 0 0 0; }
    .section { margin-bottom: 24px; }
    .bullets { list-style: none; padding: 0; margin: 0; }
    .bullets li { padding: 10px 0; padding-left: 28px; position: relative; color: rgba(255, 255, 255, 0.8); }
    .bullets li:before { content: "✓"; position: absolute; left: 0; color: #44aa44; font-weight: bold; font-size: 18px; }
    .benefits { list-style: none; padding: 0; margin: 0; }
    .benefits li { padding: 12px 0; padding-left: 32px; position: relative; color: rgba(255, 255, 255, 0.8); }
    .benefits li:before { content: "✓"; position: absolute; left: 0; color: #44aa44; font-weight: bold; font-size: 18px; }
    .draft-notice { background: rgba(170, 136, 68, 0.15); border: 1px solid rgba(170, 136, 68, 0.3); border-radius: 10px; padding: 14px; margin-bottom: 16px; }
    .footer { text-align: center; margin-top: 32px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.6); font-size: 14px; }
    .preheader { display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; overflow: hidden; }
  </style>
</head>
<body>
  <div class="container">
    <span class="preheader">${preheaderSafe}</span>
    <div class="header">
      <div class="logo">OUTERFIELDS</div>
      <p class="header-subtitle">${escapeHtml(headerSubtitle)}</p>
    </div>

    <div class="content">
      <h1>${escapeHtml(title)}</h1>
      ${bodyHtml}
    </div>

    <div class="footer">
      <p><strong>OUTERFIELDS</strong></p>
      ${
				footerHtml
					? footerHtml
					: `<p class="muted" style="margin-top: 8px;">${escapeHtml(footerNote)}</p>`
			}
    </div>
  </div>
</body>
</html>`;
}

