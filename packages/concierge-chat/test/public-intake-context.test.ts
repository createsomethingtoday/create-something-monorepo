import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildFacilityCoverageBrief,
  buildSelectedRoleIntakeMessage
} from '../src/lib/site/public-intake-context.ts';

test('selected public roles become the first bounded candidate intake context', () => {
  const message = buildSelectedRoleIntakeMessage({
    id: 'job-icu-1',
    title: 'Travel RN - ICU',
    employer: 'Abundance Staffing',
    display_location: 'Dallas, TX',
    status: 'open'
  });

  assert.equal(
    message,
    'I want to apply for Travel RN - ICU at Abundance Staffing in Dallas, TX. Keep this role in context and ask what preferences still need confirmation.'
  );
});

test('selected role context avoids empty employer and location fragments', () => {
  assert.equal(
    buildSelectedRoleIntakeMessage({ id: 'job-2', title: 'RN - Med Surg', status: 'open' }),
    'I want to apply for RN - Med Surg. Keep this role in context and ask what preferences still need confirmation.'
  );
});

test('facility coverage details become a prepared, explicitly unsent brief', () => {
  assert.equal(
    buildFacilityCoverageBrief({
      facilityName: 'Northstar Medical Center',
      specialtyOrUnit: 'ICU',
      shift: 'Nights',
      coverageWindow: 'June 3–16',
      location: 'Dallas, TX',
      urgency: 'Coverage needed this week'
    }),
    [
      'Facility coverage brief',
      'Facility: Northstar Medical Center',
      'Need: ICU',
      'Shift: Nights',
      'Coverage window: June 3–16',
      'Location: Dallas, TX',
      'Urgency: Coverage needed this week',
      'Prepared for recruiter review. This brief is not submitted from this page.'
    ].join('\n')
  );
});
