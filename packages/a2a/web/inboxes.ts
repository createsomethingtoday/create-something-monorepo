import { agentLabel, agentOptions, membershipOptions } from './agent-options';
import { startSharedMotion } from './shared-motion';
import { groupMessages, isAuthorlessNotice } from './message-groups';
import { messageParts, messagePreview, messageResultExcerpt } from './message-content';
import './styles.css';
import './inboxes.css';
import type {
  SharedAgent,
  SharedInbox,
  SharedConnection,
  SharedInvitation,
  SharedMembership,
  SharedMessage,
  SharedContext,
  SharedPage
} from '../src/shared-types';

type Inbox = Omit<SharedInbox, 'owner_subject'> & {
  isOwner: boolean;
  views?: {
    agent_id: string;
    name: string;
    generation: number;
    admission_cursor: number;
    capabilities: string;
  }[];
};
type Member = SharedMembership & { name?: string; owner_subject?: string; paused?: number };
type Invitation = SharedInvitation & {
  inbox_name?: string;
  inviter_subject?: string;
  members?: Member[];
};
type Me = { subject: string; email: string; displayName?: string };
const $ = <T extends HTMLElement = HTMLElement>(id: string) => {
  const n = document.getElementById(id);
  if (!n) throw new Error(`Missing ${id}`);
  return n as T;
};
const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '', cls = '') => {
  const n = document.createElement(tag);
  n.textContent = text;
  if (cls) n.className = cls;
  return n;
};
const state = {
  me: null as Me | null,
  agents: [] as SharedAgent[],
  inboxes: [] as Inbox[],
  connections: [] as SharedConnection[],
  invitations: [] as Invitation[],
  inboxId: '',
  viewAgentId: '',
  pane: 'conversation',
  members: [] as Member[],
  messages: [] as SharedMessage[],
  context: [] as SharedContext[],
  nextAfter: null as number | null,
  hasMore: false,
  generation: 0
};
const caps = ['read', 'post', 'work'];
// In-memory only: no message content is written to browser storage.
const drafts = new Map<string, { text: string; kind: string; assignee: string }>();
const contextDrafts = new Map<string, { title: string; text: string }>();
let authSessionGeneration = 0;
function clearContextDrafts() {
  contextDrafts.clear();
  authSessionGeneration++;
}
const sendAttempts = new Map<string, { key: string; payload: string }>();
// Tab memory only. Store open keys, never message content; session/logout clears them.
const openNoticeGroups = new Set<string>();
const openMessageBodies = new Set<string>();
let noticeSessionGeneration = 0;
function clearNoticeGroups() {
  openNoticeGroups.clear();
  openMessageBodies.clear();
  noticeSessionGeneration++;
}
const noticeGroupSavers = new WeakMap<HTMLDetailsElement, () => void>();
const messageBodySavers = new WeakMap<HTMLDetailsElement, () => void>();
function rememberNoticeGroups() {
  for (const group of document.querySelectorAll<HTMLDetailsElement>('.notice-group')) {
    noticeGroupSavers.get(group)?.();
  }
  for (const body of document.querySelectorAll<HTMLDetailsElement>('.message-body')) {
    messageBodySavers.get(body)?.();
  }
}
function focusMessage(id: string) {
  const message = document.getElementById(`message-${id}`);
  for (let parent = message?.parentElement; parent; parent = parent.parentElement) {
    if (parent instanceof HTMLDetailsElement) parent.open = true;
  }
  const body = message?.querySelector<HTMLDetailsElement>('.message-body');
  if (body) {
    body.open = true;
    messageBodySavers.get(body)?.();
  }
  message?.focus();
}
let pendingReview: ((confirmed: boolean) => void) | undefined;
let reviewInvoker: HTMLElement | null = null;
class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}
async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const r = await fetch(`/api/v2${path}`, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok)
    throw new ApiError(r.status, data.error?.message ?? `Request failed (${r.status}). Try again.`);
  return data as T;
}
function items<T>(data: T[] | Record<string, T[]>): T[] {
  return Array.isArray(data) ? data : (Object.values(data).find(Array.isArray) ?? []);
}
function notice(text: string, error = false) {
  const n = $('notice');
  n.textContent = text;
  n.dataset.tone = error ? 'error' : 'success';
  n.hidden = false;
}
function fail(error: unknown) {
  if (error instanceof ApiError && error.status === 401) {
    session(
      'Sign in to open your shared inboxes.',
      'Your verified CREATE SOMETHING account controls your agents and memberships.'
    );
    return;
  }
  notice(
    error instanceof Error ? error.message : 'Could not complete the request. Try again.',
    true
  );
}
function button(text: string, fn: () => void, primary = false) {
  const b = node('button', text, `button button-small${primary ? ' button-primary' : ''}`);
  b.type = 'button';
  b.addEventListener('click', fn);
  return b;
}
function agentsNavigation(label = 'Manage your agents') {
  return button(label, () =>
    document.querySelector<HTMLButtonElement>('[data-view="agents"]')?.click()
  );
}
function para(text: string, cls = 'small') {
  return node('p', text, cls);
}
function messageBody(message: SharedMessage, nextId?: string) {
  const body = node('p', '', 'message-text');
  for (const part of messageParts(message.text)) {
    if (part.href) {
      const link = node('a', part.text);
      link.href = part.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.title = 'Opens in a new tab';
      body.append(link);
    } else body.append(document.createTextNode(part.text));
  }
  const preview = messagePreview(message.text);
  if (preview === null) return body;
  const wrapper = node('div', '', 'message-reading');
  const disclosure = node('details', '', 'message-body');
  const subject = state.me?.subject;
  const sessionGeneration = noticeSessionGeneration;
  const key = JSON.stringify([subject, state.inboxId, state.viewAgentId, message.id]);
  disclosure.open = openMessageBodies.has(key);
  const summary = node('summary');
  const kind = message.kind === 'request' ? 'request' : 'message';
  summary.append(
    node('span', `Show full ${kind}`, 'when-collapsed'),
    node('span', `Hide full ${kind}`, 'when-expanded'),
    node(
      'span',
      ` · ${Array.from(message.text).length.toLocaleString()} characters`,
      'message-length'
    ),
    node('span', ` from ${messageAuthor(message)}, ${date(message.created_at)}`, 'sr-only')
  );
  disclosure.append(summary, body);
  const current = () =>
    disclosure.isConnected &&
    subject === state.me?.subject &&
    sessionGeneration === noticeSessionGeneration;
  const save = () => {
    if (!current()) return;
    if (disclosure.open) openMessageBodies.add(key);
    else openMessageBodies.delete(key);
  };
  messageBodySavers.set(disclosure, save);
  disclosure.addEventListener('toggle', save);
  const readingActions = node('div', '', 'message-body-tools');
  readingActions.setAttribute('role', 'group');
  readingActions.setAttribute('aria-label', `Full ${kind} navigation`);
  readingActions.append(
    button(`Collapse ${kind} ↑`, () => {
      if (!current()) return;
      disclosure.open = false;
      save();
      summary.focus({ preventScroll: true });
      summary.scrollIntoView({ block: 'nearest' });
    })
  );
  if (nextId)
    readingActions.append(
      button('Next message ↓', () => {
        if (!current()) return;
        focusMessage(nextId);
        document.getElementById(`message-${nextId}`)?.scrollIntoView({ block: 'start' });
      })
    );
  disclosure.append(readingActions);
  const resultExcerpt = messageResultExcerpt(message.text, message.kind);
  wrapper.append(
    para(
      resultExcerpt === null ? preview + '…' : `From message: “${resultExcerpt}”`,
      'message-excerpt'
    ),
    disclosure
  );
  return wrapper;
}
function tag(text: string) {
  const n = node('span', text.replaceAll('_', ' '), 'tag');
  n.dataset.tone = /revoked|failed|closed|deleted/.test(text)
    ? 'error'
    : /pending|awaiting|paused|expired|unknown|approval_required/.test(text)
      ? 'warning'
      : /active|completed|accepted/.test(text)
        ? 'success'
        : '';
  return n;
}
function date(n: number) {
  return new Date(n).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}
function agentName(id: string | null) {
  return (
    state.agents.find((a) => a.id === id)?.name ??
    state.members.find((a) => a.agent_id === id)?.name ??
    id ??
    'Verified owner'
  );
}
function visibleAgentName(id: string, historicalName?: string) {
  return agentLabel(
    id,
    [
      ...state.agents.map((a) => ({ value: a.id, label: a.name })),
      ...state.members.map((a) => ({ value: a.agent_id, label: a.name || a.agent_id }))
    ],
    historicalName
  );
}
function messageAuthor(message: SharedMessage) {
  return isAuthorlessNotice(message)
    ? 'Inbox activity'
    : message.author_agent_id
      ? visibleAgentName(message.author_agent_id, message.author_name || undefined)
      : message.author_name || 'Verified owner';
}
function field(label: string, name: string, kind = 'input', value = '') {
  const wrap = node('div', '', 'field');
  const id = `f-${name}`;
  const l = node('label', label);
  l.htmlFor = id;
  const input = kind === 'textarea' ? node('textarea') : node('input');
  input.id = id;
  input.name = name;
  input.value = value;
  wrap.append(l, input);
  return { wrap, input };
}
function selectField(
  label: string,
  name: string,
  options: { value: string; label: string }[],
  value = ''
) {
  const wrap = node('div', '', 'field');
  const l = node('label', label);
  l.htmlFor = `f-${name}`;
  const input = node('select');
  input.id = l.htmlFor;
  input.name = name;
  for (const o of options) {
    const n = node('option', o.label);
    n.value = o.value;
    input.append(n);
  }
  input.value = value || options[0]?.value || '';
  wrap.append(l, input);
  return { wrap, input };
}
function agentSelectField(
  label: string,
  name: string,
  options: { value: string; label: string }[],
  value = ''
) {
  const field = selectField(label, name, agentOptions(options), value);
  for (const option of field.input.options) {
    if (option.value) option.title = option.value;
  }
  return field;
}
function formAction(form: HTMLFormElement, fn: () => Promise<void>) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const controls = [...form.querySelectorAll<HTMLButtonElement>('button')];
    controls.forEach((b) => (b.disabled = true));
    void fn()
      .catch(fail)
      .finally(() => controls.forEach((b) => (b.disabled = false)));
  });
}
async function mutate(path: string, body?: unknown, method = 'POST', success = 'Saved.') {
  await api(path, method, body);
  notice(success);
  await refresh();
}
function confirm(title: string, copy: string, action = 'Confirm'): Promise<boolean> {
  const body = $('review-body');
  const heading = node('h2', title);
  heading.id = 'review-title';
  heading.tabIndex = -1;
  body.replaceChildren(heading, para(copy, ''));
  $('review-confirm').textContent = action;
  const dialog = $<HTMLDialogElement>('review-dialog');
  dialog.querySelector<HTMLButtonElement>('button[value="cancel"]')!.textContent =
    action.startsWith('Cancel ') ? action.replace('Cancel ', 'Keep ') : 'Cancel';
  dialog.returnValue = '';
  reviewInvoker = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  dialog.showModal();
  heading.focus({ preventScroll: true });
  dialog.scrollTop = 0;
  return new Promise((resolve) => {
    pendingReview = resolve;
  });
}
$<HTMLDialogElement>('review-dialog').addEventListener('close', () => {
  pendingReview?.($<HTMLDialogElement>('review-dialog').returnValue === 'confirm');
  pendingReview = undefined;
  const invoker = reviewInvoker;
  reviewInvoker = null;
  if (invoker && (!invoker.isConnected || !invoker.getClientRects().length)) {
    const target =
      $('workspace-content').querySelector<HTMLElement>('.shared-tabs [aria-current="page"]') ??
      $('workspace-content').querySelector<HTMLElement>('.workspace-title') ??
      $('refresh');
    if (target.getClientRects().length) target.focus({ preventScroll: true });
  }
});
function dismissReview() {
  const dialog = $<HTMLDialogElement>('review-dialog');
  const wasOpen = dialog.open;
  pendingReview?.(false);
  pendingReview = undefined;
  reviewInvoker = null;
  if (wasOpen) dialog.close('cancel');
  $('review-body').replaceChildren();
  $('review-confirm').textContent = 'Confirm';
  return wasOpen;
}
function session(title: string, copy: string, error = false) {
  const dismissedReview = dismissReview();
  if (!error) {
    drafts.clear();
    clearContextDrafts();
    sendAttempts.clear();
    clearNoticeGroups();
    state.me = null;
    $('account-email').textContent = '';
    $('logout').hidden = true;
  }
  $('desk').hidden = true;
  const s = $('session');
  s.hidden = false;
  const heading = node('h1', title);
  heading.tabIndex = -1;
  s.replaceChildren(heading, para(copy, ''));
  if (dismissedReview) heading.focus({ preventScroll: true });
  if (error) s.append(button('Try again', () => void refresh()));
  else {
    const a = node('a', 'Sign in with CREATE SOMETHING ↗', 'button button-primary');
    a.href = '/auth/login?returnTo=/inboxes';
    s.append(a);
    void fetch('/api/v1/config')
      .then((r) => r.json())
      .then((config) => {
        if (config.sharedSelfService && s.contains(a)) {
          const signup = node('a', 'Create an account ↗');
          signup.href = '/auth/signup';
          const help = para('New here? ');
          help.append(signup);
          s.append(help);
        }
      })
      .catch(() => {});
  }
}
function heading(title: string, subtitle: string) {
  const n = node('header');
  const h = node('h2', title, 'workspace-title');
  h.tabIndex = -1;
  n.append(h, para(subtitle, 'workspace-subtitle'));
  return n;
}
function empty(title: string, copy: string) {
  const n = node('div', '', 'muted-empty');
  n.append(node('h3', title), para(copy));
  return n;
}
function isCustodian() {
  return state.inboxes.find((i) => i.id === state.inboxId)?.isOwner === true;
}
function query() {
  return state.viewAgentId ? `?viewAgentId=${encodeURIComponent(state.viewAgentId)}` : '';
}
function path(suffix = '') {
  return `/inboxes/${encodeURIComponent(state.inboxId)}${suffix}`;
}
function ownOptions() {
  return state.agents
    .filter((a) => !a.deleted_at)
    .map((a) => ({ value: a.id, label: `${a.name || a.id}${a.paused ? ' · paused' : ''}` }));
}
function renderRail() {
  $('selected-inbox-name').textContent =
    state.inboxes.find((i) => i.id === state.inboxId)?.name ?? 'Choose an inbox';
  const nav = $('inbox-list');
  nav.replaceChildren();
  if (!state.inboxes.length) nav.append(para('No inboxes yet. Create one below.'));
  for (const inbox of state.inboxes) {
    const b = button(inbox.name, () => void selectInbox(inbox.id));
    b.className = 'inbox-option';
    if (inbox.id === state.inboxId) b.setAttribute('aria-current', 'page');
    b.append(node('span', `${inbox.isOwner ? 'Your inbox' : 'Member inbox'} · ${inbox.state}`));
    nav.append(b);
  }
  $('invitation-count').textContent = String(
    state.invitations.filter(
      (i) => i.state === 'pending' && state.agents.some((a) => a.id === i.agent_id)
    ).length
  );
}
async function selectInbox(id: string) {
  if (id !== state.inboxId) $('notice').hidden = true;
  if (window.matchMedia('(max-width: 767px)').matches)
    ($('inbox-switcher') as HTMLDetailsElement).open = false;
  state.inboxId = id;
  state.viewAgentId = '';
  state.pane = 'conversation';
  await loadInbox();
  renderRail();
}
async function loadInbox() {
  rememberNoticeGroups();
  const generation = ++state.generation;
  const ws = $('workspace');
  ws.setAttribute('aria-busy', 'true');
  $('workspace-content').replaceChildren(para('Loading shared inbox…'));
  try {
    const inbox = state.inboxes.find((i) => i.id === state.inboxId);
    if (!inbox) {
      render();
      return;
    }
    if (!isCustodian() && !state.viewAgentId) {
      render();
      return;
    }
    const [members, page] = await Promise.all([
      api<Member[]>(path(`/members${query()}`)),
      api<SharedPage<SharedMessage>>(path(`/messages${query()}`))
    ]);
    if (generation !== state.generation) return;
    state.members = items(members);
    state.messages = page.items;
    state.nextAfter = page.nextAfter;
    state.hasMore = page.hasMore;
    render();
  } catch (e) {
    if (generation === state.generation) {
      $('workspace-content').replaceChildren(
        empty(
          'This inbox could not be loaded.',
          'Access or network state may have changed. Refresh to retry.'
        )
      );
      fail(e);
    }
  } finally {
    if (generation === state.generation) ws.setAttribute('aria-busy', 'false');
  }
}
function render() {
  rememberNoticeGroups();
  const root = $('workspace-content');
  root.replaceChildren();
  if (state.pane === 'agents') {
    renderAgents(root);
    return;
  }
  if (state.pane === 'invitations') {
    renderInvitations(root);
    return;
  }
  const inbox = state.inboxes.find((i) => i.id === state.inboxId);
  if (!inbox) {
    root.append(
      heading(
        'Make room for a shared handoff.',
        'Create a private inbox, register an agent, then choose who participates.'
      ),
      empty(
        'No inbox selected.',
        'An inbox is a space for conversation and context. Your agents can participate in more than one inbox.'
      )
    );
    return;
  }
  root.append(heading(inbox.name, ''));
  const identity = node('details', '', 'reading-details');
  const accessSummary = node('summary', `${isCustodian() ? 'Custodian' : 'Owner'} access`);
  identity.append(accessSummary);
  identity.append(
    para(
      `Inbox ${inbox.state}. ${isCustodian() ? 'Custodian view reads all retained shared history and context.' : 'Your owner view follows the selected agent’s admission boundary.'}`,
      'small'
    )
  );
  if (!isCustodian() && !state.viewAgentId) identity.open = true;
  identity.append(para(`Inbox ${inbox.id}`, 'small inbox-identity'));
  const view = agentSelectField(
    'Reading as',
    'view',
    [
      ...(isCustodian()
        ? [{ value: '', label: 'Custodian' }]
        : [{ value: '', label: 'Choose membership' }]),
      ...(
        inbox.views ??
        state.agents
          .filter((a) => state.members.some((m) => m.agent_id === a.id))
          .map((a) => ({ agent_id: a.id, name: a.name }))
      ).map((a) => ({ value: a.agent_id, label: a.name || a.agent_id }))
    ],
    state.viewAgentId
  );
  view.input.addEventListener('change', () => {
    state.viewAgentId = view.input.value;
    void loadInbox();
  });
  if (state.viewAgentId)
    identity.append(para(`Selected agent: ${state.viewAgentId}`, 'small inbox-identity'));
  identity.append(
    view.wrap,
    para(
      'Agent membership views read from that agent’s admission point. Selecting a view does not change anyone’s authority.',
      'small'
    )
  );
  root.append(identity);
  if (!isCustodian() && !state.viewAgentId) {
    root.append(
      empty(
        'Choose a membership view.',
        'Each agent has its own admission boundary. One agent’s membership never gives another agent access to older or different history.'
      )
    );
    return;
  }
  const tabs = node('nav', '', 'shared-tabs');
  tabs.setAttribute('aria-label', 'Inbox workspace');
  for (const [id, label, shortLabel] of [
    ['conversation', 'Conversation', 'Messages'],
    ['members', 'Members & access', 'Access'],
    ['context', 'Shared context', 'Context'],
    ['status', 'Delivery & status', 'Status']
  ]) {
    const b = button(label, () => {
      state.pane = id;
      render();
      $('workspace-content').querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
    });
    b.className = '';
    b.setAttribute('aria-label', id === 'conversation' ? 'Messages · conversation' : label);
    const full = node('span', label, 'destination-full');
    const compact = node('span', shortLabel, 'destination-compact');
    b.replaceChildren(full, compact);
    if (state.pane === id) b.setAttribute('aria-current', 'page');
    tabs.append(b);
  }
  root.append(tabs);
  const activeTab = tabs.querySelector<HTMLElement>('[aria-current]');
  if (activeTab && activeTab.offsetLeft + activeTab.offsetWidth > tabs.clientWidth) {
    tabs.scrollLeft = activeTab.offsetLeft + activeTab.offsetWidth - tabs.clientWidth;
  }
  const status = node('div', '', 'shared-status');
  status.append(node('span', `Inbox ${inbox.state}`, 'lifecycle-state'));
  const connectivity = button('Runtime unverified →', () => {
    state.pane = 'status';
    render();
    root.querySelector<HTMLElement>('.shared-tabs [aria-current="page"]')?.focus({
      preventScroll: true
    });
  });
  connectivity.className = 'connectivity-summary';
  status.append(connectivity);
  if (state.viewAgentId) status.append(tag('View: agent membership'));
  if (state.pane === 'conversation') {
    const write = button('Write ↓', () => {
      document.querySelector<HTMLTextAreaElement>('.shared-compose textarea')?.focus();
    });
    write.classList.add('compose-shortcut');
    status.append(write);
  }
  const tools = node('div', '', 'workspace-tools');
  identity.remove();
  tools.append(identity, status);
  tabs.after(tools);
  if (state.pane === 'members') renderMembers(root);
  else if (state.pane === 'context') void renderContext(root);
  else if (state.pane === 'status') void renderStatus(root);
  else renderConversation(root);
}
function audience() {
  const n = node('details', '', 'boundary audience-details');
  const active = state.members.filter((m) => m.state === 'active');
  const names = agentOptions(
    active.map((m) => ({ value: m.agent_id, label: m.name || m.agent_id }))
  ).map((option) => option.label);
  const identities = active.map((m, index) => `${names[index]} (${m.agent_id})`);
  const custodian = isCustodian()
    ? `you (${state.me?.email ?? 'verified owner'})`
    : 'identity not provided';
  n.append(
    node(
      'summary',
      `Shared with ${isCustodian() ? 'you' : 'custodian (identity not provided)'}${names.length > 2 ? `, ${names.length} agents & their owners` : names.length ? `, ${names.join(', ')} & their owners` : '; no active agents'}.`
    ),
    para(
      `Custodian: ${custodian}. Authorized agents: ${identities.join(', ') || 'none'}; their owners also have access.`
    ),
    para(
      'Visible to the inbox custodian and authorized agent memberships and their owners. Future members can see content from their admission point; existing members may quote earlier content into later messages. This is not a private note.'
    )
  );
  const wrapper = node('section', '', 'audience');
  wrapper.setAttribute('aria-label', 'Shared audience');
  wrapper.append(n);
  return wrapper;
}
function renderConversation(root: HTMLElement) {
  root.append(audience());
  const stream = node('div', '', 'message-stream');
  stream.setAttribute('aria-label', 'Shared messages');
  const following = new Map(
    state.messages.map((message, index) => [message.id, state.messages[index + 1]?.id])
  );

  for (const entry of groupMessages(state.messages)) {
    let container: HTMLElement = stream;
    if (entry.kind === 'notices') {
      const group = node('details', '', 'notice-group');
      const subject = state.me?.subject;
      const sessionGeneration = noticeSessionGeneration;
      const key = JSON.stringify([subject, state.inboxId, state.viewAgentId, entry.id]);
      group.open = openNoticeGroups.has(key);
      group.append(node('summary', `${entry.messages.length} activity notices`));
      const save = () => {
        if (
          !group.isConnected ||
          subject !== state.me?.subject ||
          sessionGeneration !== noticeSessionGeneration
        )
          return;
        if (group.open) openNoticeGroups.add(key);
        else openNoticeGroups.delete(key);
      };
      noticeGroupSavers.set(group, save);
      group.addEventListener('toggle', save);
      stream.append(group);
      container = group;
    }
    const messages = entry.kind === 'notices' ? entry.messages : [entry.message];
    for (const m of messages) {
      const article = node('article', '', 'shared-message');
      const activity = isAuthorlessNotice(m);
      if (activity) article.classList.add('system-activity');
      article.id = `message-${m.id}`;
      article.tabIndex = -1;
      const meta = node('div', '', 'message-meta');
      meta.id = `message-meta-${m.id}`;
      article.setAttribute('aria-labelledby', meta.id);
      meta.append(
        node('strong', messageAuthor(m)),
        node(
          'span',
          date(m.created_at) +
            ((m.kind === 'conversation' || activity) && m.state === 'posted' ? ' · Posted' : ''),
          'message-timing'
        )
      );
      article.append(meta);
      const status = node('div', '', 'shared-status');
      if ((m.kind === 'conversation' || activity) && m.state === 'posted') {
        status.classList.add('routine-status');
      } else {
        const work = tag(
          m.kind === 'request' && m.state === 'completed'
            ? 'Agent reported completion'
            : m.kind === 'request' && m.state === 'approval_required'
              ? 'Owner decision requested'
              : `${m.kind === 'request' ? 'Request · work' : m.kind}: ${m.state}`
        );
        if (m.kind === 'request' && m.state === 'completed') work.dataset.tone = 'success';
        if (m.kind === 'request' && m.state === 'approval_required') work.dataset.tone = 'warning';
        status.append(work);
      }
      if (m.assignee_agent_id)
        status.append(
          node('span', `Assigned: ${visibleAgentName(m.assignee_agent_id)}`, 'message-assignee')
        );
      article.append(status);
      if (m.kind === 'request') {
        let explanation =
          'A request is subject to the assigned agent owner’s policy. Delivery is separate from work.';
        if (m.state === 'completed')
          explanation =
            'This state does not record human acceptance or publication permission. See the conversation for evidence.';
        else if (m.state === 'approval_required')
          explanation =
            'See the conversation for the agent’s reason and evidence. Reassigning does not grant external authority.';
        else if (m.state === 'awaiting_assignment')
          explanation =
            'Work is waiting for a new assignment. The inbox custodian can reassign or cancel this request.';
        else if (m.state === 'rejected')
          explanation =
            'The agent declined this request. Check the conversation for its explanation; this is not completed work.';
        const identity = node('details', '', 'record-details request-identity');
        identity.append(
          node('summary', 'Request details'),
          node('code', m.id),
          para(`Recorded work state: ${m.state}`),
          para(`Assignment version ${m.assignment_version}`)
        );
        if (m.assignee_agent_id)
          identity.append(para('Assigned agent ID'), node('code', m.assignee_agent_id));
        article.append(para(explanation, 'small request-qualification'));
        article.append(messageBody(m, following.get(m.id)), identity);
      } else {
        article.append(messageBody(m, following.get(m.id)));
      }
      if (isCustodian() && ['awaiting_assignment', 'approval_required'].includes(m.state)) {
        const actions = node('div', '', 'message-actions');
        actions.setAttribute('role', 'group');
        actions.setAttribute('aria-label', 'Request controls');
        const assignee = agentSelectField(
          'New assignee',
          'reassign-' + m.id,
          state.members
            .filter((a) => a.state === 'active' && a.capabilities.includes('work'))
            .map((a) => ({ value: a.agent_id, label: agentName(a.agent_id) }))
        );
        const selected = para('', 'small selected-assignee');
        const showSelection = () => {
          selected.textContent = `Selected: ${visibleAgentName(assignee.input.value)}`;
        };
        showSelection();
        assignee.input.addEventListener('change', showSelection);
        actions.append(
          assignee.wrap,
          selected,
          button(
            'Reassign',
            () =>
              void mutate(
                path(`/messages/${m.id}/reassign`),
                { agentId: assignee.input.value, assignmentVersion: m.assignment_version },
                'POST',
                'Request reassigned.'
              ).catch(fail)
          ),
          button(
            'Cancel request',
            () =>
              void (async () => {
                if (await confirm('Cancel this request?', m.text, 'Cancel request'))
                  await mutate(
                    path(`/messages/${m.id}/cancel`),
                    { assignmentVersion: m.assignment_version },
                    'POST',
                    'Request canceled.'
                  );
              })().catch(fail)
          )
        );
        article.append(actions);
      }
      container.append(article);
    }
  }
  const disclosures = [
    ...stream.querySelectorAll<HTMLDetailsElement>('.message-body, .notice-group')
  ];
  if (disclosures.length) {
    const reading = node('div', '', 'message-reading-tools');
    const expand = button('Expand all messages', () => {
      const open = !disclosures.every((disclosure) => disclosure.open);
      for (const disclosure of disclosures) {
        disclosure.open = open;
        messageBodySavers.get(disclosure)?.();
        noticeGroupSavers.get(disclosure)?.();
      }
      updateReadingLabel();
    });
    const updateReadingLabel = () => {
      expand.textContent = disclosures.every((disclosure) => disclosure.open)
        ? 'Collapse messages'
        : 'Expand all messages';
    };
    stream.addEventListener('toggle', updateReadingLabel, true);
    updateReadingLabel();
    reading.append(expand, para('Expand to search all message text.', 'small'));
    root.append(reading);
  }
  root.append(stream);
  if (state.hasMore)
    root.append(
      button(
        'Load more messages',
        () =>
          void (async () => {
            const generation = state.generation;
            const q = new URLSearchParams(
              state.viewAgentId ? { viewAgentId: state.viewAgentId } : {}
            );
            q.set('after', String(state.nextAfter ?? 0));
            const page = await api<SharedPage<SharedMessage>>(path(`/messages?${q}`));
            if (generation !== state.generation) return;
            state.messages = [
              ...new Map([...state.messages, ...page.items].map((m) => [m.id, m])).values()
            ].sort((a, b) => a.cursor - b.cursor);
            state.nextAfter = page.nextAfter;
            state.hasMore = page.hasMore;
            render();
          })().catch(fail)
      )
    );
  const form = node('form', '', 'shared-compose');
  const draftKey = JSON.stringify([state.me?.subject, state.inboxId, state.viewAgentId]);
  const draft = drafts.get(draftKey);
  form.append(
    node(
      'h3',
      state.messages.length ? 'Add to the shared conversation' : 'Start the shared conversation'
    )
  );
  if (!state.messages.length)
    form.append(
      para(
        'Post context for the group, or request work from one named agent. Conversation posts do not ask an agent to act.'
      )
    );
  const text = field('Message', 'text', 'textarea');
  text.input.required = true;
  text.input.maxLength = 16384;
  text.input.value = draft?.text ?? '';
  const options = node('div', '', 'compose-options');
  const mode = selectField('Message type', 'kind', [
    { value: 'conversation', label: 'Conversation' },
    { value: 'request', label: 'Request work' }
  ]);
  const assignee = agentSelectField('Assign work to', 'assignee', [
    { value: '', label: 'Choose an active agent' },
    ...state.members
      .filter((a) => a.state === 'active' && a.capabilities.includes('work'))
      .map((a) => ({ value: a.agent_id, label: agentName(a.agent_id) }))
  ]);
  assignee.wrap.hidden = true;
  const policy = para(
    'Posting as your verified owner identity. Conversation posts do not request agent work.'
  );
  const guide = node('details', '', 'request-guide');
  const reviewOutline = [
    'Deliverable review',
    'Outcome: [What should be reviewed, and what result is needed?]',
    'Source of truth: [Exact artifact, revision or shared-context reference]',
    'Scope: [Permitted actions and limits under the agent owner’s policy]',
    'Verification: [Checks to run and evidence to return]',
    'Recovery: [When to stop, retry or escalate, and to whom]',
    'Return receipt: source/revision reviewed, findings, checks and results, evidence links, and unresolved items.',
    'Acceptance or publication: [Who decides, if this workflow requires it]'
  ].join('\n');
  const outlineError = para('', 'error-inline');
  outlineError.hidden = true;
  outlineError.setAttribute('role', 'status');
  const insertOutline = button('Add review outline to message', () => {
    if (text.input.value.includes(reviewOutline)) return;
    const next = text.input.value ? `${text.input.value}\n\n${reviewOutline}` : reviewOutline;
    if (new TextEncoder().encode(next).length > 16384) {
      outlineError.textContent =
        'The outline would exceed the 16 KiB message limit. Shorten your draft first.';
      outlineError.hidden = false;
      return;
    }
    text.input.value = next;
    text.input.dispatchEvent(new Event('input', { bubbles: true }));
    guide.open = false;
    text.input.focus();
  });
  const outlineStatus = para('The outline is in your draft. Edit it in Message.');
  const updateOutline = () => {
    outlineError.hidden = true;
    outlineError.textContent = '';
    const inserted = text.input.value.includes(reviewOutline);
    insertOutline.hidden = inserted;
    outlineStatus.hidden = !inserted;
    insertOutline.textContent = text.input.value
      ? 'Append review outline to message'
      : 'Add review outline to message';
  };
  text.input.addEventListener('input', updateOutline);
  updateOutline();
  guide.append(
    node('summary', 'Deliverable review outline'),
    para(
      'Start with the source, scope, checks and recovery path. Edit the outline before sending.'
    ),
    insertOutline,
    outlineError,
    outlineStatus,
    para('An agent’s completion report is separate from human acceptance or publication.')
  );
  const updateMode = () => {
    assignee.wrap.hidden = mode.input.value !== 'request';
    assignee.input.required = mode.input.value === 'request';
    guide.hidden = mode.input.value !== 'request';
    submit.textContent = mode.input.value === 'request' ? 'Request work →' : 'Post conversation →';
    policy.textContent =
      mode.input.value === 'request'
        ? 'Only the named agent is assigned. This does not grant external tools or approval.'
        : 'Posting as your verified owner identity. Conversation posts do not request agent work.';
  };
  mode.input.addEventListener('change', updateMode);
  options.append(mode.wrap, assignee.wrap);
  const submit = node('button', 'Post conversation →', 'button button-primary');
  submit.type = 'submit';
  if (draft) {
    mode.input.value = draft.kind;
    assignee.input.value = draft.assignee;
  }
  updateMode();
  const saveDraft = () =>
    drafts.set(draftKey, {
      text: text.input.value,
      kind: mode.input.value,
      assignee: assignee.input.value
    });
  form.addEventListener('input', saveDraft);
  form.addEventListener('change', saveDraft);
  const composeHelp = node('details', '', 'compose-help');
  composeHelp.append(
    node('summary', 'Message limits & draft retention'),
    para('Text only, up to 16 KiB in UTF-8. Do not include credentials or secrets.'),
    para('Your draft stays in this tab while you switch views. Reloading or signing out clears it.')
  );
  form.append(text.wrap, options, guide, policy, composeHelp, submit);
  formAction(form, async () => {
    const payload = JSON.stringify([text.input.value, mode.input.value, assignee.input.value]);
    if (new TextEncoder().encode(text.input.value).length > 16384)
      throw new Error('Shorten the message to 16 KiB of UTF-8 text.');
    let attempt = sendAttempts.get(draftKey);
    if (!attempt || attempt.payload !== payload) {
      attempt = { key: crypto.randomUUID(), payload };
      sendAttempts.set(draftKey, attempt);
    }
    const generation = state.generation;
    const posted = await api<SharedMessage>(path('/messages'), 'POST', {
      text: text.input.value,
      kind: mode.input.value,
      ...(mode.input.value === 'request' ? { assigneeAgentId: assignee.input.value } : {}),
      idempotencyKey: attempt.key,
      ...(state.viewAgentId ? { viewAgentId: state.viewAgentId } : {})
    });
    const currentDraft = drafts.get(draftKey);
    if (
      !currentDraft ||
      JSON.stringify([currentDraft.text, currentDraft.kind, currentDraft.assignee]) === payload
    ) {
      drafts.delete(draftKey);
    }
    if (sendAttempts.get(draftKey) === attempt) sendAttempts.delete(draftKey);
    if (generation !== state.generation) return;
    notice('Message posted. Delivery and work status are separate.');
    state.messages = [...state.messages.filter((m) => m.id !== posted.id), posted].sort(
      (a, b) => a.cursor - b.cursor
    );
    render();
    focusMessage(posted.id);
  });
  root.append(form);
}
function renderMembers(root: HTMLElement) {
  root.append(
    para(
      'Removing membership stops future access and work. It cannot recall copies already delivered.'
    ),
    audience()
  );
  for (const member of state.members) {
    const r = node('article', '', 'shared-record member-record');
    const header = node('div', '', 'record-heading');
    header.append(
      node('h3', visibleAgentName(member.agent_id)),
      tag(`Membership: ${member.state}`)
    );
    if (member.paused) header.append(tag('Agent: paused'));
    const identity = node('details', '', 'record-details');
    const utilities = node('div', '', 'member-utilities');
    utilities.append(identity);
    identity.append(
      node('summary', 'Identity & history'),
      node('code', member.agent_id),
      para(`History begins at cursor ${member.admission_cursor} · Generation ${member.generation}`)
    );
    r.append(header, para(`Permissions: ${member.capabilities.split(',').join(', ')}`), utilities);
    if (
      member.state === 'active' &&
      (isCustodian() || state.agents.some((a) => a.id === member.agent_id))
    ) {
      const own = state.agents.some((a) => a.id === member.agent_id);
      const actions = node('div', '', 'form-actions record-actions');
      const remove = button(
        isCustodian() ? 'Remove membership' : 'Leave inbox',
        () =>
          void (async () => {
            if (
              await confirm(
                isCustodian() ? 'Remove this membership?' : 'Leave this inbox?',
                `${member.agent_id} will lose future reads, context access and work authority. Delivered copies remain.`,
                isCustodian() ? 'Remove membership' : 'Leave inbox'
              )
            )
              await mutate(
                path(
                  `/members/${encodeURIComponent(member.agent_id)}${own && !isCustodian() ? '/leave' : ''}`
                ),
                undefined,
                own && !isCustodian() ? 'POST' : 'DELETE',
                'Membership ended.'
              );
          })().catch(fail)
      );
      remove.classList.add('button-danger', 'button-quiet');
      actions.append(remove);
      utilities.append(actions);
    }
    root.append(r);
  }
  if (!isCustodian()) return;
  const add = node('section', '', 'membership-add-section');
  add.append(node('h3', 'Add one of your agents'));
  const available = membershipOptions(
    state.agents,
    state.members.filter((m) => m.state === 'active').map((m) => m.agent_id)
  );
  if (available.length) {
    const own = node('form', '', 'compact-form');
    const agent = agentSelectField('Your agent', 'own-agent', available);
    const submit = node('button', 'Add agent', 'button');
    submit.type = 'submit';
    own.append(
      agent.wrap,
      para('Your approval activates this exact agent membership at the current history boundary.'),
      submit
    );
    formAction(own, () => {
      const eligible = membershipOptions(
        state.agents,
        state.members.filter((m) => m.state === 'active').map((m) => m.agent_id)
      );
      if (!eligible.some((option) => option.value === agent.input.value))
        throw new Error('Choose an enabled agent that is not already a member.');
      return mutate(
        path('/members'),
        { agentId: agent.input.value, capabilities: caps },
        'POST',
        'Agent added.'
      );
    });
    add.append(own);
  } else {
    add.append(
      para(
        membershipOptions(state.agents, []).length
          ? 'All of your enabled agents are already active in this inbox.'
          : 'No enabled agents are available to add. Enable or register an agent to continue.'
      ),
      agentsNavigation()
    );
  }
  root.append(add);
  const invite = node('form', '', 'compact-form membership-invite-form');
  const f = field('Exact external agent ID', 'invite-agent');
  f.input.required = true;
  f.input.maxLength = 160;
  const submit = node('button', 'Review invitation →', 'button button-primary');
  submit.type = 'submit';
  invite.append(
    node('h3', 'Invite another owner’s agent'),
    f.wrap,
    para(
      'Permissions: read, post and work. The invited owner must accept. History begins at acceptance. You remain custodian of the shared transcript and context.'
    ),
    submit
  );
  formAction(invite, async () => {
    if (
      await confirm(
        'Invite this exact agent?',
        `${f.input.value} will be invited to ${state.inboxes.find((i) => i.id === state.inboxId)?.name}. Permissions: read, post, work. Their owner reviews the roster and history boundary before acceptance. Future members and their owners can see newly admitted content. You retain full custodian access.`,
        'Send invitation'
      )
    )
      await mutate(
        path('/invitations'),
        { agentId: f.input.value, capabilities: caps },
        'POST',
        'Invitation sent. Membership remains pending until owner acceptance.'
      );
  });
  root.append(invite);
  const outgoing = state.invitations.filter(
    (i) => i.inbox_id === state.inboxId && i.state === 'pending'
  );
  for (const i of outgoing) {
    const r = node('article', '', 'shared-record');
    r.append(
      node('h3', 'Pending invitation'),
      node('code', i.agent_id),
      para(`Expires ${date(i.expires_at)}`),
      button(
        'Revoke invitation',
        () =>
          void mutate(
            `/invitations/${i.id}/revoke`,
            undefined,
            'POST',
            'Invitation revoked.'
          ).catch(fail)
      )
    );
    root.append(r);
  }
}
function renderAgents(root: HTMLElement) {
  root.append(
    heading(
      'Your agents & connections',
      'Agent identity, runtime authorization and event monitoring are separate.'
    )
  );
  const form = node('form', '', 'compact-form');
  const f = field('Agent display name', 'agent-name');
  f.input.required = true;
  f.input.maxLength = 80;
  const b = node('button', 'Register agent →', 'button button-primary');
  b.type = 'submit';
  form.append(f.wrap, para('This registers an identity. Connect your own runtime separately.'), b);
  formAction(form, async () => {
    await mutate('/agents', { name: f.input.value }, 'POST', 'Agent registered.');
  });
  root.append(form);
  for (const a of state.agents) {
    const r = node('article', '', 'shared-record');
    r.append(
      node('h3', a.name),
      node('code', a.id),
      tag(a.deleted_at ? 'Agent: deleted' : a.paused ? 'Agent: paused' : 'Agent: enabled')
    );
    if (!a.deleted_at) {
      const actions = node('div', '', 'form-actions');
      actions.append(
        button(
          a.paused ? 'Resume agent' : 'Pause agent',
          () =>
            void mutate(
              `/agents/${a.id}`,
              { paused: !a.paused },
              'PATCH',
              a.paused ? 'Agent resumed.' : 'Agent paused.'
            ).catch(fail)
        ),
        button(
          'Delete agent',
          () =>
            void (async () => {
              if (
                await confirm(
                  'Delete this agent?',
                  `${a.name} (${a.id}) will lose its memberships and runtime authorization. Shared history is retained under inbox policy.`,
                  'Delete agent'
                )
              )
                await mutate(`/agents/${a.id}`, undefined, 'DELETE', 'Agent deleted.');
            })().catch(fail)
        )
      );
      r.append(actions);
    }
    root.append(r);
  }
  root.append(
    node('h3', 'Runtime connections'),
    para(
      'Add the authenticated A2A MCP endpoint in your agent host, then have that runtime request a connection. Approve the exact pending record below for one agent. Approval does not create a receiver or subscription.'
    ),
    node('code', 'https://a2a.createsomething.agency/mcp')
  );
  if (!state.connections.length)
    root.append(
      empty(
        'No runtime connections yet.',
        'Use the shared connection request tool from your authenticated runtime. Its pending request will appear here after refresh.'
      )
    );
  for (const c of state.connections) {
    const r = node('article', '', 'shared-record');
    r.append(
      node('h3', c.label),
      node('code', c.id),
      para(
        `OAuth client: ${c.client_id ?? 'Not recorded'} · Assigned agent: ${c.agent_id ?? 'None'}`
      ),
      tag(`Authorization: ${c.state}`)
    );
    if (c.state === 'pending') {
      const select = agentSelectField(
        'Approve for exactly one agent',
        'connection-' + c.id,
        ownOptions()
      );
      r.append(
        select.wrap,
        button(
          'Review approval',
          () =>
            void (async () => {
              if (
                await confirm(
                  'Approve this runtime connection?',
                  `Connection ${c.id}, client ${c.client_id ?? 'not recorded'}, will be authorized as exactly ${select.input.value}. If a host shares this OAuth grant, it shares this delegated authority. This is not native agent attestation.`,
                  'Approve connection'
                )
              )
                await mutate(
                  `/connections/${c.id}/approve`,
                  { agentId: select.input.value },
                  'POST',
                  'Connection approved for the selected agent.'
                );
            })().catch(fail)
        )
      );
    }
    if (c.state !== 'revoked')
      r.append(
        button(
          'Revoke connection',
          () =>
            void (async () => {
              if (
                await confirm(
                  'Revoke this connection?',
                  `${c.id} will lose its delegated authority. Membership is managed separately.`,
                  'Revoke connection'
                )
              )
                await mutate(
                  `/connections/${c.id}/revoke`,
                  undefined,
                  'POST',
                  'Connection revoked.'
                );
            })().catch(fail)
        )
      );
    root.append(r);
  }
}
function renderInvitations(root: HTMLElement) {
  root.append(
    heading(
      'Incoming invitations',
      'Review the exact agent, permissions and shared audience before accepting.'
    )
  );
  const invitations = state.invitations.filter((i) =>
    state.agents.some((a) => a.id === i.agent_id)
  );
  if (!invitations.length)
    root.append(
      empty(
        'No invitations to review.',
        'Give an inbox owner the exact ID of the agent you want to participate.'
      )
    );
  for (const i of invitations) {
    const r = node('article', '', 'shared-record');
    r.append(
      node('h3', i.inbox_name ?? `Inbox ${i.inbox_id}`),
      para(`Your invited agent: ${visibleAgentName(i.agent_id)}`),
      node('code', i.agent_id),
      para(`Permissions: ${i.capabilities} · Expires ${date(i.expires_at)}`),
      tag(i.state)
    );
    const disclosure = node('div', '', 'boundary');
    disclosure.append(
      para(
        'History starts at acceptance. The inbox custodian can read all retained shared history and context. Your owner view follows this agent’s admission boundary. Existing members may quote earlier material into later messages. Future members and their owners can see content after their admission.'
      )
    );
    r.append(disclosure);
    if (i.members)
      r.append(
        para(
          `Visible roster: ${i.members.map((m) => `${m.name ?? m.agent_id} (${m.agent_id})`).join(', ') || 'No active members'}`
        )
      );
    else if (i.state === 'pending')
      r.append(para('Review this invitation to inspect the current roster before acceptance.'));
    else
      r.append(
        para(
          i.state === 'accepted'
            ? 'Invitation accepted. Open the inbox to inspect your current membership and audience.'
            : 'This invitation is no longer pending. No acceptance action is available.'
        )
      );
    if (i.state === 'pending') {
      const actions = node('div', '', 'form-actions');
      actions.append(
        button(
          'Review & accept',
          () =>
            void (async () => {
              const preview = await api<{
                invitation: Invitation;
                roster: Member[];
                disclosure: string;
              }>(`/invitations/${i.id}`);
              const detail = preview.invitation;
              const roster =
                preview.roster?.map((m) => `${m.name ?? m.agent_id} (${m.agent_id})`).join(', ') ??
                'Roster unavailable';
              if (!preview.roster)
                throw new Error(
                  'The invitation roster could not be verified. Acceptance is unavailable until details load.'
                );
              if (
                await confirm(
                  'Accept this membership?',
                  `Agent ${i.agent_id}; inbox ${detail.inbox_name ?? i.inbox_id}; custodian ${detail.inviter_subject ?? 'identity not provided'}; permissions ${i.capabilities}. Current roster: ${roster || 'none'}. History begins now. The custodian can read all retained shared content. Future members and owners can see content from their admission point. Participation grants no external tool permission.`,
                  'Accept membership'
                )
              )
                await mutate(
                  `/invitations/${i.id}/accept`,
                  undefined,
                  'POST',
                  'Invitation accepted. Membership is active; runtime authorization is separate.'
                );
            })().catch(fail),
          true
        ),
        button(
          'Reject',
          () =>
            void mutate(
              `/invitations/${i.id}/reject`,
              undefined,
              'POST',
              'Invitation rejected.'
            ).catch(fail)
        )
      );
      r.append(actions);
    }
    root.append(r);
  }
}
async function renderContext(root: HTMLElement) {
  const generation = state.generation;
  const sessionGeneration = authSessionGeneration;
  const subject = state.me?.subject;
  const inboxId = state.inboxId;
  const viewAgentId = state.viewAgentId;
  const contextPath = path('/context');
  const draftKey = JSON.stringify([subject, inboxId, viewAgentId]);
  const sameSession = () =>
    sessionGeneration === authSessionGeneration && subject === state.me?.subject;
  const current = () =>
    sameSession() &&
    generation === state.generation &&
    inboxId === state.inboxId &&
    viewAgentId === state.viewAgentId &&
    state.pane === 'context' &&
    list.isConnected;
  root.append(
    para(
      'Text context is shared under the same membership history boundary as messages. Revocation blocks future reads; delivered copies remain.'
    )
  );
  const list = node('div');
  const loading = para('Loading shared context…');
  loading.setAttribute('role', 'status');
  list.append(loading);
  root.append(list);
  let after = 0;
  const loadPage = async () => {
    const params = new URLSearchParams();
    if (viewAgentId) params.set('viewAgentId', viewAgentId);
    if (after) params.set('after', String(after));
    const result = await api<SharedPage<SharedContext>>(`${contextPath}?${params}`);
    if (!current()) return;
    state.context = after ? [...state.context, ...result.items] : result.items;
    if (!after && !result.items.length)
      list.append(
        empty(
          'No shared context yet.',
          isCustodian()
            ? 'Add a text document for this inbox. Do not include credentials or secrets.'
            : 'The inbox custodian can share text documents here. Ask them to add any context your agent needs.'
        )
      );
    for (const c of result.items) {
      const r = node('article', '', 'shared-record context-record');
      const sections = node('div');
      let offset = 0;
      const read = button(
        'Read text',
        () =>
          void (async () => {
            read.disabled = true;
            try {
              const params = new URLSearchParams({ offset: String(offset) });
              if (state.viewAgentId) params.set('viewAgentId', state.viewAgentId);
              const doc = await api<SharedContext & { nextOffset: number | null }>(
                path(`/context/${c.id}?${params}`)
              );
              if (generation !== state.generation || !r.isConnected) return;
              const section = node('div', doc.text, 'context-text');
              section.tabIndex = 0;
              section.setAttribute('aria-label', `${c.title}, section starting at ${offset}`);
              sections.append(section);
              section.focus();
              if (doc.nextOffset !== null) {
                offset = doc.nextOffset;
                read.textContent = 'Read next section';
                read.disabled = false;
              } else read.textContent = 'All sections shown';
            } catch (error) {
              read.disabled = false;
              fail(error);
            }
          })()
      );
      read.classList.add('button-primary');
      const actions = node('div', '', 'form-actions record-actions context-actions');
      actions.append(read);
      const fingerprint = node('details', '', 'record-details');
      fingerprint.append(
        node('summary', 'Document fingerprint'),
        node('code', `SHA-256 ${c.sha256}`)
      );
      const dates = node('div', '', 'context-dates small');
      dates.append(
        node('span', `Added ${date(c.created_at)}`),
        node('span', `Expires ${date(c.expires_at)}`)
      );
      r.append(node('h3', c.title), dates, actions, fingerprint, sections);
      if (isCustodian()) {
        const revoke = button(
          'Revoke context',
          () =>
            void (async () => {
              if (
                await confirm(
                  'Revoke shared context?',
                  `${c.title}: future reads stop; delivered copies cannot be recalled.`,
                  'Revoke context'
                )
              )
                await mutate(path(`/context/${c.id}`), undefined, 'DELETE', 'Context revoked.');
            })().catch(fail)
        );
        revoke.classList.add('button-danger', 'button-quiet');
        actions.append(revoke);
      }
      list.append(r);
    }
    if (result.hasMore && result.nextAfter !== null) {
      after = result.nextAfter;
      const more = button(
        'Load more documents',
        () =>
          void (async () => {
            more.disabled = true;
            try {
              await loadPage();
              more.remove();
            } catch (error) {
              more.disabled = false;
              fail(error);
            }
          })()
      );
      list.append(more);
    }
  };
  try {
    await loadPage();
  } catch (e) {
    if (!current()) {
      if (sameSession() && e instanceof ApiError && e.status === 401) fail(e);
      return;
    }
    list.append(para('Shared context could not be loaded. Refresh to retry.', 'error-inline'));
    fail(e);
  } finally {
    loading.remove();
  }
  // The shared root is reused. A superseded list must never bind a form to a new account.
  if (!current() || !subject || !isCustodian()) return;
  const form = node('form', '', 'compact-form');
  const draft = contextDrafts.get(draftKey);
  const title = field('Document title', 'context-title');
  title.input.required = true;
  title.input.maxLength = 120;
  title.input.value = draft?.title ?? '';
  const text = field('Text content', 'context-text', 'textarea');
  text.input.required = true;
  text.input.maxLength = 65536;
  text.input.value = draft?.text ?? '';
  let draftRevision = 0;
  const saveDraft = () => {
    if (!current() || !form.isConnected) return;
    draftRevision++;
    contextDrafts.set(draftKey, { title: title.input.value, text: text.input.value });
  };
  for (const input of [title.input, text.input]) {
    input.addEventListener('input', saveDraft);
    input.addEventListener('change', saveDraft);
  }
  const upload = field('Or load a local text file', 'context-file');
  (upload.input as HTMLInputElement).type = 'file';
  (upload.input as HTMLInputElement).accept = '.txt,.md,text/plain,text/markdown';
  upload.input.addEventListener(
    'change',
    () =>
      void (async () => {
        if (!current() || !form.isConnected) return;
        const revision = ++draftRevision;
        const file = (upload.input as HTMLInputElement).files?.[0];
        if (!file) return;
        if (file.size > 65536) throw new Error('Choose a text file up to 64 KiB.');
        const loaded = await file.text();
        if (!current() || !form.isConnected || revision !== draftRevision) return;
        text.input.value = loaded;
        if (!title.input.value) title.input.value = file.name.slice(0, title.input.maxLength);
        saveDraft();
      })().catch((error) => {
        if (current() && form.isConnected) fail(error);
      })
  );
  const b = node('button', 'Share text context →', 'button button-primary');
  b.type = 'submit';
  form.append(
    node('h3', 'Share a text document'),
    title.wrap,
    upload.wrap,
    text.wrap,
    para(
      'Text only, up to 64 KiB. Loading a file fills this draft; it is shared only when you submit.'
    ),
    para(
      'Your draft stays in this tab for this inbox and reading view while you switch panes or use Refresh. Reloading this page, signing out or changing accounts clears it.'
    ),
    b
  );
  formAction(form, async () => {
    if (!current() || !form.isConnected) return;
    saveDraft();
    const payload = { title: title.input.value, text: text.input.value };
    if (new TextEncoder().encode(text.input.value).length > 65536)
      throw new Error('Shorten context to 64 KiB of UTF-8 text.');
    try {
      await api(contextPath, 'POST', payload);
    } catch (error) {
      if (sameSession() && (current() || (error instanceof ApiError && error.status === 401)))
        fail(error);
      return;
    }
    if (!sameSession()) return;
    const latest = contextDrafts.get(draftKey);
    if (latest?.title === payload.title && latest.text === payload.text)
      contextDrafts.delete(draftKey);
    if (!current()) return;
    notice('Context shared.');
    await refresh();
  });
  root.append(form);
}
async function renderStatus(root: HTMLElement) {
  const generation = state.generation;
  const authGeneration = authSessionGeneration;
  const subject = state.me?.subject;
  const sameSession = () =>
    authGeneration === authSessionGeneration && subject === state.me?.subject;
  const list = node('div', '', 'monitoring-results');
  const current = () => sameSession() && generation === state.generation && list.isConnected;
  list.append(para('Loading monitoring records…', 'status-loading'));
  const explanation = node('details', '', 'status-explanation');
  explanation.append(
    node('summary', 'About access, monitoring & receipts'),
    para(
      'Membership permits participation. Connection authorization binds a runtime to one agent. Monitoring requires a live event subscription. HTTP delivery acceptance is not evidence of completed work.'
    )
  );
  root.append(
    para(
      'Event subscriptions and HTTP delivery receipts for your agents. These records do not verify a running host or completed work.',
      'small monitoring-intro'
    ),
    list,
    explanation
  );
  try {
    const result = await api<{ subscriptions: Record<string, unknown>[] }>(
      path(`/monitoring${query()}`)
    );
    if (!current()) return;
    list.replaceChildren();
    if (!result.subscriptions.length) {
      const missing = empty(
        'No event subscriptions recorded for your agents.',
        'Unattended monitoring is not established. Other owners’ subscription details are private.'
      );
      missing.append(agentsNavigation('Review agents & connections'));
      list.append(missing);
    }
    for (const row of result.subscriptions) {
      const section = node('section', '', 'shared-record');
      section.append(
        node('h3', visibleAgentName(String(row.agentId))),
        tag(`Monitoring: ${row.status}`)
      );
      const data = node('dl', '', 'status-facts');
      for (const [key, label] of [
        ['id', 'Subscription'],
        ['generation', 'Membership generation'],
        ['expiresAt', 'Lease expires'],
        ['cursor', 'Replay cursor'],
        ['accepted', 'HTTP accepted receipts'],
        ['pending', 'Pending delivery receipts']
      ])
        if (row[key] !== undefined && row[key] !== null) {
          const value = node('dd', key === 'expiresAt' ? date(Number(row[key])) : String(row[key]));
          if (key === 'id') {
            const identity = node('details', '', 'subscription-identity');
            identity.append(node('summary', 'Show full ID'), node('code', String(row[key])));
            value.replaceChildren(identity);
          }
          data.append(node('dt', label), value);
        }
      section.append(
        data,
        para(
          'Counts describe delivery receipts, not completed work. A listed lease does not prove that the host is running.'
        )
      );
      if (row.status === 'active')
        section.append(
          button(
            'Cancel monitoring subscription',
            () =>
              void (async () => {
                if (
                  await confirm(
                    'Cancel this event subscription?',
                    `Subscription ${row.id} will stop future notifications. Membership and connection authorization remain separate.`,
                    'Cancel subscription'
                  )
                )
                  await mutate(
                    `/subscriptions/${row.id}`,
                    undefined,
                    'DELETE',
                    'Monitoring subscription canceled.'
                  );
              })().catch(fail)
          )
        );
      list.append(section);
    }
  } catch (error) {
    if (!sameSession()) return;
    if (error instanceof ApiError && error.status === 401) {
      fail(error);
      return;
    }
    if (!current()) return;
    list.replaceChildren(
      para(
        'Monitoring and delivery receipts are unavailable. No monitoring or delivery claim can be made.',
        'error-inline'
      )
    );
  }
}
async function refresh() {
  try {
    const me = await api<Me>('/me');
    if (me.subject !== state.me?.subject) {
      dismissReview();
      clearNoticeGroups();
      clearContextDrafts();
    }
    state.me = me;
    $('account-email').textContent = state.me.email;
    $('logout').hidden = false;
    const [agents, inboxes, connections, invitations] = await Promise.all([
      api<SharedAgent[]>('/agents'),
      api<Inbox[]>('/inboxes'),
      api<SharedConnection[]>('/connections'),
      api<Invitation[]>('/invitations')
    ]);
    state.agents = items(agents);
    state.inboxes = items(inboxes);
    state.connections = items(connections);
    state.invitations = items(invitations);
    $('session').hidden = true;
    $('desk').hidden = false;
    if (!state.inboxes.some((i) => i.id === state.inboxId))
      state.inboxId = state.inboxes[0]?.id ?? '';
    renderRail();
    if (state.pane === 'agents' || state.pane === 'invitations' || !state.inboxId) render();
    else await loadInbox();
  } catch (e) {
    if (e instanceof ApiError && e.status === 401)
      session(
        'Your shared handoff desk.',
        'Sign in with a verified CREATE SOMETHING account to create inboxes and manage your agents.'
      );
    else if (e instanceof ApiError && e.status === 403)
      session('This account cannot open shared inboxes.', e.message, true);
    else if ($('desk').hidden)
      session(
        'The desk is temporarily unavailable.',
        'We could not load your account. Try again; your inboxes have not been changed.',
        true
      );
    else fail(e);
  }
}
formAction($<HTMLFormElement>('create-inbox'), async () => {
  const name = $<HTMLInputElement>('inbox-name');
  const result = await api<{ inbox: SharedInbox }>('/inboxes', 'POST', { name: name.value });
  state.inboxId = result.inbox.id;
  name.value = '';
  state.pane = 'conversation';
  await refresh();
  notice('Private inbox created. Add an agent when you are ready.');
});
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-view]'))
  b.addEventListener('click', () => {
    state.generation++;
    state.pane = b.dataset.view!;
    if (window.matchMedia('(max-width: 767px)').matches)
      ($('inbox-switcher') as HTMLDetailsElement).open = false;
    render();
    $('workspace-content').querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
  });
$('refresh').addEventListener('click', () => void refresh());
$('logout').addEventListener(
  'click',
  () =>
    void (async () => {
      const r = await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' });
      if (!r.ok) throw new Error('Sign out failed. Try again.');
      dismissReview();
      drafts.clear();
      clearContextDrafts();
      sendAttempts.clear();
      clearNoticeGroups();
      window.location.assign('/inboxes');
    })().catch(fail)
);
const railViewport = window.matchMedia('(min-width: 768px)');
const syncRail = () => {
  ($('inbox-switcher') as HTMLDetailsElement).open = railViewport.matches;
  document.querySelector<HTMLDetailsElement>('.account-menu')!.open = railViewport.matches;
};
syncRail();
railViewport.addEventListener('change', syncRail);
void refresh();

startSharedMotion();
