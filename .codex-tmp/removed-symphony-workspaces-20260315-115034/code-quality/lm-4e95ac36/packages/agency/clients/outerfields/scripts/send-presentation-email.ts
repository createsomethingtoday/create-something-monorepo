/**
 * Send OUTERFIELDS presentation email via Resend.
 *
 * DRY: reuses `sendPresentationEmail` template + Resend service in `src/lib/email/`.
 *
 * Usage:
 *   RESEND_API_KEY=... pnpm tsx scripts/send-presentation-email.ts --draft --to micah@createsomething.io --name Micah
 *   RESEND_API_KEY=... pnpm tsx scripts/send-presentation-email.ts --to aaron@outerfields.co --name Aaron
 */

import { sendPresentationEmail } from '../src/lib/email';

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

	const presentationUrl = 'https://outerfields.createsomething.agency/presentation';

	const result = await sendPresentationEmail(apiKey, to, {
		recipientName: name,
		presentationUrl,
		senderName: 'Micah',
		isDraft: draft
	});

	if (!result.success) {
		throw new Error(result.error || 'Failed to send email');
	}

	console.log(`✅ Sent ${draft ? 'draft ' : ''}presentation email to ${to}`);
	console.log(`Email ID: ${result.id}`);
}

main().catch((err) => {
	console.error(`❌ ${err instanceof Error ? err.message : String(err)}`);
	process.exit(1);
});

