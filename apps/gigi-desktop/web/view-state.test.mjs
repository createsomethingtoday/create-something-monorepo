import test from 'node:test';
import assert from 'node:assert/strict';
import { captureViewState, restoreViewState } from './view-state.mjs';

function surface({ query = '', role = '', record = '', backup = '', open = false } = {}) {
  const control = (name, value, id = name, tagName = 'INPUT') => ({ name, value, id, tagName, dataset: {}, selectionStart: 2, selectionEnd: 4, selectionDirection: 'forward', scrollTop: 8,
    focus(options) { this.focused = options; }, setSelectionRange(...range) { this.range = range; } });
  const forms = [
    { id: 'context-form', hidden: false, elements: [control('query', query)] },
    { id: 'link-form', hidden: false, elements: [control('role', role, 'link-role', 'SELECT'), control('id', record, 'link-record', 'SELECT')] },
    { id: 'restore-form', hidden: !open, elements: [control('backupId', backup, 'backup-id')] },
  ];
  const details = [{ id: 'test-details', open }], controls = forms.flatMap(form => form.elements);
  return { forms, controls, details, contains: node => controls.includes(node), querySelectorAll: selector => selector === 'form' ? forms : selector === 'details' ? details : controls };
}

test('status rerender retains history query, link choices, open restore draft and text selection', () => {
  const before = surface({ query: 'booking Friday', role: 'Venue', record: 'place-1', backup: 'synthetic-backup', open: true });
  const snapshot = captureViewState(before, before.controls[0]);
  const after = surface();
  restoreViewState(after, snapshot);
  assert.deepEqual(after.controls.map(item => item.value), ['booking Friday', 'Venue', 'place-1', 'synthetic-backup']);
  assert.equal(after.forms[2].hidden, false);
  assert.equal(after.details[0].open, true);
  assert.deepEqual(after.controls[0].focused, { preventScroll: true });
  assert.deepEqual(after.controls[0].range, [2, 4, 'forward']);
});

test('new logical view does not inherit a previous query or restore confirmation draft', () => {
  const after = surface();
  restoreViewState(after, null);
  assert.deepEqual(after.controls.map(item => item.value), ['', '', '', '']);
  assert.equal(after.forms[2].hidden, true);
});

test('rerender restores the matching action focus without focusing a disabled control', () => {
  const action = { tagName: 'BUTTON', dataset: { sourceRefresh: 'gmail' } };
  const before = { contains: () => true, querySelectorAll: () => [] };
  const snapshot = captureViewState(before, action);
  const control = { ...action, focus() { this.focused = true; } };
  const after = { querySelectorAll: selector => selector === 'input, select, textarea, button, a, summary' ? [control] : [] };
  control.disabled = true;
  restoreViewState(after, snapshot); assert.equal(control.focused, undefined);
  control.disabled = false;
  restoreViewState(after, snapshot); assert.equal(control.focused, true);
});


test('chat rerender preserves scrolled conversation list and expanded review details', () => {
  const intro = { scrollTop: 280 }, detail = { id: 'approval-details', open: true };
  const root = { querySelector: selector => selector === '.chat-intro' ? intro : null,
    querySelectorAll: selector => selector === 'details' ? [detail] : [] };
  const snapshot = captureViewState(root, null);
  intro.scrollTop = 0; detail.open = false;
  restoreViewState(root, snapshot);
  assert.equal(intro.scrollTop, 280);
  assert.equal(detail.open, true);
});


test('removing diagnostic disclosure never transfers its open state to agent setup', () => {
  const surface = details => ({ querySelectorAll: selector => selector === 'details' ? details : [] });
  const before = surface([
    { dataset: { viewKey: 'source-gmail-technical' }, open: true },
    { dataset: { viewKey: 'source-googlecalendar-technical' }, open: false },
    { dataset: { viewKey: 'diagnostic-report' }, open: true },
    { dataset: { viewKey: 'agent-walkthrough' }, open: false },
  ]);
  const snapshot = captureViewState(before, null);
  const details = [
    { dataset: { viewKey: 'source-googlecalendar-technical' }, open: true },
    { dataset: { viewKey: 'agent-walkthrough' }, open: true },
    { dataset: { viewKey: 'source-gmail-technical' }, open: false },
  ];
  restoreViewState(surface(details), snapshot);
  assert.deepEqual(details.map(detail => detail.open), [false, false, true]);
});
