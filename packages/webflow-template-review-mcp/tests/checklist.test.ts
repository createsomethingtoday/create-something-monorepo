import assert from 'node:assert/strict';
import test from 'node:test';

import { parseChecklist, setAllChecklistItems, setChecklistItemStates } from '../src/checklist.js';

/**
 * Abridged excerpt of the real `📝Review Checklist` field value (Vauitly v0,
 * captured 2026-07-28). Preserves the exact shapes that matter: `[ ]` anchored
 * at line start with no bullet prefix, `- 🔵` sub-criteria, `\xa0` trailing
 * non-breaking spaces, and a trailing newline.
 */
const REVIEW_CHECKLIST = [
  '## Express review checklist',
  'If the review length is an express review, then complete the steps below. You do not need to complete the other review list items. ',
  '',
  '### Webflow Audit Panel',
  '[ ] I have completed all audit panel checks',
  '- 🔵 One H1 per page; **no skipped heading levels** (H2, H3…).',
  '- 🔵 No missing alt texts',
  '',
  '### Components Panel',
  '[ ] 🔵 **Nav, Footer and CTAs** are Components with title casing in names.',
  '',
  '### Styles Selector ',
  '[ ] I have completed all page level checks',
  '',
  '- 🔵 **Unused** **styles**/classes are **cleaned** up. ',
  '- 🔵 **No more than 3 - 4 combo classes** stacked per element. ',
  ''
].join('\n');

/** Abridged excerpt of the real `🚀Publishing Checklist`: no headings, indented sub-steps. */
const PUBLISHING_CHECKLIST = [
  "[ ] Ensure that you've received a response from the email listed by the asset creator (most important for New Asset reviews)",
  '[ ] Review the template name to ensure it complies with our naming policies found here (URL pending)',
  '    1. If the name requires an update, send a message to the creator in the review thread via "Changes requested" to tell them that a name change is required.',
  '[ ] Open <https://webflow.com/admin/templates> and create a new template with the following fields:',
  '    - **Template name** using the `Name` field',
  '    - **Template site slug** using the `ℹ️UID` field',
  '[ ] Attach the version to the soonest selectable release.'
].join('\n');

test('parseChecklist finds only line-anchored checkbox items and tracks sections', () => {
  const parsed = parseChecklist(REVIEW_CHECKLIST);

  assert.equal(parsed.summary.total, 3);
  assert.equal(parsed.summary.checked, 0);
  assert.equal(parsed.summary.unchecked, 3);
  assert.equal(parsed.summary.complete, false);

  assert.deepEqual(
    parsed.items.map((item) => ({
      index: item.index,
      section: item.section,
      checked: item.checked
    })),
    [
      { index: 1, section: 'Webflow Audit Panel', checked: false },
      { index: 2, section: 'Components Panel', checked: false },
      { index: 3, section: 'Styles Selector', checked: false }
    ]
  );

  assert.equal(parsed.items[0].text, 'I have completed all audit panel checks');
  assert.equal(
    parsed.items[1].text,
    '🔵 **Nav, Footer and CTAs** are Components with title casing in names.'
  );
  assert.deepEqual(
    parsed.sections.map((section) => section.title),
    ['Express review checklist', 'Webflow Audit Panel', 'Components Panel', 'Styles Selector']
  );
  assert.deepEqual(parsed.sections[1].itemIndexes, [1]);
  assert.deepEqual(parsed.sections[0].itemIndexes, []);
});

test('parseChecklist ignores indented sub-steps and bullet sub-criteria', () => {
  const parsed = parseChecklist(PUBLISHING_CHECKLIST);

  assert.equal(parsed.summary.total, 4);
  assert.deepEqual(parsed.sections, []);
  assert.equal(
    parsed.items.every((item) => item.section === null),
    true
  );
  assert.equal(parsed.items[3].text, 'Attach the version to the soonest selectable release.');
});

test('parseChecklist reads existing checked state in either case', () => {
  const parsed = parseChecklist('[x] done lower\n[X] done upper\n[ ] not done');

  assert.deepEqual(
    parsed.items.map((item) => item.checked),
    [true, true, false]
  );
  assert.deepEqual(parsed.summary, { total: 3, checked: 2, unchecked: 1, complete: false });
});

test('parseChecklist treats absent and empty values as having no items', () => {
  for (const value of [undefined, null, '']) {
    const parsed = parseChecklist(value);
    assert.deepEqual(parsed.items, []);
    assert.deepEqual(parsed.summary, { total: 0, checked: 0, unchecked: 0, complete: false });
  }
});

test('setChecklistItemStates rewrites only the checkbox token', () => {
  const result = setChecklistItemStates(REVIEW_CHECKLIST, [{ index: 2, checked: true }]);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  // Byte-for-byte identical apart from the single flipped token.
  assert.equal(result.raw.length, REVIEW_CHECKLIST.length);
  assert.equal(result.raw.replace('[x]', '[ ]'), REVIEW_CHECKLIST);
  assert.equal(
    result.raw.includes('- 🔵 **Unused** **styles**/classes are **cleaned** up. '),
    true
  );
  assert.equal(result.raw.split('\n').length, REVIEW_CHECKLIST.split('\n').length);

  assert.deepEqual(result.changed, [
    {
      index: 2,
      text: '🔵 **Nav, Footer and CTAs** are Components with title casing in names.',
      section: 'Components Panel',
      from: false,
      to: true
    }
  ]);
  assert.deepEqual(result.after.summary, { total: 3, checked: 1, unchecked: 2, complete: false });
});

test('setChecklistItemStates preserves a trailing newline', () => {
  const raw = '[ ] one\n';
  const result = setChecklistItemStates(raw, [{ index: 1, checked: true }]);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.raw, '[x] one\n');
  assert.equal(result.raw.length, raw.length);
});

test('setChecklistItemStates preserves indentation and CRLF line endings', () => {
  const raw = '  [ ] indented\r\n [ ] nbsp indented\r\n';
  const result = setChecklistItemStates(raw, [
    { index: 1, checked: true },
    { index: 2, checked: true }
  ]);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.raw, '  [x] indented\r\n [x] nbsp indented\r\n');
});

test('setChecklistItemStates can uncheck and applies mixed updates in one pass', () => {
  const raw = '[x] one\n[ ] two\n[x] three';
  const result = setChecklistItemStates(raw, [
    { index: 1, checked: false },
    { index: 2, checked: true },
    { index: 3, checked: true }
  ]);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.raw, '[ ] one\n[x] two\n[x] three');
  // Item 3 already matched, so it is not reported as changed.
  assert.deepEqual(
    result.changed.map((change) => [change.index, change.from, change.to]),
    [
      [1, true, false],
      [2, false, true]
    ]
  );
});

test('setChecklistItemStates reports a no-op when state already matches', () => {
  const raw = '[x] already done\n[ ] pending';
  const result = setChecklistItemStates(raw, [{ index: 1, checked: true }]);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.changed, []);
  assert.equal(result.raw, raw);
});

test('setChecklistItemStates rejects out-of-range, duplicate, empty, and missing input', () => {
  const raw = '[ ] one\n[ ] two';

  const outOfRange = setChecklistItemStates(raw, [{ index: 3, checked: true }]);
  assert.equal(outOfRange.ok, false);
  if (!outOfRange.ok) {
    assert.equal(outOfRange.code, 'CHECKLIST_ITEM_OUT_OF_RANGE');
    assert.deepEqual(outOfRange.details, { invalid_indexes: [3], total_items: 2 });
  }

  const zeroIndex = setChecklistItemStates(raw, [{ index: 0, checked: true }]);
  assert.equal(zeroIndex.ok, false);
  if (!zeroIndex.ok) assert.equal(zeroIndex.code, 'CHECKLIST_ITEM_OUT_OF_RANGE');

  const duplicate = setChecklistItemStates(raw, [
    { index: 1, checked: true },
    { index: 1, checked: false }
  ]);
  assert.equal(duplicate.ok, false);
  if (!duplicate.ok) {
    assert.equal(duplicate.code, 'CHECKLIST_DUPLICATE_ITEM');
    assert.deepEqual(duplicate.details, { duplicate_indexes: [1] });
  }

  const noUpdates = setChecklistItemStates(raw, []);
  assert.equal(noUpdates.ok, false);
  if (!noUpdates.ok) assert.equal(noUpdates.code, 'CHECKLIST_NO_UPDATES');

  const empty = setChecklistItemStates('', [{ index: 1, checked: true }]);
  assert.equal(empty.ok, false);
  if (!empty.ok) assert.equal(empty.code, 'CHECKLIST_EMPTY');

  const noItems = setChecklistItemStates('## Heading only\nno checkboxes here', [
    { index: 1, checked: true }
  ]);
  assert.equal(noItems.ok, false);
  if (!noItems.ok) assert.equal(noItems.code, 'CHECKLIST_NO_ITEMS');
});

test('setChecklistItemStates rejects a stale selected item even when the count matches', () => {
  const raw = '[ ] current first item\n[ ] current second item';
  const result = setChecklistItemStates(raw, [
    {
      index: 1,
      checked: true,
      expectedText: 'previous first item'
    }
  ]);

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'CHECKLIST_ITEM_TEXT_MISMATCH');
  assert.deepEqual(result.details, {
    mismatches: [
      {
        index: 1,
        expected_text: 'previous first item',
        actual_text: 'current first item'
      }
    ]
  });
});

test('setAllChecklistItems marks every item without disturbing other content', () => {
  const result = setAllChecklistItems(PUBLISHING_CHECKLIST, true);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.after.summary, { total: 4, checked: 4, unchecked: 0, complete: true });
  assert.equal(result.changed.length, 4);
  assert.equal(result.raw.length, PUBLISHING_CHECKLIST.length);
  assert.equal(result.raw.includes('    - **Template site slug** using the `ℹ️UID` field'), true);
  assert.equal(result.raw.includes('[ ]'), false);

  const reverted = setAllChecklistItems(result.raw, false);
  assert.equal(reverted.ok, true);
  if (!reverted.ok) return;
  assert.equal(reverted.raw, PUBLISHING_CHECKLIST);
});
