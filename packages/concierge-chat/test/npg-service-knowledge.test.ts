import assert from 'node:assert/strict';
import test from 'node:test';

import { npgClientServiceInstructions } from '../src/lib/voice/npg-knowledge';

test('the NPG representative discloses automation and keeps its operating boundary clear', () => {
  assert.match(npgClientServiceInstructions, /automated NPG client service assistant/i);
  assert.match(npgClientServiceInstructions, /human (?:representative|help)/i);
  assert.match(npgClientServiceInstructions, /lookup_npg_location/i);
  assert.match(npgClientServiceInstructions, /never guess/i);
  assert.match(npgClientServiceInstructions, /do not disclose.*account numbers/i);
  assert.match(npgClientServiceInstructions, /do not disclose.*provider.*phone/i);
  assert.match(npgClientServiceInstructions, /do not guarantee.*late/i);
  assert.match(npgClientServiceInstructions, /do not formally cancel|does not formally cancel/i);
  assert.match(npgClientServiceInstructions, /not been sent|nothing has been sent/i);
  assert.match(npgClientServiceInstructions, /call 911/i);
});
