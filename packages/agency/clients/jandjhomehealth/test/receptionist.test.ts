import assert from 'node:assert/strict';
import test from 'node:test';

import {
	agencyKnowledge,
	buildReceptionistInstructions,
	receptionistVoice,
	receptionistVoiceSpeed,
	type ReceptionistKnowledge
} from '../src/lib/receptionist/knowledge';

test('the synthetic corpus names safe services and keeps unknown agency facts explicit', () => {
	assert.equal(agencyKnowledge.agency.name, 'J and J Home Health');
	assert.equal(agencyKnowledge.agency.phone, '(817) 999-3839');
	assert.ok(agencyKnowledge.services.some((service) => service.name === 'Skilled nursing'));
	assert.ok(agencyKnowledge.services.some((service) => service.name === 'Therapy at home'));

	for (const unknown of [
		'office hours',
		'service area',
		'accepted insurance plans',
		'caller eligibility',
		'visit availability'
	]) {
		assert.ok(
			agencyKnowledge.unknowns.some((item) => item.toLowerCase().includes(unknown)),
			`expected unknown corpus entry for ${unknown}`
		);
	}
});

test('the voice policy makes demo, privacy, clinical, emergency, and handoff boundaries explicit', () => {
	const prompt = buildReceptionistInstructions(agencyKnowledge).toLowerCase();

	for (const requiredRule of [
		'fictional information',
		'do not persist',
		'call 911 now',
		'do not diagnose',
		'do not provide medication instructions',
		'do not promise eligibility or insurance coverage',
		'do not claim to access patient records',
		'one question at a time',
		'unclear audio',
		'simulated callback request'
	]) {
		assert.match(prompt, new RegExp(requiredRule.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
	}
});

test('Jamie uses the requested respectful Black woman voice persona', () => {
	const prompt = buildReceptionistInstructions(agencyKnowledge);

	assert.equal(receptionistVoice, 'coral');
	assert.equal(receptionistVoiceSpeed, 1);
	assert.match(prompt, /Black American woman/i);
	assert.match(prompt, /professional/i);
	assert.match(prompt, /Do not exaggerate dialect, slang, or cultural markers/i);
	assert.match(prompt, /substantially softer than a typical business phone voice/i);
	assert.match(prompt, /Do not whisper/i);
});

test('corpus injection remains data-driven for a future agency-owned replacement', () => {
	const fixture: ReceptionistKnowledge = {
		...agencyKnowledge,
		agency: { ...agencyKnowledge.agency, name: 'Example Home Health' }
	};

	const prompt = buildReceptionistInstructions(fixture);
	assert.match(prompt, /Example Home Health/);
	assert.doesNotMatch(prompt, /J and J Home Health/);
});
