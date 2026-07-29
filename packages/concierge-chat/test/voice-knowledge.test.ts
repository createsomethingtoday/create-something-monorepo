import assert from 'node:assert/strict';
import test from 'node:test';

import { voiceConciergeInstructions } from '../src/lib/voice/knowledge';

test('Voice Concierge keeps collection and staffing judgment bounded', () => {
  assert.match(voiceConciergeInstructions, /You are not a recruiter/i);
  assert.match(voiceConciergeInstructions, /do not ask for or repeat a full legal name/i);
  assert.match(voiceConciergeInstructions, /identity, documents, credentials, consent/i);
  assert.match(voiceConciergeInstructions, /do not promise a job/i);
  assert.match(voiceConciergeInstructions, /prepare_application_brief/i);
  assert.match(voiceConciergeInstructions, /nothing is submitted/i);
  assert.match(voiceConciergeInstructions, /recruiter reviews fit/i);
});
