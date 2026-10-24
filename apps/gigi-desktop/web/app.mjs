import {agentPreflightView} from './agent-preflight.mjs';
import {eventLabel} from './event-identity.mjs';
import {artworkPanel,installArtworkUI} from './artwork.mjs';
import {createGigs, gigsView, gigsFilterValue} from './gigs.mjs';
import {sourceSelection, sourceImportView, sourceImportRunning} from './source-center.mjs';
import {statusLabel, peopleShortcut, todaySummary, builtInChatSetup} from './desktop-polish.mjs';
import {referenceHeader, referenceCards, createWorkspaceHistory} from './reference-layout.mjs';
import {createContactRead} from './contact-read.mjs';
import { historyPresentation, copyableRecordField } from './record-polish.mjs';
import { mountMusic } from './music.mjs';
import { mountSocial } from './social.mjs';
import { diagnosticsView } from './diagnostics-view.mjs';
import { captureViewState, restoreViewState } from './view-state.mjs';
import { scheduleAgenda, scheduleEntry, readWorkspaceAgenda } from './schedule.mjs';
import { displayField, importantDetails, emptyCopy, localToday, fieldHelp, collectionCount } from './experience.mjs';
import { sourceView, setupSummary, sourceJourney, sourceErrorMessage } from './setup-view.mjs';
import { canUseSource, sourceDraft, reviewSourceDraft, sourceProposalView } from './source-proposal.mjs';
import { icon, entityIcon } from './icons.mjs';
import { tauriBridge } from './bridge.mjs';
import { ChatController, chatView } from './chat.mjs';
import { aiConnectionView } from './ai-connection.mjs';
import { sections, fields, moneyFields, booleanFields, fieldOptions, listFrom, recordFields, editedFields, formatMoney, gigBalance, relatedEndpoint, sourcePreview, sourceSessionBlocked, sourceCanBegin, sourceNeedsOperatorReview, importRunForAccount, pendingConsentForProvider, pendingAccountForProvider, linkInput } from './model.mjs';

const root = document.querySelector('#app');
const bridge = tauriBridge(workspace=>gigs.invalidate(workspace));
let chat;
let routeVersion = 0;
const workspaceHistory=createWorkspaceHistory();
let operationVersion = 0;
let currencyVersion = 0;
let sourceProposal = null;
let renderedView = null;
let renderedGigsCriteria = null;
let creatorMount = null;
let creatorNode = null;
let creatorRoute = null;
let renderedChatSession = null;
let chatRefreshFocus = null;
let editorBaseline = null;
let submittedEditor = null;
let pendingLeave = null;
let editorReturnFocus = null;
const contactRead=createContactRead();
let contactSearchTimer;
let contactSearchVersion = 0;
const state = { workspace: null, setupProfile: false, setupDraft: null, currency: null, currencyKnown: false, page: 'overview', contactQuery: '', contactSearching: false, contactSearchError: false, scheduleView: 'upcoming', libraryOpen: false, records: [], recordCount: 0, nextCursor: null, selected: null, editing: false, editorDraft: null, editorOrigin: null, sourceExpanded: false, busy: false, signingIn: false, signingOut: false, sourceSignedOut: false, justCreated: false, agentProvider: 'codex', toast: null, summary: null, summaryUnavailable: false, history: [], backupId: null, pendingRestoreId: null, agent: null, agentReceipt: null, relationSchema: null, linkChoices: null, sources: {}, sourceAttempts: {}, connectionRequests: {}, imports: {}, sourceDrafts: {}, sourceBusy: {}, contextHits: [], contextQueried: false, diagnostics: { status: null, review: null, exported: null } };
const gigs=createGigs({read:(workspace,criteria,cursor)=>bridge.listGigs(workspace,criteria,cursor),changed(){if(state.page==='gigs'&&!state.selected&&!state.editing)render();}});
const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const label = (name) => sections.find((item) => item.id === name)?.label || name;
const entityName = (name) => ({ schedule: 'schedule', finances: 'financial record', contacts: 'contact', companies: 'company', gigs: 'gig or shift', locations: 'place' })[name] || name.replace(/s$/, '');
const status = (record) => statusLabel(record?.fields?.Status || record?.status || '');
const workspaceId = () => state.workspace?.workspaceId || state.workspace?.id;
installArtworkUI(root,{call:bridge.call,workspaceId,canEdit:async()=>!state.editing&&(!creatorMount?.canLeave||await creatorMount.canLeave()),onChanged:async()=>{if(state.selected)await selectRecord(state.selected.id,state.page);else if(state.page==='music')globalThis.dispatchEvent(new Event('focus'));else await openPage(state.page);}});
const explain = (error) => {
  const raw = error instanceof Error ? error.message : String(error);
  const reasons = { session_busy: 'Source sign-in is busy. Finish or cancel it, then sign out.', session_expired: 'Sign in to GiGi sources, then check source status.', access_denied: 'Source access is not enabled for this GiGi sign-in. Ask the GiGi operator to check access for this app.', unconfigured: 'Source connection needs developer configuration on this build.', unauthorized: 'Sign in to the source account and try again.', reauthentication_required: 'Sign in to GiGi sources, then check source status.', refresh_in_progress: 'Connector session is refreshing. Check status again shortly.', refresh_outcome_unknown: 'Session refresh is uncertain. Check source status before retrying.', missing_dependency: 'A required companion is missing. Reinstall the complete GiGi app.', unavailable: 'The source is temporarily unavailable. Try again later.', provider_unavailable: 'The connection service is temporarily unavailable. Your local records are unchanged; check status later.', timeout: 'Connector sign-in timed out. Your local records are unchanged; try again.', cancelled: 'Connection was cancelled. Your records are unchanged.' };
  return sourceErrorMessage(raw) || reasons[raw] || raw;
};

function notice(message, error = false) {
  state.toast = { message, error };
  render();
  setTimeout(() => { if (state.toast?.message === message) { state.toast = null; render(); } }, 5000);
}

function readRoute() { return { version: routeVersion, page: state.page, workspace: workspaceId() }; }
function nextRoute() { sourceProposal = null; routeVersion++; clearTimeout(contactSearchTimer); contactRead.cancel(); gigs.cancel(); return readRoute(); }
function currentRoute(route) { return route.version === routeVersion && route.page === state.page && route.workspace === workspaceId(); }
function leaveRoute() { sourceProposal = null; routeVersion++; clearTimeout(contactSearchTimer); contactRead.cancel(); gigs.cancel(); }

async function run(task) {
  const operation = ++operationVersion;
  state.busy = true; render();
  try { return await task(); } catch (error) { if (operation === operationVersion) notice(explain(error), true); }
  finally { if (operation === operationVersion) { state.busy = false; render(); } }
}

async function refreshCurrency() {
  const workspace = workspaceId(), version = ++currencyVersion;
  state.currencyKnown = false; renderChat();
  try {
    const profiles = listFrom(await bridge.listRecords(workspace, 'profile'));
    const value = profiles[0] ? (await bridge.getRecord(workspace, 'profile', profiles[0].id)).fields?.Currency || null : null;
    if (version !== currencyVersion || workspace !== workspaceId()) return;
    state.currency = value; state.currencyKnown = true;
  } catch {
    if (version !== currencyVersion || workspace !== workspaceId()) return;
    state.currency = null;
  }
  render();
}

function initializeChat() {
  chat?.close();
  chat = new ChatController(bridge, workspaceId(), renderChat, async () => {
    const route = readRoute();
    gigs.invalidate();
    await refreshCurrency();
    if (!currentRoute(route) || state.editing) return;
    if (state.selected?.id) await selectRecord(state.selected.id);
    else if (state.page === 'overview') await openPage('overview');
    else if (fields[state.page] && !state.editing) await openPage(state.page);
  });
  chat.currency = () => state.currency;
  chat.currencyKnown = () => state.currencyKnown;
}

async function load() {
  const result = await bridge.getWorkspace();
  chat?.close();
  chat = null;
  state.workspace = result?.workspace || result?.workspaceId && result || result?.id && result || null;
  if (state.workspace) {
    initializeChat();
    currencyVersion++; state.currencyKnown = false;
    const profiles = listFrom(await bridge.listRecords(workspaceId(), 'profile'));
    state.setupProfile = profiles.length === 0;
    state.currency = profiles[0] ? (await bridge.getRecord(workspaceId(), 'profile', profiles[0].id)).fields?.Currency || null : null;
    state.currencyKnown = true;
    if (!state.setupProfile) await openPage(state.page);
  }
  render();
}

function protectEditor(next) {
  captureEditorDraft();
  if (submittedEditor?.version === routeVersion && Object.keys(submittedEditor.values).every(key => String(state.editorDraft?.[key] ?? '') === String(submittedEditor.values[key] ?? ''))) return true;
  if (state.editing !== true || !editorBaseline || !state.editorDraft || Object.keys(editorBaseline.values).every(key => String(state.editorDraft[key] ?? '') === String(editorBaseline.values[key] ?? ''))) return true;
  pendingLeave = next;
  editorReturnFocus = globalThis.document?.activeElement?.id || 'title';
  render();
  root.querySelector?.('[data-keep-editing]')?.focus?.();
  return false;
}
function keepEditing() {
  pendingLeave = null; render();
  root.querySelector?.(`#${editorReturnFocus || 'title'}`)?.focus?.();
}
async function openPage(page, resetScroll = false, historyIndex = null) {
  if (!protectEditor(() => void run(() => openPage(page, resetScroll, historyIndex)))) return false;
  if (creatorMount?.canLeave && !await creatorMount.canLeave()) return false;
  if (creatorMount) { if(typeof creatorMount==='function') creatorMount(); else creatorMount.dispose?.(); }
  creatorMount=null; creatorNode=null; creatorRoute=null;
  if (page !== 'settings') state.justCreated = false;
  clearTimeout(contactSearchTimer); contactSearchVersion++; state.contactSearching = false; state.contactSearchError = false;
  if(state.page==='gigs'&&!state.selected&&!state.editing)gigs.remember(globalThis.scrollY||0);
  workspaceHistory.visit(page, historyIndex);
  state.page = page; state.selected = null; state.editing = false; state.editorDraft = null; state.editorOrigin = null; state.sourceExpanded = false; state.summary = null; state.summaryUnavailable = false;
  const route = nextRoute();
  if (page !== 'settings') state.pendingRestoreId = null;
  if (page === 'overview') {
    const value = await bridge.overview(route.workspace, localToday());
    if (!currentRoute(route)) return false;
    state.overview = value;
  } else if (page === 'history') {
    const value = await bridge.listHistory(route.workspace, 40);
    if (!currentRoute(route)) return false;
    state.history = listFrom(value);
  } else if (page === 'settings') {
    const providers = ['gmail', 'googlecalendar'];
    state.setupChatStatus = null; state.setupChatFailed = false;
    state.sources = Object.fromEntries(providers.map((provider) => [provider, { provider, state: 'checking' }]));
    render();
    const results = await Promise.allSettled([...providers.map((provider) => bridge.sourceStatus(route.workspace, provider)), bridge.agentStatus(), bridge.call('diagnostics.status'), bridge.chatStatus(route.workspace)]);
    if (!currentRoute(route)) return false;
    state.sources = Object.fromEntries(providers.map((provider, index) => [provider, results[index].status === 'fulfilled' ? results[index].value : { provider, state: 'unavailable', detail: results[index].reason instanceof Error ? results[index].reason.message : String(results[index].reason) }]));
    for (const provider of providers) {
      const source = state.sources[provider];
      if (source.latestImport && !importRunForAccount(state.imports[provider], source.connectedAccountId)) {
        const receipt = source.latestImport, selection = receipt.scope?.selection || {};
        state.imports[provider] = {accountId: source.connectedAccountId, receipt, selection, restoredScope:true, selectionKey:JSON.stringify(selection), cursor:receipt.retryCursor};
        state.sourceDrafts[provider] = {from:selection.from?.slice(0,10) || '',to:selection.to?.slice(0,10) || ''};
      }
    }
    state.setupChatStatus = results[4].status === 'fulfilled' ? results[4].value : null;
    state.setupChatFailed = results[4].status === 'rejected';
    state.agentReceipt = results[2].status === 'fulfilled' ? results[2].value : null;
    state.diagnostics = { status: results[3].status === 'fulfilled' ? results[3].value : null, review: null, exported: null };
  } else if (page==='gigs') {
    await gigs.open(route.workspace);if(!currentRoute(route))return false;
  } else if (fields[page]) {
    state.records = []; state.recordCount = 0; state.nextCursor = null;
    if(page==='contacts'){await searchContacts(state.contactQuery,true);if(!currentRoute(route))return false;render();if(resetScroll)globalThis.scrollTo?.(0,0);return true;}
    const result = page === 'schedule' ? await readWorkspaceAgenda((entity, cursor) => bridge.listRecords(route.workspace, entity, cursor), () => currentRoute(route)).then(items => items && ({ items, count: items.length })) : await bridge.listRecords(route.workspace, page, null, page === 'contacts' ? state.contactQuery : undefined);
    if (!currentRoute(route)) return false;
    state.records = listFrom(result);
    state.recordCount = result?.count ?? state.records.length;
    state.nextCursor = result?.nextCursor || null;
  }
  render();
  if(page==='gigs')globalThis.scrollTo?.(0,gigs.state?.scroll||0);
  else if (resetScroll) globalThis.scrollTo?.(0, 0);
  return true;
}

async function selectRecord(id, entity = state.page) {
  if (state.page !== entity) return false;
  if(entity==='gigs'&&!state.selected&&!state.editing)gigs.remember(globalThis.scrollY||0,id);
  const route = nextRoute();
  state.selected = null; state.editing = false; state.editorDraft = null; state.editorOrigin = null; state.sourceExpanded = false;
  const [record, summary] = await Promise.allSettled([bridge.getRecord(route.workspace, entity, id), entity === 'gigs' ? bridge.gigSummary(route.workspace, id) : null]);
  if (!currentRoute(route)) return false;
  if (record.status === 'rejected') throw record.reason;
  state.selected = record.value; state.summary = summary.status === 'fulfilled' ? summary.value : null;
  state.summaryUnavailable = summary.status === 'rejected';
  render(); globalThis.scrollTo?.(0, 0);
  return true;
}

async function navigateRecord(entity, id) {
  if (!protectEditor(() => void run(() => navigateRecord(entity, id)))) return;
  if (!fields[entity]) return;
  if (state.page !== entity && !await openPage(entity)) return;
  await selectRecord(id, entity);
}

async function enterEditor() {
  const selected = state.selected;
  if (!selected?.id) return;
  const origin = editorOrigin(selected, '[data-edit]');
  const route = nextRoute();
  await run(async () => {
    const record = await bridge.getRecord(route.workspace, route.page, selected.id, 'full');
    if (!currentRoute(route)) return;
    state.selected = record; state.editorOrigin = origin; state.editorDraft = null; state.editing = true;
  });
  if (currentRoute(route) && state.editing === true) globalThis.scrollTo?.(0, 0);
}

async function refreshSelected(sourceExpanded = false) {
  const selected = state.selected;
  if (!selected?.id) return;
  const route = nextRoute();
  const record = await bridge.getRecord(route.workspace, route.page, selected.id, 'full');
  if (!currentRoute(route)) return;
  state.selected = record; state.sourceExpanded = sourceExpanded;
}

function editorOrigin(selected, focus, keepPosition = true) {
  return { selected, focus, reloadCollection: !selected && !keepPosition, x: keepPosition ? globalThis.scrollX || 0 : 0, y: keepPosition ? globalThis.scrollY || 0 : 0,
    openDetails: [...(root.querySelectorAll?.('.content-primary details') || [])].map((detail) => detail.open) };
}

async function cancelEditor() {
  if (!protectEditor(() => void cancelEditor())) return;
  const origin = state.editorOrigin;
  leaveRoute();
  if (origin?.reloadCollection || (state.page === 'contacts' && !origin?.selected && state.contactSearching)) {
    state.records = []; state.recordCount = 0; state.nextCursor = null;
    if (!await run(() => openPage(state.page))) return;
  } else {
    state.selected = origin?.selected || null;
    state.editing = false; state.editorDraft = null; state.editorOrigin = null;
    if(state.page==='gigs'&&!state.selected)await gigs.open(workspaceId());
    render();
  }
  if (origin) {
    [...(root.querySelectorAll?.('.content-primary details') || [])].forEach((detail, index) => { detail.open = origin.openDetails[index] || false; });
    root.querySelector?.(origin.focus)?.focus?.({ preventScroll: true });
  }
  globalThis.scrollTo?.(origin?.x || 0, origin?.y || 0);
}

function newRecord(entity) {
  if (!protectEditor(() => newRecord(entity))) return;
  workspaceHistory.visit(entity); leaveRoute(); state.editorOrigin = editorOrigin(null, `[data-new="${entity}"]`, state.page === entity); state.justCreated = false; state.page = entity; state.selected = null; state.editorDraft = null; state.editing = true; render(); globalThis.scrollTo?.(0, 0); root.querySelector?.('#title')?.focus?.();
}


function shell(body) {
  return `<div class="shell">${referenceHeader({page:state.page,sections,workspace:state.workspace?.name,history:workspaceHistory})}<main class="main" aria-label="GiGi / ${safe(label(state.page))}"><div class="content"><div class="content-primary"><button type="button" class="btn mobile-chat-entry" data-chat-open="1">Ask GiGi</button>${body}</div></div></main>${chatView(chat || { visible: false })}</div>${pendingLeave ? '<div class="record-leave-backdrop"><section class="record-leave-dialog panel" role="alertdialog" aria-modal="true" aria-labelledby="leave-title" aria-describedby="leave-description"><h2 id="leave-title">Keep your changes?</h2><p id="leave-description">This record has unsaved changes. Keep editing to save them, or discard them to leave.</p><div class="inline-actions"><button class="btn primary" data-keep-editing="1">Keep editing</button><button class="btn" data-discard-changes="1">Discard changes</button></div></section></div>' : ''}${state.toast ? `<div class="toast ${state.toast.error ? 'error' : ''}" role="status">${safe(state.toast.message)}</div>` : ''}`;
}

function heading(eyebrow, title, description, action = '') {
  return `<div class="page-head"><div><p class="eyebrow">${safe(eyebrow)}</p><h1>${icon(entityIcon(state.page))}<span>${safe(title)}</span></h1><p class="subhead">${safe(description)}</p></div>${action}</div>`;
}

function rows(name, records, max = Infinity) {
  if (!records.length) { const copy = emptyCopy(name); return `<div class="empty"><strong>${safe(copy.title)}</strong><p>${safe(copy.description)}</p><button class="btn" data-new="${safe(name)}">${icon('plus')}${safe(copy.action)}</button></div>`; }
  return `<div class="rows">${records.slice(0, max).map((record) => `<button class="row" type="button" data-open="${safe(record.id)}" data-entity="${name}"><span><strong>${safe(record.title || 'Untitled')}</strong><small>${safe([status(record), record.date ? displayField('Date', record.date) : '', name === 'finances' ? [formatMoney(record.moneyCents, state.currency), state.currency].filter(Boolean).join(' ') : ''].filter(Boolean).join(' · ') || 'Open record')}</small></span><span class="arrow" aria-hidden="true">${icon('arrow-up-right')}</span></button>`).join('')}</div>`;
}

function overview() {
  const data = state.overview || {};
  const counts = data.counts || {};
  const group = (entity, title, description) => { const value = data[entity] || { items: [], count: 0 }; return `<section class="panel"><div class="panel-head"><h2>${icon(entityIcon(entity))}<span>${title}</span></h2><button class="btn text" data-page="${entity==='events'?'schedule':entity}">View all ${safe(label(entity==='events'?'schedule':entity).toLowerCase())} ${icon('arrow-up-right')}</button></div><details class="today-scope" data-view-key="today-scope-${entity}"><summary>What’s included</summary><p class="muted">${description}</p></details>${value.items.length ? referenceCards(entity, value.items, {status,date:value=>displayField('Date',value),money:value=>formatMoney(value,state.currency)}) : `<p class="muted overview-empty">${entity === 'events' ? 'No ongoing or upcoming events. Add a gig or import Calendar entries.' : entity === 'gigs' ? 'No upcoming dated gigs or shifts. Add a date to a gig to include it here.' : entity === 'tasks' ? 'No open tasks. Add a task when there is something to follow up.' : 'No expected, invoiced or overdue payments. Record income or an expense when you need to track it.'}</p>`}<small class="muted">Showing ${value.items.length} of ${value.count} matching records${entity === 'events' && value.undatedCount ? ` · ${value.undatedCount} need a usable date` : entity === 'gigs' && data.undatedGigsCount ? ` · ${data.undatedGigsCount} without a usable date` : ''}</small></section>`; };
  return heading('Local workspace', 'Today', 'Your upcoming work and open commitments.', `<button class="btn primary" data-new="gigs">${icon('plus')}New gig</button>`) + todaySummary(data) + `${counts.gigs || counts.tasks || counts.finances || data.events?.count ? '' : `<div class="callout section-gap"><strong>Start with the work you know.</strong><p>Add a gig or shift, then link its people, place and tasks. Sources and an agent are optional.</p><button class="btn" data-new="gigs">${icon('plus')}Add your first gig or shift</button><button class="btn" data-page="music">Add music</button><button class="btn" data-page="social">Draft a post</button></div>`}<div class="today-sections section-gap">${group(data.events?'events':'gigs', data.events?'Coming up':'Upcoming work', 'Gigs and Calendar entries, ordered across the whole workspace before showing the first five. Ongoing events are included; completed and cancelled work is excluded.')}${group('tasks', 'Open tasks', 'Unfinished tasks, with the earliest due dates first.')}</div>${group('finances', 'Unpaid income & expenses', 'Expected, invoiced and overdue records. Income and expenses are shown separately on each record; this is not a net balance.')}<details class="overview-counts"><summary>Workspace totals</summary><div class="cards overview-metrics"><div class="card"><div class="label">${icon('music')} Gigs & shifts</div><div class="value">${counts.gigs || 0}</div></div><div class="card"><div class="label">${icon('list-checks')} Tasks</div><div class="value">${counts.tasks || 0}</div></div><div class="card"><div class="label">${icon('users')} People</div><div class="value">${counts.contacts || 0}</div></div></div></details><details data-view-key="overview-guide" class="panel overview-guide"><summary>Connections and getting started</summary><p class="muted">You can work directly in GiGi. Connect Gmail, Calendar or your subscribed agent when useful.</p><button class="btn" data-page="settings">Open setup guide ${icon('arrow-up-right')}</button></details>`;
}

function scheduleView() {
  const agenda = scheduleAgenda(state.records, state.scheduleView);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const controls = ['upcoming', 'past', 'all'].map(view => `<button class="btn" data-schedule-view="${view}" aria-pressed="${state.scheduleView === view}">${view === 'all' ? 'All entries' : view === 'past' ? 'Past' : 'Upcoming'} (${agenda.counts[view]})</button>`).join('');
  return heading('Daily work', 'Schedule', 'Dated gigs and schedule entries, together. Open an item for details.', `<button class="btn primary" data-new="schedule">${icon('plus')}Add event</button>`) + `<section class="panel"><div class="panel-head"><h2>Agenda</h2><button class="btn" data-schedule-today="1">Today</button></div><div class="inline-actions schedule-controls" aria-label="Schedule views">${controls}</div><p class="muted">Times in ${safe(zone)} · ${state.records.length} agenda ${state.records.length === 1 ? 'item' : 'items'}</p>${agenda.undated ? `<p class="muted">${agenda.undated} ${agenda.undated === 1 ? 'entry needs' : 'entries need'} a usable date. Find ${agenda.undated === 1 ? 'it' : 'them'} in All entries.</p>` : ''}${agenda.groups.length ? agenda.groups.map(group => `<section class="agenda-day" ${group.key === localToday() ? 'id="schedule-today"' : ''}><h3>${safe(group.title)}</h3>${group.entries.map(entry => `<button class="row agenda-event" type="button" data-open="${safe(entry.record.id)}" data-entity="${safe(entry.record.entity || 'schedule')}"><span class="agenda-time">${safe(entry.time)}</span><span><strong>${safe(entry.record.title || 'Untitled event')}</strong><small>${safe(eventLabel(entry.record))}${entry.record.status ? ` · ${safe(entry.record.status)}` : ''}</small></span><span class="arrow" aria-hidden="true">${icon('arrow-up-right')}</span></button>`).join('')}</section>`).join('') : state.records.length ? `<div class="empty"><strong>${state.scheduleView === 'past' ? 'No past events.' : 'Nothing scheduled for today or later.'}</strong><p>View All entries to find earlier events, or add an event.</p><button class="btn" data-schedule-view="all">View all entries</button></div>` : rows('schedule', [])}</section>`;
}

function searchContacts(query, immediate = false) {
  if (state.page !== 'contacts' || state.selected || state.editing) return;
  clearTimeout(contactSearchTimer);
  contactRead.cancel();
  state.contactQuery = query.slice(0,160); state.contactSearching = true; state.contactSearchError = false;
  const version = ++contactSearchVersion, route = readRoute(), requestedQuery = state.contactQuery;
  render();
  const search = async () => {
    if (version !== contactSearchVersion || !currentRoute(route) || state.selected || state.editing) return;
    try {
      const result = await contactRead.read(()=>bridge.listRecords(route.workspace, 'contacts', null, requestedQuery));
      if (version !== contactSearchVersion || !currentRoute(route) || state.selected || state.editing) return;
      state.records = listFrom(result); state.recordCount = result?.count ?? state.records.length; state.nextCursor = result?.nextCursor || null;
    } catch (error) {
      if (version !== contactSearchVersion || !currentRoute(route) || error?.code==='contact_read_superseded') return;
      state.records = []; state.recordCount = 0; state.nextCursor = null; state.contactSearchError = error?.code==='contact_read_timeout'?'timeout':true;
    } finally {
      if (version === contactSearchVersion && currentRoute(route) && !state.selected && !state.editing) { state.contactSearching = false; render(); }
    }
  };
  if (immediate) return search(); else contactSearchTimer = setTimeout(search, 150);
}
function contactSearchControls() {
  return `<div class="contact-search"><div class="field"><label for="contact-search">Search people</label><input id="contact-search" type="search" maxlength="160" value="${safe(state.contactQuery)}" placeholder="Name, email, phone or company" aria-describedby="contact-search-help" aria-controls="contact-results" autocomplete="off"></div><button type="button" class="btn" data-clear-contacts="1" ${state.contactQuery ? '' : 'disabled'}>Clear search</button></div><p class="muted" id="contact-search-help">Local contacts only · name, email, phone or company. Escape clears; ⌘F focuses this search.</p>`;
}

function collection() {
  if (state.page === 'schedule') return scheduleView();
  if (state.page === 'gigs') return heading('Your records','Gigs & shifts','Find upcoming work, revisit past gigs, or check dates that need attention.',`<button class="btn primary" data-new="gigs">${icon('plus')}Add gig or shift</button>`)+gigsView(gigs.state);
  const name = state.page;
  const action = name === 'profile' && state.records.length ? `<button class="btn" data-open="${safe(state.records[0].id)}" data-entity="profile">Open profile</button>` : `<button class="btn primary" data-new="${name}">${icon('plus')}Add ${safe(entityName(name))}</button>`;
  const searching = name === 'contacts' && state.contactSearching;
  const searchError = name === 'contacts' && state.contactSearchError;
  const filtered = name === 'contacts' && state.contactQuery.trim();
  const content = searching ? '<p role="status">Searching people…</p>' : searchError ? `<div class="empty"><strong>Couldn’t search people.</strong><p>${state.contactSearchError==='timeout'?'The search took too long. GiGi stopped waiting; the local read may still finish. Your contacts are unchanged. Retry or clear the search.':'Your contacts are unchanged. Try again.'}</p><button class="btn" data-retry-contacts="1">Retry search</button></div>` : filtered && !state.records.length ? '<div class="empty"><strong>No people match your search.</strong><p>Try a name, email, phone or linked company, or clear the search to see everyone.</p></div>' : rows(name, state.records);
  return heading('Your records', label(name), name === 'contacts' ? 'Find the people connected to your work.' : name === 'finances' ? 'Newest dated records first. Open a record for income or expense direction and due date.' : name === 'tasks' ? 'Recently updated first. Open a task for its due date, priority and links.' : `A private view of your ${label(name).toLowerCase()}. Open any record to inspect its details and links.`, action) + `<section class="panel">${name === 'contacts' ? contactSearchControls() : ''}<div id="contact-results" aria-busy="${searching}"><div class="panel-head"><h2>${safe(collectionCount(name, state.recordCount))}</h2><small role="status" aria-live="polite">${searching ? 'Searching…' : searchError ? 'Search unavailable' : `Showing ${state.records.length} of ${state.recordCount}${filtered ? ' matching contacts' : ''}`}</small></div>${content}${!searching && !searchError && state.nextCursor ? '<button class="btn section-gap" data-more="1">Load more</button>' : ''}</div></section>`;
}

function recordDetail() {
  const record = state.selected;
  const values = record.fields || {};
  const detail = importantDetails(state.page, values);
  const detailRows = (items) => items.map(([key, value]) => `<dt>${safe(key === 'Do Date' ? 'Planned date' : key === 'Venue Intel' ? 'Venue notes' : key === 'Note Details' ? 'Note' : key)}</dt><dd>${safe(state.page === 'schedule' && key === 'Date' ? (() => { const entry = scheduleEntry(record); return entry.key ? `${new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }).format(new Date(`${entry.key}T12:00:00`))} · ${entry.time} · ${Intl.DateTimeFormat().resolvedOptions().timeZone}` : displayField(key, value, state.currency); })() : displayField(key, value, state.currency))}${copyableRecordField(key,value) ? ` <button type="button" class="btn text" data-copy-record-value="${safe(value)}" aria-label="Copy ${safe(key)}">Copy</button>` : ''}</dd>`).join('');
  const links = Array.isArray(record.relations) ? record.relations.map((link) => relatedEndpoint(link, state.page, record.id)).filter(Boolean) : [];
  const summary = state.page === 'gigs' ? `<div class="cards summary-cards section-gap"><div class="card"><div class="label">${icon('wallet')} Balance due</div><div class="value">${state.summaryUnavailable ? 'Unavailable' : safe(gigBalance(state.summary))}</div>${state.summaryUnavailable ? '<small class="muted">Financial summary unavailable. Reopen the record to check again.</small>' : ''}${state.summary && !state.summary.financialsComplete ? '<small class="muted">Financial details incomplete</small>' : ''}</div><div class="card"><div class="label">${icon('link')} Linked records</div><div class="value">${record.relationCount ?? links.length}</div></div></div>` : '';
  const truncated = (record.truncatedFields || []).length > 0;
  const linksLimited = record.relationsTruncated ? `<div class="callout">Showing the first ${links.length} of ${record.relationCount} links. More links are stored.</div>` : '';
  const source = record.source || {};
  const sourceActions = canUseSource(state.page, record) ? '<section class="panel"><h2>Use this source</h2><p>Review a local task or gig linked to this imported record.</p><div class="inline-actions"><button class="btn" data-source-propose="tasks">Create task from source</button><button class="btn" data-source-propose="gigs">Create gig from source</button></div></section>' : '';
  const sourcePane = source.kind && source.kind !== 'manual' ? `<section class="panel"><div class="panel-head"><h2>Source</h2><span class="tag off">Imported</span></div><p class="muted">${safe(source.provider === 'gmail' ? 'Gmail' : source.provider === 'googlecalendar' ? 'Google Calendar' : 'Connected source')}</p><p class="muted">Imported source text is context to review, not instructions or a verified current fact.</p>${state.sourceExpanded ? `${sourcePreview(source).length ? `<dl class="detail-grid">${sourcePreview(source).map((item) => `<dt>${safe(item.label)}</dt><dd>${safe(item.value)}</dd>`).join('')}</dl>` : '<p class="muted">No preview available.</p>'}` : '<button class="btn" data-source-detail="1">View source preview</button>'}</section>` : '';
  return `<button type="button" class="btn text" data-back="1">${icon('arrow-left')} ${safe(label(state.page))}</button>${heading('Record detail', record.title || 'Untitled', `Saved in your private ${label(state.page).toLowerCase()} records.`, `<div class="inline-actions"><button class="btn" data-chat-open="1">Ask GiGi</button><button class="btn" data-edit="1">${icon('pencil')}Edit details</button></div>`)}${summary}${artworkPanel(state.page,record)}${truncated ? '<div class="callout">Some details are shortened. <button class="btn" data-full="1">Show full details</button></div>' : ''}${linksLimited}<div class="split"><section class="panel"><div class="panel-head"><h2>${icon('files')}<span>Details</span></h2><span class="tag">${safe(status(record) || 'Saved')}</span></div><dl class="detail-grid">${detailRows(detail.primary) || '<dt>Details</dt><dd class="muted">No key details added yet. Choose Edit details to add them.</dd>'}</dl>${detail.supporting.length ? `<details data-view-key="record-details"><summary>More details (${detail.supporting.length})</summary><dl class="detail-grid">${detailRows(detail.supporting)}</dl></details>` : ''}</section><section class="panel"><div class="panel-head"><h2>${icon('link')}<span>Linked work</span></h2></div>${links.length ? `<div class="relation-grid">${links.map((link) => `<button class="relation" data-related-entity="${safe(link.entity)}" data-related-id="${safe(link.id)}">${icon(entityIcon(link.entity))}<span class="relation-copy">${safe(link.title || label(link.entity))} <small>${safe(link.role || label(link.entity))}</small></span><span class="arrow" aria-hidden="true">${icon('arrow-up-right')}</span></button>`).join('')}</div>` : `<p class="muted">Connect this record to a person, gig or place to see the full picture.</p>`}<button type="button" class="btn section-gap" data-link="1">${icon('link')}Link a record</button></section></div>${sourceActions}${sourcePane}`;
}

function editor() {
  const name = state.page;
  const current = state.selected || {};
  const currentFields = current.fields || {};
  return `<button type="button" class="btn text" data-cancel="1">${icon('arrow-left')} Back</button>${heading(current.id ? 'Edit record' : 'New record', current.id ? `Edit ${entityName(name)}` : `Add ${entityName(name)}`, name === 'profile' ? 'Set your defaults. Currency cannot change after monetary records are saved.' : 'Save the details you know. Leave uncertain fields empty.')}
  <form id="record-form" class="panel" data-entity="${name}" data-editor-version="${routeVersion}"><div class="form-grid"><div class="field wide"><label for="title">${name === 'contacts' ? 'Name' : 'Title'} <span aria-hidden="true">*</span></label><input id="title" name="title" required maxlength="200" value="${safe(state.editorDraft?.title ?? current.title ?? '')}" autocomplete="off"></div>${(fields[name] || []).map((field) => { const value = currentFields[field] ?? ''; const display = state.editorDraft?.[field] ?? (moneyFields.has(field) && value !== '' ? Number(value) / 100 : value); const selectedValue = state.editorDraft?.[field] ?? value; const id = `field-${field.replace(/\s+/g, '-').toLowerCase()}`; const help = fieldHelp(field, state.currency); const description = help ? `aria-describedby="${id}-help"` : ''; return `<div class="field ${['Description', 'Details', 'Note Details', 'Requirements', 'Venue Intel', 'Summary'].includes(field) ? 'wide' : ''}"><label for="${id}">${safe(field)}</label>${fieldOptions(name, field) ? `<select id="${id}" ${description} name="${safe(field)}" ${field==='Work kind'?'':'required'}><option value="">${field==='Work kind'?'Unclassified':'Choose '+safe(field.toLowerCase())}</option>${fieldOptions(name, field).map((choice) => `<option value="${safe(choice)}" ${selectedValue === choice ? 'selected' : ''}>${safe(choice)}</option>`).join('')}</select>` : name === 'profile' && field === 'Currency' ? `<select id="${id}" ${description} name="Currency" required><option value="">Choose currency</option>${['USD','CAD','EUR','GBP'].map((code) => `<option value="${code}" ${selectedValue === code ? 'selected' : ''}>${code}</option>`).join('')}</select>` : booleanFields.has(`${name}.${field}`) ? `<select id="${id}" ${description} name="${safe(field)}"><option value="">Not set</option><option value="true" ${selectedValue === true || selectedValue === 'true' ? 'selected' : ''}>Yes</option><option value="false" ${selectedValue === false || selectedValue === 'false' ? 'selected' : ''}>No</option></select>` : ['Description', 'Details', 'Note Details', 'Requirements', 'Venue Intel', 'Summary'].includes(field) ? `<textarea id="${id}" ${description} name="${safe(field)}">${safe(display)}</textarea>` : `<input id="${id}" ${description} name="${safe(field)}" value="${safe(display)}" ${moneyFields.has(field) ? 'inputmode="decimal"' : ''} autocomplete="off">`}${help ? `<small id="${id}-help" class="field-help">${safe(help)}</small>` : ''}</div>`; }).join('')}</div><div class="form-actions"><button type="button" class="btn" data-cancel="1">Cancel</button><button class="btn primary" type="submit">Save ${safe(entityName(name))}</button></div></form>`;
}

function linkEditor() {
  const candidates = [...new Set((state.relationSchema?.relationFields || []).map((field) => field.targetEntity))].filter((name) => name !== state.page || state.page === 'tasks');
  const selected = state.linkChoices?.entity || candidates[0];
  const roles = (state.relationSchema?.relationFields || []).filter((field) => field.targetEntity === selected);
  const choices = state.linkChoices?.items || [];
  return `<button class="btn text" data-link-cancel="1">${icon('arrow-left')} Record</button>${heading('Relationship', 'Link this record', 'Choose an existing record in your private workspace.')}<form id="link-form" class="panel" novalidate>${candidates.length ? `<div class="field"><label for="link-entity">Record type</label><select id="link-entity" name="entity">${candidates.map((name) => `<option value="${name}" ${name === selected ? 'selected' : ''}>${safe(label(name))}</option>`).join('')}</select></div><div class="field"><label for="link-role">Relationship</label><select id="link-role" name="role" required>${roles.map((field) => `<option value="${safe(field.name)}">${safe(field.name)}</option>`).join('')}</select></div><div class="field"><label for="link-record">Record</label><select id="link-record" name="id" required><option value="">Choose a record</option>${choices.map((record) => `<option value="${safe(record.id)}">${safe(record.title)}</option>`).join('')}</select></div>${state.linkChoices?.nextCursor ? '<button class="btn" type="button" data-link-more="1">Load more records</button>' : ''}<div class="form-actions"><button class="btn primary" type="button" data-link-submit="1">Link records</button></div>` : '<p class="muted">No available relationship types for this record.</p>'}</form>`;
}

function history() {
  return heading('Activity', 'History', 'Recent changes in this private workspace.') + `<section class="panel">${state.history.length ? `<div class="rows">${state.history.map((item) => {
    const receipt = historyPresentation(item);
    const canOpen = fields[item.entity] && item.recordId;
    return `<${canOpen ? 'button type="button"' : 'div'} class="row" ${canOpen ? `data-open="${safe(item.recordId)}" data-entity="${safe(item.entity)}"` : ''}><span><strong>${safe(receipt.action)}</strong><small>${safe(receipt.detail || label(item.entity || ''))}</small></span><small>${safe(receipt.time)}</small></${canOpen ? 'button' : 'div'}>`;
  }).join('')}</div>` : '<div class="empty"><strong>No activity yet.</strong>Changes to your workspace will appear here.</div>'}</section>`;
}

function sourceCard(provider, title) {
  const source = state.sources[provider] || { state: 'unavailable' };
  const connected = source.state === 'connected' && !sourceSessionBlocked(source);
  const account = source.connectedAccountId || '';
  const attempt = state.sourceAttempts[provider] || null;
  const accountToVerify = pendingAccountForProvider(source, provider) || source.connectedAccountId;
  const consentUrl = sourceSessionBlocked(source) ? null : pendingConsentForProvider(source, state.sourceAttempts, provider);
  const reconnectable = source.state === 'attention' && source.reconnectable === true && !sourceSessionBlocked(source);
  const operatorReview = sourceNeedsOperatorReview(source);
  const pending = source.state === 'pending' && !sourceSessionBlocked(source);
  const run = importRunForAccount(state.imports[provider], account);
  const feedback = sourceView(source);
  return `<div class="step"><span class="number">${icon(provider === 'gmail' ? 'mail' : 'calendar')}</span><div><h3>${title}</h3><p>${safe(feedback.description)}</p>${connected ? `<p class="muted">${source.accountLabel ? `${provider === 'gmail' ? 'Google-verified Gmail address' : 'Google-verified primary calendar'}: <strong>${safe(source.accountLabel.value)}</strong>` : 'Google account label is unavailable. Check status again to confirm the account; your GiGi sign-in email does not identify this Google source.'}</p>` : ''}<p class="muted">${provider === 'gmail' ? 'Turn a booking email into a follow-up task or gig. Each import reads up to 2 messages: sender, subject, date and a short snippet.' : 'Turn an event into a local gig or preparation task. Each import reads up to 10 events from the primary calendar, including dates and event details.'} Connecting does not import records.</p><div class="inline-actions section-gap"><button class="btn" data-source-refresh="${provider}">${icon('refresh-cw')}Check status</button>${sourceCanBegin(source) ? `<button class="btn" data-source-begin="${provider}">${reconnectable ? `Reconnect ${title}` : state.connectionRequests[provider] ? 'Resume connection' : `Connect ${title}`}</button>` : ''}</div>${consentUrl ? `<p class="muted">Consent is pending. Open the hosted consent page in your browser, then return here to verify.</p><p><button class="btn" data-open-consent="${provider}">Open consent page ↗</button></p>` : attempt && pending ? '<p class="muted">Consent started. Check status after completing the browser step.</p>' : ''}${pending && !operatorReview && accountToVerify ? `<button class="btn" data-source-reconcile="${provider}">${icon('circle-check')}Verify connection</button>` : pending && !operatorReview ? '<p class="muted">The account ID is not available yet. Check status after consent; do not start a new connection while this attempt is pending.</p>' : ''}${connected && account ? `<details data-view-key="source-${provider}-account"><summary>Account details</summary><p class="muted">Connected account ID: ${safe(account)}</p></details>` : ''}${source.detail ? `<details data-view-key="source-${provider}-technical"><summary>Technical details</summary><p class="muted">${safe(explain(source.detail))}</p></details>` : ''}<p class="muted">After importing, open a record in ${provider === 'gmail' ? 'Interactions' : 'Schedule'} and choose Create task from source or Create gig from source. Review before saving; the new record stays linked to its source.</p>${connected && account ? sourceImportView(provider, account, state.sourceDrafts[provider], run, state.sourceBusy[provider]) : ''}</div><span class="tag ${connected ? '' : 'off'}">${safe(feedback.label)}</span></div>`;
}
async function sourceAction(provider, action) {
  if (!['gmail','googlecalendar'].includes(provider)) return;
  if (state.sourceBusy[provider] && action !== 'cancel') return;
  const source = state.sources[provider], accountId = source?.connectedAccountId, workspace = workspaceId();
  const current = importRunForAccount(state.imports[provider], accountId);
  if (sourceSessionBlocked(source)) { notice(sourceErrorMessage(source.detail), true); return; }
  if (!accountId || source?.state !== 'connected') { notice('Verify the source account before reading or importing.', true); return; }
  const route = readRoute();
  state.sourceBusy[provider] = action; render();
  try {
    if (action === 'preview' || action === 'fresh') {
      if (sourceImportRunning(current)) throw new Error('Stop the active import or check its receipt before reading another page.');
      const selection = current?.selection || sourceSelection(provider, state.sourceDrafts[provider]);
      const selectionKey = JSON.stringify(selection);
      const cursor = action !== 'fresh' && current?.selectionKey === selectionKey ? current.receipt && current.receipt.state !== 'complete' ? current.receipt.retryCursor || current.cursor : current.receipt?.nextCursor || (!current.receipt && current.preview?.nextCursor) : undefined;
      const preview = await bridge.previewSource(workspace, provider, accountId, selection, cursor);
      if (!currentRoute(route) || state.sources[provider]?.connectedAccountId !== accountId) return;
      state.imports[provider] = { accountId, preview, selection, restoredScope:current?.restoredScope || false, selectionKey, cursor, idempotencyKey: crypto.randomUUID() };
    } else if (action === 'commit') {
      if (!current?.preview || current.receipt) throw new Error('Preview source records before importing.');
      const receipt = await bridge.commitSource(workspace, current.preview.previewId, current.preview.revision, current.idempotencyKey);
      if (state.imports[provider] === current) current.receipt = receipt;
    } else if (action === 'receipt') {
      const jobId = current?.receipt?.jobId || current?.preview?.previewId;
      if (!jobId) throw new Error('No import receipt is available yet.');
      const receipt = await bridge.importStatus(workspace, jobId);
      if (state.imports[provider] === current) current.receipt = receipt;
    } else if (action === 'cancel') {
      const previewId = current?.preview?.previewId || current?.receipt?.previewId || current?.receipt?.jobId;
      if (!previewId) throw new Error('No preview or import is available to stop.');
      const receipt = await bridge.cancelImport(workspace, previewId);
      if (state.imports[provider] === current) { current.receipt = receipt; delete current.preview; }
    }
  } catch (error) { if (currentRoute(route)) notice(explain(error), true); }
  finally { if (state.sourceBusy[provider] === action) delete state.sourceBusy[provider]; render(); }
}

function agentSetup() {
  const claude = state.agentProvider === 'claude';
  const provider = claude ? 'Claude Code' : 'Codex';
  const command = claude ? state.agent?.claudeCommand : state.agent?.codexCommand;
  return `<section class="panel" id="agent-setup"><div class="panel-head"><h2>${icon('terminal')}<span>External agent connection</span></h2><small>Optional</small></div><p class="muted">Connect this workspace to a separate Codex or Claude Code session. These steps are not required for built-in Ask GiGi. Use an eligible subscription account in the agent on this Mac. GiGi does not supply model tokens or require a model API key for this beta.</p><details data-view-key="external-agent-setup"><summary>Connect an external Codex or Claude Code session</summary><fieldset class="provider-choice"><legend>Choose your agent</legend><div class="inline-actions"><button type="button" class="btn" data-agent-provider="codex" aria-pressed="${!claude}">Codex</button><button type="button" class="btn" data-agent-provider="claude" aria-pressed="${claude}">Claude Code</button></div></fieldset>
    <details data-view-key="agent-walkthrough" class="agent-walkthrough" ${state.agentReceipt?.lastCall ? '' : 'open'}><summary>${state.agentReceipt?.lastCall ? 'Review agent setup steps' : 'Set up and verify your agent'}</summary><ol class="setup-instructions"><li><strong>Sign in to ${provider} on this Mac.</strong> ${claude ? 'Have Claude Code available in Terminal and sign in with your Claude subscription account.' : 'Have the Codex CLI available in Terminal and sign in with your ChatGPT account. The setup guide explains installation and sign-in.'} <button class="btn text" data-help="${claude ? 'claude-setup' : 'codex-setup'}">Open ${provider} setup guide ↗</button></li><li><strong>Prepare GiGi’s connector.</strong> This creates commands for this workspace; it does not install or connect the agent for you.<div class="inline-actions"><button class="btn" data-prepare-agent="1">${icon('terminal')}${state.agentReceipt?.prepared || state.agent ? 'Show setup commands' : 'Prepare GiGi connector'}</button></div></li><li><strong>${claude ? 'Start Claude with GiGi.' : 'Register GiGi with Codex.'}</strong> ${claude ? 'Run the command below in Terminal. It loads GiGi for that Claude session. Use this command again for future GiGi sessions.' : 'Run the command below in Terminal, then open a new local Codex session on this Mac. Restart an already-open desktop host if it has not picked up the connector.'}${command ? `<pre class="config" id="agent-command">${safe(command)}</pre><button class="btn" data-copy-agent="command">${icon('copy')}Copy ${provider} command</button>` : '<p>Prepare the connector to reveal your exact command.</p>'}</li><li><strong>Verify a real tool call.</strong> Check the agent’s MCP connections with <code>/mcp</code>, then send this prompt in that session. Confirm it returns this workspace’s name and ID before asking it to change records.${state.agent?.starterPrompt ? `<pre class="config prompt" id="agent-prompt">${safe(state.agent.starterPrompt)}</pre><div class="inline-actions"><button class="btn" data-copy-agent="prompt">${icon('copy')}Copy verification prompt</button><button class="btn" data-source-refresh="agent">${icon('refresh-cw')}Check local tool status</button></div>` : '<p>The verification prompt appears after preparing the connector.</p>'}</li></ol></details>
    ${claude ? '' : agentPreflightView(state.agentPreflight,state.busy)}
    ${state.agentReceipt?.lastCall ? `<p class="tool-receipt muted">Last local GiGi tool: ${safe(state.agentReceipt.lastCall.tool)} at ${safe(new Date(state.agentReceipt.lastCall.lastToolAt * 1000).toLocaleString())}. This is local tool-use evidence; confirm the result in your agent. Phone access still needs its own test.</p>` : '<p class="tool-receipt muted">No local tool call recorded yet. Preparing commands does not verify the connection.</p>'}
    </details><details data-view-key="agent-expectations"><summary>What to expect when working with your agent</summary><ul class="setup-instructions"><li>Ask for a specific gig, contact or task. GiGi’s compact skill and bounded tools help the agent retrieve only the context it needs.</li><li>Ask the agent to read first and confirm the workspace. Review proposed changes before approving them; edits update the local records you see in GiGi.</li><li>Model usage is handled by your provider account. Your subscription’s eligibility, limits and availability apply. GiGi has no paid model API fallback.</li><li>If the agent is unavailable or at its subscription limit, keep working directly in GiGi and reconnect the agent later.</li><li>Local records stay on this Mac. Information retrieved by the agent is processed by the provider you use; imported source text is context to review.</li></ul></details>
    ${state.agent ? `<details data-view-key="agent-files"><summary>Advanced connector files</summary><p class="backup-code">Package: ${safe(state.agent.packagePath)}</p>${state.agent.skillPath ? `<p class="backup-code">Skill: ${safe(state.agent.skillPath)}</p>` : ''}<pre class="config">${safe(typeof state.agent.mcpConfig === 'string' ? state.agent.mcpConfig : JSON.stringify(state.agent.mcpConfig, null, 2))}</pre></details>` : ''}</section>`;
}

function settings() {
  const journey = sourceJourney(state.sources, state.sourceAttempts);
  const sourceStates = Object.values(state.sources);
  const sourceSignInNeeded = !sourceStates.some(sourceSessionBlocked) && (state.sourceSignedOut || !sourceStates.some(source => source?.detail === 'access_denied') && (sourceStates.some(source => ['session_expired','reauthentication_required','unauthorized'].includes(source?.detail)) || !sourceStates.some(source => ['connected','pending'].includes(source?.state))));
  return heading('Workspace', 'Setup & safety', 'Review what is ready, what still needs your consent, and how to protect your local data.') +
    `${state.justCreated ? `<div class="callout setup-welcome"><strong>Your private workspace is ready.</strong><p>Connect sources and an agent below, or start with a record. You can return to Settings at any time.</p><button class="btn" data-new="gigs">${icon('plus')}Start with a gig</button></div>` : ''}` +
    builtInChatSetup(state.setupChatStatus, state.setupChatFailed) + aiConnectionView() + `<section class="setup-checklist"><div class="panel-head"><h2>Choose your next step</h2><small>Connections are optional</small></div><button class="btn section-gap" data-page="overview">Continue with local records ${icon('arrow-up-right')}</button><p class="muted">${safe(setupSummary(state).nextStep)}</p><div class="steps">${setupSummary(state).steps.map((step, index) => `<div class="step"><span class="number">${index + 1}</span><div><h3>${safe(step.title)}</h3><p>${safe(step.description)}</p>${step.href ? `<a class="setup-link" href="${step.href}">Open ${step.id === 'agent' ? 'agent setup' : step.id === 'phone' ? 'phone guide' : 'source setup'} ↓</a>` : ''}</div><span class="tag ${step.id === 'workspace' ? '' : 'off'}">${safe(step.label)}</span></div>`).join('')}</div></section>
    <section class="panel" id="source-connections"><div class="panel-head"><h2>${icon('unplug')}<span>Source connections</span></h2><small>Separate consent required</small></div><p class="muted">Your local workspace needs no login. GiGi source sign-in confirms access to this app. Google consent connects the Google account you choose; it may be different from your GiGi sign-in.</p><details data-view-key="source-stages"><summary>How source setup works</summary><ol class="welcome-plan" aria-label="Source setup stages">${journey.stages.map((title, index) => `<li ${index === journey.current ? 'aria-current="step"' : ''}><strong>${safe(title)}</strong>${index === journey.current ? '<span>Current step</span>' : ''}</li>`).join('')}</ol></details><p role="status">${safe(journey.next)}</p>${sourceSignInNeeded ? `<button class="btn" data-sign-in="1" ${state.signingIn ? 'disabled' : ''}>${state.signingIn ? 'Waiting for browser sign-in…' : 'Sign in to GiGi sources'}</button>` : ''}${state.sourceSignedOut ? '<p class="muted" role="status">Signed out of GiGi sources on this Mac. Google consent and imported records are unchanged.</p>' : `<div class="source-session section-gap"><button class="btn text" data-source-sign-out="1" ${state.signingIn || state.signingOut || Object.keys(state.sourceBusy).length || Object.values(state.imports).some(sourceImportRunning) ? 'disabled' : ''}>${state.signingOut ? 'Signing out…' : 'Sign out of GiGi sources'}</button><p class="muted">Clears source sign-in on this Mac. Keeps Google consent and imported records.</p></div>`}<details data-view-key="source-permissions"><summary>What connecting and importing allow</summary><p>Review the Google consent screen before continuing. The configured Google grants are broader than read-only. GiGi’s source workflow uses them only to read source identity and the bounded pages described below; it does not send email, modify calendars or invite anyone.</p><p>Return here after consent, choose Check status, then Verify connection if shown. Once Account verified appears, review the Google identity and preview a source page. Preview reads a bounded selection without adding local records. Import reviewed records saves that selection. Your agent can use the same scoped read and import tools when you ask. You can skip sources and keep working with local records.</p></details><div class="steps section-gap">${sourceCard('gmail', 'Gmail')}${sourceCard('googlecalendar', 'Google Calendar')}</div><p class="muted">If a connection needs operator help, <a href="#source-diagnostics">record local diagnostics below</a>, then review the report before sharing it.</p></section>
    ${diagnosticsView(state.diagnostics, state.busy)}
    ${agentSetup()}
    <section class="panel" id="phone-access"><div class="panel-head"><h2>${icon('smartphone')}<span>Use GiGi from your phone</span></h2><span class="tag off">Optional · Separate test</span></div><p class="muted">Phone access connects to an agent session on this Mac. It is available only when your provider and account support remote access. A normal mobile chat does not connect to GiGi by itself.</p><details data-view-key="phone-expectations"><summary>Phone setup and offline expectations</summary><ol class="setup-instructions"><li><strong>Connect to this Mac.</strong> For Codex, use the ChatGPT desktop remote setup and the same account/workspace on your phone. For Claude Code, start the GiGi-enabled session above, then use <code>/remote-control</code> inside that session and open its phone link.</li><li><strong>Keep the host available.</strong> Keep this Mac awake, online and signed in, with the provider’s desktop host or Claude session running. GiGi’s local connector must remain installed.</li><li><strong>Test over cellular.</strong> Turn phone Wi-Fi off and send the verification prompt above. Confirm the correct workspace before requesting an edit. A local tool receipt alone cannot prove a phone connection.</li><li><strong>If the Mac goes offline.</strong> A request may wait or fail. Reconnect and check the record before retrying an edit, so a completed change is not repeated.</li></ol><div class="inline-actions"><button class="btn" data-help="codex-remote">Codex remote guide ↗</button><button class="btn" data-help="claude-remote">Claude remote guide ↗</button></div></details></section>
    <section class="panel"><div class="panel-head"><h2>${icon('shield-check')}<span>Backup & restore</span></h2></div><p class="muted">Create a local recovery point before major changes. Restore replaces the active workspace with a chosen backup.</p><div class="inline-actions"><button class="btn" data-backup="1">${icon('download')}Create backup</button><button class="btn" data-restore-toggle="1" ${state.busy ? 'disabled' : ''}>${icon('history')}Restore backup</button></div>${state.backupId ? `<span class="backup-code">Backup ID: ${safe(state.backupId)}</span>` : ''}${state.pendingRestoreId ? `<div class="callout section-gap" role="group" aria-label="Confirm restore"><strong>Confirm restore</strong><p>The current workspace will be replaced with backup ${safe(state.pendingRestoreId)}. GiGi will save a safety backup first.</p><div class="inline-actions"><button type="button" class="btn danger" data-confirm-restore="1" ${state.busy ? 'disabled' : ''}>Restore this backup</button><button type="button" class="btn" data-cancel-restore="1" ${state.busy ? 'disabled' : ''}>Cancel</button></div></div>` : '<form id="restore-form" class="section-gap" hidden><div class="field"><label for="backup-id">Backup ID</label><input id="backup-id" name="backupId" required autocomplete="off"></div><button class="btn danger" type="submit">Continue to confirmation</button></form>'}</section>
    <section class="panel"><div class="panel-head"><h2>${icon('database')}<span>Source context</span></h2><button class="btn" data-context-sync="1">${icon('refresh-cw')}Sync local history</button></div><p class="muted">Search supporting CTX history from this workspace. Current records and calculations remain in the local database. Each result shows its source session.</p><form id="context-form" class="inline-actions section-gap"><input id="context-query" class="compact-input" name="query" aria-label="Search history" placeholder="Search local history" required maxlength="160"><button class="btn" type="submit">Search</button></form>${state.contextQueried ? state.contextHits.length ? `<div class="rows section-gap">${state.contextHits.map((hit) => `<div class="row"><span><strong>${safe(hit.snippet)}</strong><small>Source: ${safe(hit.provider)} · session ${safe(hit.sessionId)}</small></span></div>`).join('')}</div>` : '<p class="muted section-gap">No matching history in this workspace.</p>' : ''}</section>`;
}
function onboarding() {
  const resume = Boolean(state.workspace);
  return `<div class="setup"><span class="brand-mark">g.</span><p class="eyebrow">Welcome to GiGi</p><h1>${resume ? 'Finish your profile.' : 'Your work, in one place.'}</h1><p class="subhead">${resume ? 'Your private workspace is ready. Add your profile to finish setup.' : 'Build a private home for gigs, shifts, contacts, money and the details that connect them. Your records live on this Mac. No login is needed to start; connect sources and your subscribed agent when ready.'}</p><ol class="welcome-plan" role="list"><li><strong>${resume ? 'Finish your profile' : 'Create your workspace'}</strong><span>Private local records for your gigs, people and money.</span></li><li><strong>Connect sources, if useful</strong><span>Separate GiGi sign-in and Google consent; import when you choose.</span></li><li><strong>Use your own agent</strong><span>Connect Codex or Claude Code on this Mac, then test a real tool call.</span></li></ol><form id="workspace-form" class="panel"><h2>${resume ? 'Your profile' : 'Make it yours'}</h2><p class="muted">${resume ? 'Choose your currency carefully. You can change other defaults later, but currency locks after you save monetary records.' : 'Start with your name and workspace. Choose your currency carefully: it locks after you save monetary records. Connect sources later.'}</p><div class="form-grid section-gap"><div class="field"><label for="owner-name">Your name</label><input id="owner-name" name="ownerName" required maxlength="80" placeholder="Your name" value="${safe(state.setupDraft?.ownerName || '')}" autocomplete="name" ${state.busy ? 'disabled' : ''}></div>${resume ? '' : `<div class="field"><label for="workspace-name">Workspace name</label><input id="workspace-name" name="name" required maxlength="80" placeholder="e.g. Danny’s work" value="${safe(state.setupDraft?.name || '')}" autocomplete="off" ${state.busy ? 'disabled' : ''}></div>`}<div class="field"><label for="currency">Currency</label><select id="currency" name="currency" required ${state.busy ? 'disabled' : ''}><option value="">Choose currency</option><option value="USD" ${state.setupDraft?.currency === 'USD' ? 'selected' : ''}>USD</option><option value="CAD" ${state.setupDraft?.currency === 'CAD' ? 'selected' : ''}>CAD</option><option value="EUR" ${state.setupDraft?.currency === 'EUR' ? 'selected' : ''}>EUR</option><option value="GBP" ${state.setupDraft?.currency === 'GBP' ? 'selected' : ''}>GBP</option></select></div></div><div class="form-actions"><button type="submit" class="btn primary" ${state.busy ? 'disabled' : ''}>${state.busy ? 'Saving workspace…' : resume ? 'Finish setup' : 'Create private workspace'} →</button></div></form><p class="section-gap"><small>Gmail, Calendar and agent access are optional setup steps that require separate verification.</small></p></div>${state.toast ? `<div class="toast ${state.toast.error ? 'error' : ''}" role="status">${safe(state.toast.message)}</div>` : ''}`;
}

function captureEditorDraft() {
  const form = root.querySelector?.('#record-form');
  if (state.editing !== true || !form || form.dataset.editorVersion !== String(routeVersion)) return null;
  state.editorDraft = Object.fromEntries(new FormData(form));
  const active = globalThis.document?.activeElement;
  return { x: globalThis.scrollX || 0, y: globalThis.scrollY || 0,
    focus: active?.form === form && active.id ? { id: active.id, start: active.selectionStart, end: active.selectionEnd, direction: active.selectionDirection, scrollTop: active.scrollTop } : null };
}

function render() {
  const view = [workspaceId(), state.setupProfile, routeVersion, state.page, state.editing, state.selected?.id, sourceProposal?.phase].join('|');
  const gigsCriteria = state.page === 'gigs' && !state.selected && !state.editing ? JSON.stringify([gigs.state?.criteria, gigs.state?.scrollRevision]) : null;
  const gigsPosition = gigsCriteria !== null ? view === renderedView && gigsCriteria === renderedGigsCriteria ? globalThis.scrollY || 0 : gigs.state?.scroll || 0 : null;
  renderedGigsCriteria = gigsCriteria;
  const viewState = view === renderedView ? captureViewState(root) : null;
  renderedView = view;
  const editorPosition = captureEditorDraft();
  root.classList.toggle('loading', state.busy);
  if (!state.workspace || state.setupProfile) { root.innerHTML = onboarding(); restoreViewState(root, viewState); return; }
  let body;
  if (sourceProposal) body = sourceProposalView(sourceProposal, state.busy);
  else if (state.editing === 'link') body = linkEditor();
  else if (state.editing) body = editor();
  else if (state.selected) body = recordDetail();
  else if (['music','social'].includes(state.page)) body = '<div id="creator-workspace"></div>';
  else if (state.page === 'overview') body = overview();
  else if (state.page === 'history') body = history();
  else if (state.page === 'settings') body = settings();
  else body = collection();
  const composer = globalThis.document?.activeElement?.id === 'chat-message' ? globalThis.document.activeElement : null;
  const selection = composer ? { start: composer.selectionStart, end: composer.selectionEnd, scrollTop: composer.scrollTop } : null;
  const transcript = root.querySelector?.('.chat-transcript');
  const transcriptPosition = transcript ? { top: transcript.scrollTop, stick: transcript.scrollHeight - transcript.scrollTop - transcript.clientHeight < 48 } : null;
  root.innerHTML = shell(body);
  if (['music','social'].includes(state.page)) {
    const placeholder=root.querySelector?.('#creator-workspace');
    const key=workspaceId()+':'+state.page;
    if (placeholder && creatorNode && creatorRoute===key) placeholder.replaceWith(creatorNode);
    else if (placeholder) {
      creatorNode=placeholder; creatorRoute=key;
      creatorMount=(state.page==='music'?mountMusic:mountSocial)(creatorNode,{call:bridge.call,workspaceId:workspaceId(),onError:(error)=>notice(explain(error),true)});
    }
  }
  if (state.editing === true) {
    const form = root.querySelector?.('#record-form');
    if (form && editorBaseline?.version !== routeVersion) editorBaseline = { version: routeVersion, values: Object.fromEntries(new FormData(form)) };
  } else editorBaseline = null;
  renderedChatSession = chat?.current?.sessionId ?? null;
  restoreViewState(root, viewState);
  // WebKit may clamp window scroll while innerHTML replaces the collection.
  if (gigsPosition !== null) globalThis.scrollTo?.(0, gigsPosition);
  if (chat) chat.opening = false;
  if (editorPosition) {
    const focus = editorPosition.focus;
    const control = focus ? root.querySelector?.(`#${focus.id}`) : null;
    control?.focus?.({ preventScroll: true });
    if (control && Number.isInteger(focus.start) && Number.isInteger(focus.end)) control.setSelectionRange?.(focus.start, focus.end, focus.direction);
    if (control) control.scrollTop = focus.scrollTop;
    globalThis.scrollTo?.(editorPosition.x, editorPosition.y);
  }
  if (selection) {
    const nextComposer = root.querySelector?.('#chat-message');
    nextComposer?.focus?.();
    nextComposer?.setSelectionRange?.(selection.start, selection.end);
    if (nextComposer) nextComposer.scrollTop = selection.scrollTop;
  }
  if (transcriptPosition) {
    const nextTranscript = root.querySelector?.('.chat-transcript');
    if (nextTranscript) nextTranscript.scrollTop = transcriptPosition.stick ? nextTranscript.scrollHeight : transcriptPosition.top;
  }
  if (pendingLeave) root.querySelector?.('[data-keep-editing]')?.focus?.();
  const linkButton = root.querySelector?.('[data-link-submit]');
  linkButton?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation?.();
    const entity = root.querySelector('#link-entity');
    const role = root.querySelector('#link-role');
    const record = root.querySelector('#link-record');
    if (!entity || !role || !record) { notice('Link fields are unavailable. Reopen the record and retry.', true); return; }
    submitLink({ entity: entity.value, role: role.value, id: record.value });
  });

}

function renderChat() {
  const panel = root.querySelector?.('.chat-panel');
  if (!chat?.visible) {
    if (panel?.remove) { panel.remove(); return; }
    render(); return;
  }
  if (!panel) {
    const shellNode = root.querySelector?.('.shell');
    if (shellNode?.insertAdjacentHTML) {
      shellNode.insertAdjacentHTML('beforeend', chatView(chat));
      renderedChatSession = chat?.current?.sessionId ?? null;
      chat.opening = false;
      root.querySelector?.('[data-chat-close]')?.focus?.();
      return;
    }
    render(); root.querySelector?.('[data-chat-close]')?.focus?.(); return;
  }
  const composer = globalThis.document?.activeElement?.id === 'chat-message' ? globalThis.document.activeElement : null;
  const selection = composer ? { start: composer.selectionStart, end: composer.selectionEnd, scrollTop: composer.scrollTop } : null;
  const transcript = panel.querySelector?.('.chat-transcript');
  const transcriptPosition = transcript ? { top: transcript.scrollTop, stick: transcript.scrollHeight - transcript.scrollTop - transcript.clientHeight < 48 } : null;
  const activeAction = ['chatClose','chatRefresh','chatSetup','chatNew','chatStop'].find(key => globalThis.document?.activeElement?.dataset?.[key] !== undefined);
  const session = chat?.current?.sessionId ?? null;
  const viewState = session === renderedChatSession ? captureViewState(panel) : null;
  panel.innerHTML = chatView(chat, true);
  renderedChatSession = session;
  restoreViewState(panel, viewState);
  if (activeAction) { const attr = activeAction.replace(/[A-Z]/g, letter => '-'+letter.toLowerCase()); root.querySelector?.(`[data-${attr}]`)?.focus?.(); }
  if (selection) {
    const nextComposer = panel.querySelector?.('#chat-message');
    nextComposer?.focus?.(); nextComposer?.setSelectionRange?.(selection.start, selection.end);
    if (nextComposer) nextComposer.scrollTop = selection.scrollTop;
  }
  if (transcriptPosition) {
    const nextTranscript = panel.querySelector?.('.chat-transcript');
    if (nextTranscript) nextTranscript.scrollTop = transcriptPosition.stick ? nextTranscript.scrollHeight : transcriptPosition.top;
  }
}

function focusChatTrigger() {
  const mobile = globalThis.matchMedia?.('(max-width: 700px)')?.matches;
  root.querySelector?.(mobile ? '.mobile-chat-entry' : '[data-chat-open]')?.focus?.();
}

async function loadLinkChoices(entity, cursor) {
  const route = cursor ? readRoute() : nextRoute();
  const old = cursor && state.linkChoices?.entity === entity ? state.linkChoices.items : [];
  const result = await bridge.listRecords(route.workspace, entity, cursor);
  if (!currentRoute(route)) return;
  state.linkChoices = { entity, items: [...old, ...listFrom(result)], nextCursor: result?.nextCursor || null };
  render();
}

async function enterLinkEditor() {
  const route = nextRoute();
  const schema = await bridge.describeSchema(route.page);
  if (!currentRoute(route)) return;
  const first = schema.relationFields?.[0]?.targetEntity;
  const result = first ? await bridge.listRecords(route.workspace, first) : null;
  if (!currentRoute(route)) return;
  state.relationSchema = schema;
  state.linkChoices = first ? { entity: first, items: listFrom(result), nextCursor: result?.nextCursor || null } : null;
  state.editing = 'link'; render();
}

async function loadMore() {
  if(state.page==='contacts'){
    if(state.contactSearching||state.selected||state.editing||!state.nextCursor)return;
    const route=readRoute(),version=++contactSearchVersion,cursor=state.nextCursor,records=state.records,query=state.contactQuery;
    state.contactSearching=true;state.contactSearchError=false;render();
    try{const result=await contactRead.read(()=>bridge.listRecords(route.workspace,'contacts',cursor,query));
      if(!currentRoute(route)||version!==contactSearchVersion)return;
      state.records=[...records,...listFrom(result)];state.nextCursor=result?.nextCursor||null;state.recordCount=result?.count??state.recordCount;
    }catch(error){if(!currentRoute(route)||version!==contactSearchVersion||error?.code==='contact_read_superseded')return;state.contactSearchError=error?.code==='contact_read_timeout'?'timeout':true;}
    finally{if(currentRoute(route)&&version===contactSearchVersion){state.contactSearching=false;render();}}
    return;
  }
  const route = nextRoute(), cursor = state.nextCursor, records = state.records, searchVersion = contactSearchVersion;
  const result = await bridge.listRecords(route.workspace, route.page, cursor, route.page === 'contacts' ? state.contactQuery : undefined);
  if (!currentRoute(route)) return;
  if (route.page === 'contacts' && searchVersion !== contactSearchVersion) return;
  state.records = [...records, ...listFrom(result)]; state.nextCursor = result?.nextCursor || null; state.recordCount = result?.count ?? state.recordCount;
}

function submitLink(data) {
  if (state.busy) { notice('Please wait for the current action to finish.', true); return; }
  if (state.editing !== 'link' || !state.selected?.id) { notice('Link view changed. Reopen the record and retry.', true); return; }
  let input;
  try { input = linkInput(data, state.page, state.selected.id); }
  catch (error) { notice(explain(error), true); return; }
  const route = readRoute();
  void run(async () => {
    await bridge.linkRecords(route.workspace, input.fromEntity, input.fromId, input.toEntity, input.toId, input.role);
    if (!currentRoute(route)) return;
    state.editing = false;
    if (!await selectRecord(input.fromId, input.fromEntity)) return;
    notice('Records linked.');
  });
}

async function findPeople() {
  if(!protectEditor(()=>void run(findPeople))) return;
  if(await openPage('contacts',true)) root.querySelector?.('#contact-search')?.focus?.();
}

root.addEventListener('click', (event) => {
  const button = event.target.closest('button'); if (!button) return;
  if(button.dataset.agentPreflight){
    if(state.busy)return;
    const route=readRoute(),x=globalThis.scrollX||0,y=globalThis.scrollY||0;
    const restore=()=>{if(currentRoute(route)){root.querySelector?.('[data-agent-preflight]')?.focus?.({preventScroll:true});globalThis.scrollTo?.(x,y);}};
    const pending=run(async()=>{try{const value=await bridge.call('agent.preflight',{});if(currentRoute(route))state.agentPreflight=value;}catch(error){if(currentRoute(route))state.agentPreflight={error:explain(error)};}});
    restore();void pending.finally(restore);
  }
  else if(button.dataset.gigsView)gigs.update({view:button.dataset.gigsView,...(button.dataset.gigsView==='needs_date'?{from:'',to:''}:{})},false);
  else if(button.dataset.gigsReset)gigs.reset();
  else if(button.dataset.gigsRefresh)void gigs.refresh();
  else if(button.dataset.gigsMore)void gigs.more();
  else if (button.dataset.clearContacts) { searchContacts('', true); root.querySelector?.('#contact-search')?.focus?.(); }
  else if (button.dataset.retryContacts) searchContacts(state.contactQuery, true);
  else if (button.dataset.keepEditing) { keepEditing(); }
  else if (button.dataset.discardChanges) { const next = pendingLeave; pendingLeave = null; state.editing = false; state.editorDraft = null; editorBaseline = null; next?.(); }
  else if (pendingLeave) return;
  else if (button.dataset.copyRecordValue) {
    const value = button.dataset.copyRecordValue;
    if (!globalThis.navigator?.clipboard?.writeText) { notice('Select the value and copy it manually.', true); return; }
    void navigator.clipboard.writeText(value).then(() => notice('Copied to clipboard.')).catch(() => notice('Select the value and copy it manually.', true));
  }
  else if (button.dataset.sourcePropose) {
    if (state.busy) return;
    const route = readRoute(), selected = state.selected;
    void run(async () => {
      const record = await bridge.getRecord(route.workspace, route.page, selected.id, 'full');
      if (!currentRoute(route) || state.selected?.id !== selected.id) return;
      sourceProposal = sourceDraft(route.workspace, route.page, record, button.dataset.sourcePropose);
      render();
    });
  }
  else if (button.dataset.sourceEdit) {
    if (!state.busy && sourceProposal?.phase === 'review') {
      sourceProposal = { ...sourceProposal, phase: 'draft', payload: undefined }; render();
      root.querySelector?.('#source-proposal-title')?.focus?.();
    }
  }
  else if (button.dataset.diagnostics) {
    const action = button.dataset.diagnostics;
    if (state.busy) return;
    if (action === 'copy') {
      const path = state.diagnostics.exported?.path;
      if (!path || !globalThis.navigator?.clipboard?.writeText) { notice('Select the export path and copy it manually.', true); return; }
      void navigator.clipboard.writeText(path).then(() => notice('Export path copied. Nothing was sent.')).catch(() => notice('Select the export path and copy it manually.', true));
      return;
    }
    if (!['status', 'start', 'stop', 'review', 'export', 'delete'].includes(action)) return;
    const status = state.diagnostics.status;
    if (action === 'start' && (typeof status?.enabled !== 'boolean' || status.enabled || status.eventCount)) return;
    if (action === 'review' && (!status || status.enabled)) return;
    if (action === 'export' && (!state.diagnostics.review?.reviewToken || status?.enabled)) return;
    void run(async () => {
      const result = await bridge.call(`diagnostics.${action}`, action === 'export' ? { reviewToken: state.diagnostics.review.reviewToken } : {});
      if (action === 'export') {
        if (typeof result?.path !== 'string' || !result.path) throw new Error('The diagnostic export could not be confirmed. Review and try again.');
        state.diagnostics.exported = { path: result.path };
        notice('Diagnostic report exported locally. Nothing was sent.');
      } else {
        state.diagnostics.status = result;
        state.diagnostics.review = action === 'review' ? result : null;
        state.diagnostics.exported = null;
        if (action === 'start') notice('Local capture started. Repeat the source action, then stop and review.');
        if (action === 'stop') notice('Capture stopped. Review diagnostics before exporting.');
        if (action === 'delete') notice('Diagnostics and GiGi’s local export deleted. Shared copies are unaffected.');
      }
    });
  }
  else if (button.dataset.sourceCancel) { if (!state.busy) { sourceProposal = null; render(); } }
  else if (button.dataset.sourceApprove) {
    if (state.busy || !sourceProposal?.payload) return;
    const proposal = sourceProposal, route = readRoute();
    proposal.phase = 'submitted';
    void run(async () => {
      const result = await bridge.call('records.save', proposal.payload);
      if (!result?.id || !['created', 'existing'].includes(result.sourceProposal?.outcome)) throw new Error('Save receipt could not be verified. Retry this exact proposal.');
      const saved = await bridge.getRecord(route.workspace, proposal.entity, result.id, 'full');
      const origin = saved.source?.kind === 'manual' ? saved.source.origin : saved.source;
      const expected = proposal.sourceRecord.expectedRecord.source;
      if (saved.workspaceId !== route.workspace || saved.entity !== proposal.entity || !['provider','connectedAccountId','collectionId','externalId'].every(key => origin?.[key] === expected[key])) throw new Error('Saved source could not be verified. Retry this exact proposal.');
      if (!saved.relations?.some(link => { const endpoint = relatedEndpoint(link, proposal.entity, saved.id); return endpoint?.entity === proposal.sourceRecord.entity && endpoint.id === proposal.sourceRecord.id; })) throw new Error('Source link could not be verified. Retry this exact proposal.');
      if (!currentRoute(route) || sourceProposal !== proposal) return;
      sourceProposal = null;
      await navigateRecord(proposal.entity, result.id);
      notice(result.sourceProposal.outcome === 'existing' ? 'Opened the existing record from this source. Your edits were preserved.' : 'Local record created and linked to its source.');
    });
  }
  else if (button.dataset.scheduleView) { state.scheduleView = button.dataset.scheduleView; render(); }
  else if (button.dataset.scheduleToday) { state.scheduleView = 'upcoming'; render(); root.querySelector('#schedule-today')?.scrollIntoView?.({ block: 'start' }); }
  else if (button.dataset.chatOpen) void chat?.open(state.selected && !state.editing ? { entity: state.page, id: state.selected.id, title: state.selected.title } : null);
  else if (button.dataset.chatRefresh) {
    button.focus?.();
    const request = {}; chatRefreshFocus = request;
    void chat?.checkStatus().finally(() => {
      const active = globalThis.document?.activeElement;
      if (chatRefreshFocus === request && chat?.visible && (!active || active === document.body || active === document.documentElement || active.dataset?.chatRefresh !== undefined)) root.querySelector?.('[data-chat-refresh]')?.focus?.();
      if (chatRefreshFocus === request) chatRefreshFocus = null;
    });
  }
  else if (button.dataset.setupChatRefresh) void run(async () => {
    const route = readRoute(); state.setupChatStatus = null; state.setupChatFailed = false; render();
    try { const status = await bridge.chatStatus(route.workspace); if (currentRoute(route)) state.setupChatStatus = status; }
    catch { if (currentRoute(route)) state.setupChatFailed = true; }
  });
  else if (button.dataset.chatSetup) { chat?.close(); void run(() => openPage('settings')); }
  else if (button.dataset.chatClose) { chat?.close(); focusChatTrigger(); }
  else if (button.dataset.chatNew) void chat?.start();
  else if (button.dataset.chatSession) void chat?.read(button.dataset.chatSession);
  else if (button.dataset.chatStop) void chat?.cancel();
  else if (button.dataset.chatApproval) void chat?.decide(button.dataset.chatApproval, button.dataset.chatDecision);
  else if (button.dataset.chatLinkEntity) void run(() => navigateRecord(button.dataset.chatLinkEntity, button.dataset.chatLinkId));
  else if (button.dataset.findPeople) void run(findPeople);
  else if (button.dataset.workspaceHistory) { const target=workspaceHistory.target(Number(button.dataset.workspaceHistory)); if(target) void run(()=>openPage(target.page,true,target.index)); }
  else if (button.dataset.page) void run(() => openPage(button.dataset.page, true));
  else if (button.dataset.new) newRecord(button.dataset.new);
  else if (button.dataset.open) void run(() => navigateRecord(button.dataset.entity, button.dataset.open));
  else if (button.dataset.cancel) void cancelEditor();
  else if(button.dataset.back&&state.page==='gigs'){if(!protectEditor(()=>void run(()=>openPage('gigs'))))return;leaveRoute();state.selected=null;state.editing=false;state.editorDraft=null;state.editorOrigin=null;void gigs.open(workspaceId()).then(()=>{if(state.page==='gigs'&&!state.selected&&!state.editing){render();Array.from(root.querySelectorAll?.('[data-open]')||[]).find(row=>row.dataset.open===gigs.state?.focusId)?.focus?.({preventScroll:true});globalThis.scrollTo?.(0,gigs.state?.scroll||0);}});}
  else if (button.dataset.back && state.page === 'contacts') void run(() => openPage('contacts'));
  else if (button.dataset.back) { if (!protectEditor(() => void run(() => openPage(state.page)))) return; leaveRoute(); state.selected = null; state.editing = false; state.editorDraft = null; state.editorOrigin = null; render(); globalThis.scrollTo?.(0, 0); }
  else if (button.dataset.edit) void enterEditor();
  else if (button.dataset.full) void run(() => refreshSelected());
  else if (button.dataset.sourceDetail) void run(() => refreshSelected(true));
  else if (button.dataset.link) void run(() => enterLinkEditor());
  else if (button.dataset.linkMore) void run(() => loadLinkChoices(state.linkChoices.entity, state.linkChoices.nextCursor));
  else if (button.dataset.linkCancel) { leaveRoute(); state.editing = false; render(); }
  else if (button.dataset.relatedEntity) void run(() => navigateRecord(button.dataset.relatedEntity, button.dataset.relatedId));
  else if (button.dataset.backup) void run(async () => { const result = await bridge.createBackup(workspaceId()); state.backupId = result?.backupId || result?.id || String(result); notice('Backup created. Keep its ID in a safe place.'); });
  else if (button.dataset.more) void run(() => loadMore());
  else if (button.dataset.agentProvider) { if (['codex','claude'].includes(button.dataset.agentProvider)) { state.agentProvider = button.dataset.agentProvider; render(); root.querySelector(`[data-agent-provider="${state.agentProvider}"]`)?.focus(); } }
  else if (button.dataset.copyAgent) { const value = button.dataset.copyAgent === 'prompt' ? state.agent?.starterPrompt : state.agentProvider === 'claude' ? state.agent?.claudeCommand : state.agent?.codexCommand; if (!value) { notice('Prepare the connector before copying.', true); return; } if (!globalThis.navigator?.clipboard?.writeText) { notice('Clipboard is unavailable. Select and copy the displayed text.', true); return; } void navigator.clipboard.writeText(value).then(() => notice('Copied. Paste into Terminal or your agent as directed.')).catch(() => notice('Could not copy. Select and copy the displayed text.', true)); }
  else if (button.dataset.help) void run(() => bridge.call('help.open', { topic: button.dataset.help }));
  else if (button.dataset.prepareAgent) void run(async () => { state.agent = await bridge.prepareAgent(); state.agentReceipt = await bridge.agentStatus(); notice('GiGi connector prepared. Follow the selected agent steps, then verify a real tool call.'); });
  else if (button.dataset.signIn) { const blocked = Object.values(state.sources).find(sourceSessionBlocked); if (blocked) { notice(sourceErrorMessage(blocked.detail), true); return; } const route = readRoute(); state.signingIn = true; render(); void bridge.signIn().then(async () => { state.signingIn = false; state.sourceSignedOut = false; if (!currentRoute(route)) { render(); return; } if (!await openPage('settings')) return; notice('Connector sign-in completed. Authorize your sources separately.'); }).catch((error) => { state.signingIn = false; if (currentRoute(route)) notice(explain(error), true); else render(); }); }
  else if (button.dataset.sourceSignOut) {
    if (state.signingIn || state.signingOut || Object.keys(state.sourceBusy).length || Object.values(state.imports).some(sourceImportRunning)) return;
    state.signingOut = true;
    void run(async () => {
      try {
        const receipt = await bridge.signOut();
        if (receipt?.signedOut !== true || receipt?.localOnly !== true) throw new Error('GiGi could not confirm sign-out. Check status before trying again.');
        state.sourceSignedOut = true; state.imports = {}; state.sourceDrafts = {}; state.sourceAttempts = {}; state.connectionRequests = {};
        await openPage('settings');
      } finally { state.signingOut = false; }
    });
  }
  else if (button.dataset.sourceRefresh) void run(() => openPage('settings'));
  else if (button.dataset.sourceReconcile) { const route = readRoute(); void run(async () => { const provider = button.dataset.sourceReconcile; if (sourceSessionBlocked(state.sources[provider])) throw new Error(sourceErrorMessage(state.sources[provider].detail)); const accountId = pendingAccountForProvider(state.sources[provider], provider) || state.sources[provider]?.connectedAccountId; if (!accountId) throw new Error('Check connection status after finishing consent.'); await bridge.reconcileConnection(provider, accountId); delete state.sourceAttempts[provider]; delete state.connectionRequests[provider]; if (!currentRoute(route) || !await openPage('settings')) return; notice('Source account verified. Import records separately.'); }); }
  else if (button.dataset.sourcePreview) void sourceAction(button.dataset.sourcePreview, 'preview');
  else if (button.dataset.sourceFresh) void sourceAction(button.dataset.sourceFresh, 'fresh');
  else if (button.dataset.sourceCommit) void sourceAction(button.dataset.sourceCommit, 'commit');
  else if (button.dataset.sourceReceipt) void sourceAction(button.dataset.sourceReceipt, 'receipt');
  else if (button.dataset.sourceImportCancel) void sourceAction(button.dataset.sourceImportCancel, 'cancel');
  else if (button.dataset.contextSync) void run(async () => { await bridge.syncContext(); notice('Local history synced. Search to see cited context.'); });
  else if (button.dataset.openConsent) void run(async () => { const provider = button.dataset.openConsent; if (sourceSessionBlocked(state.sources[provider])) throw new Error(sourceErrorMessage(state.sources[provider].detail)); const url = pendingConsentForProvider(state.sources[provider], state.sourceAttempts, provider); if (!url) throw new Error('Consent link is unavailable or expired. Check source status.'); await bridge.openConsent(url, provider); notice('Consent page opened in your browser. Return here to verify the account.'); });
  else if (button.dataset.sourceBegin) void run(async () => { const provider = button.dataset.sourceBegin; const source = state.sources[provider]; if (!sourceCanBegin(source)) throw new Error('Check source status before starting consent.'); const requestId = source.reconnectable === true ? crypto.randomUUID() : state.connectionRequests[provider] || crypto.randomUUID(); state.connectionRequests[provider] = requestId; delete state.sourceAttempts[provider]; state.sources[provider] = { provider, state: 'pending' }; const result = await bridge.beginConnection(provider, requestId); state.sourceAttempts[provider] = result; state.sources[provider] = { provider, state: 'pending', connectedAccountId: result.connectedAccountId }; render(); });
  else if (button.dataset.restoreToggle && !state.busy) { if (state.pendingRestoreId) { state.pendingRestoreId = null; render(); } else { const form = document.querySelector('#restore-form'); if (form) form.hidden = !form.hidden; } }
  else if (button.dataset.cancelRestore) { state.pendingRestoreId = null; render(); }
  else if (button.dataset.confirmRestore && !state.busy && state.pendingRestoreId) { const backupId = state.pendingRestoreId; void run(async () => { const restored = await bridge.restoreBackup(backupId); state.pendingRestoreId = null; state.imports = {}; state.contextHits = []; state.contextQueried = false; state.sourceAttempts = {}; state.backupId = restored.safetyBackupId || null; await load(); notice('Backup restored. A safety backup was created; sync local history before relying on CTX results.'); }); }
});

globalThis.document?.addEventListener?.('focusin', event => {
  if (chatRefreshFocus && event.target !== document.body && event.target !== document.documentElement && event.target?.dataset?.chatRefresh === undefined) chatRefreshFocus = null;
});
globalThis.document?.addEventListener?.('pointerdown', () => { chatRefreshFocus = null; });
(globalThis.document?.addEventListener ? document : root).addEventListener('keydown', (event) => {
  if (chatRefreshFocus && event.key === 'Tab') chatRefreshFocus = null;
  if(state.page==='gigs'&&!state.selected&&!state.editing&&!chat?.visible){
    if(event.metaKey&&!event.shiftKey&&event.key.toLowerCase()==='f'){event.preventDefault?.();root.querySelector?.('#gigs-search')?.focus?.();return;}
    if(event.target?.id==='gigs-search'&&event.key==='Escape'){event.preventDefault?.();gigs.update({query:''},false);root.querySelector?.('#gigs-search')?.focus?.();return;}
    if(event.key==='Escape'){const filter=root.querySelector?.('.gigs-filters[open]');if(filter){filter.open=false;filter.querySelector?.('summary')?.focus?.();event.preventDefault?.();return;}}
  }
  if (event.target?.id === 'contact-search' && event.key === 'Escape') { event.preventDefault?.(); searchContacts('', true); root.querySelector?.('#contact-search')?.focus?.(); return; }
  if (pendingLeave) {
    if (event.key === 'Escape') { event.preventDefault?.(); keepEditing(); }
    if (event.key === 'Tab') { event.preventDefault?.(); const keep = root.querySelector?.('[data-keep-editing]'); const discard = root.querySelector?.('[data-discard-changes]'); (document.activeElement === keep ? discard : keep)?.focus?.(); }
    return;
  }
  if (peopleShortcut(event, state.page, chat?.visible)) { event.preventDefault?.(); void run(findPeople); return; }
  if (event.metaKey && ['[',']'].includes(event.key) && !chat?.visible) { const target=workspaceHistory.target(event.key==='['?-1:1); if(target){event.preventDefault?.();void run(()=>openPage(target.page,true,target.index));} return; }
  if(event.key==='Escape' && !chat?.visible) { const more=root.querySelector?.('.reference-more[open]'); if(more){more.open=false;more.querySelector?.('summary')?.focus?.();event.preventDefault?.();} }
  if (event.key !== 'Escape' || !chat?.visible) return;
  event.preventDefault?.();
  chat.close();
  focusChatTrigger();
});

root.addEventListener('change',event=>{const field=event.target?.dataset?.gigsField;if(!field)return;gigs.update({[field]:['status','type'].includes(field)?gigsFilterValue(event.target.value):event.target.value},false);});

root.addEventListener('toggle', (event) => { if (event.target.dataset?.libraryNav) state.libraryOpen = event.target.open; }, true);

root.addEventListener('change', (event) => { if (event.target.id === 'link-entity') void run(() => loadLinkChoices(event.target.value)); });
root.addEventListener('input', (event) => {
  if (event.target.dataset?.sourceDate) {
    const provider = event.target.dataset.sourceDate, bound = event.target.dataset.bound;
    if (['gmail','googlecalendar'].includes(provider) && ['from','to'].includes(bound) && !state.sourceBusy[provider]) {
      state.sourceDrafts[provider] = {...state.sourceDrafts[provider], [bound]:event.target.value};
      delete state.imports[provider]; render();
    }
    return;
  }
  if(event.target.id==='gigs-search'){gigs.update({query:event.target.value});return;}
  if (event.target.id === 'contact-search') { searchContacts(event.target.value); return; }
  if (event.target.id === 'chat-message' && chat) chat.draft = event.target.value;
  if (sourceProposal?.phase === 'draft') {
    if (event.target.id === 'source-proposal-title') sourceProposal.title = event.target.value;
    if (event.target.id === 'source-proposal-date') sourceProposal.date = event.target.value;
  }
});

root.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.target;
  if (state.busy) return;
  if (form.id === 'source-proposal-form') {
    if (!sourceProposal || sourceProposal.phase !== 'draft') return;
    const values = Object.fromEntries(new FormData(form));
    sourceProposal.title = String(values.title || ''); sourceProposal.date = String(values.date || '');
    try { sourceProposal = reviewSourceDraft(sourceProposal, values); render(); } catch (error) { notice(explain(error), true); }
  }
  else if (form.id === 'chat-form') { const value = String(new FormData(form).get('message') || ''); if (chat) { chat.draft = value; void chat.send(value); } }
  else if (form.id === 'workspace-form') { const data = Object.fromEntries(new FormData(form)); state.setupDraft = { ...data }; void run(async () => { if (!state.workspace) state.workspace = await bridge.createWorkspace(data.name); state.setupProfile = true; await bridge.saveRecord(workspaceId(), 'profile', { title: String(data.ownerName).trim(), fields: { Currency: String(data.currency) } }); state.currency = String(data.currency); state.currencyKnown = true; currencyVersion++; state.setupProfile = false; state.setupDraft = null; state.justCreated = true; initializeChat(); await openPage('settings'); notice('Your private workspace is ready. Connections are optional.'); }); }
  else if (form.id === 'record-form') { const data = Object.fromEntries(new FormData(form)); state.editorDraft = { ...data }; const route = readRoute(), selected = state.selected; submittedEditor = { version: route.version, values: { ...data } }; void run(async () => { const title = String(data.title).trim(); delete data.title; const saved = await bridge.saveRecord(route.workspace, route.page, { ...(selected?.id ? { id: selected.id, fieldsMode: 'replace', expectedRecord: { title: selected.title, fields: selected.fields, source: selected.source } } : {}), title, fields: selected?.id ? editedFields(selected.fields, data, route.page) : recordFields(data, route.page) }); if(route.page==='gigs'&&route.workspace===workspaceId())gigs.invalidate(); if (route.page === 'profile' && route.workspace === workspaceId()) { state.currency = saved.fields?.Currency || null; state.currencyKnown = true; currencyVersion++; } if (!currentRoute(route)) return; state.editing = false; state.editorDraft = null; if (!await openPage(route.page)) return; if (!await selectRecord(saved.id || saved.record?.id, route.page)) return; notice(`${entityName(route.page)} saved.`); }).finally(() => { if (submittedEditor?.version === route.version) submittedEditor = null; }); }
  else if (form.id === 'link-form') submitLink(Object.fromEntries(new FormData(form)));
  else if (form.id === 'restore-form') { const backupId = String(new FormData(form).get('backupId')).trim(); if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(backupId)) { notice('Enter a valid backup ID.', true); return; } state.pendingRestoreId = backupId; render(); }
  else if (form.id === 'context-form') void run(async () => { const query = String(new FormData(form).get('query')).trim(); state.contextHits = await bridge.searchContext(query, 5); state.contextQueried = true; });

});



load().catch((error) => { root.innerHTML = `<div class="setup"><span class="brand-mark">g.</span><h1>Couldn’t open GiGi.</h1><p class="subhead">${safe(explain(error))}</p><button class="btn section-gap" id="retry">Retry</button></div>`; document.querySelector('#retry')?.addEventListener('click', () => location.reload()); });
