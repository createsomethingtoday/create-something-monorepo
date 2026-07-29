import assert from 'node:assert/strict';
import test from 'node:test';

import { formatVoiceBriefForApplication, getVoiceBriefRows } from '../src/lib/voice/brief';

test('the confirmed voice brief becomes a review-first candidate message', () => {
  const brief = {
    specialty: 'ICU travel RN',
    workType: 'Travel contract',
    preferredShift: 'Nights',
    preferredLocation: 'Austin, Texas',
    startWindow: 'About six weeks',
    fitNotes: 'No rotating shifts'
  };

  assert.deepEqual(
    getVoiceBriefRows(brief).map(({ label, value }) => [label, value]),
    [
      ['Specialty or role', 'ICU travel RN'],
      ['Work type', 'Travel contract'],
      ['Preferred shift', 'Nights'],
      ['Preferred location', 'Austin, Texas'],
      ['Start window', 'About six weeks'],
      ['Fit notes', 'No rotating shifts']
    ]
  );

  const message = formatVoiceBriefForApplication(brief);
  assert.match(message, /candidate-controlled application brief/i);
  assert.match(message, /review and confirm/i);
  assert.match(message, /ICU travel RN/);
  assert.doesNotMatch(message, /submitted|recruiter contacted/i);
});
