import { createWorkspaceMemory } from '../web/workspace-memory.mjs';
// Native transaction/navigation controller, extracted from the tested ESM app.
// This module renders no HTML; React/Astryx owns every shipped surface.
import {
  WorkspaceSearch,
  workspaceSearchKey,
  workspaceSearchShortcut
} from '../web/workspace-search.mjs';
import { AttentionController } from '../web/attention.mjs';
import {
  defaults,
  readPreferences,
  writePreferences,
  importPreferences,
  exportPreferences,
  applyPreferences as applyLegacyPreferences
} from '../web/preferences.mjs';
import { createTasks, completeTask as completeCalmTask } from '../web/calm-work.mjs';
import { boundedStatusRead } from '../web/optional-status.mjs';
import { createDevQuestController } from './dev-quest-controller.mjs';
import { loadRelationPage } from '../web/relation-pagination.mjs';
import { agentPreflightView } from '../web/agent-preflight.mjs';
import { eventLabel } from '../web/event-identity.mjs';
import { createGigs, gigsView, gigsFilterValue } from '../web/gigs.mjs';
import { sourceSelection, sourceImportView, sourceImportRunning } from '../web/source-center.mjs';
import { statusLabel, todaySummary, builtInChatSetup } from '../web/desktop-polish.mjs';
import {
  referenceHeader,
  referenceCards,
  createWorkspaceHistory,
  installReferenceMenu
} from '../web/reference-layout.mjs';
import { createContactRead } from '../web/contact-read.mjs';
import { historyPresentation, copyableRecordField } from '../web/record-polish.mjs';
import { captureViewState, restoreViewState } from '../web/view-state.mjs';
import { scheduleAgenda, scheduleEntry, readWorkspaceAgenda } from '../web/schedule.mjs';
import {
  displayField,
  importantDetails,
  emptyCopy,
  localToday,
  fieldHelp,
  collectionCount
} from '../web/experience.mjs';
import {
  sourceView,
  setupSummary,
  sourceJourney,
  sourceErrorMessage,
  sourceSignInNeeded
} from '../web/setup-view.mjs';
import {
  canUseSource,
  sourceDraft,
  reviewSourceDraft,
  sourceProposalView
} from '../web/source-proposal.mjs';
import { icon, entityIcon } from '../web/icons.mjs';
import { tauriBridge, createBridge } from '../web/bridge.mjs';
import { ChatController } from '../web/chat.mjs';
import { AiConnection, updateAiDraft } from '../web/ai-connection.mjs';
import {
  sections,
  fields,
  moneyFields,
  booleanFields,
  fieldOptions,
  listFrom,
  recordFields,
  editedFields,
  formatMoney,
  gigBalance,
  relatedEndpoint,
  sourcePreview,
  sourceSessionBlocked,
  sourceCanBegin,
  sourceNeedsOperatorReview,
  importRunForAccount,
  pendingConsentForProvider,
  pendingAccountForProvider,
  linkInput
} from '../web/model.mjs';
export function startController({ renderUI, invoke, initialize } = {}) {
  const memoryControllers = new Map();
  const root = document.querySelector('#app');
  // Astryx AppShell owns the page scroller; onboarding still uses the window.
  const pageScroll = () => root.querySelector('[role="main"]');
  const scrollX = () => pageScroll()?.scrollLeft ?? globalThis.scrollX ?? 0;
  const scrollY = () => pageScroll()?.scrollTop ?? globalThis.scrollY ?? 0;
  const scrollTo = (x, y) => {
    const main = pageScroll();
    if (main) main.scrollTo({ left: x, top: y, behavior: 'instant' });
    else globalThis.scrollTo?.(x, y);
  };
  function applyPreferences(value) {
    const normalized = applyLegacyPreferences(value);
    document.documentElement.dataset.gigiTheme = normalized.theme;
    document.documentElement.dataset.theme = normalized.theme === 'paper' ? 'light' : 'dark';
    return normalized;
  }
  installReferenceMenu(root);
  const bridge = (invoke ? (callback) => createBridge(invoke, callback) : tauriBridge)(
    (workspace) => {
      gigs.invalidate(workspace);
      tasks.invalidate(workspace);
      if (attention?.workspaceId === workspace) void attention.refresh();
    }
  );
  const ai = new AiConnection(bridge, () => {
    if (state.page === 'settings') render();
  });
  let chat;
  let attention;
  let attentionSettingsDirty = false;
  let notificationUnlisten;
  let attentionChatSignature;
  let notificationOpening = false;
  let routeVersion = 0;
  const workspaceHistory = createWorkspaceHistory();
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
  const contactRead = createContactRead();
  let contactSearchTimer;
  let contactSearchVersion = 0;
  let todayWeekStart = null;
  let overviewWorkspace = null;
  const state = {
    workspace: null,
    overview: null,
    overviewCheckedAt: null,
    overviewError: "",
    setupProfile: false,
    setupDraft: null,
    currency: null,
    currencyKnown: false,
    page: 'overview',
    financeView: 'overall',
    financeSnapshot: null,
    financeError: null,
    financeCounts: {},
    contactQuery: '',
    contactSearching: false,
    contactSearchError: false,
    scheduleView: 'upcoming',
    libraryOpen: false,
    records: [],
    recordCount: 0,
    nextCursor: null,
    selected: null,
    editing: false,
    editorDraft: null,
    editorOrigin: null,
    sourceExpanded: false,
    busy: false,
    signingIn: false,
    signingOut: false,
    sourceSignedOut: false,
    justCreated: false,
    agentProvider: 'codex',
    toast: null,
    summary: null,
    summaryUnavailable: false,
    history: [],
    backupId: null,
    pendingRestoreId: null,
    agent: null,
    agentReceipt: null,
    relationSchema: null,
    linkChoices: null,
    sources: {},
    sourceAttempts: {},
    connectionRequests: {},
    imports: {},
    sourceDrafts: {},
    sourceBusy: {},
    contextHits: [],
    contextQueried: false,
    diagnostics: { status: null, review: null, exported: null }
  };
  const workspaceSearch = new WorkspaceSearch(
    (input) => bridge.call('workspace.search', input),
    () => renderWorkspaceSearch()
  );
  const gigs = createGigs({
    read: (workspace, criteria, cursor) => bridge.listGigs(workspace, criteria, cursor),
    changed() {
      if (state.page === 'gigs' && !state.selected && !state.editing) render();
    }
  });
  const tasks = createTasks({
    read: (workspace, criteria, cursor) => bridge.listTasks(workspace, criteria, cursor),
    changed() {
      if (state.page === 'tasks' && !state.selected && !state.editing) render();
    }
  });
  const safe = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]
    );
  const label = (name) =>
    name === 'appearance'
      ? 'Appearance & views'
      : sections.find((item) => item.id === name)?.label || name;
  const entityName = (name) =>
    ({
      schedule: 'schedule',
      finances: 'financial record',
      contacts: 'contact',
      companies: 'company',
      gigs: 'gig or shift',
      locations: 'place'
    })[name] || name.replace(/s$/, '');
  const status = (record) => statusLabel(record?.fields?.Status || record?.status || '');
  const workspaceId = () => state.workspace?.workspaceId || state.workspace?.id;
  const devQuest = createDevQuestController({
    bridge, state, workspaceId, run, render,
    onProfileReady: async (profile) => {
      currencyVersion++;
      state.currency = profile.fields?.Currency || null;
      state.currencyKnown = true;
      state.setupProfile = false;
      state.setupDraft = null;
      restorePreferences();
      state.page = 'overview';
      if (!chat) initializeChat();
    },
    openPage, navigateRecord,
    openSetup: async (section) => {
      chat?.close();
      await openPage('settings', true, null, section);
    },
    onAsk: async (prompt) => {
      if (!chat) initializeChat();
      await chat.open();
      if (!chat.current) await chat.start();
      chat.draft = prompt;
      renderChat({ replaceDraft: true });
      root.querySelector?.('#chat-message')?.focus?.();
    },
    newGig: () => newRecord('gigs')
  });
  let preferences = { ...defaults };
  let preferencesDraft = '';
  let preferencesExported = null;
  let preferencesExportChat = false;
  let preferencesFeedback = null;
  function preferenceStorage() {
    try {
      return globalThis.localStorage;
    } catch {
      return null;
    }
  }
  function restorePreferences() {
    preferences = readPreferences(preferenceStorage(), workspaceId());
    applyPreferences(preferences);
    state.scheduleView = preferences.scheduleView;
  }
  function savePreferences(next, message = 'Preferences saved on this Mac.') {
    try {
      const previous = preferences;
      preferences = writePreferences(preferenceStorage(), workspaceId(), next);
      const chatOnly = Object.keys(defaults).every(
        (key) => key.startsWith('chat') || preferences[key] === previous[key]
      );
      applyPreferences(preferences);
      state.scheduleView = preferences.scheduleView;
      preferencesExported = preferencesExported
        ? exportPreferences(preferences, { includeChat: preferencesExportChat })
        : null;
      preferencesFeedback = { message, error: false };
      if (chatOnly && state.page !== 'appearance') renderChat();
      else render();
      return true;
    } catch (error) {
      preferencesFeedback = { message: explain(error), error: true };
      if (state.page === 'appearance') render();
      else notice(explain(error), true);
      return false;
    }
  }

  const explain = (error) => {
    const raw = error instanceof Error ? error.message : String(error);
    const reasons = {
      session_busy: 'Source sign-in is busy. Finish or cancel it, then sign out.',
      session_expired: 'Sign in to GiGi sources, then check source status.',
      access_denied:
        'Source access is not enabled for this GiGi sign-in. Ask the GiGi operator to check access for this app.',
      unconfigured: 'Source connection needs developer configuration on this build.',
      unauthorized: 'Sign in to the source account and try again.',
      reauthentication_required: 'Sign in to GiGi sources, then check source status.',
      refresh_in_progress: 'Connector session is refreshing. Check status again shortly.',
      refresh_outcome_unknown: 'Session refresh is uncertain. Check source status before retrying.',
      missing_dependency: 'A required companion is missing. Reinstall the complete GiGi app.',
      unavailable: 'The source is temporarily unavailable. Try again later.',
      provider_unavailable:
        'The connection service is temporarily unavailable. Your local records are unchanged; check status later.',
      timeout: 'Connector sign-in timed out. Your local records are unchanged; try again.',
      cancelled: 'Connection was cancelled. Your records are unchanged.'
    };
    return sourceErrorMessage(raw) || reasons[raw] || raw;
  };

  function notice(message, error = false) {
    const toast = (state.toast = { message, error });
    render();
    // Recovery instructions stay available. An earlier success cannot expire a
    // later notice with the same wording or remove a focused dismiss control.
    if (!error) {
      const expire = () => {
        if (state.toast !== toast) return;
        if (root.querySelector?.('.toast')?.contains?.(globalThis.document?.activeElement)) {
          setTimeout(expire, 5000);
          return;
        }
        state.toast = null;
        render();
      };
      setTimeout(expire, 5000);
    }
  }

  function readRoute() {
    return { version: routeVersion, page: state.page, workspace: workspaceId() };
  }
  function nextRoute() {
    sourceProposal = null;
    routeVersion++;
    clearTimeout(contactSearchTimer);
    contactRead.cancel();
    gigs.cancel();
    tasks.cancel();
    return readRoute();
  }
  function currentRoute(route) {
    return (
      route.version === routeVersion &&
      route.page === state.page &&
      route.workspace === workspaceId()
    );
  }
  function leaveRoute() {
    sourceProposal = null;
    routeVersion++;
    clearTimeout(contactSearchTimer);
    contactRead.cancel();
    gigs.cancel();
    tasks.cancel();
  }

  async function run(task) {
    const operation = ++operationVersion;
    state.busy = true;
    render();
    try {
      return await task();
    } catch (error) {
      if (operation === operationVersion) notice(explain(error), true);
    } finally {
      if (operation === operationVersion) {
        state.busy = false;
        render();
      }
    }
  }

  async function refreshCurrency() {
    const workspace = workspaceId(),
      version = ++currencyVersion;
    state.currencyKnown = false;
    renderChat();
    try {
      const profiles = listFrom(await bridge.listRecords(workspace, 'profile'));
      const value = profiles[0]
        ? (await bridge.getRecord(workspace, 'profile', profiles[0].id)).fields?.Currency || null
        : null;
      if (version !== currencyVersion || workspace !== workspaceId()) return;
      state.currency = value;
      state.currencyKnown = true;
    } catch {
      if (version !== currencyVersion || workspace !== workspaceId()) return;
      state.currency = null;
    }
    render();
  }
  function renderAttention() {
    render();
  }

  async function openAttention(item, mode = 'review') {
    if (item.sessionId) {
      await chat.open();
      if (chat.visible) await chat.read(item.sessionId);
      root.querySelector?.('[data-chat-close]')?.focus?.();
    } else if (item.entity && item.recordId) {
      if (mode === 'ask') {
        await chat.open({ entity: item.entity, id: item.recordId, title: item.title });
        if (
          !chat.current ||
          chat.record?.entity !== item.entity ||
          chat.record?.id !== item.recordId
        )
          await chat.start();
        root.querySelector?.('[data-chat-close]')?.focus?.();
      } else await run(() => navigateRecord(item.entity, item.recordId));
    }
  }

  async function processNotificationOpen() {
    if (notificationOpening || !attention || !workspaceId()) return;
    notificationOpening = true;
    try {
      const { item: payload } = await bridge.call('notifications.takeOpen', {
        workspaceId: workspaceId()
      });
      if (payload?.workspaceId !== workspaceId() || typeof payload.id !== 'string') return;
      await attention.refresh();
      if (
        !attention.lastRefreshSuccessful ||
        !attention.items.some(
          (item) => item.id === payload.id && item.revision === payload.revision
        )
      ) {
        notice(
          'This notification is no longer current. Check Needs your attention for the latest work.'
        );
        return;
      }
      await attention.open(payload.id);
    } catch {
      /* Local attention stays available when no native route can be read. */
    } finally {
      notificationOpening = false;
    }
  }

  function initializeAttention() {
    attention?.stop();
    notificationUnlisten?.();
    notificationUnlisten = null;
    attention = new AttentionController(bridge, workspaceId(), {
      changed: renderAttention,
      getChat: () => chat,
      isForeground: () => globalThis.document?.hasFocus?.() ?? true,
      onOpen: openAttention,
      onDelivery: () => bridge.call('notifications.send', { workspaceId: workspaceId() })
    });
    void attention.start();
    void bridge
      .call('notifications.status', {})
      .then((value) => {
        if (attention) {
          attention.permission = value.permission || 'unknown';
          attention.alertsEnabled = value.alertsEnabled;
          renderAttention();
        }
      })
      .catch(() => {});
    const listen = globalThis.__TAURI__?.event?.listen;
    if (listen)
      void listen('gigi-attention-open', () => void processNotificationOpen())
        .then((unlisten) => {
          notificationUnlisten = unlisten;
          void processNotificationOpen();
        })
        .catch(() => {
          void processNotificationOpen();
        });
    else void processNotificationOpen();
  }

  function initializeChat() {
    chat?.close();
    chat = new ChatController(
      bridge,
      workspaceId(),
      () => {
        renderChat();
        if (chat?.current && !chat.pending && !chat.reading) {
          const signature = JSON.stringify([
            workspaceId(),
            chat.current.sessionId,
            chat.current.state,
            chat.current.messages?.at(-1)?.id,
            chat.current.decisionReceipt
          ]);
          if (signature !== attentionChatSignature) {
            attentionChatSignature = signature;
            void attention?.refresh();
          }
        }
      },
      async () => {
        const route = readRoute();
        gigs.invalidate();
        tasks.invalidate();
        await refreshCurrency();
        if (!currentRoute(route) || state.editing) return;
        if (state.selected?.id) await selectRecord(state.selected.id);
        else if (state.page === 'overview') await openPage('overview');
        else if (fields[state.page] && !state.editing) await openPage(state.page);
      }
    );
    Object.defineProperty(chat, 'preferences', { get: () => preferences });
    chat.currency = () => state.currency;
    chat.currencyKnown = () => state.currencyKnown;
    initializeAttention();
  }

  async function load() {
    const result = await bridge.getWorkspace();
    attention?.stop();
    chat?.close();
    chat = null;
    state.workspace =
      result?.workspace || (result?.workspaceId && result) || (result?.id && result) || null;
    let profile = null;
    if (state.workspace) {
      restorePreferences();
      state.page = preferences.startPage;
      initializeChat();
      currencyVersion++;
      state.currencyKnown = false;
      const profiles = listFrom(await bridge.listRecords(workspaceId(), 'profile'));
      state.setupProfile = profiles.length === 0;
      profile = profiles[0]
        ? await bridge.getRecord(workspaceId(), 'profile', profiles[0].id)
        : null;
      state.currency = profile?.fields?.Currency || null;
      state.currencyKnown = true;
    }
    await devQuest.load(profile);
    if (state.workspace && !devQuest.view.active) await openPage(state.page);
    render();
  }

  function protectEditor(next) {
    captureEditorDraft();
    if (
      submittedEditor?.version === routeVersion &&
      Object.keys(submittedEditor.values).every(
        (key) =>
          String(state.editorDraft?.[key] ?? '') === String(submittedEditor.values[key] ?? '')
      )
    )
      return true;
    if (
      state.editing !== true ||
      !editorBaseline ||
      !state.editorDraft ||
      Object.keys(editorBaseline.values).every(
        (key) => String(state.editorDraft[key] ?? '') === String(editorBaseline.values[key] ?? '')
      )
    )
      return true;
    pendingLeave = next;
    editorReturnFocus = globalThis.document?.activeElement?.id || 'title';
    render();
    root.querySelector?.('[data-keep-editing]')?.focus?.();
    return false;
  }
  function keepEditing() {
    pendingLeave = null;
    render();
    root.querySelector?.(`#${editorReturnFocus || 'title'}`)?.focus?.();
  }
  async function collectionDetails(items,route) {
    if(!['contacts','companies','services','profile','locations'].includes(route.page))return items;
    const result=[];
    for(let start=0;start<items.length;start+=4){
      if(!currentRoute(route))return [];
      const group=items.slice(start,start+4);
      const reads=await Promise.allSettled(group.map(item=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Record details timed out')),2500);Promise.resolve().then(()=>bridge.getRecord(route.workspace,route.page,item.id)).then(resolve,reject).finally(()=>clearTimeout(timer));})));
      reads.forEach((read,index)=>result.push(read.status==='fulfilled'?{...group[index],...read.value}:{...group[index],detailsUnavailable:true}));
    }
    return result;
  }
  function collectionRead(route,cursor) {
    return route.page==='finances'?bridge.call('records.list',{workspaceId:route.workspace,entity:'finances',cursor,finance:{view:state.financeView,today:localToday(),timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone}}):bridge.listRecords(route.workspace,route.page,cursor,route.page==='contacts'?state.contactQuery:undefined);
  }
  async function openPage(page, resetScroll = false, historyIndex = null, focusTarget = null) {
    if(page==='appearance'){page='settings';focusTarget||='workspace-preferences';}
    // A repeated navigation click is not leaving the creator. React retains
    // this component's route key, so disposing here would permanently disable
    // its actions and drop the unsaved-change guard without remounting it.
    if (
      page === state.page &&
      ['music', 'social', 'memory'].includes(page) &&
      !state.selected &&
      !state.editing
    ) {
      workspaceHistory.visit(page, historyIndex);
      if (resetScroll) scrollTo(0, 0);
      return true;
    }
    if (!protectEditor(() => void run(() => openPage(page, resetScroll, historyIndex, focusTarget))))
      return false;
    if (creatorMount?.canLeave && !(await creatorMount.canLeave())) return false;
    if (creatorMount) {
      if (typeof creatorMount === 'function') creatorMount();
      else creatorMount.dispose?.();
    }
    creatorMount = null;
    creatorNode = null;
    creatorRoute = null;
    if (page !== 'settings') state.justCreated = false;
    clearTimeout(contactSearchTimer);
    contactSearchVersion++;
    state.contactSearching = false;
    state.contactSearchError = false;
    if (['gigs','tasks'].includes(state.page) && !state.selected && !state.editing)
      (state.page === 'tasks' ? tasks : gigs).remember(scrollY());
    workspaceHistory.visit(page, historyIndex);
    state.page = page;
    state.selected = null;
    state.editing = false;
    state.linkPurpose = null;
    state.editorDraft = null;
    state.editorOrigin = null;
    state.sourceExpanded = false;
    state.summary = null;
    state.summaryUnavailable = false;
    const route = nextRoute();
    if (page !== 'settings') state.pendingRestoreId = null;
    if (page === 'overview') {
      void attention?.refresh();
      if (overviewWorkspace !== route.workspace) { state.overview = null; state.overviewCheckedAt = null; state.overviewError = ''; }
      try {
        const value = await bridge.today(route.workspace, localToday(), todayWeekStart);
        if (!currentRoute(route)) return false;
        state.overview = value; state.overviewCheckedAt = new Date().toISOString(); state.overviewError = ''; overviewWorkspace = route.workspace;
      } catch(error) { if (currentRoute(route)) state.overviewError = explain(error); }
    } else if (page === 'attention') {
      await attention?.refresh();
    } else if (page === 'history') {
      const value = await bridge.listHistory(route.workspace, 40);
      if (!currentRoute(route)) return false;
      state.history = listFrom(value);
  } else if (page === 'settings') {
    attentionSettingsDirty = false;
    state.setupChatStatus = null; state.setupChatFailed = false;
    state.agentReceipt = null;
    state.sources = Object.fromEntries(['gmail', 'googlecalendar'].map(provider => [provider, { provider, state: 'checking' }]));
    render();
    void ai.refresh();
    const initialAgent = state.agent, initialAgentReceipt = state.agentReceipt;
    state.diagnostics = {status:null,review:null,exported:null};
    const initialDiagnostics = state.diagnostics;
    const observe = (read, accept, reject, valid = () => true) => {
      void boundedStatusRead(read).then(value => { if (currentRoute(route) && valid()) { accept(value); render(); } }, error => { if (currentRoute(route) && valid()) { reject(error); render(); } });
    };
    for (const provider of ['gmail', 'googlecalendar']) {
      const checking = state.sources[provider];
      observe(
      () => bridge.sourceStatus(route.workspace, provider),
      source => {
        state.sources[provider] = source;
        if (source.latestImport && !importRunForAccount(state.imports[provider], source.connectedAccountId)) {
          const receipt = source.latestImport, selection = receipt.scope?.selection || {};
          state.imports[provider] = {accountId: source.connectedAccountId, receipt, selection, restoredScope:true, selectionKey:JSON.stringify(selection), cursor:receipt.retryCursor};
          state.sourceDrafts[provider] = {from:selection.from?.slice(0,10) || '',to:selection.to?.slice(0,10) || ''};
        }
      },
      error => { state.sources[provider] = { provider, state: 'unavailable', detail:error instanceof Error ? error.message : String(error) }; },
      () => state.sources[provider] === checking && !state.sourceBusy[provider] && !state.signingIn && !state.signingOut
      );
    }
    observe(() => bridge.agentStatus(), value => { state.agentReceipt = value; }, () => { state.agentReceipt = null; }, () => state.agent === initialAgent && state.agentReceipt === initialAgentReceipt);
    observe(() => bridge.call('diagnostics.status'), value => { state.diagnostics = { status:value, review:null, exported:null }; }, () => { state.diagnostics = {status:null,review:null,exported:null}; }, () => state.diagnostics === initialDiagnostics);
    observe(() => bridge.chatStatus(route.workspace), value => { state.setupChatStatus = value; }, () => { state.setupChatFailed = true; });

    } else if(page==='finances') {
      const saved=state.financeSnapshot?.workspace===route.workspace?state.financeSnapshot:null;
      state.financeSnapshot=saved;
      state.records=saved?.items||[];state.recordCount=saved?.count||0;state.nextCursor=null;state.financeCounts=saved?.viewCounts||{};state.financeError=null;
      try {
        const result=await collectionRead(route,null);if(!currentRoute(route))return false;
        state.records=listFrom(result);state.recordCount=result.count;state.nextCursor=result.nextCursor||null;state.financeCounts=result.viewCounts||{};
        state.financeSnapshot={workspace:route.workspace,view:state.financeView,items:state.records,count:state.recordCount,viewCounts:state.financeCounts};
      } catch(error) {if(currentRoute(route))state.financeError=explain(error);}
    } else if (page === 'tasks') {
      await tasks.open(route.workspace);
      if (!currentRoute(route)) return false;
    } else if (page === 'gigs') {
      await gigs.open(route.workspace);
      if (!currentRoute(route)) return false;
      if (overviewWorkspace !== route.workspace) { state.overview = null; state.overviewCheckedAt = null; state.overviewError = ''; }
      try {
        const value = await bridge.today(route.workspace, localToday(), todayWeekStart);
        if (!currentRoute(route)) return false;
        state.overview=value;state.overviewCheckedAt=new Date().toISOString();state.overviewError='';overviewWorkspace=route.workspace;
      } catch(error) { if(currentRoute(route))state.overviewError=explain(error); }
    } else if (fields[page]) {
      state.records = [];
      state.recordCount = 0;
      state.nextCursor = null;
      if (page === 'contacts') {
        await searchContacts(state.contactQuery, true);
        if (!currentRoute(route)) return false;
        render();
        if (resetScroll) scrollTo(0, 0);
        return true;
      }
      const result =
        page === 'schedule'
          ? await readWorkspaceAgenda(
              (entity, cursor) => bridge.listRecords(route.workspace, entity, cursor),
              () => currentRoute(route)
            ).then((items) => items && { items, count: items.length })
          : await collectionRead(route,null);
      if (!currentRoute(route)) return false;
      const details=await collectionDetails(listFrom(result),route);
      if(!currentRoute(route))return false;
      state.records = details;
      if(page==='finances')state.financeCounts=result.viewCounts||{};
      state.recordCount = result?.count ?? state.records.length;
      state.nextCursor = result?.nextCursor || null;
    }
    render();
    if (page === 'appearance')
      root
        .querySelector?.(`[data-preferences-theme="${preferences.theme}"]`)
        ?.focus?.({ preventScroll: true });
    if (['gigs','tasks'].includes(page)) scrollTo(0, (page === 'tasks' ? tasks : gigs).state?.scroll || 0);
    else if (resetScroll) scrollTo(0, 0);
    if (focusTarget && /^[a-zA-Z0-9_-]+$/.test(focusTarget)) {
      const target = root.querySelector?.(`#${focusTarget}`);
      target?.scrollIntoView?.({ block: 'start' });
      (target?.querySelector?.('button,input,select,textarea') || target)?.focus?.({ preventScroll: true });
    }
    return true;
  }

  async function selectRecord(id, entity = state.page) {
    if (state.page !== entity) return false;
    if (['gigs','tasks'].includes(entity) && !state.selected && !state.editing)
      (entity === 'tasks' ? tasks : gigs).remember(scrollY(), id);
    const route = nextRoute();
    state.selected = null;
    state.editing = false;
    state.editorDraft = null;
    state.editorOrigin = null;
    state.sourceExpanded = false;
    const [record, summary] = await Promise.allSettled([
      bridge.getRecord(route.workspace, entity, id),
      entity === 'gigs' ? bridge.gigSummary(route.workspace, id) : null
    ]);
    if (!currentRoute(route)) return false;
    if (record.status === 'rejected') throw record.reason;
    state.selected = record.value;
    state.summary = summary.status === 'fulfilled' ? summary.value : null;
    state.summaryUnavailable = summary.status === 'rejected';
    render();
    scrollTo(0, 0);
    return true;
  }

  async function navigateRecord(entity, id) {
    if (!protectEditor(() => void run(() => navigateRecord(entity, id)))) return;
    if (!fields[entity]) return;
    if (state.page !== entity && !(await openPage(entity))) return;
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
      state.selected = record;
      state.editorOrigin = origin;
      state.editorDraft = null;
      state.editing = true;
    });
    if (currentRoute(route) && state.editing === true) scrollTo(0, 0);
  }

  async function refreshSelected(sourceExpanded = false) {
    const selected = state.selected;
    if (!selected?.id) return;
    const route = nextRoute();
    const record = await bridge.getRecord(route.workspace, route.page, selected.id, 'full');
    if (!currentRoute(route)) return;
    state.selected = record;
    state.sourceExpanded = sourceExpanded;
  }

  function editorOrigin(selected, focus, keepPosition = true) {
    return {
      selected,
      focus,
      reloadCollection: !selected && !keepPosition,
      x: keepPosition ? scrollX() : 0,
      y: keepPosition ? scrollY() : 0,
      openDetails: [...(root.querySelectorAll?.('.content-primary details') || [])].map(
        (detail) => detail.open
      )
    };
  }

  async function cancelEditor() {
    if (!protectEditor(() => void cancelEditor())) return;
    const origin = state.editorOrigin;
    leaveRoute();
    if (
      origin?.reloadCollection ||
      (state.page === 'contacts' && !origin?.selected && state.contactSearching)
    ) {
      state.records = [];
      state.recordCount = 0;
      state.nextCursor = null;
      if (!(await run(() => openPage(state.page)))) return;
    } else {
      state.selected = origin?.selected || null;
      state.editing = false;
      state.editorDraft = null;
      state.editorOrigin = null;
      if (!state.selected && ['gigs', 'tasks'].includes(state.page))
        await (state.page === 'tasks' ? tasks : gigs).open(workspaceId());
      render();
    }
    if (origin) {
      [...(root.querySelectorAll?.('.content-primary details') || [])].forEach((detail, index) => {
        detail.open = origin.openDetails[index] || false;
      });
      root.querySelector?.(origin.focus)?.focus?.({ preventScroll: true });
    }
    scrollTo(origin?.x || 0, origin?.y || 0);
  }

  function newRecord(entity) {
    if (!protectEditor(() => newRecord(entity))) return;
    workspaceHistory.visit(entity);
    leaveRoute();
    state.editorOrigin = editorOrigin(null, `[data-new="${entity}"]`, state.page === entity);
    state.justCreated = false;
    state.page = entity;
    state.selected = null;
    state.editorDraft = null;
    state.editing = true;
    render();
    scrollTo(0, 0);
    root.querySelector?.('#title')?.focus?.();
  }

  function searchContacts(query, immediate = false) {
    if (state.page !== 'contacts' || state.selected || state.editing) return;
    clearTimeout(contactSearchTimer);
    contactRead.cancel();
    state.contactQuery = query.slice(0, 160);
    state.contactSearching = true;
    state.contactSearchError = false;
    const version = ++contactSearchVersion,
      route = readRoute(),
      requestedQuery = state.contactQuery;
    render();
    const search = async () => {
      if (
        version !== contactSearchVersion ||
        !currentRoute(route) ||
        state.selected ||
        state.editing
      )
        return;
      try {
        const result = await contactRead.read(() =>
          bridge.listRecords(route.workspace, 'contacts', null, requestedQuery)
        );
        if (
          version !== contactSearchVersion ||
          !currentRoute(route) ||
          state.selected ||
          state.editing
        )
          return;
        const details=await collectionDetails(listFrom(result),route);
        if(version!==contactSearchVersion||!currentRoute(route)||state.selected||state.editing)return;
        state.records = details;
        state.recordCount = result?.count ?? state.records.length;
        state.nextCursor = result?.nextCursor || null;
      } catch (error) {
        if (
          version !== contactSearchVersion ||
          !currentRoute(route) ||
          error?.code === 'contact_read_superseded'
        )
          return;
        state.records = [];
        state.recordCount = 0;
        state.nextCursor = null;
        state.contactSearchError = error?.code === 'contact_read_timeout' ? 'timeout' : true;
      } finally {
        if (
          version === contactSearchVersion &&
          currentRoute(route) &&
          !state.selected &&
          !state.editing
        ) {
          state.contactSearching = false;
          render();
        }
      }
    };
    if (immediate) return search();
    else contactSearchTimer = setTimeout(search, 150);
  }
  async function sourceAction(provider, action) {
    if (!['gmail', 'googlecalendar'].includes(provider)) return;
    if (state.sourceBusy[provider] && action !== 'cancel') return;
    const source = state.sources[provider],
      accountId = source?.connectedAccountId,
      workspace = workspaceId();
    const current = importRunForAccount(state.imports[provider], accountId);
    if (sourceSessionBlocked(source)) {
      notice(sourceErrorMessage(source.detail), true);
      return;
    }
    if (!accountId || source?.state !== 'connected') {
      notice('Verify the source account before reading or importing.', true);
      return;
    }
    const route = readRoute();
    state.sourceBusy[provider] = action;
    render();
    try {
      if (action === 'preview' || action === 'fresh') {
        if (sourceImportRunning(current))
          throw new Error(
            'Stop the active import or check its receipt before reading another page.'
          );
        const selection =
          current?.selection || sourceSelection(provider, state.sourceDrafts[provider]);
        const selectionKey = JSON.stringify(selection);
        const cursor =
          action !== 'fresh' && current?.selectionKey === selectionKey
            ? current.receipt && current.receipt.state !== 'complete'
              ? current.receipt.retryCursor || current.cursor
              : current.receipt?.nextCursor || (!current.receipt && current.preview?.nextCursor)
            : undefined;
        const preview = await bridge.previewSource(
          workspace,
          provider,
          accountId,
          selection,
          cursor
        );
        if (!currentRoute(route) || state.sources[provider]?.connectedAccountId !== accountId)
          return;
        state.imports[provider] = {
          accountId,
          preview,
          selection,
          restoredScope: current?.restoredScope || false,
          selectionKey,
          cursor,
          idempotencyKey: crypto.randomUUID()
        };
      } else if (action === 'commit') {
        if (!current?.preview || current.receipt)
          throw new Error('Preview source records before importing.');
        const receipt = await bridge.commitSource(
          workspace,
          current.preview.previewId,
          current.preview.revision,
          current.idempotencyKey
        );
        if (state.imports[provider] === current) current.receipt = receipt;
      } else if (action === 'receipt') {
        const jobId = current?.receipt?.jobId || current?.preview?.previewId;
        if (!jobId) throw new Error('No import receipt is available yet.');
        const receipt = await bridge.importStatus(workspace, jobId);
        if (state.imports[provider] === current) current.receipt = receipt;
      } else if (action === 'cancel') {
        const previewId =
          current?.preview?.previewId || current?.receipt?.previewId || current?.receipt?.jobId;
        if (!previewId) throw new Error('No preview or import is available to stop.');
        const receipt = await bridge.cancelImport(workspace, previewId);
        if (state.imports[provider] === current) {
          current.receipt = receipt;
          delete current.preview;
        }
      }
    } catch (error) {
      if (currentRoute(route)) notice(explain(error), true);
    } finally {
      if (state.sourceBusy[provider] === action) delete state.sourceBusy[provider];
      render();
    }
  }

  function captureEditorDraft() {
    const form = root.querySelector?.('#record-form');
    if (state.editing !== true || !form || form.dataset.editorVersion !== String(routeVersion))
      return null;
    state.editorDraft = Object.fromEntries(new FormData(form));
    const active = globalThis.document?.activeElement;
    return {
      x: scrollX(),
      y: scrollY(),
      focus:
        active?.form === form && active.id
          ? {
              id: active.id,
              start: active.selectionStart,
              end: active.selectionEnd,
              direction: active.selectionDirection,
              scrollTop: active.scrollTop
            }
          : null
    };
  }
  function render() {
    root.classList.toggle('loading', state.busy);
    const position = captureEditorDraft();
    renderUI(context());
    if (state.editing === true) {
      const form = root.querySelector('#record-form');
      if (form && editorBaseline?.version !== routeVersion)
        editorBaseline = { version: routeVersion, values: Object.fromEntries(new FormData(form)) };
    } else editorBaseline = null;
    if (position?.focus) {
      const control = root.querySelector('#' + position.focus.id);
      control?.focus({ preventScroll: true });
      try {
        control?.setSelectionRange?.(
          position.focus.start,
          position.focus.end,
          position.focus.direction
        );
      } catch {}
    }
    if (pendingLeave) root.querySelector('[data-keep-editing]')?.focus();
    const linkButton = root.querySelector('[data-link-submit]');
    if (linkButton)
      linkButton.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const entity = root.querySelector('#link-entity'),
          role = root.querySelector('#link-role'),
          record = root.querySelector('#link-record');
        if (entity && role && record)
          submitLink({ entity: entity.value, role: role.value, id: record.value });
      };
    if (chat) chat.opening = false;
  }

  function renderChat() {
    render();
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
    state.linkChoices = {
      entity,
      items: [...old, ...listFrom(result)],
      nextCursor: result?.nextCursor || null
    };
    render();
  }

  async function enterLinkEditor(preferred = null) {
    const route = nextRoute();
    const schema = await bridge.describeSchema(route.page);
    if (!currentRoute(route)) return;
    const first = preferred && schema.relationFields?.some(
      field => field.targetEntity === preferred && field.name === 'Location'
    ) ? preferred : schema.relationFields?.[0]?.targetEntity;
    state.linkPurpose = preferred === 'locations' && first === preferred ? 'place' : null;
    const result = first ? await bridge.listRecords(route.workspace, first) : null;
    if (!currentRoute(route)) return;
    state.relationSchema = schema;
    state.linkChoices = first
      ? { entity: first, items: listFrom(result), nextCursor: result?.nextCursor || null }
      : null;
    state.editing = 'link';
    render();
  }

  async function loadMore() {
    if (state.page === 'contacts') {
      if (state.contactSearching || state.selected || state.editing || !state.nextCursor) return;
      const route = readRoute(),
        version = ++contactSearchVersion,
        cursor = state.nextCursor,
        records = state.records,
        query = state.contactQuery;
      state.contactSearching = true;
      state.contactSearchError = false;
      render();
      try {
        const result = await contactRead.read(() =>
          bridge.listRecords(route.workspace, 'contacts', cursor, query)
        );
        if (!currentRoute(route) || version !== contactSearchVersion) return;
        const details=await collectionDetails(listFrom(result),route);
        if(!currentRoute(route)||version!==contactSearchVersion)return;
        state.records = [...records, ...details];
        state.nextCursor = result?.nextCursor || null;
        state.recordCount = result?.count ?? state.recordCount;
      } catch (error) {
        if (
          !currentRoute(route) ||
          version !== contactSearchVersion ||
          error?.code === 'contact_read_superseded'
        )
          return;
        state.contactSearchError = error?.code === 'contact_read_timeout' ? 'timeout' : true;
      } finally {
        if (currentRoute(route) && version === contactSearchVersion) {
          state.contactSearching = false;
          render();
        }
      }
      return;
    }
    const route = nextRoute(),
      cursor = state.nextCursor,
      records = state.records,
      searchVersion = contactSearchVersion;
    const result = await collectionRead(route,cursor);
    if (!currentRoute(route)) return;
    if (route.page === 'contacts' && searchVersion !== contactSearchVersion) return;
    const details=await collectionDetails(listFrom(result),route);
    if(!currentRoute(route))return;
    state.records = [...records, ...details];
    state.nextCursor = result?.nextCursor || null;
    state.recordCount = result?.count ?? state.recordCount;
  }

  function submitLink(data) {
    if (state.busy) {
      notice('Please wait for the current action to finish.', true);
      return;
    }
    if (state.editing !== 'link' || !state.selected?.id) {
      notice('Link view changed. Reopen the record and retry.', true);
      return;
    }
    let input;
    try {
      input = linkInput(data, state.page, state.selected.id);
    } catch (error) {
      notice(explain(error), true);
      return;
    }
    const route = readRoute();
    void run(async () => {
      await bridge.linkRecords(
        route.workspace,
        input.fromEntity,
        input.fromId,
        input.toEntity,
        input.toId,
        input.role
      );
      if (!currentRoute(route)) return;
      state.editing = false;
      if (!(await selectRecord(input.fromId, input.fromEntity))) return;
      notice('Records linked.');
    });
  }
async function finishTask(id) {
  if(state.busy||state.page!=='tasks')return;
  const listed=state.selected?.id===id?state.selected:tasks.state?.result?.items?.find(item=>item.id===id);
  if(!listed)return;
  const route=readRoute(),wasSelected=Boolean(state.selected);
  await run(async()=>{
    const saved=await completeCalmTask(bridge,route.workspace,listed,()=>currentRoute(route));
    if(!saved||!currentRoute(route))return;
    if(wasSelected)state.selected=saved;else await tasks.refresh();
    notice('Task completed.');
  });
  if(currentRoute(route)&&!state.selected)(root.querySelector?.('[data-task-done]:not(:disabled)')||root.querySelector?.('[data-tasks-view="past"]'))?.focus?.({preventScroll:true});
}


  function renderWorkspaceSearch() {
    renderUI(context());
  }

  function openWorkspaceSearch() {
    if (!workspaceId() || state.setupProfile || pendingLeave) return;
    workspaceSearch.open(workspaceId());
    root.querySelector?.('#workspace-search-input')?.focus?.();
  }
  function closeWorkspaceSearch(restoreFocus = true) {
    workspaceSearch.close();
    render();
    if (restoreFocus)
      root.querySelector?.('[data-workspace-search]')?.focus?.({ preventScroll: true });
  }

  root.addEventListener('click', (event) => {
    if (event.target.closest?.('[data-creator-owned]')) return;
    if (event.target?.dataset?.searchBackdrop) {
      closeWorkspaceSearch();
      return;
    }
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.workspaceSearch) {
      openWorkspaceSearch();
      return;
    }
    if (button.dataset.searchClose) {
      closeWorkspaceSearch();
      return;
    }
    if (button.dataset.searchRetry) {
      void workspaceSearch.search();
      return;
    }
    if (button.dataset.searchMore) {
      if (!workspaceSearch.busy) void workspaceSearch.search(button.dataset.searchMore);
      return;
    }
    if (button.dataset.searchRecord) {
      const { searchEntity, searchRecord } = button.dataset;
      closeWorkspaceSearch(false);
      void run(() => navigateRecord(searchEntity, searchRecord));
      return;
    }
    if (button.dataset.noticeDismiss) {
      state.toast = null;
      render();
      (
        (chat?.visible
          ? root.querySelector?.('#chat-message:not(:disabled)') ||
            root.querySelector?.('[data-chat-close]')
          : null) ||
        root.querySelector?.('#title') ||
        root.querySelector?.('.main') ||
        root.querySelector?.('#owner-name')
      )?.focus?.({ preventScroll: true });
      return;
    }
    if(button.dataset.profileEdit){const id=button.dataset.profileEdit;void run(()=>navigateRecord('profile',id)).then(()=>{if(state.page==='profile'&&state.selected?.id===id)void enterEditor();});return;}
    if(button.dataset.financeView){if(!state.busy){state.financeView=button.dataset.financeView;void run(()=>openPage('finances'));}return;}
    if (button.dataset.todayWeek) {
      if (state.busy) return;
      const start = state.overview?.calendar?.weekStart;
      if (button.dataset.todayWeek === 'current') todayWeekStart = null;
      else if (start) { const day = new Date(`${start}T12:00:00`); day.setDate(day.getDate() + (button.dataset.todayWeek === 'next' ? 7 : -7)); todayWeekStart = localToday(day); }
      void run(() => openPage(state.page==='gigs'?'gigs':'overview')).then(opened => { if (opened && ['overview','gigs'].includes(state.page)) root.querySelector?.(`[data-today-week="${button.dataset.todayWeek}"]`)?.focus?.({preventScroll:true}); });
      return;
    }
    if (button.dataset.todayRefresh) { void run(() => openPage(state.page==='gigs'?'gigs':'overview')); return; }
    if (button.dataset.taskDone) { void finishTask(button.dataset.taskDone); return; }
    if (button.dataset.tasksView) { tasks.update({view:button.dataset.tasksView},false); return; }
    if (button.dataset.tasksRefresh) { void tasks.refresh(); return; }
    if (button.dataset.tasksMore) { void tasks.more(); return; }
    if (button.dataset.attentionHome) {
      void run(async () => {
        if (await openPage('attention', true)) {
          root.querySelector?.('#attention-title')?.setAttribute?.('tabindex', '-1');
          root.querySelector?.('#attention-title')?.focus?.();
        }
      });
      return;
    }
    if (button.dataset.attentionRefresh) {
      void attention?.refresh();
      return;
    }
    if (button.dataset.attentionOpen || button.dataset.attentionAsk) {
      void attention?.open(
        button.dataset.attentionOpen || button.dataset.attentionAsk,
        button.dataset.attentionAsk ? 'ask' : 'review'
      );
      return;
    }
    if (button.dataset.attentionUpdate) {
      void attention?.update(button.dataset.attentionUpdate, button.dataset.attentionAction);
      return;
    }
    if (button.dataset.notificationSettings) {
      void bridge
        .call('notifications.openSettings', {})
        .catch((error) => notice(explain(error), true));
      return;
    }
    if (button.dataset.chatLatest) {
      const transcript = root.querySelector?.('.chat-transcript');
      if (transcript) transcript.scrollTop = transcript.scrollHeight;
      button.hidden = true;
      root.querySelector?.('#chat-message')?.focus?.({ preventScroll: true });
      return;
    }
    if (button.dataset.chatPrompt) {
      const prompt = button.dataset.chatPrompt;
      void (async () => {
        if (!chat) return;
        if (!chat.current) await chat.start();
        chat.draft = prompt;
        renderChat({ replaceDraft: true });
        root.querySelector?.('#chat-message')?.focus?.();
      })();
      return;
    }
    if (button.dataset.preferencesTheme) {
      savePreferences({ ...preferences, theme: button.dataset.preferencesTheme });
      root
        .querySelector?.(`[data-preferences-theme="${preferences.theme}"]`)
        ?.focus?.({ preventScroll: true });
      return;
    }
    if (button.dataset.preferencesReset) {
      savePreferences(defaults, 'Appearance and views reset to Studio defaults.');
      return;
    }
    if (button.dataset.preferencesExport) {
      preferencesExported = exportPreferences(preferences, { includeChat: preferencesExportChat });
      render();
      const detail = root.querySelector?.('.portable-preferences');
      if (detail) detail.open = true;
      root.querySelector?.('#preferences-export')?.focus?.();
      return;
    }
    if (button.dataset.preferencesCopy) {
      void (async () => {
        try {
          if (!globalThis.navigator?.clipboard?.writeText) throw new Error('Clipboard unavailable');
          await globalThis.navigator.clipboard.writeText(
            exportPreferences(preferences, { includeChat: preferencesExportChat })
          );
          preferencesFeedback = { message: 'Configuration copied.', error: false };
        } catch {
          preferencesFeedback = {
            message: 'Could not copy. Select the configuration JSON and copy it manually.',
            error: true
          };
        }
        render();
      })();
      return;
    }
    if (button.dataset.aiAction) {
      const action = button.dataset.aiAction,
        client = button.dataset.aiClient;
      void ai.action(action, client).then(() => {
        if (state.page === 'settings')
          root.querySelector('[data-ai-action="refresh"]')?.focus?.({ preventScroll: true });
      });
      return;
    }
    if (button.dataset.agentPreflight) {
      if (state.busy) return;
      const route = readRoute(),
        x = scrollX(),
        y = scrollY();
      const restore = () => {
        if (currentRoute(route)) {
          root.querySelector?.('[data-agent-preflight]')?.focus?.({ preventScroll: true });
          scrollTo(x, y);
        }
      };
      const pending = run(async () => {
        try {
          const value = await bridge.call('agent.preflight', {});
          if (currentRoute(route)) state.agentPreflight = value;
        } catch (error) {
          if (currentRoute(route)) state.agentPreflight = { error: explain(error) };
        }
      });
      restore();
      void pending.finally(restore);
    } else if (button.dataset.gigsView)
      gigs.update(
        {
          view: button.dataset.gigsView,
          ...(button.dataset.gigsView === 'needs_date' ? { from: '', to: '' } : {})
        },
        false
      );
    else if (button.dataset.gigsReset) gigs.reset();
    else if (button.dataset.gigsRefresh) void gigs.refresh();
    else if (button.dataset.gigsMore) void gigs.more();
    else if (button.dataset.clearContacts) {
      searchContacts('', true);
      root.querySelector?.('#contact-search')?.focus?.();
    } else if (button.dataset.retryContacts) searchContacts(state.contactQuery, true);
    else if (button.dataset.keepEditing) {
      keepEditing();
    } else if (button.dataset.discardChanges) {
      const next = pendingLeave;
      pendingLeave = null;
      state.editing = false;
      state.editorDraft = null;
      editorBaseline = null;
      next?.();
    } else if (pendingLeave) return;
    else if (button.dataset.copyRecordValue) {
      const value = button.dataset.copyRecordValue;
      if (!globalThis.navigator?.clipboard?.writeText) {
        notice('Select the value and copy it manually.', true);
        return;
      }
      void navigator.clipboard
        .writeText(value)
        .then(() => notice('Copied to clipboard.'))
        .catch(() => notice('Select the value and copy it manually.', true));
    } else if (button.dataset.sourcePropose) {
      if (state.busy) return;
      const route = readRoute(),
        selected = state.selected;
      void run(async () => {
        const record = await bridge.getRecord(route.workspace, route.page, selected.id, 'full');
        if (!currentRoute(route) || state.selected?.id !== selected.id) return;
        sourceProposal = sourceDraft(
          route.workspace,
          route.page,
          record,
          button.dataset.sourcePropose
        );
        render();
      });
    } else if (button.dataset.sourceEdit) {
      if (!state.busy && sourceProposal?.phase === 'review') {
        sourceProposal = { ...sourceProposal, phase: 'draft', payload: undefined };
        render();
        root.querySelector?.('#source-proposal-title')?.focus?.();
      }
    } else if (button.dataset.diagnostics) {
      const action = button.dataset.diagnostics;
      if (state.busy) return;
      if (action === 'copy') {
        const path = state.diagnostics.exported?.path;
        if (!path || !globalThis.navigator?.clipboard?.writeText) {
          notice('Select the export path and copy it manually.', true);
          return;
        }
        void navigator.clipboard
          .writeText(path)
          .then(() => notice('Export path copied. Nothing was sent.'))
          .catch(() => notice('Select the export path and copy it manually.', true));
        return;
      }
      if (!['status', 'start', 'stop', 'review', 'export', 'delete'].includes(action)) return;
      const status = state.diagnostics.status;
      if (
        action === 'start' &&
        (typeof status?.enabled !== 'boolean' || status.enabled || status.eventCount)
      )
        return;
      if (action === 'review' && (!status || status.enabled)) return;
      if (action === 'export' && (!state.diagnostics.review?.reviewToken || status?.enabled))
        return;
      void run(async () => {
        const result = await bridge.call(
          `diagnostics.${action}`,
          action === 'export' ? { reviewToken: state.diagnostics.review.reviewToken } : {}
        );
        if (action === 'export') {
          if (typeof result?.path !== 'string' || !result.path)
            throw new Error('The diagnostic export could not be confirmed. Review and try again.');
          state.diagnostics.exported = { path: result.path };
          notice('Diagnostic report exported locally. Nothing was sent.');
        } else {
          state.diagnostics.status = result;
          state.diagnostics.review = action === 'review' ? result : null;
          state.diagnostics.exported = null;
          if (action === 'start')
            notice('Local capture started. Repeat the source action, then stop and review.');
          if (action === 'stop') notice('Capture stopped. Review diagnostics before exporting.');
          if (action === 'delete')
            notice('Diagnostics and GiGi’s local export deleted. Shared copies are unaffected.');
        }
      });
    } else if (button.dataset.sourceCancel) {
      if (!state.busy) {
        sourceProposal = null;
        render();
      }
    } else if (button.dataset.sourceApprove) {
      if (state.busy || !sourceProposal?.payload) return;
      const proposal = sourceProposal,
        route = readRoute();
      proposal.phase = 'submitted';
      void run(async () => {
        const result = await bridge.call('records.save', proposal.payload);
        if (!result?.id || !['created', 'existing'].includes(result.sourceProposal?.outcome))
          throw new Error('Save receipt could not be verified. Retry this exact proposal.');
        const saved = await bridge.getRecord(route.workspace, proposal.entity, result.id, 'full');
        const origin = saved.source?.kind === 'manual' ? saved.source.origin : saved.source;
        const expected = proposal.sourceRecord.expectedRecord.source;
        if (
          saved.workspaceId !== route.workspace ||
          saved.entity !== proposal.entity ||
          !['provider', 'connectedAccountId', 'collectionId', 'externalId'].every(
            (key) => origin?.[key] === expected[key]
          )
        )
          throw new Error('Saved source could not be verified. Retry this exact proposal.');
        if (
          !saved.relations?.some((link) => {
            const endpoint = relatedEndpoint(link, proposal.entity, saved.id);
            return (
              endpoint?.entity === proposal.sourceRecord.entity &&
              endpoint.id === proposal.sourceRecord.id
            );
          })
        )
          throw new Error('Source link could not be verified. Retry this exact proposal.');
        if (!currentRoute(route) || sourceProposal !== proposal) return;
        sourceProposal = null;
        await navigateRecord(proposal.entity, result.id);
        notice(
          result.sourceProposal.outcome === 'existing'
            ? 'Opened the existing record from this source. Your edits were preserved.'
            : 'Local record created and linked to its source.'
        );
      });
    } else if (button.dataset.scheduleView) {
      if (!savePreferences({ ...preferences, scheduleView: button.dataset.scheduleView })) {
        state.scheduleView = button.dataset.scheduleView;
        render();
      }
    } else if (button.dataset.scheduleToday) {
      if (!savePreferences({ ...preferences, scheduleView: 'upcoming' })) {
        state.scheduleView = 'upcoming';
        render();
      }
      root.querySelector('#schedule-today')?.scrollIntoView?.({ block: 'start' });
    } else if (button.dataset.chatOpen)
      void chat?.open(
        state.selected && !state.editing
          ? { entity: state.page, id: state.selected.id, title: state.selected.title }
          : null
      );
    else if (button.dataset.chatRefresh) {
      button.focus?.();
      const request = {};
      chatRefreshFocus = request;
      void chat?.checkStatus().finally(() => {
        const active = globalThis.document?.activeElement;
        if (
          chatRefreshFocus === request &&
          chat?.visible &&
          (!active ||
            active === document.body ||
            active === document.documentElement ||
            active.dataset?.chatRefresh !== undefined)
        )
          root.querySelector?.('[data-chat-refresh]')?.focus?.();
        if (chatRefreshFocus === request) chatRefreshFocus = null;
      });
    } else if (button.dataset.setupChatRefresh)
      void run(async () => {
        const route = readRoute();
        state.setupChatStatus = null;
        state.setupChatFailed = false;
        render();
        try {
          const status = await bridge.chatStatus(route.workspace);
          if (currentRoute(route)) state.setupChatStatus = status;
        } catch {
          if (currentRoute(route)) state.setupChatFailed = true;
        }
      });
    else if (button.dataset.chatSetup) {
      chat?.close();
      void run(() => openPage('settings'));
    } else if (button.dataset.chatClose) {
      chat?.close();
      focusChatTrigger();
    } else if (button.dataset.chatNew) void chat?.start();
    else if (button.dataset.chatHistory) { chat?.close();void run(()=>openPage('history',true)); }
    else if (button.dataset.chatSession) {
      const target=chat,workspace=workspaceId(),version=routeVersion,id=button.dataset.chatSession;
      if(!target||target.pending||target.reading)return;
      void (async()=>{
        if(!target.visible)await target.open();
        if(chat===target&&workspaceId()===workspace&&routeVersion===version&&target.visible&&!target.pending)await target.read(id);
      })();
    }
    else if (button.dataset.chatStop) void chat?.cancel();
    else if (button.dataset.chatApproval)
      void chat?.decide(button.dataset.chatApproval, button.dataset.chatDecision);
    else if (button.dataset.chatLinkEntity)
      void run(() => navigateRecord(button.dataset.chatLinkEntity, button.dataset.chatLinkId));
    else if (button.dataset.workspaceHistory) {
      const target = workspaceHistory.target(Number(button.dataset.workspaceHistory));
      if (target) void run(() => openPage(target.page, true, target.index));
    } else if (button.dataset.page) void run(() => openPage(button.dataset.page, true, null, button.dataset.navTarget));
    else if (button.dataset.new) newRecord(button.dataset.new);
    else if (button.dataset.open)
      void run(() => navigateRecord(button.dataset.entity, button.dataset.open));
    else if (button.dataset.cancel) void cancelEditor();
    else if (button.dataset.back && ['gigs','tasks'].includes(state.page)) {
      const page = state.page, collection = page === 'tasks' ? tasks : gigs;
      if (!protectEditor(() => void run(() => openPage(page)))) return;
      leaveRoute();
      state.selected = null;
      state.editing = false;
      state.editorDraft = null;
      state.editorOrigin = null;
      void collection.open(workspaceId()).then(() => {
        if (state.page === page && !state.selected && !state.editing) {
          render();
          Array.from(root.querySelectorAll?.('[data-open]') || [])
            .find((row) => row.dataset.open === collection.state?.focusId)
            ?.focus?.({ preventScroll: true });
          scrollTo(0, collection.state?.scroll || 0);
        }
      });
    } else if (button.dataset.back && state.page === 'contacts')
      void run(() => openPage('contacts'));
    else if (button.dataset.back) {
      if (!protectEditor(() => void run(() => openPage(state.page)))) return;
      leaveRoute();
      state.selected = null;
      state.editing = false;
      state.editorDraft = null;
      state.editorOrigin = null;
      render();
      scrollTo(0, 0);
    } else if (button.dataset.edit) void enterEditor();
    else if (button.dataset.full) void run(() => refreshSelected());
    else if (button.dataset.sourceDetail) void run(() => refreshSelected(true));
    else if (button.dataset.gigPlace) void run(() => enterLinkEditor('locations'));
    else if (button.dataset.link) void run(() => enterLinkEditor());
    else if (button.dataset.linkMore)
      void run(() => loadLinkChoices(state.linkChoices.entity, state.linkChoices.nextCursor));
    else if (button.dataset.linkCancel) {
      leaveRoute();
      state.editing = false;
      render();
    } else if (button.dataset.relatedEntity)
      void run(() => navigateRecord(button.dataset.relatedEntity, button.dataset.relatedId));
    else if (button.dataset.backup)
      void run(async () => {
        const result = await bridge.createBackup(workspaceId());
        state.backupId = result?.backupId || result?.id || String(result);
        notice('Backup created. Keep its ID in a safe place.');
      });
    else if (button.dataset.relationsMore) {
      const record = state.selected;
      const route = readRoute();
      const recoverFocus = document.activeElement === button;
      const isCurrent = () => currentRoute(route) && state.selected === record;
      if (record)
        void loadRelationPage({
          call: bridge.call,
          workspaceId: workspaceId(),
          entity: state.page,
          record,
          isCurrent,
          onChange: () => {
            render();
            if (
              recoverFocus &&
              isCurrent() &&
              !record.relationsLoading &&
              document.activeElement === document.body
            )
              (
                root.querySelector('[data-relations-more]') ||
                root.querySelector('#linked-work-heading')
              )?.focus({ preventScroll: true });
          }
        });
    } else if (button.dataset.more) void run(() => loadMore());
    else if (button.dataset.agentProvider) {
      if (['codex', 'claude'].includes(button.dataset.agentProvider)) {
        state.agentProvider = button.dataset.agentProvider;
        render();
        root.querySelector(`[data-agent-provider="${state.agentProvider}"]`)?.focus();
      }
    } else if (button.dataset.copyAgent) {
      const value =
        button.dataset.copyAgent === 'prompt'
          ? state.agent?.starterPrompt
          : state.agentProvider === 'claude'
            ? state.agent?.claudeCommand
            : state.agent?.codexCommand;
      if (!value) {
        notice('Prepare the connector before copying.', true);
        return;
      }
      if (!globalThis.navigator?.clipboard?.writeText) {
        notice('Clipboard is unavailable. Select and copy the displayed text.', true);
        return;
      }
      void navigator.clipboard
        .writeText(value)
        .then(() => notice('Copied. Paste into Terminal or your agent as directed.'))
        .catch(() => notice('Could not copy. Select and copy the displayed text.', true));
    } else if (button.dataset.help)
      void run(() => bridge.call('help.open', { topic: button.dataset.help }));
    else if (button.dataset.prepareAgent)
      void run(async () => {
        state.agent = await bridge.prepareAgent();
        state.agentReceipt = await bridge.agentStatus();
        notice(
          'GiGi connector prepared. Follow the selected agent steps, then verify a real tool call.'
        );
      });
    else if (button.dataset.signIn) {
      const blocked = Object.values(state.sources).find(sourceSessionBlocked);
      if (blocked) {
        notice(sourceErrorMessage(blocked.detail), true);
        return;
      }
      const route = readRoute();
      state.signingIn = true;
      render();
      void bridge
        .signIn()
        .then(async () => {
          state.signingIn = false;
          state.sourceSignedOut = false;
          if (!currentRoute(route)) {
            render();
            return;
          }
          if (!(await openPage('settings'))) return;
          notice(
            sourceJourney(state.sources, state.sourceAttempts).next,
            Object.values(state.sources).some((source) => source?.detail === 'access_denied')
          );
        })
        .catch((error) => {
          state.signingIn = false;
          if (currentRoute(route)) notice(explain(error), true);
          else render();
        });
    } else if (button.dataset.sourceSignOut) {
      if (
        state.signingIn ||
        state.signingOut ||
        Object.keys(state.sourceBusy).length ||
        Object.values(state.imports).some(sourceImportRunning)
      )
        return;
      state.signingOut = true;
      void run(async () => {
        try {
          const receipt = await bridge.signOut();
          if (receipt?.signedOut !== true || receipt?.localOnly !== true)
            throw new Error('GiGi could not confirm sign-out. Check status before trying again.');
          state.sourceSignedOut = true;
          state.imports = {};
          state.sourceDrafts = {};
          state.sourceAttempts = {};
          state.connectionRequests = {};
          await openPage('settings');
        } finally {
          state.signingOut = false;
        }
      });
    } else if (button.dataset.sourceRefresh) void run(() => openPage('settings'));
    else if (button.dataset.sourceReconcile) {
      const route = readRoute();
      void run(async () => {
        const provider = button.dataset.sourceReconcile;
        if (sourceSessionBlocked(state.sources[provider]))
          throw new Error(sourceErrorMessage(state.sources[provider].detail));
        const accountId =
          pendingAccountForProvider(state.sources[provider], provider) ||
          state.sources[provider]?.connectedAccountId;
        if (!accountId) throw new Error('Check connection status after finishing consent.');
        await bridge.reconcileConnection(provider, accountId);
        delete state.sourceAttempts[provider];
        delete state.connectionRequests[provider];
        if (!currentRoute(route) || !(await openPage('settings'))) return;
        notice('Source account verified. Import records separately.');
      });
    } else if (button.dataset.sourcePreview)
      void sourceAction(button.dataset.sourcePreview, 'preview');
    else if (button.dataset.sourceFresh) void sourceAction(button.dataset.sourceFresh, 'fresh');
    else if (button.dataset.sourceCommit) void sourceAction(button.dataset.sourceCommit, 'commit');
    else if (button.dataset.sourceReceipt)
      void sourceAction(button.dataset.sourceReceipt, 'receipt');
    else if (button.dataset.sourceImportCancel)
      void sourceAction(button.dataset.sourceImportCancel, 'cancel');
    else if (button.dataset.contextSync)
      void run(async () => {
        await bridge.syncContext();
        notice('Local history synced. Search to see cited context.');
      });
    else if (button.dataset.openConsent)
      void run(async () => {
        const provider = button.dataset.openConsent;
        if (sourceSessionBlocked(state.sources[provider]))
          throw new Error(sourceErrorMessage(state.sources[provider].detail));
        const url = pendingConsentForProvider(
          state.sources[provider],
          state.sourceAttempts,
          provider
        );
        if (!url) throw new Error('Consent link is unavailable or expired. Check source status.');
        await bridge.openConsent(url, provider);
        notice('Consent page opened in your browser. Return here to verify the account.');
      });
    else if (button.dataset.sourceBegin)
      void run(async () => {
        const provider = button.dataset.sourceBegin;
        const source = state.sources[provider];
        if (!sourceCanBegin(source))
          throw new Error('Check source status before starting consent.');
        const requestId =
          source.reconnectable === true
            ? crypto.randomUUID()
            : state.connectionRequests[provider] || crypto.randomUUID();
        state.connectionRequests[provider] = requestId;
        delete state.sourceAttempts[provider];
        state.sources[provider] = { provider, state: 'pending' };
        const result = await bridge.beginConnection(provider, requestId);
        state.sourceAttempts[provider] = result;
        state.sources[provider] = {
          provider,
          state: 'pending',
          connectedAccountId: result.connectedAccountId
        };
        render();
      });
    else if (button.dataset.restoreToggle && !state.busy) {
      if (state.pendingRestoreId) {
        state.pendingRestoreId = null;
        render();
      } else {
        const form = document.querySelector('#restore-form');
        if (form) form.hidden = !form.hidden;
      }
    } else if (button.dataset.cancelRestore) {
      state.pendingRestoreId = null;
      render();
    } else if (button.dataset.confirmRestore && !state.busy && state.pendingRestoreId) {
      const backupId = state.pendingRestoreId;
      void run(async () => {
        const restored = await bridge.restoreBackup(backupId);
        state.pendingRestoreId = null;
        state.imports = {};
        state.contextHits = [];
        state.contextQueried = false;
        state.sourceAttempts = {};
        state.backupId = restored.safetyBackupId || null;
        await load();
        notice(
          'Backup restored. A safety backup was created; sync local history before relying on CTX results.'
        );
      });
    }
  });

  globalThis.document?.addEventListener?.('focusin', (event) => {
    if (
      chatRefreshFocus &&
      event.target !== document.body &&
      event.target !== document.documentElement &&
      event.target?.dataset?.chatRefresh === undefined
    )
      chatRefreshFocus = null;
  });
  globalThis.document?.addEventListener?.('pointerdown', () => {
    chatRefreshFocus = null;
  });
  (globalThis.document?.addEventListener ? document : root).addEventListener('keydown', (event) => {
    if (chatRefreshFocus && event.key === 'Tab') chatRefreshFocus = null;
    if (workspaceSearch.visible) {
      workspaceSearchKey(root, event, closeWorkspaceSearch);
      return;
    }
    if (workspaceSearchShortcut(event) && workspaceId() && !state.setupProfile && !pendingLeave) {
      event.preventDefault?.();
      openWorkspaceSearch();
      return;
    }
    if (state.page === 'gigs' && !state.selected && !state.editing && !chat?.visible) {
      if (event.target?.id === 'gigs-search' && event.key === 'Escape') {
        event.preventDefault?.();
        gigs.update({ query: '' }, false);
        root.querySelector?.('#gigs-search')?.focus?.();
        return;
      }
      if (event.key === 'Escape') {
        const filter = root.querySelector?.('.gigs-filters[open]');
        if (filter) {
          filter.open = false;
          filter.querySelector?.('summary')?.focus?.();
          event.preventDefault?.();
          return;
        }
      }
    }
    if (event.target?.id === 'tasks-search' && event.key === 'Escape' && state.page === 'tasks' && !state.selected && !state.editing && !chat?.visible) {
      event.preventDefault?.(); tasks.update({query:''},false); root.querySelector?.('#tasks-search')?.focus?.(); return;
    }
    if (event.target?.id === 'contact-search' && event.key === 'Escape') {
      event.preventDefault?.();
      searchContacts('', true);
      root.querySelector?.('#contact-search')?.focus?.();
      return;
    }
    if (pendingLeave) {
      if (event.key === 'Escape') {
        event.preventDefault?.();
        keepEditing();
      }
      if (event.key === 'Tab') {
        event.preventDefault?.();
        const keep = root.querySelector?.('[data-keep-editing]');
        const discard = root.querySelector?.('[data-discard-changes]');
        (document.activeElement === keep ? discard : keep)?.focus?.();
      }
      return;
    }
    if (event.metaKey && ['[', ']'].includes(event.key) && !chat?.visible) {
      const target = workspaceHistory.target(event.key === '[' ? -1 : 1);
      if (target) {
        event.preventDefault?.();
        void run(() => openPage(target.page, true, target.index));
      }
      return;
    }
    if (event.key === 'Escape' && !chat?.visible) {
      const more = root.querySelector?.('.reference-more[open]');
      if (more) {
        more.open = false;
        more.querySelector?.('summary')?.focus?.();
        event.preventDefault?.();
      }
    }
    if (event.key !== 'Escape' || !chat?.visible) return;
    event.preventDefault?.();
    chat.close();
    focusChatTrigger();
  });

  root.addEventListener('change', (event) => {
    if (event.target.id === 'ai-model') {
      ai.model = event.target.value;
      render();
      root.querySelector('#ai-model')?.focus?.();
      return;
    }
    const field = event.target?.dataset?.gigsField;
    if (!field) return;
    gigs.update(
      {
        [field]: ['status', 'type'].includes(field)
          ? gigsFilterValue(event.target.value)
          : event.target.value
      },
      false
    );
  });

  root.addEventListener(
    'toggle',
    (event) => {
      if (event.target.dataset?.libraryNav) state.libraryOpen = event.target.open;
    },
    true
  );

  root.addEventListener('change', (event) => {
    if (event.target.id === 'preferences-export-format') {
      preferencesExportChat = event.target.value === 'chat';
      if (preferencesExported)
        preferencesExported = exportPreferences(preferences, {
          includeChat: preferencesExportChat
        });
      render();
      root.querySelector('#preferences-export-format')?.focus?.({ preventScroll: true });
      return;
    }
    if (event.target.dataset?.preference) {
      const key = event.target.dataset.preference;
      if (Object.hasOwn(defaults, key) && key !== 'version')
        savePreferences({ ...preferences, [key]: event.target.value });
    } else if (event.target.id === 'link-entity')
      void run(() => loadLinkChoices(event.target.value));
  });
  root.addEventListener('input', (event) => {
    if (event.target.id === 'preferences-import') {
      preferencesDraft = event.target.value;
      return;
    }
    if (event.target.dataset?.sourceDate) {
      const provider = event.target.dataset.sourceDate,
        bound = event.target.dataset.bound;
      if (
        ['gmail', 'googlecalendar'].includes(provider) &&
        ['from', 'to'].includes(bound) &&
        !state.sourceBusy[provider]
      ) {
        state.sourceDrafts[provider] = {
          ...state.sourceDrafts[provider],
          [bound]: event.target.value
        };
        delete state.imports[provider];
        render();
      }
      return;
    }
    if (event.target.id === 'workspace-search-input') {
      workspaceSearch.update(event.target.value);
      return;
    }
    if (event.target.id === 'ai-message') {
      updateAiDraft(ai, event.target.value, root);
      render();
      return;
    }
    if (event.target.id === 'tasks-search') { tasks.update({query:event.target.value}); return; }
    if (event.target.id === 'gigs-search') {
      gigs.update({ query: event.target.value });
      return;
    }
    if (event.target.id === 'contact-search') {
      searchContacts(event.target.value);
      return;
    }
    if (event.target.id === 'chat-message' && chat) chat.draft = event.target.value;
    if (sourceProposal?.phase === 'draft') {
      if (event.target.id === 'source-proposal-title') sourceProposal.title = event.target.value;
      if (event.target.id === 'source-proposal-date') sourceProposal.date = event.target.value;
    }
  });

  root.addEventListener('submit', (event) => {
    if (event.target.closest?.('[data-creator-owned], [data-quest-owned]')) return;
    event.preventDefault();
    const form = event.target;
    const missing = Array.from(form.querySelectorAll('[data-gigi-required]')).find(
      (input) => !input.value
    );
    if (missing) {
      notice(missing.dataset.gigiRequired + ' is required.', true);
      missing.focus();
      return;
    }
    if (form.id === 'attention-settings') {
      if (attention?.pending || attention?.requestingPermission) return;
      const data = new FormData(form);
      const patch = {
        enabled: data.get('enabled') === 'on',
        reminders: data.get('reminders') === 'on',
        detailedPreviews: data.get('detailedPreviews') === 'on',
        quietStart: Number(data.get('quietStart')),
        quietEnd: Number(data.get('quietEnd'))
      };
      attentionSettingsDirty = false;
      attention.requestingPermission = true;
      renderAttention();
      void (async () => {
        if (patch.enabled) {
          try {
            const value = await bridge.call('notifications.request', {});
            attention.permission = value.permission || 'unknown';
            attention.alertsEnabled = value.alertsEnabled;
            if (attention.permission !== 'granted' || !value.alertsEnabled) patch.enabled = false;
          } catch {
            attention.permission = 'unknown';
            patch.enabled = false;
          }
        }
        attention.requestingPermission = false;
        await attention.saveSettings(patch);
        await bridge.call('notifications.send', { workspaceId: workspaceId() }).catch(() => {});
        if (!patch.enabled && data.get('enabled') === 'on')
          notice(
            'Desktop notifications are unavailable. Your attention feed remains available. Check macOS notification settings.',
            true
          );
        renderAttention(true);
      })();
      return;
    }

    if (state.busy) return;
    if (form.id === 'preferences-import-form') {
      try {
        savePreferences(
          importPreferences(preferencesDraft),
          'Configuration imported. Your starting page applies next time GiGi opens.'
        );
      } catch (error) {
        preferencesFeedback = { message: explain(error), error: true };
        render();
        root.querySelector?.('#preferences-import')?.focus?.();
      }
    } else if (form.id === 'source-proposal-form') {
      if (!sourceProposal || sourceProposal.phase !== 'draft') return;
      const values = Object.fromEntries(new FormData(form));
      sourceProposal.title = String(values.title || '');
      sourceProposal.date = String(values.date || '');
      try {
        sourceProposal = reviewSourceDraft(sourceProposal, values);
        render();
      } catch (error) {
        notice(explain(error), true);
      }
    } else if (form.id === 'chat-form') {
      const value = String(new FormData(form).get('message') || '');
      if (chat) {
        chat.draft = value;
        void chat.send(value);
      }
    } else if (form.id === 'record-form') {
      const data = Object.fromEntries(new FormData(form));
      state.editorDraft = { ...data };
      const route = readRoute(),
        selected = state.selected;
      submittedEditor = { version: route.version, values: { ...data } };
      void run(async () => {
        const title = String(data.title).trim();
        delete data.title;
    const chosenCurrency = data.__workspaceCurrency; delete data.__workspaceCurrency;
    const hasMoney = Object.entries(data).some(([field,value]) => moneyFields.has(field) && String(value ?? '').trim() !== '');
    if (!state.currency && route.page !== 'profile' && (chosenCurrency || hasMoney)) {
      if (!['USD','CAD','EUR','GBP'].includes(chosenCurrency)) throw new Error('Choose your currency below before saving an amount. Your draft is kept.');
      const profiles = listFrom(await bridge.listRecords(route.workspace,'profile'));
      if (!profiles[0]) throw new Error('Open your Profile and choose a currency before saving money. Your draft is kept.');
      const profile = await bridge.getRecord(route.workspace,'profile',profiles[0].id);
      const updated = await bridge.saveRecord(route.workspace,'profile',{id:profile.id,title:profile.title,fieldsMode:'replace',expectedRecord:{title:profile.title,fields:profile.fields,source:profile.source},fields:{...profile.fields,Currency:chosenCurrency}});
      state.currency = updated.fields?.Currency || null; state.currencyKnown = true; currencyVersion++;
      if (state.currency !== chosenCurrency) throw new Error('The currency could not be confirmed. Your money record has not been saved.');
    }
        const saved = await bridge.saveRecord(route.workspace, route.page, {
          ...(selected?.id
            ? {
                id: selected.id,
                fieldsMode: 'replace',
                expectedRecord: {
                  title: selected.title,
                  fields: selected.fields,
                  source: selected.source
                }
              }
            : {}),
          title,
          fields: selected?.id
            ? editedFields(selected.fields, data, route.page)
            : recordFields(data, route.page)
        });
        if (route.page === 'gigs' && route.workspace === workspaceId()) gigs.invalidate();
        if (route.page === 'tasks' && route.workspace === workspaceId()) tasks.invalidate();
        if (route.page === 'profile' && route.workspace === workspaceId()) {
          state.currency = saved.fields?.Currency || null;
          state.currencyKnown = true;
          currencyVersion++;
        }
        if (!currentRoute(route)) return;
        state.editing = false;
        state.editorDraft = null;
        if (!(await openPage(route.page))) return;
        if (!(await selectRecord(saved.id || saved.record?.id, route.page))) return;
        notice(`${entityName(route.page)} saved.`);
      }).finally(() => {
        if (submittedEditor?.version === route.version) submittedEditor = null;
      });
    } else if (form.id === 'link-form') submitLink(Object.fromEntries(new FormData(form)));
    else if (form.id === 'restore-form') {
      const backupId = String(new FormData(form).get('backupId')).trim();
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(backupId)) {
        notice('Enter a valid backup ID.', true);
        return;
      }
      state.pendingRestoreId = backupId;
      render();
    } else if (form.id === 'context-form')
      void run(async () => {
        const query = String(new FormData(form).get('query')).trim();
        state.contextHits = await bridge.searchContext(query, 5);
        state.contextQueried = true;
      });
  });

  // A terminal response can arrive while its text is selected. Reconcile the
  // withheld answer once selection clears, even after response polling stops.
  globalThis.document?.addEventListener?.('selectionchange', () => {
    if (!chat?.visible || !root.querySelector?.('.chat-answer[data-chat-selection-deferred]'))
      return;
    const selection = globalThis.document.getSelection?.();
    const panel = root.querySelector?.('.chat-panel');
    if (
      selection &&
      !selection.isCollapsed &&
      (panel?.contains(selection.anchorNode) || panel?.contains(selection.focusNode))
    )
      return;
    renderChat();
  });
  if (initialize) initialize(context());
  else
    void load().catch((error) => {
      state.startupError = explain(error);
      render();
    });

  root.addEventListener('change', (event) => {
    if (event.target?.closest?.('#attention-settings')) attentionSettingsDirty = true;
  });
  globalThis.addEventListener?.('focus', () => {
    void processNotificationOpen();
    void attention?.refresh();
    void bridge
      .call('notifications.status', {})
      .then((value) => {
        if (attention) {
          attention.permission = value.permission || 'unknown';
          attention.alertsEnabled = value.alertsEnabled;
          renderAttention();
        }
      })
      .catch(() => {});
  });
  globalThis.addEventListener?.('beforeunload', () => {
    attention?.stop();
    notificationUnlisten?.();
  });

  root.addEventListener(
    'scroll',
    (event) => {
      if (
        event.target?.classList?.contains('chat-transcript') &&
        event.target.scrollHeight - event.target.scrollTop - event.target.clientHeight < 48
      ) {
        const latest = root.querySelector?.('[data-chat-latest]');
        if (latest) latest.hidden = true;
      }
    },
    true
  );

  function context() {
    const memoryWorkspace = workspaceId();
    if (!memoryControllers.has(memoryWorkspace)) {
      memoryControllers.set(memoryWorkspace, createWorkspaceMemory({
        call: bridge.call,
        workspaceId: () => memoryWorkspace,
        changed: () => { if (workspaceId() === memoryWorkspace) render(); },
        notice: (message) => { if (workspaceId() === memoryWorkspace) notice(message); }
      }));
    }
    const memoryController = memoryControllers.get(memoryWorkspace);
    return {
      state,
      memory: memoryController,
      preferences,
      preferencesDraft,
      preferencesExported,
      preferencesExportChat,
      preferencesFeedback,
      ai,
      attention,
      gigs: gigs.state,
      tasks: tasks.state,
      devQuest,
      chat,
      workspaceSearch,
      sourceProposal,
      pendingLeave,
      routeVersion,
      workspaceHistory,
      workspaceId: workspaceId(),
      bridge,
      actions: {
        render,
        renderChat,
        run,
        openPage,
        navigateRecord,
        selectRecord,
        sourceAction,
        notice,
        savePreferences,
        restorePreferences,
        submitLink,
        keepEditing,
        closeWorkspaceSearch,
        openWorkspaceSearch,
        initializeChat,
        updateGigs(patch) {
          gigs.update(patch, false);
        },
        setCreatorMount(value) {
          creatorMount = value;
        },
        setAttention(value) {
          attention = value;
        },
        setChat(value) {
          chat = value;
        },
        setSourceProposal(value) {
          sourceProposal = value;
        },
        setPreferences(value) {
          preferences = value;
          applyPreferences(preferences);
        },
        snapshot: context
      }
    };
  }
  return context();
}
