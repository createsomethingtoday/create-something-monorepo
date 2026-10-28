import test from 'node:test';
import assert from 'node:assert/strict';
import {statusLabel, peopleShortcut, todaySummary, builtInChatSetup} from './desktop-polish.mjs';
test('known display statuses are readable while custom values and input stay intact', () => {
 const record = {status:'ready_for_review'};
 assert.equal(statusLabel(record.status),'Ready for review');
 assert.equal(record.status,'ready_for_review');
 assert.equal(statusLabel('Vendor_CHECK_pending'),'Vendor_CHECK_pending');
 assert.equal(statusLabel(null),'');
 assert.equal(statusLabel('__proto__'),'__proto__');
});
test('people shortcut does not hijack unmodified Find on other workspaces or an open chat', () => {
 const key = {key:'f',metaKey:true};
 for (const page of ['overview','music','tasks','finances','settings']) {
  assert.equal(Boolean(peopleShortcut(key,page,false)),false);
  assert.equal(Boolean(peopleShortcut({...key,shiftKey:true},page,false)),true);
 }
 assert.equal(peopleShortcut(key,'contacts',false),true);
 assert.equal(peopleShortcut({...key,shiftKey:true},'contacts',true),false);
 assert.equal(Boolean(peopleShortcut({...key,altKey:true},'contacts',false)),false);
 assert.equal(Boolean(peopleShortcut({key:'F',ctrlKey:true,shiftKey:true},'tasks',false)),true);
});
test('Today uses server totals rather than loaded-card counts and keeps navigation scoped', () => {
 const html=todaySummary({tasks:{items:[{}],count:51},finances:{count:7}});
 assert.match(html,/>51<\/strong> Open tasks/);
 assert.match(html,/data-page="finances"/);
 assert.doesNotMatch(html,/overdue|net balance/i);
});
test('built-in readiness never derives from an external-agent preparation receipt', () => {
 assert.match(builtInChatSetup(null),/Not checked/);
 assert.match(builtInChatSetup(null,true),/Check unavailable/);
 assert.match(builtInChatSetup({available:false,authenticated:false}),/Codex unavailable/);
 assert.match(builtInChatSetup({available:true,authenticated:false}),/Sign in needed/);
 assert.match(builtInChatSetup({available:true,authenticated:true}),/Codex signed in/);
 assert.doesNotMatch(builtInChatSetup({prepared:true,lastCall:{}}),/Codex signed in/);
});
