import test from 'node:test';
import assert from 'node:assert/strict';
import {todayView,mondayOf,shiftDay} from './today-view.mjs';
const empty=()=>({items:[],count:0});
const snapshot=(values={})=>({today:'2026-11-06',calendar:{weekStart:'2026-11-02',weekEnd:'2026-11-08',...empty()},tasks:empty(),payable:empty(),receivable:empty(),financialThrough:'2026-11-08',...values});
const view=(data,options={})=>todayView({data,currency:'USD',checkedAt:'2026-11-06T14:30:00Z',...options});
test('weekly calendar includes all seven days, real routes, correct dates, and local week navigation',()=>{
 const data=snapshot({calendar:{weekStart:'2026-11-02',weekEnd:'2026-11-08',count:2,items:[{id:'g1',entity:'gigs',title:'Friday performance',date:'2026-11-06',endDate:'2026-11-06',fields:{Date:'2026-11-06','Call Time':'16:00'},identity:{recordKind:'performance'}},{id:'s1',entity:'schedule',title:'Weekend studio',date:'2026-11-07',endDate:'2026-11-08',fields:{Date:'2026-11-07/2026-11-09','All Day':true}}]}});
 const before=structuredClone(data),html=view(data);
 assert.match(html,/>Upcoming Gigs</);assert.equal((html.match(/class="today-calendar-day(?: is-today)?"/g)||[]).length,7);
 for(const label of ['Previous week','Current week','Next week'])assert.ok(html.includes(`aria-label="${label}"`));
 assert.match(html,/data-open="g1" data-entity="gigs"/);assert.match(html,/Call 16:00/);
 assert.equal((html.match(/data-open="s1" data-entity="schedule"/g)||[]).length,2);
 assert.match(html,/aria-current="date"/);assert.match(html,/>Sun</);assert.deepEqual(data,before);
});
test('task list shows name date and priority in server date order',()=>{
 const html=view(snapshot({tasks:{count:3,items:[{id:'a',title:'Overdue task',date:'2026-11-01',fields:{Priority:'High'}},{id:'b',title:'Today task',date:'2026-11-06',fields:{}},{id:'c',title:'Tomorrow task',date:'2026-11-07',fields:{Priority:'Low'}}]}}));
 for(const label of ['Open Tasks','Task','Date','Priority','Overdue','Today','Tomorrow','High','Low','Not set'])assert.ok(html.includes(label),label);
 assert.ok(html.indexOf('Overdue task')<html.indexOf('Today task'));assert.ok(html.indexOf('Today task')<html.indexOf('Tomorrow task'));
 assert.match(html,/class="today-task-open" data-open="a" data-entity="tasks"/);
});
test('Financials splits Payable and Receivable with saved amount status and due date',()=>{
 const html=view(snapshot({payable:{count:1,items:[{id:'p',title:'Van rental',date:'2026-11-06',status:'Expected',moneyCents:9000}]},receivable:{count:1,items:[{id:'r',title:'Venue invoice',date:'2026-11-01',status:'Invoiced',moneyCents:37500}]}}));
 assert.match(html,/>Financials</);assert.match(html,/>Payable</);assert.match(html,/>Receivable</);assert.match(html,/\$90\.00/);assert.match(html,/\$375\.00/);assert.match(html,/Expected/);assert.match(html,/Invoiced/);
 assert.match(html,/Overdue or due this week/);assert.doesNotMatch(html,/Unpaid income|Workspace totals|Net balance|\$465/);
});
test('empty and unavailable sections stay distinct; records are never inferred from counts',()=>{
 const emptyHtml=view(snapshot());assert.match(emptyHtml,/No gigs/);assert.match(emptyHtml,/No open tasks overdue, today, or tomorrow/);assert.match(emptyHtml,/No payable overdue or due this week/);assert.match(emptyHtml,/No receivable overdue or due this week/);
 const missing=view(null,{checkedAt:null,readError:'Read <failed>'});assert.match(missing,/Read &lt;failed&gt;/);assert.match(missing,/has not been read/);assert.doesNotMatch(missing,/No gigs|No open tasks|No payable|No receivable|Workspace totals/);
});
test('failed week refresh preserves the previous successful week and marks its read time',()=>{
 const html=view(snapshot({calendar:{weekStart:'2026-11-02',weekEnd:'2026-11-08',count:1,items:[{id:'g',entity:'gigs',title:'Saved gig',date:'2026-11-06',endDate:'2026-11-06',fields:{Date:'2026-11-06'}}]}}),{readError:'Try again',busy:true});
 assert.match(html,/Showing the last successful local read/);assert.match(html,/Saved gig/);assert.match(html,/datetime="2026-11-06T14:30:00\.000Z"/);assert.match(html,/aria-label="Next week" disabled/);
});
test('stored titles, priorities, statuses and identifiers are escaped',()=>{
 const html=view(snapshot({tasks:{count:1,items:[{id:'a" onclick="bad',title:'<script>bad</script>',date:'2026-11-06',fields:{Priority:'<urgent>'}}]},payable:{count:1,items:[{id:'p',title:'<expense>',date:'2026-11-05',status:'<pending>',moneyCents:'9000'}]}}));
 assert.match(html,/a&quot; onclick=&quot;bad/);assert.match(html,/&lt;script&gt;/);assert.match(html,/&lt;urgent&gt;/);assert.match(html,/&lt;pending&gt;/);assert.match(html,/Amount not recorded/);assert.doesNotMatch(html,/<script>|data-open="a" onclick=/);
});
test('source observation remains distinct from local reads and trusted setup/attention are retained',()=>{
 const html=view(snapshot({calendar:{weekStart:'2026-11-02',weekEnd:'2026-11-08',count:1,items:[{id:'s',entity:'schedule',title:'Calendar appointment',date:'2026-11-06',endDate:'2026-11-06',fields:{Date:'2026-11-06'},source:{kind:'import',provider:'googlecalendar',observedAt:'2026-10-30T09:00:00Z'}}]}}),{setupHtml:'<section id="actual-setup">Setup</section>',attentionHtml:'<p>Actual attention</p>'});
 assert.match(html,/Source last observed/);assert.match(html,/2026-10-30T09:00:00\.000Z/);assert.match(html,/does not sync Gmail or Calendar/);assert.match(html,/actual-setup/);assert.match(html,/Actual attention/);assert.doesNotMatch(html,/Workspace totals|Synced|Verified/);
});
test('local calendar arithmetic crosses month year and daylight saving boundaries without fixed-hour math',()=>{
 assert.equal(mondayOf('2026-11-01'),'2026-10-26');assert.equal(mondayOf('2026-11-02'),'2026-11-02');assert.equal(shiftDay('2026-12-28',7),'2027-01-04');assert.equal(shiftDay('2026-11-01',1),'2026-11-02');
});
