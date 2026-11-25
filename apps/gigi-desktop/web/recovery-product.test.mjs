import test from 'node:test';
import assert from 'node:assert/strict';
import {musicView} from './music-view.mjs';
test('file reference mismatch does not assert original content changed',()=>{
 const html=musicView({items:[{id:'synthetic',title:'Demo',filename:'Demo.mp3',kind:'audio',bytes:0,availability:'changed'}],total:1});
 assert.doesNotMatch(html,/Original changed/);
 assert.match(html,/File reference needs checking/);
 assert.match(html,/0 bytes recorded/);
});
import {readFileSync} from 'node:fs';
test('Notes date context has a typed Schedule relation in both directions',()=>{
 const schema=JSON.parse(readFileSync(new URL('../src-tauri/migrations/notion_fields.json',import.meta.url),'utf8'));
 assert.equal(schema.notes.relationFields.Schedule,'schedule');
 assert.equal(schema.schedule.relationFields.Notes,'notes');
});
import {todayView} from './today-view.mjs';
test('Today separates explicitly classified performances from other calendar commitments',()=>{
 const html=todayView({data:{today:'2026-11-06',calendar:{weekStart:'2026-11-02',count:2,items:[{id:'g',entity:'gigs',title:'Performance',date:'2026-11-06',identity:{recordKind:'performance'},fields:{}},{id:'s',entity:'schedule',title:'Flight',date:'2026-11-06',fields:{}}]},tasks:{count:0,items:[]},payable:{count:0,items:[]},receivable:{count:0,items:[]}}});
 assert.match(html,/>Performances</);assert.match(html,/>Other commitments</);
});
