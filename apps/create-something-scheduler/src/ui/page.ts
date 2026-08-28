import {
  PERFORMANCE_DOCUMENT_STYLE_VERSION,
  performanceDocumentCss,
  performanceDocumentFontLinks
} from '@create-something/canon/performance/scheduler-document';

export function renderBookingManagementActions(status: string): string {
  return status === 'cancelled'
    ? ''
    : '<div class="actions"><button id="reschedule" type="button">Choose another time</button><button id="cancel" class="danger" type="button">Cancel meeting</button></div><div id="confirm-action"></div>';
}

type SchedulerPageOffer = {
  metaDescription: string;
  title: string;
  heading: string;
  lede: string;
  policy: string;
};

const workflowMappingOffer: SchedulerPageOffer = {
  metaDescription:
    'Schedule a verified 30- or 60-minute workflow mapping session with Micah Johnson.',
  title: 'Workflow Mapping Session | CREATE SOMETHING',
  heading: 'Map One Workflow',
  lede:
    'Choose an open time for a focused, 30- or 60-minute workflow mapping session with Micah Johnson. Bring one real handoff, its decision owner, and the proof your team needs next.',
  policy: 'Workflow Mapping / V2'
};

const compilerIntegrationOffer: SchedulerPageOffer = {
  metaDescription:
    'Schedule a verified 30- or 60-minute Workflow Compiler Integration fit call with Micah Johnson.',
  title: 'Workflow Compiler Integration Fit Call | CREATE SOMETHING',
  heading: 'Fit One Integration',
  lede:
    'Choose an open time for a focused, 30- or 60-minute integration fit call with Micah Johnson. Bring one repository, one consequential workflow, and the required MCP or agent tool boundary.',
  policy: 'Compiler Integration / V1'
};

export function resolveSchedulerPageOffer(intent: string | null | undefined): SchedulerPageOffer {
  return intent === 'compiler-integration' ? compilerIntegrationOffer : workflowMappingOffer;
}

export function schedulerPage(input: {
  nonce: string;
  turnstileSiteKey?: string;
  intent?: string | null;
}): string {
  const offer = resolveSchedulerPageOffer(input.intent);
  const offerIntent = input.intent === 'compiler-integration' ? input.intent : null;
  const configuration = JSON.stringify({
    turnstileSiteKey: input.turnstileSiteKey ?? null
  }).replaceAll('<', '\\u003c');
  const siteKeyAttribute = escapeHtmlAttribute(input.turnstileSiteKey ?? '');
  const turnstileScript = input.turnstileSiteKey
    ? '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>'
    : '';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${offer.metaDescription}">
  <title>${offer.title}</title>
  ${performanceDocumentFontLinks}
  ${turnstileScript}
  <style nonce="${input.nonce}">
    ${performanceDocumentCss}
    * { box-sizing:border-box; }
    body { margin:0; min-width:320px; min-height:100vh; background-color:var(--color-performance-paper); background-image:linear-gradient(var(--color-performance-grid) 1px,transparent 1px),linear-gradient(90deg,var(--color-performance-grid) 1px,transparent 1px); background-size:40px 40px; color:var(--color-performance-ink); font-size:16px; line-height:1.5; }
    main { width:min(1360px,100%); margin:0 auto; padding:clamp(16px,4vw,56px); }
    .system-bar { display:grid; grid-template-columns:repeat(4,1fr); border:1px solid var(--color-performance-line); background:var(--color-performance-panel); }
    .system-bar > div { display:grid; gap:7px; min-width:0; padding:13px 16px; border-right:1px solid var(--color-performance-line); }
    .system-bar > div:last-child { border-right:0; }
    .system-bar span,.detail span,.field-label { color:var(--color-performance-muted); font:700 9px/1.2 var(--font-mono); letter-spacing:.07em; text-transform:uppercase; }
    .system-bar strong { font:700 12px/1.2 var(--font-mono); text-transform:uppercase; }
    .state-controlled { display:flex; gap:8px; align-items:center; }
    .state-controlled::before { width:8px; height:8px; background:var(--color-performance-signal); content:""; }
    header { display:grid; grid-template-columns:minmax(0,1.45fr) minmax(280px,.55fr); gap:clamp(28px,6vw,80px); align-items:end; margin:20px 0 32px; padding:clamp(28px,5vw,64px); border-bottom:5px solid var(--color-performance-signal); background:var(--color-performance-ink); color:white; }
    .eyebrow { color:#8fc1f2; font:700 10px/1 var(--font-mono); letter-spacing:.1em; text-transform:uppercase; }
    h1 { margin:16px 0 0; max-width:850px; font-size:clamp(2.7rem,7.4vw,6.7rem); text-transform:uppercase; }
    .hero-spec { display:grid; gap:22px; align-self:stretch; padding-left:22px; border-left:1px solid rgba(255,255,255,.24); }
    .lede { margin:0; max-width:460px; color:rgba(255,255,255,.72); font-size:clamp(1rem,1.8vw,1.25rem); }
    .spec-grid { display:grid; border-top:1px solid rgba(255,255,255,.24); }
    .spec-row { display:grid; grid-template-columns:88px 1fr; gap:12px; padding:10px 0; border-bottom:1px solid rgba(255,255,255,.16); }
    .spec-row span { color:rgba(255,255,255,.5); font:700 9px/1.2 var(--font-mono); letter-spacing:.07em; text-transform:uppercase; }
    .spec-row strong { font:700 10px/1.2 var(--font-mono); text-transform:uppercase; }
    .layout { display:grid; grid-template-columns:minmax(0,1fr) minmax(280px,360px); gap:24px; align-items:start; }
    .panel { min-width:0; padding:24px; border:1px solid var(--color-performance-line); border-top:4px solid var(--color-performance-ink); background:var(--color-performance-panel); }
    .details { display:grid; position:sticky; top:24px; border:1px solid var(--color-performance-line); border-top:4px solid var(--color-performance-ink); background:var(--color-performance-panel); }
    .detail { display:grid; grid-template-columns:92px 1fr; gap:14px; padding:16px 18px; border-bottom:1px solid var(--color-performance-line); }
    .detail:last-child { border-bottom:0; }
    h2 { margin:0 0 18px; font-size:clamp(1.35rem,2.4vw,2rem); text-transform:uppercase; }
    .steps { display:grid; grid-template-columns:repeat(3,1fr); margin:0 0 24px; border:1px solid var(--color-performance-line); background:var(--color-performance-paper); }
    .steps span { padding:11px 12px; border-right:1px solid var(--color-performance-line); color:var(--color-performance-muted); font:700 9px/1.2 var(--font-mono); letter-spacing:.06em; text-transform:uppercase; }
    .steps span:last-child { border-right:0; }
    .steps span[aria-current="step"] { background:var(--color-performance-ink); color:white; box-shadow:inset 4px 0 var(--color-performance-signal); }
    .duration-picker { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:0 0 18px; padding:0; border:0; }
    .duration-picker legend { grid-column:1/-1; margin:0 0 2px; padding:0; color:var(--color-performance-muted); font:700 9px/1.2 var(--font-mono); letter-spacing:.07em; text-transform:uppercase; }
    .duration-picker button[aria-pressed="true"] { background:var(--color-performance-ink); box-shadow:inset 5px 0 var(--color-performance-signal); }
    #status { display:grid; grid-template-columns:100px 1fr; min-height:48px; margin:0 0 24px; padding:13px 16px; border-left:5px solid var(--color-performance-signal); background:var(--color-performance-signal-soft); color:var(--color-performance-ink); }
    #status[data-kind="ready"] { border-color:var(--color-performance-ready); background:var(--color-performance-ready-soft); }
    #status[data-kind="review"] { border-color:var(--color-performance-review); background:var(--color-performance-review-soft); }
    #status[data-kind="stop"] { border-color:var(--color-performance-stop); background:var(--color-performance-stop-soft); color:var(--color-performance-stop); }
    #status-state { align-self:center; font:800 10px/1 var(--font-mono); letter-spacing:.08em; text-transform:uppercase; }
    #status-message { align-self:center; }
    .days { display:grid; gap:22px; }
    .date-rail { display:grid; grid-template-columns:repeat(4,1fr); border-top:1px solid var(--color-performance-line); border-left:1px solid var(--color-performance-line); }
    .date-tab { display:grid; place-items:start; gap:7px; min-height:72px; padding:12px; border:0; border-right:1px solid var(--color-performance-line); border-bottom:1px solid var(--color-performance-line); background:var(--color-performance-paper); text-align:left; }
    .date-tab[aria-selected="true"] { background:var(--color-performance-ink); color:white; box-shadow:inset 4px 0 var(--color-performance-signal); }
    .date-name { font:800 11px/1 var(--font-mono); text-transform:uppercase; }
    .date-count { color:var(--color-performance-muted); font:700 9px/1.2 var(--font-mono); text-transform:uppercase; }
    .date-tab[aria-selected="true"] .date-count { color:rgba(255,255,255,.66); }
    .time-panel { display:grid; gap:14px; }
    .day { display:grid; gap:12px; }
    .day-head { display:flex; justify-content:space-between; gap:16px; align-items:baseline; padding-bottom:8px; border-bottom:1px solid var(--color-performance-line); }
    .day h3 { margin:0; font:700 11px/1.2 var(--font-mono); letter-spacing:.05em; text-transform:uppercase; }
    .day-meta { color:var(--color-performance-muted); font:700 9px/1 var(--font-mono); letter-spacing:.05em; text-transform:uppercase; white-space:nowrap; }
    .slots { display:grid; grid-template-columns:repeat(auto-fill,minmax(112px,1fr)); gap:8px; }
    button,.button { appearance:none; display:inline-grid; place-items:center; min-height:44px; padding:11px 14px; border:1px solid var(--color-performance-ink); border-radius:0; background:var(--color-performance-panel); color:var(--color-performance-ink); font:700 11px/1 var(--font-mono); letter-spacing:.04em; text-decoration:none; text-transform:uppercase; cursor:pointer; }
    button:hover { background:var(--color-performance-ink); color:white; }
    button:focus-visible,.button:focus-visible,input:focus-visible { outline:3px solid var(--color-performance-signal); outline-offset:3px; }
    button[aria-pressed="true"] { border-color:var(--color-performance-signal); background:var(--color-performance-signal); color:white; box-shadow:inset 4px 0 white; }
    button.primary { border-color:var(--color-performance-ink); background:var(--color-performance-ink); color:white; box-shadow:inset 5px 0 var(--color-performance-signal); }
    button.danger { border-color:var(--color-performance-stop); color:var(--color-performance-stop); }
    button.danger:hover,button.danger:focus-visible { background:var(--color-performance-stop); color:white; }
    button:disabled { cursor:not-allowed; opacity:.45; }
    form { display:grid; gap:16px; margin-top:30px; padding-top:24px; border-top:4px solid var(--color-performance-signal); }
    label { display:grid; gap:7px; color:var(--color-performance-muted); font:700 10px/1.2 var(--font-mono); letter-spacing:.06em; text-transform:uppercase; }
    input { width:100%; min-height:48px; padding:11px 12px; border:1px solid var(--color-performance-line-strong); border-radius:0; background:var(--color-performance-panel); color:var(--color-performance-ink); font:16px/1.3 var(--font-sans); }
    .actions { display:flex; flex-wrap:wrap; gap:10px; margin-top:18px; }
    .confirmation { display:grid; gap:18px; }
    .confirmation h2 { margin:0; font-size:clamp(2rem,5vw,4rem); text-transform:uppercase; }
    .receipt { overflow-wrap:anywhere; padding:16px; border:1px solid var(--color-performance-line); border-left:5px solid var(--color-performance-signal); background:var(--color-performance-paper); font:12px/1.6 var(--font-mono); text-transform:uppercase; }
    .proof-footer { display:grid; grid-template-columns:repeat(4,1fr); margin-top:24px; border:1px solid var(--color-performance-line); border-top:4px solid var(--color-performance-ready); background:var(--color-performance-panel); }
    .proof-footer > div { display:grid; gap:7px; min-width:0; padding:15px 18px; border-right:1px solid var(--color-performance-line); }
    .proof-footer > div:last-child { border-right:0; }
    .proof-footer span { color:var(--color-performance-muted); font:700 9px/1.2 var(--font-mono); letter-spacing:.07em; text-transform:uppercase; }
    .proof-footer strong { font-size:.85rem; }
    [hidden] { display:none !important; }
    @media (max-width:760px) { .system-bar,.proof-footer { grid-template-columns:repeat(2,1fr); } .system-bar > div:nth-child(2),.proof-footer > div:nth-child(2) { border-right:0; } .system-bar > div:nth-child(-n+2),.proof-footer > div:nth-child(-n+2) { border-bottom:1px solid var(--color-performance-line); } header { grid-template-columns:1fr; } .hero-spec { padding:20px 0 0; border-top:1px solid rgba(255,255,255,.24); border-left:0; } .layout { grid-template-columns:1fr; } .details { position:static; order:-1; } .detail { grid-template-columns:84px 1fr; } .panel { padding:18px; } #status { grid-template-columns:82px 1fr; } .date-rail { grid-template-columns:repeat(2,1fr); } .day-head { align-items:flex-start; flex-direction:column; gap:6px; } }
    @media (prefers-reduced-motion:no-preference) { button { transition:background-color .14s,color .14s,border-color .14s; } }
  </style>
</head>
<body data-performance-surface="booking" data-performance-contract="${PERFORMANCE_DOCUMENT_STYLE_VERSION}">
<main>
  <section class="system-bar" aria-label="Scheduler control state">
    <div><span>Surface</span><strong>Booking / 01</strong></div>
    <div><span>Mode</span><strong class="state-controlled">Controlled</strong></div>
    <div><span>Interfaces</span><strong>API + MCP</strong></div>
    <div><span>Proof</span><strong>Receipt issued</strong></div>
  </section>
  <header>
    <div><div class="eyebrow">CREATE SOMETHING · PERFORMANCE LAB · SCHEDULER</div><h1>${offer.heading}</h1></div>
    <div class="hero-spec"><p class="lede">${offer.lede}</p><div class="spec-grid"><div class="spec-row"><span>Policy</span><strong>${offer.policy}</strong></div><div class="spec-row"><span>Window</span><strong>28 Days / Live Conflicts</strong></div><div class="spec-row"><span>Calendar</span><strong>Google Calendar</strong></div></div></div>
  </header>
  <div class="layout">
    <section class="panel" aria-labelledby="booking-heading">
      <div id="scheduler-view">
        <nav class="steps" aria-label="Booking progress"><span data-step="1" aria-current="step">01 · Time</span><span data-step="2">02 · Details</span><span data-step="3">03 · Confirm</span></nav>
        <h2 id="booking-heading">Choose a time</h2>
        <fieldset class="duration-picker" aria-label="Meeting duration"><legend>Meeting duration</legend><button type="button" data-duration="30" aria-pressed="true">30 minutes</button><button type="button" data-duration="60" aria-pressed="false">60 minutes</button></fieldset>
        <p id="status" data-kind="controlled" role="status" aria-live="polite"><span id="status-state">Controlled</span><span id="status-message">Checking the calendar…</span></p>
        <div id="days" class="days" aria-label="Available meeting times"></div>
        <form id="identity" hidden>
          <h2>Your details</h2>
          <label>Name <input name="name" autocomplete="name" maxlength="100" required></label>
          <label>Email <input name="email" type="email" autocomplete="email" required></label>
          ${input.turnstileSiteKey ? `<div class="cf-turnstile" data-sitekey="${siteKeyAttribute}" data-callback="schedulerProofReady"></div>` : ''}
          <button class="primary" type="submit">Confirm this meeting</button>
        </form>
      </div>
      <div id="confirmation" class="confirmation" hidden></div>
    </section>
    <aside class="details" aria-label="Meeting details">
      <div class="detail"><span>Host</span><strong>Micah Johnson</strong></div>
      <div class="detail"><span>Length</span><strong id="duration-summary">30 minutes</strong></div>
      <div class="detail"><span>Where</span><strong>Google Meet</strong></div>
      <div class="detail"><span>Baseline</span><strong>Tue + Thu<br>11 AM–5 PM Central</strong></div>
      <div class="detail"><span>Selected</span><strong id="selected-summary">Choose a time</strong></div>
    </aside>
  </div>
  <footer class="proof-footer" aria-label="Scheduler proof contract">
    <div><span>Calendar</span><strong>Conflict checked</strong></div>
    <div><span>Commit</span><strong>Explicit intent</strong></div>
    <div><span>Evidence</span><strong>Receipt issued</strong></div>
    <div><span>Recovery</span><strong>Fail closed</strong></div>
  </footer>
</main>
<script nonce="${input.nonce}">
(() => {
  const renderBookingManagementActions=${renderBookingManagementActions.toString()};
  const config = ${configuration};
  const offerIntent=${JSON.stringify(offerIntent)};
  const state = { slots: [], selected: null, selectedDay: null, durationMinutes: 30, browserProof: null, booking: null, actionToken: null, mode: 'book', context: null, schedulerSessionId: crypto.randomUUID(), formStarted: false };
  const status = document.querySelector('#status');
  const statusState = document.querySelector('#status-state');
  const statusMessage = document.querySelector('#status-message');
  const days = document.querySelector('#days');
  const form = document.querySelector('#identity');
  const schedulerView = document.querySelector('#scheduler-view');
  const confirmation = document.querySelector('#confirmation');
  const selectedSummary = document.querySelector('#selected-summary');
  const durationSummary = document.querySelector('#duration-summary');
  const durationButtons = Array.from(document.querySelectorAll('[data-duration]'));
  const stepNodes = Array.from(document.querySelectorAll('[data-step]'));
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago';
  window.schedulerProofReady = token => { state.browserProof = token; };

  function schedulerContext(input) {
    if (!input || typeof input !== 'object') return null;
    const context={};
    for (const key of ['source','intent','lane','warmup','readiness','atlasSessionId']) {
      if (typeof input[key] === 'string' && input[key].trim()) context[key]=input[key].trim();
    }
    if (input.trafficClass === 'internal' || input.trafficClass === 'test') context.trafficClass=input.trafficClass;
    for (const key of ['score','agentMessages']) {
      if (Number.isInteger(Number(input[key]))) context[key]=Number(input[key]);
    }
    if (typeof input.warmupNotes === 'string' && input.warmupNotes.trim()) context.warmupNotes=input.warmupNotes.trim().slice(0,2000);
    return Object.keys(context).length ? context : null;
  }
  const query=new URLSearchParams(location.search);
  state.context=schedulerContext({source:query.get('source'),intent:query.get('intent'),lane:query.get('lane'),warmup:query.get('warmup'),readiness:query.get('readiness'),trafficClass:query.get('traffic_class'),score:query.get('score'),atlasSessionId:query.get('atlas_session_id'),agentMessages:query.get('agent_messages')});
  addEventListener('message',event=>{
    if (event.source !== parent || event.origin !== 'https://createsomething.agency') return;
    if (event.data?.type === 'create-something:scheduler-context') {
      state.context=schedulerContext(event.data.context);
      queueParentHeight();
      return;
    }
    if (event.data?.type === 'create-something:scheduler-access') {
      const access=schedulerAccess(event.data);
      if (!access) return;
      sessionStorage.setItem(tokenKey(access.bookingId),access.actionToken);
      restoreBooking(access.bookingId,access.actionToken);
    }
  });

  function schedulerAccess(input) {
    if (!input || typeof input !== 'object') return null;
    const bookingId=String(input.bookingId || '');
    const actionToken=String(input.actionToken || '');
    const expectedBookingId=query.get('booking');
    if (!expectedBookingId || bookingId !== expectedBookingId) return null;
    if (!/^[A-Za-z0-9_-]{1,200}$/.test(bookingId)) return null;
    if (!/^[A-Za-z0-9._~-]{16,4096}$/.test(actionToken)) return null;
    return {bookingId,actionToken};
  }

  function notifyParent(action, details={}) {
    if (parent === window || !['booking_form_started','booking_initiated','booking_completed'].includes(action)) return;
    parent.postMessage({
      type:'create-something:scheduler-lifecycle',
      action,
      schedulerSessionId:state.schedulerSessionId,
      ...(state.context?.trafficClass ? {trafficClass:state.context.trafficClass} : {}),
      ...details
    },'https://createsomething.agency');
  }

  let reportedDocumentHeight=0;
  function notifyParentHeight(force=false) {
    if (parent === window) return;
    const schedulerDocument=document.querySelector('body > main');
    if (!schedulerDocument) return;
    const height=Math.ceil(schedulerDocument.getBoundingClientRect().height);
    if (!Number.isFinite(height) || (!force && height === reportedDocumentHeight)) return;
    reportedDocumentHeight=height;
    parent.postMessage({type:'create-something:scheduler-resize',height},'https://createsomething.agency');
  }
  function queueParentHeight() { requestAnimationFrame(()=>notifyParentHeight(true)); }
  const schedulerResizeObserver=new ResizeObserver(()=>requestAnimationFrame(notifyParentHeight));
  const schedulerMutationObserver=new MutationObserver(()=>requestAnimationFrame(notifyParentHeight));
  const schedulerDocument=document.querySelector('body > main');
  if (schedulerDocument) {
    schedulerResizeObserver.observe(schedulerDocument);
    schedulerMutationObserver.observe(schedulerDocument,{attributes:true,childList:true,characterData:true,subtree:true});
  }
  addEventListener('load',notifyParentHeight,{once:true});
  requestAnimationFrame(notifyParentHeight);

  function setStatus(message, kind = 'controlled') { const labels={controlled:'Controlled',ready:'Ready',review:'Review',stop:'Stop'}; statusState.textContent=labels[kind] || 'Controlled'; statusMessage.textContent=message; status.dataset.kind=kind; }
  function updateSteps(current) { for (const step of stepNodes) { if (Number(step.dataset.step) === current) step.setAttribute('aria-current','step'); else step.removeAttribute('aria-current'); } }
  function idempotency(prefix) { return prefix + ':' + crypto.randomUUID(); }
  function formatTime(value) { return new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit',timeZone:timezone}).format(new Date(value)); }
  function formatDay(value) { return new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric',timeZone:timezone}).format(new Date(value)); }
  function formatWeekday(value) { return new Intl.DateTimeFormat(undefined,{weekday:'short',timeZone:timezone}).format(new Date(value)); }
  function formatDate(value) { return new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',timeZone:timezone}).format(new Date(value)); }
  function tokenKey(bookingId) { return 'scheduler:action:' + bookingId; }
  function canonicalBookingUrl(bookingId) { const params=new URLSearchParams({booking:bookingId}); if (offerIntent) params.set('intent',offerIntent); return location.pathname+'?'+params.toString(); }
  function slotDuration(slot) { return Math.round((new Date(slot.end).getTime()-new Date(slot.start).getTime())/60000); }
  function renderDuration() { durationSummary.textContent=state.durationMinutes+' minutes'; for (const button of durationButtons) { const active=Number(button.dataset.duration)===state.durationMinutes; button.setAttribute('aria-pressed',String(active)); button.disabled=state.mode==='reschedule'&&!active; } }

  for (const button of durationButtons) button.addEventListener('click',()=>{ if (state.mode==='reschedule') return; state.durationMinutes=Number(button.dataset.duration); renderDuration(); loadAvailability(); });

  async function api(path, options = {}) {
    const headers = { accept:'application/json', ...(options.body ? {'content-type':'application/json'} : {}), ...(options.headers || {}) };
    const response = await fetch(path,{...options,headers});
    const body = await response.json();
    if (!response.ok) throw Object.assign(new Error(body?.error?.message || body?.reason || 'The scheduler could not complete that request.'),{body,status:response.status});
    return body;
  }

  async function loadAvailability() {
    setStatus('Checking the calendar…','controlled');
    state.selected=null; state.selectedDay=null; selectedSummary.textContent='Choose a time'; updateSteps(1);
    days.replaceChildren();
    const from = new Date();
    const to = new Date(from.getTime() + 28 * 24 * 60 * 60 * 1000);
    try {
      const result = await api('/api/v1/availability?' + new URLSearchParams({from:from.toISOString(),to:to.toISOString(),timezone,durationMinutes:String(state.durationMinutes)}));
      state.slots = result.slots;
      renderSlots();
      setStatus(result.slots.length ? result.slots.length + ' verified '+state.durationMinutes+'-minute openings · ' + timezone.replaceAll('_',' ') + '.' : 'No open times in the next four weeks.',result.slots.length ? 'ready' : 'review');
      queueParentHeight();
    } catch (error) {
      setStatus(error.message + ' No time can be booked until Calendar is confirmed.', 'stop');
      queueParentHeight();
    }
  }

  function renderSlots() {
    const grouped = new Map();
    for (const slot of state.slots) {
      const key = formatDay(slot.start);
      if (!grouped.has(key)) grouped.set(key,[]);
      grouped.get(key).push(slot);
    }
    const entries=Array.from(grouped.entries());
    if (!state.selectedDay || !grouped.has(state.selectedDay)) state.selectedDay=entries[0]?.[0] || null;
    if (!state.selectedDay) { days.replaceChildren(); return; }
    const dateRail=document.createElement('div'); dateRail.className='date-rail'; dateRail.setAttribute('role','tablist'); dateRail.setAttribute('aria-label','Available dates');
    for (const [label,slots] of entries) {
      const tab=document.createElement('button'); tab.type='button'; tab.className='date-tab'; tab.setAttribute('role','tab'); tab.setAttribute('aria-selected',String(label===state.selectedDay));
      const name=document.createElement('span'); name.className='date-name'; name.textContent=formatWeekday(slots[0].start)+' · '+formatDate(slots[0].start);
      const count=document.createElement('span'); count.className='date-count'; count.textContent=slots.length+' openings';
      tab.append(name,count); tab.addEventListener('click',()=>{ state.selectedDay=label; state.selected=null; form.hidden=true; selectedSummary.textContent='Choose a time'; updateSteps(1); renderSlots(); setStatus(slots.length+' openings on '+label+'.','ready'); }); dateRail.append(tab);
    }
    const activeIndex=entries.findIndex(([label])=>label===state.selectedDay);
    const activeSlots=grouped.get(state.selectedDay) || [];
    const timePanel=document.createElement('section'); timePanel.className='time-panel';
    const heading = document.createElement('h3'); heading.textContent=state.selectedDay;
    const meta = document.createElement('span'); meta.className='day-meta'; meta.textContent='Trial '+String(activeIndex+1).padStart(2,'0')+' · '+activeSlots.length+' openings';
    const head = document.createElement('div'); head.className='day-head'; head.append(heading,meta);
    const list = document.createElement('div'); list.className='slots';
    for (const slot of activeSlots) {
        const button = document.createElement('button'); button.type='button'; button.textContent=formatTime(slot.start);
        button.setAttribute('aria-pressed',String(state.selected?.start === slot.start));
        button.addEventListener('click',()=>selectSlot(slot)); list.append(button);
    }
    timePanel.append(head,list); days.replaceChildren(dateRail,timePanel);
  }

  function selectSlot(slot) {
    state.selected = slot; renderSlots();
    if (state.mode === 'reschedule') { renderRescheduleConfirmation(); return; }
    form.hidden = false; form.querySelector('input').focus();
    selectedSummary.textContent=formatDay(slot.start)+' · '+formatTime(slot.start)+' · '+state.durationMinutes+' min'; updateSteps(2);
    setStatus('Selected ' + formatDay(slot.start) + ' at ' + formatTime(slot.start) + ' for '+state.durationMinutes+' minutes.','review');
    if (!state.formStarted) { state.formStarted=true; notifyParent('booking_form_started',{durationMinutes:state.durationMinutes}); }
    queueParentHeight();
  }

  form.addEventListener('submit',async event => {
    event.preventDefault();
    if (!state.selected) return;
    if (config.turnstileSiteKey && !state.browserProof) { setStatus('Complete the verification before booking.','review'); return; }
    const submit = form.querySelector('button[type=submit]'); submit.disabled=true; updateSteps(3); setStatus('Confirming your meeting…','controlled');
    notifyParent('booking_initiated',{durationMinutes:state.durationMinutes});
    try {
      const data = new FormData(form);
      const prepared = await api('/api/v1/bookings/prepare',{method:'POST',body:JSON.stringify({slot:state.selected,scheduler:{name:data.get('name'),email:data.get('email')},...(state.context?{context:state.context}:{})})});
      const committed = await api('/api/v1/bookings',{method:'POST',headers:{'x-browser-proof':state.browserProof || ''},body:JSON.stringify({proposalToken:prepared.proposalToken,idempotencyKey:idempotency('browser-book'),explicitIntent:true})});
      state.booking=committed.booking; state.actionToken=committed.actionToken;
      sessionStorage.setItem(tokenKey(state.booking.bookingId),state.actionToken);
      history.replaceState({},'',canonicalBookingUrl(state.booking.bookingId));
      notifyParent('booking_completed',{bookingId:state.booking.bookingId,receiptId:committed.receiptId,durationMinutes:state.durationMinutes});
      showBooking(committed);
    } catch (error) { setStatus(error.message,'stop'); submit.disabled=false; }
  });

  function showBooking(result) {
    state.durationMinutes=slotDuration(result.booking.slot); renderDuration();
    updateSteps(3); schedulerView.hidden=true; confirmation.hidden=false;
    const managementActions=renderBookingManagementActions(result.booking.status);
    const canManageBooking=Boolean(managementActions);
    confirmation.innerHTML='<div class="eyebrow">'+escapeHtml(result.status)+'</div><h2>Your meeting is '+escapeHtml(result.status)+'.</h2><p>'+escapeHtml(formatDay(result.booking.slot.start))+' at '+escapeHtml(formatTime(result.booking.slot.start))+' · '+escapeHtml(state.durationMinutes)+' minutes · '+timezone.replaceAll('_',' ')+'</p><p><a class="button" href="'+escapeAttribute(result.booking.provider.meetUrl)+'">Open Google Meet</a></p><div class="receipt">Booking '+escapeHtml(result.booking.bookingId)+'<br>Receipt '+escapeHtml(result.receiptId)+'</div>'+managementActions;
    if (canManageBooking) {
      confirmation.querySelector('#reschedule').addEventListener('click',()=>{ state.mode='reschedule'; renderDuration(); confirmation.hidden=true; schedulerView.hidden=false; form.hidden=true; state.selected=null; loadAvailability(); });
      confirmation.querySelector('#cancel').addEventListener('click',()=>{
        confirmation.querySelector('#confirm-action').innerHTML='<p>Cancel this meeting for everyone?</p><button id="confirm-cancel" class="danger" type="button">Confirm cancellation</button>';
        confirmation.querySelector('#confirm-cancel').addEventListener('click',cancelBooking);
      });
    }
    queueParentHeight();
  }

  function renderRescheduleConfirmation() {
    form.hidden=true;
    setStatus('Move to '+formatDay(state.selected.start)+' at '+formatTime(state.selected.start)+'?','review');
    let button=document.querySelector('#move-meeting');
    if (!button) { button=document.createElement('button'); button.id='move-meeting'; button.type='button'; button.className='primary'; button.textContent='Move this meeting'; button.addEventListener('click',rescheduleBooking); days.after(button); }
    queueParentHeight();
  }

  async function rescheduleBooking() {
    if (!state.booking || !state.selected) return;
    try {
      const result=await api('/api/v1/bookings/'+encodeURIComponent(state.booking.bookingId)+'/reschedule',{method:'POST',headers:{'x-booking-action-token':state.actionToken},body:JSON.stringify({newSlot:state.selected,idempotencyKey:idempotency('browser-reschedule'),explicitIntent:true})});
      state.booking=result.booking; state.actionToken=result.actionToken;
      sessionStorage.setItem(tokenKey(state.booking.bookingId),state.actionToken);
      document.querySelector('#move-meeting')?.remove(); showBooking(result);
    } catch(error) { setStatus(error.message,'stop'); }
  }

  async function cancelBooking() {
    try {
      const result=await api('/api/v1/bookings/'+encodeURIComponent(state.booking.bookingId)+'/cancel',{method:'POST',headers:{'x-booking-action-token':state.actionToken},body:JSON.stringify({idempotencyKey:idempotency('browser-cancel'),explicitIntent:true})});
      state.booking=result.booking; showBooking(result);
    } catch(error) { confirmation.querySelector('#confirm-action').textContent=error.message; }
  }

  async function restoreBooking(bookingId, suppliedToken) {
    const token=suppliedToken || sessionStorage.getItem(tokenKey(bookingId)); if (!token) { loadAvailability(); return; }
    try { const result=await api('/api/v1/bookings/'+encodeURIComponent(bookingId),{headers:{'x-booking-action-token':token}}); state.booking=result.booking; state.actionToken=token; showBooking(result); }
    catch { sessionStorage.removeItem(tokenKey(bookingId)); loadAvailability(); }
  }

  function escapeHtml(value) { const node=document.createElement('span'); node.textContent=String(value); return node.innerHTML; }
  function escapeAttribute(value) { return String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;'); }
  const bookingId=new URLSearchParams(location.search).get('booking'); bookingId ? restoreBooking(bookingId) : loadAvailability();
})();
</script>
</body>
</html>`;
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
