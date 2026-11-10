import {escapeHtml as safe} from './reference-layout.mjs';
import {statusLabel} from './desktop-polish.mjs';
import {localToday} from './experience.mjs';
import {eventLabel} from './event-identity.mjs';
import {scheduleEntry} from './schedule.mjs';
import {formatMoney,supportedCurrencies} from './model.mjs';
import {icon} from './icons.mjs';

const action=(attr,value,label,primary=false)=>`<button type="button" class="btn${primary?' primary':''}" ${attr}="${safe(value)}">${label}</button>`;
const newRecord=(entity,label)=>action('data-new',entity,`${icon('plus')}<span>${label}</span>`);
const openPage=(entity,label)=>action('data-page',entity,`${label} ${icon('arrow-up-right')}`);
const count=value=>Number.isSafeInteger(value)&&value>=0?value:null;
export function shiftDay(day,offset){const date=new Date(`${day}T12:00:00`);date.setDate(date.getDate()+offset);return localToday(date);}
export function mondayOf(day){const date=new Date(`${day}T12:00:00`);return shiftDay(day,-((date.getDay()+6)%7));}
const dateText=(day,options={month:'short',day:'numeric'})=>new Intl.DateTimeFormat('en-US',options).format(new Date(`${day}T12:00:00`));
const dateLabel=(day,today)=>day<today?'Overdue':day===today?'Today':day===shiftDay(today,1)?'Tomorrow':dateText(day,{weekday:'short'});
const dateMarkup=(day,today)=>`<span class="today-due${day<today?' is-overdue':''}"><span>${dateLabel(day,today)}</span><time datetime="${safe(day)}">${safe(dateText(day))}</time></span>`;
function timestamp(value){
 if(!['string','number'].includes(typeof value)||value==='')return null;
 const date=new Date(value);if(!Number.isFinite(date.getTime()))return null;
 return `<time datetime="${safe(date.toISOString())}">${safe(new Intl.DateTimeFormat('en-US',{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(date))}</time>`;
}
function sourceDetails(record,day){
 const source=record.source?.kind==='manual'?record.source.origin:record.source;
 const reference=source?.provider?source:record.identity?.sourceRef;if(!reference?.provider)return '';
 const provider=({gmail:'Gmail',googlecalendar:'Google Calendar'})[reference.provider]||reference.provider;
 return `<details class="today-record-source" data-view-key="today-source-${safe(record.entity)}-${safe(record.id)}-${safe(day)}"><summary>${safe(provider)}</summary><p>${timestamp(source?.observedAt)?`Source last observed ${timestamp(source.observedAt)}.`:'Source observation time is not included in this Today read.'}</p><button type="button" class="btn" data-entity="${safe(record.entity)}" data-open="${safe(record.id)}">Open source details</button></details>`;
}
function eventCard(record,day){
 const entry=scheduleEntry(record);
 return `<article class="today-calendar-entry"><button type="button" class="today-calendar-event" data-open="${safe(record.id)}" data-entity="${safe(record.entity||'gigs')}"><strong>${safe(record.title||'Untitled')}</strong><span>${safe(entry.time)}</span><span class="today-event-kind">${safe(eventLabel(record,record.entity||'gigs'))}</span>${record.status?`<span class="today-event-status">${safe(statusLabel(record.status))}</span>`:''}</button>${sourceDetails(record,day)}</article>`;
}
function calendarSection(data,today,busy){
 const calendar=data?.calendar,start=calendar?.weekStart||mondayOf(today),end=shiftDay(start,6),items=calendar?.items||[];
 const known=count(calendar?.count),month=dateText(start,{month:'long',year:'numeric'}),range=`${dateText(start)} – ${dateText(end)}`;
 const nav=(value,label,content)=>`<button type="button" class="btn" data-today-week="${value}" aria-label="${label}"${busy?' disabled':''}>${content}</button>`;
 const days=Array.from({length:7},(_,index)=>{
  const day=shiftDay(start,index),entries=items.filter(record=>(record.date||scheduleEntry(record).key)<=day&&(record.endDate||record.date||scheduleEntry(record).endKey)>=day);
  return `<section class="today-calendar-day${day===today?' is-today':''}" aria-labelledby="calendar-day-${day}"><h3 id="calendar-day-${day}"><span>${safe(dateText(day,{weekday:'short'}))}</span><time datetime="${day}"${day===today?' aria-current="date"':''}>${Number(day.slice(-2))}</time></h3><div class="today-calendar-day-events">${entries.map(record=>eventCard(record,day)).join('')}${!entries.length?'<p class="today-calendar-no-events">No gigs</p>':''}</div></section>`;
 }).join('');
 return `<section class="today-collection today-collection-events" aria-labelledby="today-events-title"><div class="today-section-head"><h2 id="today-events-title">Upcoming Gigs</h2>${openPage('schedule','View schedule')}</div><div class="today-calendar-toolbar"><div><strong>${safe(month)}</strong><span>${safe(range)}</span></div><div class="today-week-controls">${nav('previous','Previous week',icon('arrow-left'))}${nav('current','Current week','Today')}${nav('next','Next week',icon('arrow-right'))}</div></div>${known===null?unavailable('schedule'): `<div class="today-calendar-scroll" tabindex="0" role="region" aria-label="Gig calendar · ${safe(range)}"><div class="today-week-calendar">${days}</div></div>`}<p class="today-window-help">Gigs and saved calendar entries · Monday–Sunday${known!==null&&known>items.length?` · Showing ${items.length} of ${known}; open Schedule for all records.`:''}</p></section>`;
}
function unavailable(entity){return `<div class="today-empty today-unavailable"><p>This section has not been read. Read local records again, or open the collection.</p>${openPage(entity,'Open collection')}</div>`;}
function taskSection(data,today){
 const value=data?.tasks,total=count(value?.count),items=value?.items||[];
 const content=total===null?unavailable('tasks'):items.length?`<div class="today-list" role="table" aria-label="Open tasks"><div class="today-list-head" role="row"><span role="columnheader">Task</span><span role="columnheader">Date</span><span role="columnheader">Priority</span></div>${items.map(record=>`<div class="today-task-row" role="row"><span role="cell" class="today-task-name"><button type="button" class="today-task-open" data-open="${safe(record.id)}" data-entity="tasks">${safe(record.title||'Untitled')}</button></span><span role="cell">${dateMarkup(record.date,today)}</span><span role="cell"><span class="today-priority">${safe(record.fields?.Priority||'Not set')}</span></span></div>`).join('')}</div>`:`<div class="today-empty"><p>No open tasks overdue, today, or tomorrow.</p>${newRecord('tasks','Add a task')}</div>`;
 return `<section class="today-collection today-collection-tasks" aria-labelledby="today-tasks-title"><div class="today-section-head"><h2 id="today-tasks-title">Open Tasks</h2>${openPage('tasks','View tasks')}</div>${content}<p class="today-window-help">Overdue · Today · Tomorrow${total!==null&&total>items.length?` · Showing ${items.length} of ${total}; open Tasks for all records.`:''}</p></section>`;
}
function moneySection(data,key,title,today,currency){
 const value=data?.[key],total=count(value?.count),items=value?.items||[];
 return `<section class="today-money-section" aria-labelledby="today-${key}-title"><h3 id="today-${key}-title">${title}</h3>${total===null?unavailable('finances'):items.length?`<div class="today-money-list">${items.map(record=>`<button type="button" class="today-money-row" data-open="${safe(record.id)}" data-entity="finances"><span class="today-money-name"><strong>${safe(record.title||'Untitled')}</strong><small>${safe(statusLabel(record.status)||'Status not set')}</small></span>${dateMarkup(record.date,today)}<span class="today-money-amount">${Number.isSafeInteger(record.moneyCents)?safe(formatMoney(record.moneyCents,currency))+(supportedCurrencies.has(currency)?` <small>${safe(currency)}</small>`:''):'Amount not recorded'}</span></button>`).join('')}</div>`:`<div class="today-empty"><p>No ${title.toLowerCase()} overdue or due this week.</p></div>`}${total!==null&&total>items.length?`<p class="today-window-help">Showing ${items.length} of ${total}; open Money for all records.</p>`:''}</section>`;
}
// Render only the server's complete-collection date windows; never filter a five-row preview.
export function todayView({data,currency,attentionHtml='',setupHtml='',checkedAt,readError='',busy=false}={}){
 const today=data?.today||localToday(),checked=timestamp(checkedAt);
 const error=typeof readError==='string'?readError:readError?.message||'';
 const setup=setupHtml||`<section class="today-setup-invitation"><div><h2>Connect, then review your first records.</h2><p>Set up your assistant, choose a source, and review what arrives.</p></div>${action('data-guided-action','open','Continue setup',true)}</section>`;
 return `<div class="today-home"><div class="page-head today-heading"><div><h1>Today</h1><p class="subhead">Your gigs, calendar dates and next steps.</p></div><div class="inline-actions today-create">${newRecord('tasks','New task')}${newRecord('gigs','New gig')}</div></div><div class="today-read-status"><p>${checked?`Last successful local read · ${checked}`:'Local records have not been checked in this view yet.'}</p>${action('data-today-refresh','1',`${icon('refresh-cw')}<span>Read local records again</span>`)}</div>${error?`<div class="today-read-error" role="alert"><strong>Could not refresh Today.</strong><p>${safe(error)}${checked&&data?' Showing the last successful local read.':''}</p></div>`:''}<details class="today-freshness" data-view-key="today-freshness"><summary>About record freshness</summary><p>A local read does not sync Gmail or Calendar. Open a record for its source details. Tasks use Due Date, falling back to Do Date. Financials use Due Date and saved unpaid status.</p></details><div class="today-setup">${setup}</div>${calendarSection(data,today,busy)}${taskSection(data,today)}<section class="today-collection today-collection-finances" aria-labelledby="today-finances-title"><div class="today-section-head"><h2 id="today-finances-title">Financials</h2>${openPage('finances','View money')}</div><p class="today-window-help">Overdue or due this week${data?.financialThrough?` · Through ${safe(dateText(data.financialThrough))}`:''}</p><div class="today-financial-columns">${moneySection(data,'payable','Payable',today,currency)}${moneySection(data,'receivable','Receivable',today,currency)}</div></section><div data-attention-slot>${attentionHtml}</div></div>`;
}
