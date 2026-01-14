#!/usr/bin/env tsx
/**
 * Send Client Update Email via Resend Template
 *
 * Uses the 'client-update' template stored in Resend.
 * First create the template: pnpm tsx scripts/manage-resend-templates.ts create client-update
 *
 * Usage:
 *   RESEND_API_KEY=... pnpm tsx scripts/send-client-update-email.ts \
 *     --to aaron@outerfields.co \
 *     --name Aaron \
 *     --title "Video Landing Pages — Live" \
 *     --summary "Your platform now has dedicated video landing pages." \
 *     --image-url "https://..." \
 *     --cta-url "https://..." \
 *     --cta-label "View the landing page"
 *
 * Or use presets:
 *   RESEND_API_KEY=... pnpm tsx scripts/send-client-update-email.ts \
 *     --preset video-landing-page \
 *     --to aaron@outerfields.co \
 *     --name Aaron
 */

const RESEND_API = 'https://api.resend.com';
const FROM_ADDRESS = 'CREATE SOMETHING <hello@createsomething.io>';

// Presets for common updates
const PRESETS: Record<string, UpdateData> = {
	'video-landing-page': {
		title: 'Video Landing Pages — Live',
		summary: 'Your platform now has dedicated video landing pages. Every video gets its own shareable URL.',
		imageUrl: 'https://pub-cbac02584c2c4411aa214a7070ccd208.r2.dev/email/video-landing-page.png',
		imageAlt: 'Video landing page showing the player, Up Next sidebar, and engagement metrics',
		features: `<ul style="margin: 0; padding-left: 20px; color: rgba(255, 255, 255, 0.8);">
<li style="margin-bottom: 10px;"><strong style="color:#fff;">Each video = a destination.</strong> Share links directly to any content.</li>
<li style="margin-bottom: 10px;"><strong style="color:#fff;">Analytics visibility.</strong> View counts, engagement scores, most replayed moments.</li>
<li style="margin-bottom: 10px;"><strong style="color:#fff;">Related content.</strong> "Up Next" sidebar keeps viewers engaged.</li>
<li style="margin-bottom: 10px;"><strong style="color:#fff;">Access control.</strong> Free trailers open, premium content gated.</li>
</ul>`,
		ctaUrl: 'https://outerfields.createsomething.agency/watch/vid_trailer_5',
		ctaLabel: 'View the landing page'
	}
};

interface UpdateData {
	title: string;
	summary: string;
	imageUrl: string;
	imageAlt: string;
	features: string;
	ctaUrl: string;
	ctaLabel: string;
}

interface SendOptions {
	to: string;
	name: string;
	senderName: string;
	templateId?: string;
	data: UpdateData;
}

function readArg(flag: string): string | undefined {
	const idx = process.argv.indexOf(flag);
	return idx >= 0 ? process.argv[idx + 1] : undefined;
}

function parseArgs(): SendOptions {
	const to = readArg('--to');
	const name = readArg('--name');
	const preset = readArg('--preset');
	const templateId = readArg('--template-id');
	const senderName = readArg('--sender') ?? 'Micah';

	if (!to) throw new Error('Missing --to <email>');
	if (!name) throw new Error('Missing --name <recipient-name>');

	let data: UpdateData;

	if (preset) {
		if (!PRESETS[preset]) {
			throw new Error(`Unknown preset: ${preset}. Available: ${Object.keys(PRESETS).join(', ')}`);
		}
		data = PRESETS[preset];
	} else {
		// Build from individual args
		const title = readArg('--title');
		const summary = readArg('--summary');
		const imageUrl = readArg('--image-url');
		const ctaUrl = readArg('--cta-url');
		const ctaLabel = readArg('--cta-label');

		if (!title || !summary || !imageUrl || !ctaUrl || !ctaLabel) {
			throw new Error('Missing required args. Use --preset or provide all: --title, --summary, --image-url, --cta-url, --cta-label');
		}

		data = {
			title,
			summary,
			imageUrl,
			imageAlt: readArg('--image-alt') ?? 'Screenshot of the new feature',
			features: readArg('--features') ?? '',
			ctaUrl,
			ctaLabel
		};
	}

	return { to, name, senderName, templateId, data };
}

async function getTemplateId(apiKey: string, templateName: string): Promise<string | null> {
	const response = await fetch(`${RESEND_API}/templates`, {
		headers: { Authorization: `Bearer ${apiKey}` }
	});

	if (!response.ok) return null;

	const result = (await response.json()) as { data: Array<{ id: string; name: string }> };
	const template = result.data?.find(t => t.name === templateName);
	return template?.id ?? null;
}

async function sendWithTemplate(apiKey: string, options: SendOptions): Promise<void> {
	// Try to find template ID if not provided
	let templateId = options.templateId;
	if (!templateId) {
		console.log('🔍 Looking up template ID for "client-update"...');
		templateId = await getTemplateId(apiKey, 'client-update');

		if (!templateId) {
			throw new Error(
				'Template "client-update" not found in Resend.\n' +
				'Create it first: RESEND_API_KEY=... pnpm tsx scripts/manage-resend-templates.ts create client-update'
			);
		}
		console.log(`   Found: ${templateId}`);
	}

	console.log(`📤 Sending email to ${options.to}...`);

	// Resend expects template.id and template.variables
	const response = await fetch(`${RESEND_API}/emails`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			from: FROM_ADDRESS,
			to: options.to,
			subject: options.data.title,
			template: {
				id: templateId,
				variables: {
					NAME: options.name,
					UPDATE_TITLE: options.data.title,
					UPDATE_SUMMARY: options.data.summary,
					IMAGE_URL: options.data.imageUrl,
					IMAGE_ALT: options.data.imageAlt,
					FEATURES: options.data.features,
					CTA_URL: options.data.ctaUrl,
					CTA_LABEL: options.data.ctaLabel,
					SENDER_NAME: options.senderName
				}
			}
		})
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to send email: ${error}`);
	}

	const result = (await response.json()) as { id: string };
	console.log(`✅ Email sent!`);
	console.log(`   Email ID: ${result.id}`);
	console.log(`   To: ${options.to}`);
	console.log(`   Subject: ${options.data.title}`);
}

async function main() {
	const apiKey = process.env.RESEND_API_KEY;
	if (!apiKey) {
		throw new Error('Missing RESEND_API_KEY in environment');
	}

	if (process.argv.includes('--help') || process.argv.includes('-h')) {
		console.log(`
Send Client Update Email

Usage:
  RESEND_API_KEY=... pnpm tsx scripts/send-client-update-email.ts [options]

Options:
  --to <email>          Recipient email (required)
  --name <name>         Recipient name (required)
  --preset <name>       Use a preset (video-landing-page)
  --sender <name>       Sender name (default: Micah)
  --template-id <id>    Override template ID

Presets available:
  video-landing-page    Video landing pages feature announcement

Examples:
  # Using preset
  pnpm tsx scripts/send-client-update-email.ts --preset video-landing-page --to aaron@outerfields.co --name Aaron

  # Custom update
  pnpm tsx scripts/send-client-update-email.ts \\
    --to client@example.com \\
    --name Client \\
    --title "New Feature" \\
    --summary "Description here" \\
    --image-url "https://..." \\
    --cta-url "https://..." \\
    --cta-label "Check it out"
`);
		process.exit(0);
	}

	const options = parseArgs();
	await sendWithTemplate(apiKey, options);
}

main().catch((err) => {
	console.error(`❌ ${err instanceof Error ? err.message : String(err)}`);
	process.exit(1);
});
