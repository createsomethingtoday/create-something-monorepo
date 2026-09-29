import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isFreeBrowse, updateBrowseParams } from '../lib/browseState';
test('legacy free collection clears without losing category', () => {
 const initial = new URLSearchParams('scope=free&category_group_slug=technology-websites&page=3');
 assert.equal(isFreeBrowse(initial), true);
 const cleared = updateBrowseParams(initial, 'free_only', '');
 assert.equal(isFreeBrowse(cleared), false);
 assert.equal(cleared.get('category_group_slug'), 'technology-websites');
 assert.equal(cleared.has('page'), false);
});
test('switching collection clears a previous free-price constraint', () => {
 const next = updateBrowseParams(new URLSearchParams('free_only=true&scope=featured'), 'scope', 'all');
 assert.equal(isFreeBrowse(next), false);
 assert.equal(next.get('scope'), 'all');
});
test('changing a style replaces a legacy detail-link constraint', () => {
 const next = updateBrowseParams(new URLSearchParams('style_slug=modern&creator_slug=example'), 'styles', 'minimal');
 assert.equal(next.has('style_slug'), false);
 assert.equal(next.get('styles'), 'minimal');
 assert.equal(next.get('creator_slug'), 'example');
});
