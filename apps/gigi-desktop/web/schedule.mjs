import { localToday } from './experience.mjs';

// Date-only values are calendar dates; timestamps are instants in the viewer's zone.
function parse(value) {
  if (typeof value !== 'string') return null;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (!day && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  if (!day) { const clock = value.slice(11, 19).split(':').map(Number); if (clock[0] > 23 || clock[1] > 59 || (clock[2] || 0) > 59) return null; }
  const date = new Date(day ? `${value}T12:00:00` : value);
  if (!Number.isFinite(date.getTime())) return null;
  const recordedDay = value.slice(0, 10);
  const validation = new Date(`${recordedDay}T12:00:00Z`);
  if (!Number.isFinite(validation.getTime()) || validation.toISOString().slice(0, 10) !== recordedDay) return null;
  return { date, day, key: day ? value : localToday(date) };
}
export function scheduleEntry(record) {
  const value = record.fields?.Date ?? record.date;
  const parts = typeof value === 'string' ? value.split('/') : [];
  const start = parts.length <= 2 ? parse(parts[0]) : null;
  const end = parts.length === 2 ? parse(parts[1]) : null;
  if (!start || (parts.length === 2 && (!end || end.date < start.date))) return { record, key: null, time: 'Date needs attention' };
  const allDay = start.day || record.fields?.['All Day'] === true || record.allDay === true;
  const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
  const dayLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const rangeEnd = end && end.key !== start.key ? `${dayLabel.format(end.date)}, ${time.format(end.date)}` : end ? time.format(end.date) : '';
  const lastDay = allDay && end && end.key > start.key ? localToday(new Date(end.date.getFullYear(), end.date.getMonth(), end.date.getDate() - 1)) : end?.key || start.key;
  return { record, key: start.key, date: start.date, endKey: lastDay, time: allDay ? (end && end.key !== start.key ? `All day · ends ${dayLabel.format(end.date)} (exclusive)` : 'All day') : `${time.format(start.date)}${rangeEnd ? ` – ${rangeEnd}` : ''}` };
}
export function scheduleAgenda(records, view = 'upcoming', today = localToday()) {
  const entries = records.map(scheduleEntry).sort((a, b) => (a.key === null) - (b.key === null) || (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0) || String(a.record.id).localeCompare(String(b.record.id)));
  const counts = { upcoming: entries.filter(e => e.key && e.endKey >= today).length, past: entries.filter(e => e.key && e.endKey < today).length, all: entries.length };
  const visible = entries.filter(e => view === 'all' || (e.key && (view === 'past' ? e.endKey < today : e.endKey >= today)));
  const groups = [];
  for (const entry of visible) {
    let group = groups.at(-1);
    if (!group || group.key !== entry.key) {
      const title = entry.key ? `${entry.key === today ? 'Today · ' : ''}${new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(`${entry.key}T12:00:00`))}` : 'Date needs attention';
      groups.push(group = { key: entry.key, title, entries: [] });
    }
    group.entries.push(entry);
  }
  return { groups, counts, undated: entries.filter(e => !e.key).length };
}
export async function readSchedulePages(read, current = () => true) {
  const records = [], cursors = new Set();
  let cursor;
  do {
    const result = await read(cursor);
    if (!current()) return null;
    records.push(...(result.items || []));
    cursor = result.nextCursor || null;
    if (cursor && cursors.has(cursor)) throw new Error('Schedule could not finish loading. Reopen Schedule to retry.');
    if (cursor) cursors.add(cursor);
  } while (cursor);
  return records;
}
