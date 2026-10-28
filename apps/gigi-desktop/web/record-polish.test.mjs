import test from 'node:test';
import assert from 'node:assert/strict';
import { historyPresentation, copyableRecordField } from './record-polish.mjs';
test('history presents a readable saved receipt without exposing technical identifiers as its heading',()=>{
 const row=historyPresentation({operation:'records.save',entity:'gigs',recordId:'id1',summary:'Saved gigs id1: Synthetic rehearsal; Date 2026-10-22',createdAt:'2026-10-20 14:45:21'});
 assert.equal(row.action,'Saved record');assert.equal(row.detail,'Synthetic rehearsal; Date 2026-10-22');assert.doesNotMatch(row.time,/T14|records.save/);
 assert.equal(historyPresentation({operation:'workspace.create'}).action,'Created workspace');
});
test('contact and link values are copied as text without granting an executable URL action',()=>{
 assert.equal(copyableRecordField('Link','javascript:alert(1)'),'javascript:alert(1)');
 assert.equal(copyableRecordField('Details','private notes'),null);
 assert.equal(copyableRecordField('Email',''),null);
});
