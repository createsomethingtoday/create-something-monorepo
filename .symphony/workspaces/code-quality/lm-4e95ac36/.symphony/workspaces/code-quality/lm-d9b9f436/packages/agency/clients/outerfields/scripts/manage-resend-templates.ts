#!/usr/bin/env tsx
/**
 * Manage Resend Email Templates
 *
 * Create, update, and list email templates in Resend.
 * Templates are stored in src/lib/email/templates/*.html
 *
 * Usage:
 *   RESEND_API_KEY=... pnpm tsx scripts/manage-resend-templates.ts list
 *   RESEND_API_KEY=... pnpm tsx scripts/manage-resend-templates.ts create client-update
 *   RESEND_API_KEY=... pnpm tsx scripts/manage-resend-templates.ts update <template-id> client-update
 *
 * Templates:
 *   - client-update.html: Platform updates for clients (with image support)
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, '../src/lib/email/templates');

const RESEND_API = 'https://api.resend.com';

interface ResendTemplate {
	id: string;
	name: string;
	created_at: string;
}

async function listTemplates(apiKey: string): Promise<void> {
	console.log('📋 Listing Resend templates...\n');

	const response = await fetch(`${RESEND_API}/templates`, {
		headers: { Authorization: `Bearer ${apiKey}` }
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to list templates: ${error}`);
	}

	const data = (await response.json()) as { data: ResendTemplate[] };
	const templates = data.data || [];

	if (templates.length === 0) {
		console.log('No templates found.');
		return;
	}

	console.log('Templates:');
	for (const t of templates) {
		console.log(`  - ${t.name} (${t.id})`);
		console.log(`    Created: ${t.created_at}`);
	}
}

// Template variable definitions
// Resend format: { key: string, type: 'string' | 'number', required: boolean, default_value?: string }
const TEMPLATE_VARIABLES: Record<string, Array<{ key: string; type: 'string' | 'number'; required: boolean; default_value?: string }>> = {
	'client-update': [
		{ key: 'NAME', type: 'string', required: true },
		{ key: 'UPDATE_TITLE', type: 'string', required: true },
		{ key: 'UPDATE_SUMMARY', type: 'string', required: true },
		{ key: 'IMAGE_URL', type: 'string', required: true },
		{ key: 'IMAGE_ALT', type: 'string', required: false, default_value: 'Screenshot' },
		{ key: 'FEATURES', type: 'string', required: true },
		{ key: 'CTA_URL', type: 'string', required: true },
		{ key: 'CTA_LABEL', type: 'string', required: true },
		{ key: 'SENDER_NAME', type: 'string', required: false, default_value: 'The Team' }
	]
};

async function createTemplate(apiKey: string, templateName: string): Promise<void> {
	const htmlPath = join(TEMPLATES_DIR, `${templateName}.html`);

	if (!existsSync(htmlPath)) {
		throw new Error(`Template file not found: ${htmlPath}`);
	}

	const html = readFileSync(htmlPath, 'utf-8');
	const variables = TEMPLATE_VARIABLES[templateName] || [];

	console.log(`📤 Creating template "${templateName}"...`);
	if (variables.length > 0) {
		console.log(`   Variables: ${variables.map(v => v.key).join(', ')}`);
	}

	const response = await fetch(`${RESEND_API}/templates`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			name: templateName,
			html,
			...(variables.length > 0 && { variables })
		})
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to create template: ${error}`);
	}

	const data = (await response.json()) as { id: string };
	console.log(`✅ Template created!`);
	console.log(`   ID: ${data.id}`);
	console.log(`   Name: ${templateName}`);
}

async function updateTemplate(apiKey: string, templateId: string, templateName: string): Promise<void> {
	const htmlPath = join(TEMPLATES_DIR, `${templateName}.html`);

	if (!existsSync(htmlPath)) {
		throw new Error(`Template file not found: ${htmlPath}`);
	}

	const html = readFileSync(htmlPath, 'utf-8');

	console.log(`📤 Updating template "${templateId}"...`);

	const response = await fetch(`${RESEND_API}/templates/${templateId}`, {
		method: 'PATCH',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			name: templateName,
			html
		})
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to update template: ${error}`);
	}

	console.log(`✅ Template updated!`);
	console.log(`   ID: ${templateId}`);
	console.log(`   Name: ${templateName}`);
}

async function publishTemplate(apiKey: string, templateId: string): Promise<void> {
	console.log(`📤 Publishing template "${templateId}"...`);

	const response = await fetch(`${RESEND_API}/templates/${templateId}/publish`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		}
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to publish template: ${error}`);
	}

	console.log(`✅ Template published!`);
	console.log(`   ID: ${templateId}`);
}

async function main() {
	const apiKey = process.env.RESEND_API_KEY;
	if (!apiKey) {
		throw new Error('Missing RESEND_API_KEY in environment');
	}

	const [command, ...args] = process.argv.slice(2);

	switch (command) {
		case 'list':
			await listTemplates(apiKey);
			break;

		case 'create':
			if (!args[0]) {
				throw new Error('Usage: create <template-name>');
			}
			await createTemplate(apiKey, args[0]);
			break;

		case 'update':
			if (!args[0] || !args[1]) {
				throw new Error('Usage: update <template-id> <template-name>');
			}
			await updateTemplate(apiKey, args[0], args[1]);
			break;

		case 'publish':
			if (!args[0]) {
				throw new Error('Usage: publish <template-id>');
			}
			await publishTemplate(apiKey, args[0]);
			break;

		default:
			console.log(`
Manage Resend Email Templates

Usage:
  RESEND_API_KEY=... pnpm tsx scripts/manage-resend-templates.ts <command> [args]

Commands:
  list                          List all templates in Resend
  create <template-name>        Create template from templates/<name>.html
  update <id> <template-name>   Update existing template
  publish <template-id>         Publish a draft template

Examples:
  pnpm tsx scripts/manage-resend-templates.ts list
  pnpm tsx scripts/manage-resend-templates.ts create client-update
  pnpm tsx scripts/manage-resend-templates.ts publish 0cde2e7d-...
  pnpm tsx scripts/manage-resend-templates.ts update tm_abc123 client-update

Templates available:
  - client-update: Platform updates with image support
`);
	}
}

main().catch((err) => {
	console.error(`❌ ${err instanceof Error ? err.message : String(err)}`);
	process.exit(1);
});
