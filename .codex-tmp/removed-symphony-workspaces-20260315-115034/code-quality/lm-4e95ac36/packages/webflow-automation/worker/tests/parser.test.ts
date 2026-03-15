import assert from 'node:assert/strict';
import test from 'node:test';

import { parseSlackOnboardingMessage } from '../src/parser.js';

test('parser extracts structured fields from onboarding message', () => {
  const raw = [
    'Agency name: GH Branding',
    'Contact person: Edmar Batista',
    'Contact email: edmar@ghbranding.com.br',
    'Partner type: Certified / Premium Partner',
    'Acceleration: Yes, accelerate to Premium',
    'Partner (4,000 points)',
    'Enterprise distinction:',
    'Connect with Allish: Yes, share partner\'s info with Allish',
    'Workspace name: GH Workspace',
    'Workspace ID: 66144715427eb53787326617',
    'Submitter name: Allish Eisele',
    'Additional info:',
    'Will accelerate once onboarded.'
  ].join('\n');

  const parsed = parseSlackOnboardingMessage(raw);

  assert.equal(parsed.parseStatus, 'parsed');
  assert.equal(parsed.fields.agencyName, 'GH Branding');
  assert.equal(parsed.fields.contactName, 'Edmar Batista');
  assert.equal(parsed.fields.contactEmail, 'edmar@ghbranding.com.br');
  assert.equal(parsed.fields.accelerationRequested, true);
  assert.equal(parsed.fields.partnerPoints, 4000);
  assert.equal(parsed.fields.workspaceId, '66144715427eb53787326617');
  assert.equal(parsed.fields.connectWithAllish, true);
  assert.match(parsed.fields.additionalInfo ?? '', /onboarded/);
});

test('parser marks partial when required fields are missing', () => {
  const raw = ['Agency name: Missing workspace sample', 'Additional info: test'].join('\n');
  const parsed = parseSlackOnboardingMessage(raw);

  assert.equal(parsed.parseStatus, 'partial');
  assert.ok(parsed.warnings.some((warning) => warning.includes('Workspace ID')));
  assert.ok(parsed.warnings.some((warning) => warning.includes('Contact email')));
});
