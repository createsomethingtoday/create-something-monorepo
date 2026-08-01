import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const mode = process.argv[2] ?? 'all';
const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const previewPort = Number(process.env.CONCIERGE_ACCEPTANCE_PORT ?? '4179');
const baseUrl = process.env.CONCIERGE_ACCEPTANCE_BASE_URL ?? `http://127.0.0.1:${previewPort}`;

class CookieJar {
	constructor() {
		this.cookies = new Map();
	}

	store(response) {
		const headerBag = response.headers;
		const setCookieValues =
			typeof headerBag.getSetCookie === 'function'
				? headerBag.getSetCookie()
				: headerBag.get('set-cookie')
					? [headerBag.get('set-cookie')]
					: [];

		for (const value of setCookieValues) {
			if (!value) {
				continue;
			}

			const cookiePair = value.split(';', 1)[0]?.trim();
			if (!cookiePair) {
				continue;
			}

			const separatorIndex = cookiePair.indexOf('=');
			if (separatorIndex <= 0) {
				continue;
			}

			const name = cookiePair.slice(0, separatorIndex);
			const cookieValue = cookiePair.slice(separatorIndex + 1);
			if (!cookieValue) {
				this.cookies.delete(name);
				continue;
			}
			this.cookies.set(name, cookieValue);
		}
	}

	toHeader() {
		return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
	}
}

class AcceptanceClient {
	constructor(baseUrl) {
		this.baseUrl = baseUrl;
		this.jar = new CookieJar();
	}

	async request(pathname, options = {}) {
		const headers = new Headers(options.headers ?? {});
		const cookieHeader = this.jar.toHeader();
		if (cookieHeader) {
			headers.set('cookie', cookieHeader);
		}

		const response = await fetch(new URL(pathname, this.baseUrl), {
			redirect: 'manual',
			...options,
			headers
		});
		this.jar.store(response);

		const contentType = response.headers.get('content-type') ?? '';
		const bodyText = await response.text();
		let body = null;
		if (contentType.includes('application/json') && bodyText) {
			body = JSON.parse(bodyText);
		}

		return {
			status: response.status,
			headers: response.headers,
			bodyText,
			body
		};
	}

	async get(pathname) {
		return this.request(pathname, { method: 'GET' });
	}

	async postJson(pathname, payload) {
		return this.request(pathname, {
			method: 'POST',
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify(payload)
		});
	}

	async postFormData(pathname, formData) {
		return this.request(pathname, {
			method: 'POST',
			body: formData
		});
	}
}

function assertOk(result, message) {
	assert.ok(
		result.status >= 200 && result.status < 300,
		`${message} (${result.status}): ${result.bodyText}`
	);
}

function getConfirmableFieldKeys(threadView) {
	return threadView.thread.profile.fields
		.filter(
			(field) =>
				['preferred_shift', 'preferred_region'].includes(field.key) &&
				(field.status === 'candidate' || field.status === 'inferred')
		)
		.map((field) => field.key);
}

function needsConsent(threadView) {
	return threadView.thread.profile.fields.some(
		(field) => field.key === 'background_check_consent' && field.status !== 'confirmed'
	);
}

function getAppointmentWidget(threadView) {
	return threadView.inlineWidgets.find((widget) => widget.type === 'appointment_picker') ?? null;
}

async function confirmIfNeeded(client, threadId, threadView) {
	const confirmableKeys = getConfirmableFieldKeys(threadView);
	if (confirmableKeys.length === 0) {
		return threadView;
	}

	const confirmed = await client.postJson(`/api/threads/${threadId}/action`, {
		type: 'confirm_fields',
		fieldKeys: confirmableKeys
	});
	assertOk(confirmed, 'Failed to confirm inferred fields');
	return confirmed.body.threadView;
}

async function captureConsentIfNeeded(client, threadId, threadView) {
	if (!needsConsent(threadView)) {
		return threadView;
	}

	const consent = await client.postJson(`/api/threads/${threadId}/action`, {
		type: 'capture_consent'
	});
	assertOk(consent, 'Failed to capture consent');
	return consent.body.threadView;
}

async function verifySession(client) {
	const requestChallenge = await client.postJson('/api/intake-verification/request', {
		email: 'candidate@example.com'
	});
	assertOk(requestChallenge, 'Failed to request verification code');
	assert.equal(requestChallenge.body.mode, 'preview', 'Expected preview verification mode locally');
	assert.ok(requestChallenge.body.previewCode, 'Expected preview verification code');

	const verifyChallenge = await client.postJson('/api/intake-verification/verify', {
		email: 'candidate@example.com',
		code: requestChallenge.body.previewCode
	});
	assertOk(verifyChallenge, 'Failed to verify challenge');
}

async function uploadRequiredDocuments(client, threadId) {
	const formData = new FormData();
	formData.set(
		'resume_pdf',
		new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'resume.pdf', {
			type: 'application/pdf'
		})
	);
	formData.set(
		'compact_license_image',
		new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'compact-license.png', {
			type: 'image/png'
		})
	);

	const upload = await client.postFormData(`/api/threads/${threadId}/attachments`, formData);
	assertOk(upload, 'Failed to upload required documents');
	return upload.body.threadView;
}

async function prepareBookedCandidateThread(client) {
	const reset = await client.postJson('/api/threads/reset', {});
	assertOk(reset, 'Failed to reset session');

	const homePage = await client.get('/');
	assert.equal(homePage.status, 200, 'Expected / to render');
	assert.match(
		homePage.bodyText,
		/\/abundance\/logo-mark\.png/,
		'Expected the shared navigation to use the Abundance raster mark'
	);
	assert.match(
		homePage.bodyText,
		/rel="apple-touch-icon"[^>]+\/abundance\/apple-touch-icon\.png/,
		'Expected the Abundance webclip metadata'
	);
	assert.match(
		homePage.bodyText,
		/rel="manifest"[^>]+\/abundance\/site\.webmanifest/,
		'Expected the Abundance manifest metadata'
	);
	assert.match(homePage.bodyText, /Skip to main content/, 'Expected the shared skip link');
	assert.match(
		homePage.bodyText,
		/aria-controls="primary-navigation"/,
		'Expected the mobile navigation control relationship'
	);
	assert.match(
		homePage.bodyText,
		/aria-label="Open navigation"/,
		'Expected an explicit closed navigation label'
	);
	assert.match(
		homePage.bodyText,
		/Start application/,
		'Expected the applicant action to remain explicit in shared navigation'
	);

	const jobsPage = await client.get('/jobs');
	assert.equal(jobsPage.status, 200, 'Expected /jobs to render');
	assert.match(
		jobsPage.bodyText,
		/Filter open nursing roles/,
		'Expected role discovery filters'
	);
	assert.match(
		jobsPage.bodyText,
		/Try ICU, Austin, or nights/,
		'Expected a concrete role-search prompt'
	);

	const applyPage = await client.get('/apply');
	assert.equal(applyPage.status, 200, 'Expected /apply to render');
	assert.match(applyPage.bodyText, /Voice Concierge/i, 'Expected /apply voice entry point');

	const voicePage = await client.get('/voice');
	assert.equal(voicePage.status, 200, 'Expected /voice to render');
	assert.match(voicePage.bodyText, /Say what fits/i, 'Expected branded voice experience');

	const clientServicePage = await client.get('/client-service');
	assert.equal(clientServicePage.status, 200, 'Expected /client-service to render');
	assert.match(
		clientServicePage.bodyText,
		/Find the office/i,
		'Expected the NPG client-service experience'
	);
	assert.match(
		clientServicePage.bodyText,
		/\/npg-client-service\/logo-mark\.png/,
		'Expected the NPG client-service identity mark'
	);
	assert.match(
		clientServicePage.bodyText,
		/rel="apple-touch-icon"[^>]+\/npg-client-service\/apple-touch-icon\.png/,
		'Expected the NPG client-service webclip metadata'
	);
	assert.match(
		clientServicePage.bodyText,
		/rel="manifest"[^>]+\/npg-client-service\/site\.webmanifest/,
		'Expected the NPG client-service manifest metadata'
	);

	const clientServiceWebclip = await client.get('/npg-client-service/apple-touch-icon.png');
	assert.equal(clientServiceWebclip.status, 200, 'Expected the NPG client-service webclip asset');
	assert.doesNotMatch(
		clientServicePage.bodyText,
		/\/npg-client-service\/[^"']+\.svg/,
		'Expected the NPG client-service identity to remain raster-only'
	);

	const created = await client.postJson('/api/threads', {});
	assertOk(created, 'Failed to create thread');
	const threadId = created.body.threadId;
	assert.ok(threadId, 'Expected thread id');

	const sent = await client.postJson(`/api/threads/${threadId}/message`, {
		body: "I'm an ICU travel nurse looking for night shifts within 50 miles of Dallas, and I have an active compact license."
	});
	assertOk(sent, 'Failed to send intake message');

	const threadPage = await client.get(`/chat/${threadId}`);
	assert.equal(threadPage.status, 200, 'Expected candidate thread to render');
	assert.match(
		threadPage.bodyText,
		/<title>[^<]+ \| Abundance Concierge<\/title>/,
		'Expected a route-specific candidate thread title'
	);
	assert.match(
		threadPage.bodyText,
		/id="application-next-step"/,
		'Expected the candidate next-step anchor'
	);

	const profilePage = await client.get(`/chat/${threadId}/profile`);
	assert.equal(profilePage.status, 200, 'Expected candidate profile to render');
	assert.match(
		profilePage.bodyText,
		/<title>[^<]+ details \| Abundance Concierge<\/title>/,
		'Expected a route-specific candidate profile title'
	);

	let threadView = sent.body.threadView;
	threadView = await confirmIfNeeded(client, threadId, threadView);
	threadView = await captureConsentIfNeeded(client, threadId, threadView);

	await verifySession(client);
	threadView = await uploadRequiredDocuments(client, threadId);
	threadView = await confirmIfNeeded(client, threadId, threadView);

	const appointmentWidget = getAppointmentWidget(threadView);
	assert.ok(appointmentWidget, 'Expected appointment picker after candidate completion');
	assert.ok(appointmentWidget.data.slots.length > 0, 'Expected recruiter slots');

	const booked = await client.postJson(`/api/threads/${threadId}/action`, {
		type: 'book_appointment',
		slotId: appointmentWidget.data.slots[0].id
	});
	assertOk(booked, 'Failed to book recruiter review');
	assert.equal(
		getAppointmentWidget(booked.body.threadView)?.data.status,
		'booked',
		'Expected booked recruiter review state'
	);

	return {
		threadId,
		threadView: booked.body.threadView
	};
}

async function runCandidateAcceptance(client) {
	const booked = await prepareBookedCandidateThread(client);
	assert.equal(booked.threadView.nextStep.intent, 'complete_review');
	console.log(`candidate acceptance passed for thread ${booked.threadId}`);
}

async function runInternalAcceptance(client) {
	const preview = await client.postJson('/api/agency-access/preview', { mode: 'allowed' });
	assertOk(preview, 'Failed to enable local .agency preview access');

	const booked = await prepareBookedCandidateThread(client);
	const threadId = booked.threadId;
	const actions = [
		'complete_review',
		'start_staffing_outreach',
		'submit_to_facility',
		'record_facility_interview',
		'confirm_placement',
		'start_onboarding',
		'complete_onboarding'
	];

	let threadView = booked.threadView;
	for (const actionType of actions) {
		const action = await client.postJson(`/api/threads/${threadId}/action`, { type: actionType });
		assertOk(action, `Failed internal action ${actionType}`);
		threadView = action.body.threadView;
	}

	assert.equal(threadView.thread.handoff?.onboardingStatus, 'completed');
	assert.ok(
		['done', 'ready'].includes(threadView.nextStep.intent),
		`Expected completed onboarding terminal intent, received ${threadView.nextStep.intent}`
	);
	console.log(`internal acceptance passed for thread ${threadId}`);
}

async function startPreviewServer() {
	if (process.env.CONCIERGE_ACCEPTANCE_BASE_URL) {
		return null;
	}

	const preview = spawn(
		'pnpm',
		['exec', 'vite', 'dev', '--host', '127.0.0.1', '--port', String(previewPort), '--strictPort'],
		{
			cwd: packageDir,
			env: {
				...process.env,
				ENVIRONMENT: 'development',
				ALLOW_AGENCY_ACCESS_PREVIEW: 'true',
				ABUNDANCE_REQUIRE_SIGNED_INTAKE: 'true',
				ABUNDANCE_INTAKE_SIGNING_SECRET:
					process.env.ABUNDANCE_INTAKE_SIGNING_SECRET ?? 'test-intake-signing-secret'
			},
			stdio: 'pipe'
		}
	);

	let serverOutput = '';
	preview.stdout.on('data', (chunk) => {
		serverOutput += chunk.toString();
	});
	preview.stderr.on('data', (chunk) => {
		serverOutput += chunk.toString();
	});

	for (let attempt = 0; attempt < 60; attempt += 1) {
		if (preview.exitCode !== null) {
			throw new Error(`Acceptance server exited early:\n${serverOutput}`);
		}

		try {
			const response = await fetch(new URL('/apply', baseUrl));
			if (response.status === 200) {
				return preview;
			}
		} catch {
			// Server is still starting.
		}

		await delay(500);
	}

	preview.kill('SIGTERM');
	throw new Error(`Timed out waiting for acceptance server:\n${serverOutput}`);
}

async function main() {
	assert.ok(['candidate', 'internal', 'all'].includes(mode), 'Use candidate, internal, or all.');

	const preview = await startPreviewServer();
	const client = new AcceptanceClient(baseUrl);

	try {
		if (mode === 'candidate' || mode === 'all') {
			await runCandidateAcceptance(client);
		}

		if (mode === 'internal' || mode === 'all') {
			await runInternalAcceptance(client);
		}
	} finally {
		if (preview) {
			preview.kill('SIGTERM');
			await new Promise((resolve) => {
				preview.once('exit', resolve);
			});
		}
	}
}

await main();
