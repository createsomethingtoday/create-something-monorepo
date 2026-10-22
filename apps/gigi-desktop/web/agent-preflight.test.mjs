import test from 'node:test';
import assert from 'node:assert/strict';
import {agentPreflightView} from './agent-preflight.mjs';
import {eventLabel,targetDescription} from './event-identity.mjs';
import {fieldOptions,editedFields} from './model.mjs';
import {artworkButton} from './artwork.mjs';
test('fresh setup evidence never claims cached host or generation readiness',()=>{
 const html=agentPreflightView({appVersion:'0.2.9',expectedCommand:'/Applications/GiGi',registration:{state:'matches',command:'<old>',registeredVersion:'0.2.9'},connector:{state:'verified',version:'0.2.9',missingMediaTools:[]}});
 assert.match(html,/current external agent session still needs/);assert.match(html,/Configuration unchanged/);assert.match(html,/&lt;old&gt;/);assert.match(html,/embedded Ask GiGi cannot generate/);
 assert.match(agentPreflightView({registration:{state:'mismatch'},connector:{state:'unavailable',reason:'Timed out'}}),/registered command, profile or options differ/);
});
test('classification never derives from title, custom Type, money or source',()=>{
 const legacy={id:'x',title:'Jazz stage',entity:'gigs',fields:{Type:'Concert',Fee:50000},source:{provider:'googlecalendar'}};
 assert.equal(eventLabel(legacy),'Unclassified gig');assert.equal(eventLabel({...legacy,entity:'schedule'}),'Calendar event');
 assert.equal(eventLabel({...legacy,fields:{...legacy.fields,'Work kind':'Performance'}}),'Performance');
 assert.deepEqual(editedFields(legacy.fields,{'Work kind':'',Type:'Concert'},'gigs'),legacy.fields);
 assert.deepEqual(fieldOptions('gigs','Work kind'),['Performance','Crew / work','Other']);
 assert.match(artworkButton('gigs',legacy),/data-image-target="Jazz stage · Unclassified gig · Google Calendar source"/);
 assert.match(targetDescription({...legacy,title:'<target>',fields:{Date:'2026-11-03','Work kind':'Crew / work'}},'gigs'),/Crew \/ work/);
});
