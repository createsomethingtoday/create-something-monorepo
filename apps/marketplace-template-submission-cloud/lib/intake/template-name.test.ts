import assert from 'node:assert/strict';
import test from 'node:test';

import { validateTemplateNameSyntax } from './template-name';

test('blocks agent and lookalike template names used for search gaming', () => {
  const blockedNames = [
    'Agentra0',
    'Agent Lite',
    'Neilani Agents DB',
    'Ag3n7 Studio',
    'A-g-e-n-t Studio',
    'NexAgent'
  ];

  for (const name of blockedNames) {
    const result = validateTemplateNameSyntax(name);

    assert.equal(result.valid, false, `${name} should fail validation`);
    assert.match(result.errors.join(' '), /agent/i);
    assert.deepEqual(result.matchedForbiddenTokens, ['agent']);
  }
});

test('allows nearby names that do not use agent as a search term', () => {
  const allowedNames = ['Magenta Studio', 'Air Studio', 'Orbit Canvas'];

  for (const name of allowedNames) {
    const result = validateTemplateNameSyntax(name);

    assert.equal(result.valid, true, `${name} should pass validation`);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.matchedForbiddenTokens, []);
  }
});
