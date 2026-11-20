#!/usr/bin/env node
// Daily Google Calendar → GiGi sync. Meetings become gigs (idempotency key gcal-<eventId>), matching
// the gigs added by hand on 2026-10-20. Attendees of meetings with ≤10 guests become contacts
// (deduped by email) linked to the gig through its Contacts role.
//
// Calendar data comes from a headless `claude -p` call to the claude.ai Google Calendar connector;
// events are parsed from the raw tool result, never from model prose. GiGi writes go through the
// installed app's typed gigi-mcp tools. Events that changed after import are reported, not rewritten.
//
// Usage: node calendar-daily-sync.mjs [--dry-run] [--days 30] [--events-file events.json]
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { mkdirSync, readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const DRY_RUN = flag('--dry-run');
const DAYS = Number(option('--days', '30'));
const EVENTS_FILE = option('--events-file');
const MAX_GUESTS = 10;
const GIGI_DATA_DIR = process.env.GIGI_DATA_DIR ?? join(homedir(), 'Library/Application Support/agency.createsomething.gigi');
const GIGI_MCP = process.env.GIGI_MCP ?? '/Applications/GiGi.app/Contents/MacOS/gigi-mcp';
const CLAUDE_BIN = process.env.CLAUDE_BIN ?? join(homedir(), '.local/bin/claude');
const STATE_DIR = join(homedir(), 'Library/Application Support/agency.createsomething.gigi-calendar-sync');
const STATE_FILE = join(STATE_DIR, 'state.json');

if (!Number.isInteger(DAYS) || DAYS < 1 || DAYS > 60) throw new Error('--days must be 1-60');

// ---------- Calendar fetch ----------

function localIso(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T00:00:00`;
}

async function fetchEvents() {
  if (EVENTS_FILE) return JSON.parse(readFileSync(EVENTS_FILE, 'utf8'));
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + DAYS);
  const prompt = `Call mcp__claude_ai_Google_Calendar__list_events with startTime ${localIso(start)}, endTime ${localIso(end)}, ` +
    'pageSize 250, orderBy startTime. If the result has a nextPageToken, call it again with that pageToken until there is none. ' +
    'Do not read, summarize or process the events. Then reply with only the word DONE.';
  // dontAsk + a one-tool allowlist: the headless run can only list events, whatever the user's default permission mode is.
  const output = await run(CLAUDE_BIN, ['-p', prompt, '--model', 'haiku', '--output-format', 'stream-json', '--verbose',
    '--permission-mode', 'dontAsk', '--tools', 'ToolSearch',
    '--allowedTools', 'ToolSearch', 'mcp__claude_ai_Google_Calendar__list_events'], { cwd: STATE_DIR });
  const pages = [];
  for (const line of output.split('\n')) {
    if (!line.trim()) continue;
    const message = JSON.parse(line);
    if (message.type !== 'user') continue;
    for (const block of message.message?.content ?? []) {
      if (block?.type !== 'tool_result' || block.is_error) continue;
      let text = typeof block.content === 'string' ? block.content : (block.content ?? []).map((part) => part.text ?? '').join('');
      // Oversized tool results are spilled to a file under ~/.claude/projects; read the raw page from there.
      const spilled = text.match(/saved to (\/\S+?list_events-\d+\.txt)/);
      if (spilled) text = readFileSync(spilled[1], 'utf8');
      if (!text.startsWith('{')) continue;
      const page = JSON.parse(text);
      if (Array.isArray(page.events)) pages.push(page);
    }
  }
  if (!pages.length) throw new Error('calendar fetch returned no event pages');
  // The model may repeat a call; keep one copy of each event.
  const events = [...new Map(pages.flatMap((page) => page.events).map((event) => [event.id, event])).values()];
  return { timeZone: pages[0].timeZone, events };
}

function run(command, argv, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, argv, { ...options, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => child.kill('SIGTERM'), 300_000);
    child.on('close', (code) => {
      clearTimeout(timer);
      code === 0 ? resolve(stdout) : reject(new Error(`${command} exited ${code}: ${stderr.slice(0, 500)}`));
    });
  });
}

// ---------- Event → gig projection ----------

const GROUP_CALENDAR = /@(group|resource)\.calendar\.google\.com$/i;
// Mailing lists look like people in attendee lists (e.g. product-managers@): hyphenated, no dot.
const MAILING_LIST = /^[a-z0-9]+(-[a-z0-9]+)+@/i;

// Calendar titles carry trailing spaces and emoji variation selectors that hand-entered gigs dropped.
const cleanTitle = (title) => title.replace(/️/g, '').replace(/\s+/g, ' ').trim();

function selfResponse(event) {
  return event.attendees?.find((attendee) => attendee.self)?.responseStatus;
}

function skipReason(event) {
  if (event.status === 'cancelled') return 'cancelled';
  if (event.eventType && event.eventType !== 'DEFAULT') return `eventType ${event.eventType}`;
  if (!event.start?.dateTime || !event.end?.dateTime) return 'all-day';
  const response = selfResponse(event);
  if (response === 'declined') return 'declined';
  if (response === 'needsAction') return 'not answered';
  return null;
}

function parts(iso, timeZone) {
  const values = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short',
  }).formatToParts(new Date(iso)).map((part) => [part.type, part.value]));
  const hour24 = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
  return { date: `${values.year}-${values.month}-${values.day}`, hour24, clock: `${values.hour}:${values.minute}`, meridiem: values.dayPeriod, zone: values.timeZoneName };
}

function meetingType(event) {
  const text = `${event.location ?? ''} ${event.description ?? ''} ${JSON.stringify(event.conferenceData ?? {})}`;
  if (/office hours/i.test(event.summary ?? '')) return 'Office hours';
  if (/zoom\.us/i.test(text)) return 'Zoom meeting';
  if (event.hangoutLink || /meet\.google\.com/i.test(text)) return 'Google Meet';
  return 'Meeting';
}

function gigFor(event, timeZone) {
  const start = parts(event.start.dateTime, timeZone);
  const end = parts(event.end.dateTime, timeZone);
  const range = start.meridiem === end.meridiem
    ? `${start.clock}-${end.clock} ${end.meridiem}` : `${start.clock} ${start.meridiem}-${end.clock} ${end.meridiem}`;
  const organizer = GROUP_CALENDAR.test(event.organizer?.email ?? '')
    ? event.organizer.displayName ?? event.organizer.email : event.organizer?.email ?? 'unknown';
  const hours = Math.round((Date.parse(event.end.dateTime) - Date.parse(event.start.dateTime)) / 36e3) / 100;
  return {
    title: (event.summary?.trim() || 'Untitled meeting').slice(0, 500),
    fields: {
      Date: start.date, 'Call Time': start.hour24, Hours: hours, Type: meetingType(event),
      Requirements: `${range} ${end.zone}. Organizer: ${organizer}. Added from Google Calendar.`,
    },
  };
}

function guestsFor(event) {
  const people = (event.attendees ?? []).filter((attendee) => !attendee.resource && !GROUP_CALENDAR.test(attendee.email ?? ''));
  if (people.length > MAX_GUESTS) return [];
  return people.filter((attendee) => !attendee.self && attendee.email && !MAILING_LIST.test(attendee.email)
    && attendee.responseStatus !== 'declined');
}

function nameFromEmail(email) {
  return email.split('@')[0].split(/[._-]+/).filter(Boolean).map((word) => word[0].toUpperCase() + word.slice(1)).join(' ');
}

// ---------- GiGi MCP client ----------

function connectGigi() {
  const child = spawn(GIGI_MCP, [], { env: { ...process.env, GIGI_DATA_DIR }, stdio: ['pipe', 'pipe', 'inherit'] });
  const pending = new Map();
  let nextId = 0;
  createInterface({ input: child.stdout }).on('line', (line) => {
    const message = JSON.parse(line);
    if (message.id !== undefined && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
  });
  const request = (method, params) => new Promise((resolve) => {
    const id = ++nextId; pending.set(id, resolve);
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  });
  return {
    async init() {
      await request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'gigi-calendar-sync', version: '1' } });
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
    },
    async call(name, argumentsValue) {
      const reply = await request('tools/call', { name, arguments: argumentsValue });
      if (reply.error) throw new Error(`${name}: ${reply.error.message}`);
      const result = reply.result;
      if (result.isError) throw new Error(`${name}: ${result.content?.map((part) => part.text).join(' ')}`);
      return result.structuredContent ?? JSON.parse(result.content?.[0]?.text ?? 'null');
    },
    close() { child.stdin.end(); },
  };
}

async function listAll(gigi, workspaceId, entity) {
  const items = []; let cursor;
  do {
    const page = await gigi.call('gigi_records_list', { workspaceId, entity, limit: 100, ...(cursor ? { cursor } : {}) });
    items.push(...page.items); cursor = page.nextCursor;
  } while (cursor);
  return items;
}

// ---------- Sync ----------

function loadState() {
  const empty = { gigsByEvent: {}, contactsByEmail: {}, checkedContactIds: [], links: [] };
  return existsSync(STATE_FILE) ? { ...empty, ...JSON.parse(readFileSync(STATE_FILE, 'utf8')) } : empty;
}

function saveState(state) {
  writeFileSync(`${STATE_FILE}.tmp`, JSON.stringify(state, null, 1), { mode: 0o600 });
  renameSync(`${STATE_FILE}.tmp`, STATE_FILE);
}

async function main() {
  mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 });
  const state = loadState();
  const { timeZone, events } = await fetchEvents();
  const gigi = connectGigi();
  await gigi.init();
  const report = { dryRun: DRY_RUN, fetched: events.length, skipped: {}, gigsCreated: [], gigsExisting: 0, changedInCalendar: [],
    contactsCreated: [], linksCreated: 0 };
  try {
    const workspace = await gigi.call('gigi_workspace_get', {});
    if (!workspace?.id) throw new Error('no GiGi workspace');
    const workspaceId = workspace.id;

    const gigIndex = new Map();
    const gigsBySlot = new Map();
    for (const gig of await listAll(gigi, workspaceId, 'gigs')) {
      gigIndex.set(`${cleanTitle(gig.title)}|${gig.date}|${gig.callTime}`, gig.id);
      const slot = `${gig.date}|${gig.callTime}`;
      gigsBySlot.set(slot, [...(gigsBySlot.get(slot) ?? []), { id: gig.id, title: cleanTitle(gig.title).toLowerCase() }]);
    }
    const checked = new Set(state.checkedContactIds);
    for (const contact of await listAll(gigi, workspaceId, 'contacts')) {
      if (checked.has(contact.id)) continue;
      const detail = await gigi.call('gigi_records_get', { workspaceId, entity: 'contacts', id: contact.id, detail: 'full' });
      const email = detail?.fields?.Email?.toLowerCase?.();
      if (email && !state.contactsByEmail[email]) state.contactsByEmail[email] = contact.id;
      checked.add(contact.id);
    }
    state.checkedContactIds = [...checked];
    const links = new Set(state.links);

    if (!DRY_RUN) await gigi.call('gigi_backup_create', { workspaceId });

    for (const event of events) {
      const reason = skipReason(event);
      if (reason) { report.skipped[reason] = (report.skipped[reason] ?? 0) + 1; continue; }
      const gig = gigFor(event, timeZone);
      const indexKey = `${cleanTitle(gig.title)}|${gig.fields.Date}|${gig.fields['Call Time']}`;
      let gigId = state.gigsByEvent[event.id] ?? gigIndex.get(indexKey);
      if (gigId) {
        report.gigsExisting++;
      } else if (DRY_RUN) {
        report.gigsCreated.push(`${gig.fields.Date} ${gig.fields['Call Time']} ${gig.title}`);
      } else {
        try {
          gigId = (await gigi.call('gigi_records_save', { workspaceId, entity: 'gigs', title: gig.title, fields: gig.fields, idempotencyKey: `gcal-${event.id}` })).id;
          report.gigsCreated.push(`${gig.fields.Date} ${gig.fields['Call Time']} ${gig.title}`);
        } catch (error) {
          // A prior import used this key with different details: the gig was retitled in GiGi, or the event
          // moved in Calendar. Adopt the one same-slot gig whose title is a prefix of the event's (or the
          // reverse); otherwise report it and leave it alone.
          if (!/reused with different input/.test(error.message)) throw error;
          const title = cleanTitle(gig.title).toLowerCase();
          const matches = (gigsBySlot.get(`${gig.fields.Date}|${gig.fields['Call Time']}`) ?? [])
            .filter((candidate) => title.startsWith(candidate.title) || candidate.title.startsWith(title));
          if (matches.length !== 1) {
            report.changedInCalendar.push(`${gig.fields.Date} ${gig.fields['Call Time']} ${gig.title}`);
            continue;
          }
          gigId = matches[0].id;
          report.gigsExisting++;
        }
      }
      if (gigId) { state.gigsByEvent[event.id] = gigId; gigIndex.set(indexKey, gigId); }

      for (const guest of guestsFor(event)) {
        const email = guest.email.toLowerCase();
        let contactId = state.contactsByEmail[email];
        if (!contactId) {
          report.contactsCreated.push(email);
          if (DRY_RUN) continue;
          const saved = await gigi.call('gigi_records_save', { workspaceId, entity: 'contacts', title: guest.displayName || nameFromEmail(email),
            fields: { Email: email, Type: 'person' }, idempotencyKey: `gcal-contact-${email}` });
          contactId = state.contactsByEmail[email] = saved.id;
          checked.add(contactId); state.checkedContactIds = [...checked];
        }
        if (!gigId || DRY_RUN || links.has(`${gigId}|${contactId}`)) continue;
        await gigi.call('gigi_relations_link', { workspaceId, fromEntity: 'gigs', fromId: gigId, toEntity: 'contacts', toId: contactId, role: 'Contacts' });
        links.add(`${gigId}|${contactId}`); report.linksCreated++;
      }
      state.links = [...links];
      if (!DRY_RUN) saveState(state);
    }
  } finally {
    gigi.close();
  }
  report.contactsCreated = [...new Set(report.contactsCreated)];
  console.log(JSON.stringify({ at: new Date().toISOString(), ...report }, null, 1));
}

main().catch((error) => { console.error(`calendar sync failed: ${error.message}`); process.exit(1); });
