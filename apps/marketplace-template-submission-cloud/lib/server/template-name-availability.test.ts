import assert from 'node:assert/strict';
import test from 'node:test';

import { getTemplateNameAvailabilityFailureMessage } from './template-name-availability';

test('clarifies unauthorized template name availability failures', () => {
  assert.equal(
    getTemplateNameAvailabilityFailureMessage(
      new Error('You are not authorized to perform this operation')
    ),
    'Template name availability could not be checked because the marketplace name lookup is not authorized. The name has not been cleared yet; please try again later or contact the Marketplace team if this continues.'
  );
});

test('clarifies unconfigured template name availability failures', () => {
  assert.equal(
    getTemplateNameAvailabilityFailureMessage(new Error('Airtable runtime env not available')),
    'Template name availability could not be checked because this form is not connected to the marketplace name database. The name has not been cleared yet; please try again later.'
  );
});

test('clarifies rate limited template name availability failures', () => {
  assert.equal(
    getTemplateNameAvailabilityFailureMessage(new Error('Request failed with status 429')),
    'Template name availability is rate limited right now. Wait a minute, then run Check name again.'
  );
});

test('clarifies unavailable template name availability failures', () => {
  assert.equal(
    getTemplateNameAvailabilityFailureMessage(new Error('fetch failed')),
    'Template name availability could not be checked because the marketplace name service did not respond. The name has not been cleared yet; please run Check name again in a few minutes.'
  );
});
