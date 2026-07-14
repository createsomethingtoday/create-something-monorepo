import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAssetListFormula, buildCreatorEmailMatchFormula } from './airtable';

test('creator asset formulas only reference fields guaranteed by the Airtable base', () => {
  const formula = buildCreatorEmailMatchFormula('Creator@Example.com');

  assert.match(formula, /FIND\('creator@example\.com'/);
  assert.match(formula, /\{🎨📧 Creator Email\}/);
  assert.match(formula, /\{🎨📧 Creator WF Account Email\}/);
  assert.match(formula, /\{📧Emails \(from 🎨Creator\)\}/);
  assert.doesNotMatch(formula, /\{CREATOR_EMAIL\}/);
  assert.doesNotMatch(formula, /IFERROR/);
});

test('asset list formula escapes creator emails without adding a type constraint', () => {
  const formula = buildAssetListFormula("o'connor@example.com");

  assert.match(formula, /o''connor@example\.com/);
  assert.doesNotMatch(formula, /\{🆎Type\} = 'Template🏗️'/);
  assert.ok(formula.startsWith('OR('));
});
