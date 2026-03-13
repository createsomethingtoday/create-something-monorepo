/**
 * Send OUTERFIELDS video landing page update email via Resend.
 *
 * DRY: reuses `sendVideoLandingUpdateEmail` template + Resend service in `src/lib/email/`.
 *
 * Usage:
 *   RESEND_API_KEY=... pnpm tsx scripts/send-video-landing-update-email.ts --draft --to micah@createsomething.io --name Micah
 *   RESEND_API_KEY=... pnpm tsx scripts/send-video-landing-update-email.ts --to aaron@outerfields.co --name Aaron
 */

import { sendVideoLandingUpdateEmail } from '../src/lib/email';

function readArg(flag: string): string | undefined {
	const idx = process.argv.indexOf(flag);
	return idx >= 0 ? process.argv[idx + 1] : undefined;
}

async function main() {
	const apiKey = process.env.RESEND_API_KEY;
	if (!apiKey) {
		throw new Error('Missing RESEND_API_KEY in environment');
	}

	const to = readArg('--to') ?? '';
	const name = readArg('--name') ?? '';
	const draft = process.argv.includes('--draft');

	if (!to) throw new Error('Missing --to <email>');
	if (!name) throw new Error('Missing --name <recipientName>');

	// Video landing page URL - uses the trailer from the screenshot
	const videoLandingUrl = 'https://outerfields.createsomething.agency/watch/vid_trailer_2';

	const result = await sendVideoLandingUpdateEmail(apiKey, to, {
		recipientName: name,
		videoLandingUrl,
		senderName: 'Micah',
		isDraft: draft
	});

	if (!result.success) {
		throw new Error(result.error || 'Failed to send email');
	}

	console.log(`✅ Sent ${draft ? 'draft ' : ''}video landing update email to ${to}`);
	console.log(`Email ID: ${result.id}`);
}

main().catch((err) => {
	console.error(`❌ ${err instanceof Error ? err.message : String(err)}`);
	process.exit(1);
});
