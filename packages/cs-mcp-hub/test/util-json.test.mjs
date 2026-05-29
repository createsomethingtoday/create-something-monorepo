import test from 'node:test';
import assert from 'node:assert/strict';

import {
  booleanArg,
  enumArg,
  isRecord,
  normalizeArgs,
  numberArg,
  parseBooleanEnv,
  parseCsvList,
  parsePositiveInt,
  stringArg,
  stringArrayArg,
  toErrorResult,
  toJsonResource,
  toJsonResult,
} from '../dist/util/json.js';

test('isRecord distinguishes plain objects from arrays and primitives', () => {
  assert.equal(isRecord({ a: 1 }), true);
  assert.equal(isRecord([1, 2]), false);
  assert.equal(isRecord(null), false);
  assert.equal(isRecord('x'), false);
  assert.equal(isRecord(undefined), false);
});

test('normalizeArgs returns {} for non-objects', () => {
  assert.deepEqual(normalizeArgs(null), {});
  assert.deepEqual(normalizeArgs(undefined), {});
  assert.deepEqual(normalizeArgs(['a']), {});
  assert.deepEqual(normalizeArgs({ a: 1 }), { a: 1 });
});

test('stringArg trims and rejects empty / non-string', () => {
  assert.equal(stringArg('  hi  '), 'hi');
  assert.equal(stringArg(''), null);
  assert.equal(stringArg('   '), null);
  assert.equal(stringArg(42), null);
  assert.equal(stringArg(undefined), null);
});

test('numberArg clamps to [min, max] and uses fallback for non-finite', () => {
  assert.equal(numberArg(5, 10, 0, 100), 5);
  assert.equal(numberArg(-5, 10, 0, 100), 0);
  assert.equal(numberArg(500, 10, 0, 100), 100);
  assert.equal(numberArg(Number.NaN, 10, 0, 100), 10);
  assert.equal(numberArg('5', 10, 0, 100), 10);
  assert.equal(numberArg(undefined, 10, 0, 100), 10);
});

test('enumArg accepts case-insensitively, throws on unknown, falls back on undefined', () => {
  const values = ['low', 'medium', 'high'];
  assert.equal(enumArg('LOW', 'risk', values, 'medium'), 'low');
  assert.equal(enumArg(undefined, 'risk', values, 'medium'), 'medium');
  assert.throws(() => enumArg('extreme', 'risk', values, 'medium'), /risk/);
  assert.throws(() => enumArg(42, 'risk', values, 'medium'), /risk/);
});

test('stringArrayArg dedupes and trims; rejects non-array or non-strings', () => {
  assert.deepEqual(stringArrayArg([' a ', 'b', 'a', ''], 'tags'), ['a', 'b']);
  assert.deepEqual(stringArrayArg(undefined, 'tags'), []);
  assert.throws(() => stringArrayArg('a,b', 'tags'), /tags/);
  assert.throws(() => stringArrayArg(['a', 2], 'tags'), /tags/);
});

test('booleanArg uses default for undefined and enforces type', () => {
  assert.equal(booleanArg(undefined, true), true);
  assert.equal(booleanArg(false, true), false);
  assert.throws(() => booleanArg('true', true), /Boolean/);
});

test('parseCsvList trims, dedupes, and sorts', () => {
  assert.deepEqual(parseCsvList(' b, a , c, a '), ['a', 'b', 'c']);
  assert.deepEqual(parseCsvList(undefined), []);
  assert.deepEqual(parseCsvList(''), []);
});

test('parsePositiveInt enforces positive integers with fallback', () => {
  assert.equal(parsePositiveInt('5', 10), 5);
  assert.equal(parsePositiveInt('0', 10), 10);
  assert.equal(parsePositiveInt('-1', 10), 10);
  assert.equal(parsePositiveInt('abc', 10), 10);
  assert.equal(parsePositiveInt(undefined, 10), 10);
});

test('parseBooleanEnv understands 1/0, yes/no, on/off case-insensitively', () => {
  assert.equal(parseBooleanEnv('TRUE', false), true);
  assert.equal(parseBooleanEnv('Yes', false), true);
  assert.equal(parseBooleanEnv('on', false), true);
  assert.equal(parseBooleanEnv('1', false), true);
  assert.equal(parseBooleanEnv('false', true), false);
  assert.equal(parseBooleanEnv('No', true), false);
  assert.equal(parseBooleanEnv('off', true), false);
  assert.equal(parseBooleanEnv('0', true), false);
  assert.equal(parseBooleanEnv('maybe', true), true);
  assert.equal(parseBooleanEnv(undefined, true), true);
});

test('toJsonResult and toJsonResource produce MCP-compatible shapes', () => {
  const payload = { foo: 'bar' };
  const result = toJsonResult(payload);
  assert.equal(result.content[0].type, 'text');
  assert.equal(JSON.parse(result.content[0].text).foo, 'bar');
  assert.deepEqual(result.structuredContent, payload);

  const resource = toJsonResource('hub://x', payload);
  assert.equal(resource.contents[0].uri, 'hub://x');
  assert.equal(resource.contents[0].mimeType, 'application/json');
  assert.equal(JSON.parse(resource.contents[0].text).foo, 'bar');
});

test('toErrorResult marks isError true and embeds message text', () => {
  const r = toErrorResult('boom');
  assert.equal(r.isError, true);
  assert.equal(r.content[0].type, 'text');
  assert.equal(r.content[0].text, 'boom');
});
