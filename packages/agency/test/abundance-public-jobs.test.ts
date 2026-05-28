import test from 'node:test';
import assert from 'node:assert/strict';

import {
	buildPublicJobUpsert,
	normalizeBrightDataJobRecord,
	normalizePublicJob,
	parseBrightDataJobsResponse
} from '../src/lib/abundance/public-jobs.ts';
import {
	buildBrightDataFilterRequest,
	fetchBrightDataJobs,
	fetchBrightDataJobsSnapshot
} from '../src/lib/server/abundance-public-jobs.ts';

test('Bright Data job records normalize into the provider-independent Abundance job shape', async () => {
	const job = await normalizeBrightDataJobRecord(
		{
			url: 'https://www.linkedin.com/jobs/view/4416048502/',
			job_posting_id: '4416048502',
			job_title: 'Travel Nurse RN - Med Surg',
			company_name: 'Abundance Health',
			job_location: 'Fremont, CA',
			job_type: 'Contract',
			salary_range: '$2,200 - $2,600 weekly',
			posted_date: '2026-05-17'
		},
		{ fetchedAt: '2026-05-22T12:00:00.000Z', providerSnapshotId: 's_test' }
	);

	assert.equal(job.provider, 'bright_data');
	assert.equal(job.source_system, 'linkedin_jobs');
	assert.equal(job.external_job_id, '4416048502');
	assert.equal(job.title, 'Travel Nurse RN - Med Surg');
	assert.equal(job.employer, 'Abundance Health');
	assert.equal(job.city, 'Fremont');
	assert.equal(job.state, 'CA');
	assert.equal(job.location_text, 'Fremont, CA');
	assert.equal(job.employment_type, 'Contract');
	assert.equal(job.pay_text, '$2,200 - $2,600 weekly');
	assert.equal(job.status, 'open');
	assert.equal(job.provider_snapshot_id, 's_test');
	assert.match(job.id, /^abjob_[a-f0-9]{24}$/);
	assert.match(job.raw_payload_hash, /^[a-f0-9]{64}$/);
});

test('Bright Data Indeed records normalize selected dataset fields', async () => {
	const job = await normalizeBrightDataJobRecord({
		url: 'https://www.indeed.com/viewjob?jk=abc123',
		jobid: 'abc123',
		job_title: 'Registered Nurse',
		company_name: 'Abundance Health',
		location: 'Austin, TX',
		job_type: 'Full-time',
		salary_formatted: '$42 - $52 an hour',
		apply_link: 'https://www.indeed.com/applystart?jk=abc123',
		date_posted_parsed: '2026-05-17T00:00:00.000Z',
		is_expired: true
	});

	assert.equal(job.source_system, 'indeed_jobs');
	assert.equal(job.external_job_id, 'abc123');
	assert.equal(job.application_url, 'https://www.indeed.com/applystart?jk=abc123');
	assert.equal(job.pay_text, '$42 - $52 an hour');
	assert.equal(job.posted_at, '2026-05-17T00:00:00.000Z');
	assert.equal(job.status, 'expired');
});

test('public job raw payload hashes are stable across object key order', async () => {
	const first = await normalizePublicJob({
		provider: 'manual',
		source_system: 'unit_test',
		external_job_id: 'same-job',
		title: 'RN',
		raw_payload: { b: 2, a: 1 }
	});
	const second = await normalizePublicJob({
		provider: 'manual',
		source_system: 'unit_test',
		external_job_id: 'same-job',
		title: 'RN',
		raw_payload: { a: 1, b: 2 }
	});

	assert.equal(first.id, second.id);
	assert.equal(first.raw_payload_hash, second.raw_payload_hash);
	assert.equal(first.raw_payload_json, '{"a":1,"b":2}');
});

test('Bright Data response parser accepts array, record wrapper, and snapshot-only responses', () => {
	assert.deepEqual(parseBrightDataJobsResponse([{ job_title: 'RN' }]), {
		records: [{ job_title: 'RN' }]
	});

	assert.deepEqual(parseBrightDataJobsResponse({ snapshot_id: 's_123', records: [{ job_title: 'RN' }] }), {
		records: [{ job_title: 'RN' }],
		snapshotId: 's_123'
	});

	assert.deepEqual(parseBrightDataJobsResponse({ snapshot_id: 's_pending' }), {
		records: [],
		snapshotId: 's_pending'
	});

	assert.deepEqual(parseBrightDataJobsResponse('{"job_title":"RN"}\n{"title":"LPN"}'), {
		records: [{ job_title: 'RN' }, { title: 'LPN' }]
	});
});

test('Bright Data filter request stays bounded before paid collection starts', () => {
	assert.deepEqual(buildBrightDataFilterRequest('gd_jobs', { query: 'nurse', state: 'ca', limit: 250 }), {
		dataset_id: 'gd_jobs',
		records_limit: 250,
		filter: {
			operator: 'and',
			filters: [
				{ name: 'job_title', operator: 'includes', value: 'nurse' },
				{ name: 'location', operator: 'includes', value: 'CA' }
			]
		}
	});

	assert.deepEqual(buildBrightDataFilterRequest('gd_jobs', { posted_after: '2026-05-01', limit: 10 }), {
		dataset_id: 'gd_jobs',
		records_limit: 10,
		filter: { name: 'date_posted_parsed', operator: '>=', value: '2026-05-01T00:00:00.000Z' }
	});

	assert.throws(
		() => buildBrightDataFilterRequest('gd_jobs', {}),
		/At least one Bright Data filter is required/
	);
});

test('Bright Data filter can wait for a ready snapshot and download records', async () => {
	const originalFetch = globalThis.fetch;
	const calls: string[] = [];
	let downloadAttempts = 0;

	globalThis.fetch = async (input) => {
		const url = String(input);
		calls.push(url);

		if (url === 'https://api.brightdata.com/datasets/filter') {
			return jsonResponse({ snapshot_id: 'snap_ready' });
		}

		if (url === 'https://api.brightdata.com/datasets/snapshots/snap_ready') {
			return jsonResponse({ id: 'snap_ready', status: 'ready' });
		}

		if (url === 'https://api.brightdata.com/datasets/snapshots/snap_ready/download?format=json') {
			downloadAttempts += 1;
			if (downloadAttempts === 1) {
				return new Response('Snapshot is building. Try again in a few minutes', { status: 202 });
			}

			return jsonResponse([{ jobid: 'abc123', job_title: 'Registered Nurse' }]);
		}

		return new Response('not found', { status: 404 });
	};

	try {
		const result = await fetchBrightDataJobs(
			{
				BRIGHT_DATA_API_TOKEN: 'token',
				ABUNDANCE_BRIGHT_DATA_JOBS_DATASET_ID: 'gd_jobs'
			},
			{ query: 'Nurse', limit: 1 },
			{ waitForSnapshot: true, snapshotPollIntervalMs: 1, snapshotTimeoutMs: 100 }
		);

		assert.equal(result.snapshotId, 'snap_ready');
		assert.equal(result.snapshotStatus, 'ready');
		assert.deepEqual(result.records, [{ jobid: 'abc123', job_title: 'Registered Nurse' }]);
		assert.deepEqual(calls, [
			'https://api.brightdata.com/datasets/filter',
			'https://api.brightdata.com/datasets/snapshots/snap_ready',
			'https://api.brightdata.com/datasets/snapshots/snap_ready/download?format=json',
			'https://api.brightdata.com/datasets/snapshots/snap_ready/download?format=json'
		]);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test('Bright Data snapshot download returns pending when an existing snapshot is not ready', async () => {
	const originalFetch = globalThis.fetch;

	globalThis.fetch = async (input) => {
		if (String(input) === 'https://api.brightdata.com/datasets/snapshots/snap_pending') {
			return jsonResponse({ id: 'snap_pending', status: 'running' });
		}

		return new Response('not found', { status: 404 });
	};

	try {
		const result = await fetchBrightDataJobsSnapshot(
			{ BRIGHT_DATA_API_TOKEN: 'token' },
			'snap_pending'
		);

		assert.equal(result.snapshotId, 'snap_pending');
		assert.equal(result.snapshotStatus, 'running');
		assert.deepEqual(result.records, []);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test('public job upsert targets the provider source external id uniqueness boundary', async () => {
	const job = await normalizePublicJob({
		provider: 'bright_data',
		source_system: 'indeed_jobs',
		external_job_id: 'abc123',
		title: 'Clinic RN',
		raw_payload: { jobid: 'abc123', job_title: 'Clinic RN' }
	});
	const statement = buildPublicJobUpsert(job);

	assert.match(statement.sql, /ON CONFLICT\(provider, source_system, external_job_id\)/);
	assert.equal(statement.args[1], 'bright_data');
	assert.equal(statement.args[2], 'indeed_jobs');
	assert.equal(statement.args[4], 'abc123');
});

function jsonResponse(body: unknown, init?: ResponseInit): Response {
	return new Response(JSON.stringify(body), {
		...init,
		headers: { 'Content-Type': 'application/json' }
	});
}
