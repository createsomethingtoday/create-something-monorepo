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
let pendingReview: ((confirmed: boolean) => void) | undefined;
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
function para(text: string, cls = 'small') {
  return node('p', text, cls);
}
function tag(text: string) {
  const n = node('span', text.replaceAll('_', ' '), 'tag');
  n.dataset.tone = /revoked|failed|closed|deleted/.test(text)
    ? 'error'
    : /pending|awaiting|paused|expired|unknown/.test(text)
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
  body.replaceChildren(node('h2', title), para(copy, ''));
  body.firstElementChild!.id = 'review-title';
  $('review-confirm').textContent = action;
  const dialog = $<HTMLDialogElement>('review-dialog');
  dialog.returnValue = '';
  dialog.showModal();
  return new Promise((resolve) => {
    pendingReview = resolve;
  });
}
$<HTMLDialogElement>('review-dialog').addEventListener('close', () => {
  pendingReview?.($<HTMLDialogElement>('review-dialog').returnValue === 'confirm');
  pendingReview = undefined;
});
function session(title: string, copy: string, error = false) {
  $('desk').hidden = true;
  const s = $('session');
  s.hidden = false;
  s.replaceChildren(node('h1', title), para(copy, ''));
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
    .map((a) => ({ value: a.id, label: `${a.name}${a.paused ? ' · paused' : ''} (${a.id})` }));
}
function renderRail() {
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
  if (id !== state.inboxId && $('workspace-content').querySelector('textarea')?.value) {
    if (
      !(await confirm(
        'Leave this draft?',
        'The draft stays only on this page. Switching inboxes discards it.',
        'Discard draft'
      ))
    )
      return;
  }
  state.inboxId = id;
  state.viewAgentId = '';
  state.pane = 'conversation';
  await loadInbox();
  renderRail();
}
async function loadInbox() {
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
  root.append(
    heading(
      inbox.name,
      `Inbox ${inbox.id} · ${isCustodian() ? 'You are the human custodian' : 'You are a participant owner'}`
    )
  );
  const view = selectField(
    'Reading as',
    'view',
    [
      ...(isCustodian()
        ? [{ value: '', label: 'Inbox custodian · all retained shared history' }]
        : [{ value: '', label: 'Select an agent membership to read' }]),
      ...(
        inbox.views ??
        state.agents
          .filter((a) => state.members.some((m) => m.agent_id === a.id))
          .map((a) => ({ agent_id: a.id, name: a.name }))
      ).map((a) => ({ value: a.agent_id, label: `Agent membership · ${a.name} (${a.agent_id})` }))
    ],
    state.viewAgentId
  );
  view.input.addEventListener('change', () => {
    state.viewAgentId = view.input.value;
    void loadInbox();
  });
  root.append(view.wrap);
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
  for (const [id, label] of [
    ['conversation', 'Conversation'],
    ['members', 'Members & access'],
    ['context', 'Shared context'],
    ['status', 'Delivery & status']
  ]) {
    const b = button(label, () => {
      state.pane = id;
      render();
      $('workspace-content').querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
    });
    b.className = '';
    if (state.pane === id) b.setAttribute('aria-current', 'page');
    tabs.append(b);
  }
  root.append(tabs);
  const status = node('div', '', 'shared-status');
  status.append(
    tag(`Inbox: ${inbox.state}`),
    tag(state.viewAgentId ? 'View: agent membership' : 'View: custodian')
  );
  root.append(status);
  if (state.pane === 'members') renderMembers(root);
  else if (state.pane === 'context') void renderContext(root);
  else if (state.pane === 'status') void renderStatus(root);
  else renderConversation(root);
}
function audience() {
  const n = node('aside', '', 'boundary');
  n.append(
    para('Shared audience', ''),
    para(
      'Visible to the inbox custodian and authorized agent memberships and their owners. Future members can see content from their admission point; existing members may quote earlier content into later messages. This is not a private note.'
    )
  );
  return n;
}
function renderConversation(root: HTMLElement) {
  root.append(audience());
  const stream = node('div', '', 'message-stream');
  stream.setAttribute('aria-label', 'Shared messages');
  if (!state.messages.length)
    stream.append(
      empty(
        'The conversation starts here.',
        'Post context for the group, or request work from one named agent. A conversation post does not ask an agent to act.'
      )
    );
  for (const m of state.messages) {
    const article = node('article', '', 'shared-message');
    article.id = `message-${m.id}`;
    article.tabIndex = -1;
    const meta = node('div', '', 'message-meta');
    meta.append(
      node(
        'strong',
        m.author_name || (m.author_agent_id ? agentName(m.author_agent_id) : 'Verified owner')
      ),
      node('time', date(m.created_at))
    );
    article.append(meta, para(m.text, 'message-text'));
    const status = node('div', '', 'shared-status');
    status.append(tag(m.kind), tag(`${m.kind === 'request' ? 'Work' : 'Message'}: ${m.state}`));
    if (m.assignee_agent_id) status.append(tag(`Assigned: ${agentName(m.assignee_agent_id)}`));
    article.append(status);
    if (m.kind === 'request')
      article.append(
        para(
          'A request is subject to the assigned agent owner’s policy. Delivery is separate from work.'
        )
      );
    if (isCustodian() && m.state === 'awaiting_assignment') {
      const actions = node('div', '', 'message-actions');
      const assignee = selectField(
        'New assignee',
        'reassign-' + m.id,
        state.members
          .filter((a) => a.state === 'active' && a.capabilities.includes('work'))
          .map((a) => ({ value: a.agent_id, label: agentName(a.agent_id) }))
      );
      actions.append(
        assignee.wrap,
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
    stream.append(article);
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
  form.append(node('h3', 'Add to the shared conversation'));
  const text = field('Message', 'text', 'textarea');
  text.input.required = true;
  text.input.maxLength = 16384;
  const options = node('div', '', 'compose-options');
  const mode = selectField('Message type', 'kind', [
    { value: 'conversation', label: 'Conversation · no work requested' },
    { value: 'request', label: 'Request work · explicit assignee' }
  ]);
  const assignee = selectField('Assign work to', 'assignee', [
    { value: '', label: 'Choose an active agent' },
    ...state.members
      .filter((a) => a.state === 'active' && a.capabilities.includes('work'))
      .map((a) => ({ value: a.agent_id, label: agentName(a.agent_id) }))
  ]);
  assignee.wrap.hidden = true;
  const policy = para(
    'Posting as your verified owner identity. Conversation posts do not request agent work.'
  );
  mode.input.addEventListener('change', () => {
    assignee.wrap.hidden = mode.input.value !== 'request';
    assignee.input.required = mode.input.value === 'request';
    submit.textContent = mode.input.value === 'request' ? 'Request work →' : 'Post conversation →';
    policy.textContent =
      mode.input.value === 'request'
        ? 'Only the named agent is assigned. This does not grant external tools or approval.'
        : 'Posting as your verified owner identity. Conversation posts do not request agent work.';
  });
  options.append(mode.wrap, assignee.wrap);
  const submit = node('button', 'Post conversation →', 'button button-primary');
  submit.type = 'submit';
  form.append(
    text.wrap,
    options,
    policy,
    para('Text only, up to 16 KiB in UTF-8. Do not include credentials or secrets.'),
    submit
  );
  let key = crypto.randomUUID(),
    lastPayload = '';
  formAction(form, async () => {
    const payload = JSON.stringify([text.input.value, mode.input.value, assignee.input.value]);
    if (payload !== lastPayload) {
      key = crypto.randomUUID();
      lastPayload = payload;
    }
    if (new TextEncoder().encode(text.input.value).length > 16384)
      throw new Error('Shorten the message to 16 KiB of UTF-8 text.');
    const generation = state.generation;
    const posted = await api<SharedMessage>(path('/messages'), 'POST', {
      text: text.input.value,
      kind: mode.input.value,
      ...(mode.input.value === 'request' ? { assigneeAgentId: assignee.input.value } : {}),
      idempotencyKey: key,
      ...(state.viewAgentId ? { viewAgentId: state.viewAgentId } : {})
    });
    if (generation !== state.generation) return;
    key = crypto.randomUUID();
    text.input.value = '';
    notice('Message posted. Delivery and work status are separate.');
    state.messages = [...state.messages.filter((m) => m.id !== posted.id), posted].sort(
      (a, b) => a.cursor - b.cursor
    );
    render();
    document.getElementById(`message-${posted.id}`)?.focus();
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
    const r = node('article', '', 'shared-record');
    r.append(
      node('h3', agentName(member.agent_id)),
      node('code', member.agent_id),
      para(
        `Permissions: ${member.capabilities} · History begins at cursor ${member.admission_cursor} · Generation ${member.generation}`
      ),
      tag(`Membership: ${member.state}`)
    );
    if (
      member.state === 'active' &&
      (isCustodian() || state.agents.some((a) => a.id === member.agent_id))
    ) {
      const own = state.agents.some((a) => a.id === member.agent_id);
      r.append(
        button(
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
        )
      );
    }
    root.append(r);
  }
  if (!isCustodian()) return;
  const own = node('form', '', 'compact-form');
  own.append(node('h3', 'Add one of your agents'));
  const agent = selectField('Your agent', 'own-agent', ownOptions());
  const b = node('button', 'Add agent', 'button');
  b.type = 'submit';
  own.append(
    agent.wrap,
    para('Your approval activates this exact agent membership at the current history boundary.'),
    b
  );
  formAction(own, () =>
    mutate(
      path('/members'),
      { agentId: agent.input.value, capabilities: caps },
      'POST',
      'Agent added.'
    )
  );
  root.append(own);
  const invite = node('form', '', 'compact-form');
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
      const select = selectField(
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
      para(`Your invited agent: ${agentName(i.agent_id)}`),
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
    else r.append(para('Open invitation details to inspect the current roster before acceptance.'));
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
                  `Agent ${i.agent_id}; inbox ${detail.inbox_name ?? i.inbox_id}; custodian ${detail.inviter_subject ?? 'inbox owner'}; permissions ${i.capabilities}. Current roster: ${roster || 'none'}. History begins now. The custodian can read all retained shared content. Future members and owners can see content from their admission point. Participation grants no external tool permission.`,
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
  root.append(
    para(
      'Text context is shared under the same membership history boundary as messages. Revocation blocks future reads; delivered copies remain.'
    )
  );
  const list = node('div');
  root.append(list);
  let after = 0;
  const loadPage = async () => {
    const params = new URLSearchParams();
    if (state.viewAgentId) params.set('viewAgentId', state.viewAgentId);
    if (after) params.set('after', String(after));
    const result = await api<SharedPage<SharedContext>>(path(`/context?${params}`));
    if (generation !== state.generation || !list.isConnected) return;
    state.context = after ? [...state.context, ...result.items] : result.items;
    if (!after && !result.items.length)
      list.append(
        empty(
          'No shared context yet.',
          'Add a text document for this inbox. Do not include credentials or secrets.'
        )
      );
    for (const c of result.items) {
      const r = node('article', '', 'shared-record');
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
      r.append(
        node('h3', c.title),
        para(`Added ${date(c.created_at)} · Expires ${date(c.expires_at)}`),
        node('code', `SHA-256 ${c.sha256}`),
        read,
        sections
      );
      if (isCustodian())
        r.append(
          button(
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
          )
        );
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
    list.append(para('Shared context could not be loaded. Refresh to retry.', 'error-inline'));
    fail(e);
  }
  if (!isCustodian()) return;
  const form = node('form', '', 'compact-form');
  const title = field('Document title', 'context-title');
  title.input.required = true;
  title.input.maxLength = 120;
  const text = field('Text content', 'context-text', 'textarea');
  text.input.required = true;
  text.input.maxLength = 65536;
  const upload = field('Or load a local text file', 'context-file');
  (upload.input as HTMLInputElement).type = 'file';
  (upload.input as HTMLInputElement).accept = '.txt,.md,text/plain,text/markdown';
  upload.input.addEventListener(
    'change',
    () =>
      void (async () => {
        const file = (upload.input as HTMLInputElement).files?.[0];
        if (!file) return;
        if (file.size > 65536) throw new Error('Choose a text file up to 64 KiB.');
        text.input.value = await file.text();
        if (!title.input.value) title.input.value = file.name;
      })().catch(fail)
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
    b
  );
  formAction(form, async () => {
    if (new TextEncoder().encode(text.input.value).length > 65536)
      throw new Error('Shorten context to 64 KiB of UTF-8 text.');
    await mutate(
      path('/context'),
      { title: title.input.value, text: text.input.value },
      'POST',
      'Context shared.'
    );
  });
  root.append(form);
}
async function renderStatus(root: HTMLElement) {
  root.append(
    node('h3', 'Separate facts, separate receipts'),
    para(
      'Membership permits participation. Connection authorization binds a runtime to one agent. Monitoring requires a live event subscription. HTTP delivery acceptance is not evidence of completed work.'
    )
  );
  const list = node('div');
  root.append(list);
  const generation = state.generation;
  try {
    const result = await api<{ subscriptions: Record<string, unknown>[] }>(
      path(`/monitoring${query()}`)
    );
    if (generation !== state.generation || !list.isConnected) return;
    if (!result.subscriptions.length)
      list.append(
        empty(
          'No event subscriptions recorded for your agents.',
          'Unattended monitoring is not established. Other owners’ subscription details are private.'
        )
      );
    for (const row of result.subscriptions) {
      const section = node('section', '', 'shared-record');
      section.append(node('h3', agentName(String(row.agentId))), tag(`Monitoring: ${row.status}`));
      const data = node('dl', '', 'status-facts');
      for (const [key, label] of [
        ['id', 'Subscription'],
        ['generation', 'Membership generation'],
        ['expiresAt', 'Lease expires'],
        ['cursor', 'Replay cursor'],
        ['accepted', 'HTTP accepted receipts'],
        ['pending', 'Pending delivery receipts']
      ])
        if (row[key] !== undefined && row[key] !== null)
          data.append(
            node('dt', label),
            node('dd', key === 'expiresAt' ? date(Number(row[key])) : String(row[key]))
          );
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
  } catch {
    list.append(
      para(
        'Monitoring and delivery receipts are unavailable. No monitoring or delivery claim can be made.',
        'error-inline'
      )
    );
  }
}
async function refresh() {
  try {
    state.me = await api<Me>('/me');
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
      window.location.assign('/inboxes');
    })().catch(fail)
);
void refresh();
