import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { performancePageRegistry } from '../../../config/performance-pages/registry.ts';
import {
	ltdOperatingFieldMedia,
	ltdPlaybookRouteMedia
} from '../src/lib/operator-library/court-media.ts';
import { getPlaybook, playbooks } from '../src/lib/operator-library/playbooks.ts';
import { assessWorkflowReadiness } from '../src/lib/operator-library/readiness.ts';

test('publishes four concrete operator playbooks with an owned execution path', () => {
	assert.deepEqual(
		playbooks.map((playbook) => playbook.slug),
		['inbound-triage', 'decision-brief', 'exception-handoff', 'solo-control-tower']
	);

	for (const playbook of playbooks) {
		assert.ok(playbook.owner);
		assert.ok(playbook.approvedWork);
		assert.ok(playbook.waitPoint);
		assert.ok(playbook.proof);
		assert.ok(playbook.runbook.length >= 4);
	}

	assert.equal(getPlaybook('decision-brief')?.title, 'Build a decision brief from scattered work');
	assert.equal(
		getPlaybook('solo-control-tower')?.title,
		'Run parallel work lanes without losing the decision'
	);
	assert.equal(getPlaybook('not-a-playbook'), undefined);
});

test('turns workflow gaps into a specific readiness state and next action', () => {
	const assessment = assessWorkflowReadiness({
		ambiguity: true,
		access: false,
		ownership: true,
		trust: false,
		proof: true
	});

	assert.equal(assessment.state, 'review');
	assert.deepEqual(
		assessment.gaps.map((gap) => gap.id),
		['access', 'trust']
	);
	assert.equal(assessment.nextAction.href, '/playbooks/exception-handoff');
});

test('marks a workflow ready only when every boundary is named', () => {
	const assessment = assessWorkflowReadiness({
		ambiguity: true,
		access: true,
		ownership: true,
		trust: true,
		proof: true
	});

	assert.equal(assessment.state, 'ready');
	assert.equal(assessment.gaps.length, 0);
	assert.equal(assessment.nextAction.href, '/playbooks');
});

test('registers the operator library routes with their intended page contracts', () => {
	const expected = [
		['ltd-playbook-library', 'index'],
		['ltd-playbook-details', 'editorial'],
		['ltd-readiness', 'tool']
	] as const;

	for (const [id, archetype] of expected) {
		const group = performancePageRegistry.find((candidate) => candidate.id === id);
		assert.equal(group?.status, 'migrated', id);
		assert.equal(group?.contract?.archetype, archetype, id);
	}
});

test('gives each campaign opening a responsive court study and keeps proof in live HTML', async () => {
	assert.deepEqual(
		[ltdOperatingFieldMedia.src, ltdOperatingFieldMedia.mobileSrc],
		[
			'/images/court/ltd-operating-field.webp',
			'/images/court/ltd-operating-field-mobile.webp'
		]
	);
	assert.deepEqual(
		[ltdPlaybookRouteMedia.src, ltdPlaybookRouteMedia.mobileSrc],
		[
			'/images/court/ltd-playbook-route.webp',
			'/images/court/ltd-playbook-route-mobile.webp'
		]
	);
	assert.match(ltdOperatingFieldMedia.alt, /operating field/i);
	assert.match(ltdPlaybookRouteMedia.alt, /approval boundary/i);

	const homeSource = await readFile(new URL('../src/routes/+page.svelte', import.meta.url), 'utf8');
	const playbooksSource = await readFile(
		new URL('../src/routes/playbooks/+page.svelte', import.meta.url),
		'utf8'
	);

	assert.match(homeSource, /media={ltdOperatingFieldMedia}/);
	assert.match(playbooksSource, /media={ltdPlaybookRouteMedia}/);
	assert.match(homeSource, /mode="ink"/);
	assert.match(playbooksSource, /mode="ink"/);
	assert.doesNotMatch(homeSource, /paperCanonSheetMedia|mode="paper"/);
	assert.doesNotMatch(playbooksSource, /paperPrototypeScoreMedia|mode="paper"/);
});
