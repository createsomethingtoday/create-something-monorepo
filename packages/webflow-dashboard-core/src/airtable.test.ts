import assert from 'node:assert/strict';
import test from 'node:test';
import {
  airtableFormulaValue,
  buildAssetListFormula,
  buildCreatorEmailMatchFormula,
  buildCreatorRecordEmailMatchFormula,
  fieldContainsEmail,
  validateEmail
} from './airtable';

test('creator asset formulas only reference fields guaranteed by the Airtable base', () => {
  const formula = buildCreatorEmailMatchFormula('Creator@Example.com');

  assert.match(formula, /'creator@example\.com'/);
  assert.match(formula, /\{🎨📧 Creator Email\}/);
  assert.match(formula, /\{🎨📧 Creator WF Account Email\}/);
  assert.match(formula, /\{📧Emails \(from 🎨Creator\)\}/);
  assert.doesNotMatch(formula, /\{CREATOR_EMAIL\}/);
  assert.doesNotMatch(formula, /IFERROR/);
});

test('creator asset formulas anchor the match to a whole address', () => {
  const formula = buildCreatorEmailMatchFormula('creator@example.com');

  // Comma-wrapped on both sides, so 'team+creator@example.com' cannot match.
  assert.match(formula, /FIND\(',' & 'creator@example\.com' & ','/);
  assert.match(formula, /SUBSTITUTE\(SUBSTITUTE\(SUBSTITUTE\(LOWER\(ARRAYJOIN\(/);
  assert.doesNotMatch(formula, /FIND\('creator@example\.com'/);
});

test('asset list formula quotes creator emails without adding a type constraint', () => {
  const formula = buildAssetListFormula("o'connor@example.com");

  assert.match(formula, /"o'connor@example\.com"/);
  assert.doesNotMatch(formula, /o''connor@example\.com/);
  assert.doesNotMatch(formula, /\{🆎Type\} = 'Template🏗️'/);
  assert.ok(formula.startsWith('OR('));
});

test('creator record formulas use the Creators table email fields', () => {
  const formula = buildCreatorRecordEmailMatchFormula('creator@example.com');

  assert.match(formula, /\{📧Email\}/);
  assert.match(formula, /\{📧WF Account Email\}/);
  assert.match(formula, /\{📧Emails\}/);
  assert.doesNotMatch(formula, /\(from 🎨Creator\)/);
});

test('airtableFormulaValue picks a quote style the value cannot escape', () => {
  assert.equal(airtableFormulaValue('creator@example.com'), "'creator@example.com'");
  assert.equal(airtableFormulaValue("o'connor@example.com"), '"o\'connor@example.com"');
  assert.equal(airtableFormulaValue('" , TRUE(), "'), '\'" , TRUE(), "\'');
  assert.throws(() => airtableFormulaValue('a\'b"c@example.com'), /both single and double quotes/);
  assert.throws(() => airtableFormulaValue('a\nb@example.com'), /control characters/);
});

test('fieldContainsEmail matches whole addresses only', () => {
  assert.equal(fieldContainsEmail(['Creator@Example.com'], 'creator@example.com'), true);
  assert.equal(
    fieldContainsEmail('other@example.com, creator@example.com', 'creator@example.com'),
    true
  );
  assert.equal(
    fieldContainsEmail(['Example Creator <creator@example.com>'], 'creator@example.com'),
    true
  );
  assert.equal(fieldContainsEmail(['team+webflow@agency.com'], 'webflow@agency.com'), false);
  assert.equal(fieldContainsEmail(['aa@example.com'], 'a@example.com'), false);
  assert.equal(fieldContainsEmail(['a@example.com'], ''), false);
  assert.equal(fieldContainsEmail(42, 'a@example.com'), false);
});

test('validateEmail rejects quote characters but keeps apostrophes', () => {
  assert.throws(() => validateEmail('a"b@example.com'), /Invalid email format/);
  assert.throws(() => validateEmail('a\\b@example.com'), /Invalid email format/);
  assert.equal(validateEmail("O'Connor@Example.com"), "o'connor@example.com");
});
