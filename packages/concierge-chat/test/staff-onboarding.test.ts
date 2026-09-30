import assert from 'node:assert/strict';
import test from 'node:test';
import type { ConciergeThread } from '../src/lib/chat/thread-store';
import { buildStaffOnboardingPayload } from '../src/lib/server/abundance/staff-onboarding';

function field(key: string, value: string, fieldClass: 'identity' | 'contact' | 'consent' | 'regulated' | 'credential' | 'preference') {
	return {
		key,
		label: key,
		value,
		status: 'confirmed' as const,
		confidence: 1,
		fieldClass,
		sourceMessageIds: ['m1'],
		sourceArtifactIds: [],
		updatedAt: '2026-06-03T12:00:00.000Z',
		confirmedBy: 'user' as const
	};
}

function createReadyThread(): ConciergeThread {
	return {
		id: 'ready-staff-thread',
		title: 'Ready staff thread',
		subtitle: 'Ready for Staff DB',
		userName: 'Avery Stone',
		updatedAt: '2026-06-03T12:00:00.000Z',
		status: 'active',
		pendingAction: '',
		badges: [],
		messages: [],
		widgets: [],
		profile: {
			completion: 100,
			confirmedCount: 4,
			inferredCount: 0,
			candidateCount: 0,
			missingRequired: [],
			blockers: [],
			fields: [
				field('phone', '+15550000001', 'contact'),
				field('full_name', 'Avery Stone', 'identity'),
				field('specialty', 'ICU', 'regulated'),
				field('background_check_consent', 'yes', 'consent')
			]
		},
		artifacts: [],
		turn: {
			stage: 'idle',
			summary: 'Candidate is ready for Staff DB submission.',
			blockers: [],
			nextActionLabel: 'Save to Staff DB',
			policyRef: 'policy.progressive-profile-governance.v1'
		},
		connectedTools: []
	};
}

test('staff onboarding payload records Paylocity graduation as human-confirmed boundary', () => {
	const result = buildStaffOnboardingPayload(createReadyThread());

	assert.equal(result.ready, true);
	assert.ok(result.payload);
	assert.deepEqual(result.payload.metadata.paylocity_graduation, {
		state: 'requires_human_confirmation',
		confirmed: false,
		target_system: 'paylocity'
	});
});
