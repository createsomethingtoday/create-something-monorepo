/**
 * Webinar Drip Campaign API
 *
 * Sends scheduled emails for webinar drip sequences.
 * Designed to be called by a Cloudflare Cron Trigger or manually.
 *
 * Stages:
 * 1. registered → warmup_sent (Day -3)
 * 2. warmup_sent → reminder_sent (Day -1)
 * 3. reminder_sent → attended (after webinar)
 * 4. attended → follow_up_sent (Day 0 post)
 */

import { json, type RequestEvent } from '@sveltejs/kit';
import {
	generateWarmupEmail,
	generateReminderEmail,
	generateRecordingEmail,
	emailSubjects
} from '$lib/webinar/email-templates.js';

interface WebinarEnv {
	DB: D1Database;
	RESEND_API_KEY: string;
	DRIP_API_KEY?: string; // Optional API key for manual triggers
}

interface D1Database {
	prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
	bind(...args: unknown[]): D1PreparedStatement;
	run(): Promise<D1Result>;
	first<T = unknown>(): Promise<T | null>;
	all<T = unknown>(): Promise<{ results: T[] }>;
}

interface D1Result {
	success: boolean;
}

interface Registration {
	id: string;
	email: string;
	name: string;
	drip_stage: string;
	webinar_slug: string;
}

// Webinar configuration (move to DB or config later)
const WEBINAR_CONFIG: Record<string, {
	title: string;
	meetingLink: string;
	dateTime: string;
	recordingLink?: string;
	surveyLink: string;
	slidesLink?: string;
}> = {
	'zero-to-cloudflare': {
		title: 'Zero to Cloudflare in 30 Minutes',
		meetingLink: 'TBA', // Update before webinar
		dateTime: 'TBA', // Update before webinar
		surveyLink: 'https://createsomething.space/webinars/zero-to-cloudflare/survey'
	}
};

async function sendEmail(
	env: WebinarEnv,
	to: string,
	subject: string,
	html: string
): Promise<boolean> {
	try {
		const response = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.RESEND_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				from: 'CREATE SOMETHING <hello@createsomething.io>',
				to,
				subject,
				html
			})
		});

		if (!response.ok) {
			const error = await response.json();
			console.error('Resend error:', error);
			return false;
		}

		return true;
	} catch (err) {
		console.error('Email send error:', err);
		return false;
	}
}

async function updateDripStage(
	env: WebinarEnv,
	id: string,
	newStage: string
): Promise<void> {
	await env.DB.prepare(
		`UPDATE webinar_registrations SET drip_stage = ? WHERE id = ?`
	)
		.bind(newStage, id)
		.run();
}

export const POST = async ({ request, platform }: RequestEvent) => {
	const env = platform?.env as WebinarEnv | undefined;
	
	if (!env?.DB || !env?.RESEND_API_KEY) {
		return json({ error: 'Service unavailable' }, { status: 500 });
	}

	// Parse request body for stage and optional API key
	let body: { stage: string; webinar_slug: string; api_key?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}

	const { stage, webinar_slug, api_key } = body;

	// Verify API key if configured (for manual triggers)
	if (env.DRIP_API_KEY && api_key !== env.DRIP_API_KEY) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const config = WEBINAR_CONFIG[webinar_slug];
	if (!config) {
		return json({ error: 'Unknown webinar' }, { status: 400 });
	}

	let currentStage: string;
	let nextStage: string;
	let generateEmail: (reg: Registration) => { subject: string; html: string };

	switch (stage) {
		case 'warmup':
			currentStage = 'registered';
			nextStage = 'warmup_sent';
			generateEmail = (reg) => ({
				subject: emailSubjects.warmup(),
				html: generateWarmupEmail(reg.name || 'there', config.title)
			});
			break;

		case 'reminder':
			currentStage = 'warmup_sent';
			nextStage = 'reminder_sent';
			generateEmail = (reg) => ({
				subject: emailSubjects.reminder(config.title),
				html: generateReminderEmail(
					reg.name || 'there',
					config.title,
					config.meetingLink,
					config.dateTime
				)
			});
			break;

		case 'recording':
			currentStage = 'attended';
			nextStage = 'follow_up_sent';
			generateEmail = (reg) => ({
				subject: emailSubjects.recording(config.title),
				html: generateRecordingEmail(
					reg.name || 'there',
					config.title,
					config.recordingLink || 'TBA',
					config.surveyLink,
					config.slidesLink
				)
			});
			break;

		default:
			return json({ error: 'Invalid stage' }, { status: 400 });
	}

	// Fetch registrations at current stage
	const registrations = await env.DB.prepare(
		`SELECT id, email, name, drip_stage, webinar_slug
		 FROM webinar_registrations
		 WHERE webinar_slug = ? AND drip_stage = ?`
	)
		.bind(webinar_slug, currentStage)
		.all<Registration>();

	const results = {
		processed: 0,
		sent: 0,
		failed: 0,
		emails: [] as string[]
	};

	for (const reg of registrations.results) {
		results.processed++;
		const { subject, html } = generateEmail(reg);
		const sent = await sendEmail(env, reg.email, subject, html);

		if (sent) {
			await updateDripStage(env, reg.id, nextStage);
			results.sent++;
			results.emails.push(reg.email);
		} else {
			results.failed++;
		}
	}

	console.log(`[DripAPI] Stage ${stage} for ${webinar_slug}:`, results);

	return json({
		success: true,
		stage,
		webinar_slug,
		...results
	});
};
