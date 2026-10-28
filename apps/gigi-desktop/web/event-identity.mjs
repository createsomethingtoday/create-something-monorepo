const labels={calendar_event:'Calendar event',performance:'Performance',crew_work:'Crew / work',other:'Other work',unclassified:'Unclassified gig'};
export function eventKind(record,entity=record?.entity){
 if(entity==='schedule')return 'calendar_event';
 if(labels[record?.identity?.recordKind])return record.identity.recordKind;
 return {'Performance':'performance','Crew / work':'crew_work','Other':'other'}[record?.fields?.['Work kind']]||'unclassified';
}
export function eventLabel(record,entity=record?.entity){return labels[eventKind(record,entity)];}
export function targetDescription(record,entity=record?.entity){
 const source=record?.source?.kind==='manual'?record.source.origin:record?.source;
 return [record?.title||'Untitled',entity==='music'?'Music':eventLabel(record,entity),record?.fields?.Date||record?.date,source?.provider==='googlecalendar'?'Google Calendar source':null].filter(Boolean).join(' · ');
}
