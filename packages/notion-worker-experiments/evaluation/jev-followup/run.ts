import { readFile } from 'node:fs/promises';
import { classifyMeetingFollowup, type FollowupInput, type FollowupLane } from '../../src/jev-followup.js';

const apiKey = process.env.TYPESAFE_API_KEY?.trim();
if (!apiKey) throw new Error('TYPESAFE_API_KEY is required to run the Jev evaluation.');

const fixture = JSON.parse(await readFile(new URL('./cases.json', import.meta.url), 'utf8')) as {
  label_provenance: string;
  policy_version: string;
  cases: Array<FollowupInput & { id: string; expected: FollowupLane }>;
};

const results = [];
for (const item of fixture.cases) {
  const result = await classifyMeetingFollowup(item, { enabled: true, apiKey });
  results.push({
    id: item.id,
    expected: item.expected,
    suggested: result.suggestedLane,
    modelLane: result.modelLane,
    status: result.status,
    reason: result.reason,
    confidence: result.confidence,
    requestHash: result.requestHash,
    correct: item.expected === 'needs_review'
      ? result.status === 'needs_review'
      : result.suggestedLane === item.expected
  });
}

console.log(JSON.stringify({
  model: 'jev-1.13.0',
  policyVersion: fixture.policy_version,
  labelProvenance: fixture.label_provenance,
  total: results.length,
  suggestedCorrect: results.filter((result) => result.correct).length,
  needsReview: results.filter((result) => result.status === 'needs_review').length,
  results
}, null, 2));
