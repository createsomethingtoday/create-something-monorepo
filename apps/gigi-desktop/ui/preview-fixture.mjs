// Development-only synthetic backend. Vite removes this import from production.
// It never invokes Tauri, a provider, a real workspace or the filesystem.
export function startFixture({ startController, renderUI }) {
  const workspace = { id: new URLSearchParams(location.search).get('memoryWorkspace') || 'synthetic-astryx-rewrite', name: 'Rehearsal workspace · synthetic' };
  const make = (id, title, entity, fields = {}) => ({
    id,
    workspaceId: workspace.id,
    title,
    entity,
    fields,
    source: { kind: 'manual' },
    relations: [],
    date: fields.Date || fields['Due Date'],
    status: fields.Status
  });
  const records = {
    profile: [make('profile-1', 'Rehearsal owner', 'profile', { Currency: 'USD' })],
    tasks: [
      make('task-1', 'Confirm the rehearsal time', 'tasks', {
        Status: 'Open',
        'Due Date': '2026-11-09',
        Priority: 'High'
      }),
      make('task-2', 'Review the stage plan', 'tasks', { Status: 'Open' })
    ],
    gigs: [
      make('gig-1', 'Autumn showcase', 'gigs', {
        Status: 'Booked',
        Date: '2026-11-12',
        Fee: 25000,
        'Work kind': 'Performance'
      })
    ],
    contacts: [
      make('person-1', 'Rehearsal contact', 'contacts', { Email: 'rehearsal@example.invalid' })
    ],
    finances: [
      make('money-1', 'Showcase fee', 'finances', {
        Amount: 25000,
        Direction: 'Income',
        Status: 'Expected'
      })
    ],
    locations: [make('place-1', 'Rehearsal room', 'locations')],
    schedule: []
  };
  const calls = [],
    sessions = new Map();
  const faults = new Map();
  let id = 0,
    ctx;
  const attention = {
    items: [],
    unreadCount: 0,
    settings: {
      enabled: false,
      detailedPreviews: false,
      reminders: false,
      quietStart: 22,
      quietEnd: 8
    }
  };
  const invoke = async (_, { operation, input = {} }) => {
    calls.push({ operation, input: structuredClone(input) });
    const faultKey = faults.has(`${operation}:${input.entity}`)
      ? `${operation}:${input.entity}`
      : operation;
    if (faults.has(faultKey)) {
      const message = faults.get(faultKey);
      faults.delete(faultKey);
      throw Error(message);
    }
    if (operation.startsWith('memory.') && new URLSearchParams(location.search).get('nativeMemory') === '1') {
      const response = await fetch('/__synthetic_memory', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation,input})});
      const result = await response.json(); if (result.error) throw Error(result.error); return result.value;
    }
    if (operation === 'workspace.get') return workspace;
    if (operation === 'workspace.create') return { ...workspace, name: input.name };
    if (operation === 'today.read') {
      const today = input.today || '2026-11-09';
      const shift = (day, offset) => { const date = new Date(`${day}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + offset); return date.toISOString().slice(0, 10); };
      const date = new Date(`${today}T12:00:00Z`);
      const monday = shift(today, -((date.getUTCDay() + 6) % 7));
      const start = input.weekStart || monday;
      const section = items => ({ count: items.length, items: structuredClone(items) });
      return { today, calendar: { weekStart: start, weekEnd: shift(start, 6), ...section(records.gigs.filter(r => r.date >= start && r.date <= shift(start, 6))) },
        tasks: section(records.tasks.filter(r => r.date && r.date <= shift(today, 1) && !['done','completed','cancelled'].includes(String(r.fields.Status).toLowerCase()))),
        payable: section(records.finances.filter(r => r.fields.Direction === 'Expense' && r.fields['Due Date'] <= shift(monday, 6))),
        receivable: section(records.finances.filter(r => r.fields.Direction === 'Income' && r.fields['Due Date'] <= shift(monday, 6))),
        financialThrough: shift(monday, 6) };
    }
    if (operation === 'workspace.overview')
      return {
        counts: Object.fromEntries(Object.entries(records).map(([k, v]) => [k, v.length])),
        events: { items: records.gigs, count: records.gigs.length },
        tasks: { items: records.tasks, count: records.tasks.length },
        finances: { items: records.finances, count: records.finances.length }
      };
    if (operation === 'workspace.search')
      return {
        groups: [
          {
            entity: 'tasks',
            items: records.tasks.filter((r) =>
              r.title.toLowerCase().includes(String(input.query || '').toLowerCase())
            ),
            count: 2
          }
        ],
        total: 2
      };
    if (operation === 'records.list') {
      const all = records[input.entity] || [];
      if (input.entity === 'tasks' && input.tasks) {
        const criteria = input.tasks, today = criteria.today || '2026-11-09';
        const tomorrow = new Date(`${today}T12:00:00Z`); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        const open = r => !['done', 'complete', 'completed', 'cancelled', 'archived'].includes(String(r.fields.Status).toLowerCase());
        const soon = r => open(r) && r.date && r.date <= tomorrow.toISOString().slice(0,10);
        const items = all.filter(r => (criteria.view === 'done' ? !open(r) : criteria.view === 'all' ? open(r) : soon(r)) && r.title.toLowerCase().includes((criteria.query || '').toLowerCase()));
        return { items: structuredClone(items), count: items.length, total: all.length, today, nextCursor: null, viewCounts: {soon: all.filter(soon).length, all: all.filter(open).length, done: all.filter(r => !open(r)).length} };
      }
      const items = input.query
          ? all.filter((r) => r.title.toLowerCase().includes(input.query.toLowerCase()))
          : all;
      return {
        items: structuredClone(items),
        count: items.length,
        total: all.length,
        nextCursor: null,
        viewCounts: { upcoming: all.length, past: 0, all: all.length },
        statusOptions: ['Booked', 'Open'],
        typeOptions: []
      };
    }
    if (operation === 'records.get') {
      const record = (records[input.entity] || []).find((r) => r.id === input.id);
      if (!record) throw Error('Record not found.');
      return structuredClone(record);
    }
    if (operation === 'records.save') {
      const list = (records[input.entity] ??= []);
      const current = list.find((r) => r.id === input.id);
      if (
        current &&
        input.expectedRecord &&
        JSON.stringify(input.expectedRecord.fields) !== JSON.stringify(current.fields)
      )
        throw Error('stale_record');
      const next = make(
        current?.id || input.id || `synthetic-${++id}`,
        input.title,
        input.entity,
        input.fields || {}
      );
      if (current) list[list.indexOf(current)] = next;
      else list.push(next);
      return structuredClone(next);
    }
    if (operation === 'gigs.summary') return { financialsComplete: false, currency: 'USD' };
    if (operation === 'schema.describe')
      return {
        relationFields: [
          { name: 'Contacts', targetEntity: 'contacts' },
          { name: 'Location', targetEntity: 'locations' },
          { name: 'Tasks', targetEntity: 'tasks' }
        ]
      };
    if (operation === 'relations.link') {
      const record = records[input.fromEntity]?.find((r) => r.id === input.fromId);
      record?.relations.push({
        fromEntity: input.fromEntity,
        fromId: input.fromId,
        toEntity: input.toEntity,
        toId: input.toId,
        role: input.role
      });
      return { linked: true, ...structuredClone(input) };
    }
    if (operation === 'history.list') return { items: [] };
    if (operation.startsWith('sources.'))
      return {
        provider: input.provider,
        state: 'disconnected',
        access: { state: 'admitted' },
        configured: true
      };
    if (operation === 'agent.chat.status')
      return { available: true, authenticated: true, provider: 'codex' };
    if (operation === 'agent.chat.list') return { sessions: [...sessions.values()] };
    if (operation === 'agent.chat.start') {
      const value = {
        sessionId: `session-${++id}`,
        title: 'Synthetic conversation',
        state: 'idle',
        messages: [],
        approvals: [],
        recordLinks: []
      };
      sessions.set(value.sessionId, value);
      return structuredClone(value);
    }
    if (operation === 'agent.chat.send') {
      const value = sessions.get(input.sessionId);
      value.messages.push(
        { id: `user-${++id}`, role: 'user', text: input.message },
        {
          id: `assistant-${++id}`,
          role: 'assistant',
          text: '## Rehearsal plan\n\nReview the saved call time before changing it.\n\n- Check the venue.\n- Review the stage plan.\n\n<script>untrusted source</script>'
        }
      );
      return structuredClone(value);
    }
    if (operation === 'agent.chat.read' || operation === 'agent.chat.poll')
      return structuredClone(sessions.get(input.sessionId));
    if (operation === 'agent.chat.cancel') {
      const value = sessions.get(input.sessionId);
      value.state = 'interrupted';
      return structuredClone(value);
    }
    if (operation.startsWith('attention.')) return attention;
    if (operation === 'notifications.status') return { permission: 'denied', alertsEnabled: false };
    if (operation === 'notifications.pendingOpen' || operation === 'notifications.takeOpen')
      return {};
    if (operation === 'notifications.send') return { sent: 0 };
    if (operation === 'agent.status') return { prepared: false };
    if (operation === 'diagnostics.status') return { enabled: false, eventCount: 0 };
    if (operation === 'ai.connection.status') return { state: 'signed_out', available: true };
    if (operation === 'music.list') {
      const items =
        query.get('review') === '1'
          ? [
              {
                id: 'music-review-1',
                title: 'Synthetic review track',
                artist: 'Crew',
                kind: 'audio',
                filename: 'review.wav',
                bytes: 1200,
                availability: 'available',
                organizationRevision: 1
              }
            ]
          : [];
      return { items, total: items.length, hasMore: false };
    }
    if (operation === 'music.edit' && query.get('review') === '1')
      return { ...input, organizationRevision: input.expectedRevision + 1 };
    if (operation === 'social.list') return { items: [], count: 0 };
    if (operation === 'social.connection.status')
      return { configured: false, state: 'disconnected' };
    if (operation === 'artwork.list') return { items: [], count: 0 };
    if (operation === 'backup.create') return { backupId: '00000000-0000-4000-8000-000000000001' };
    if (operation === 'context.search') return [];
    if (operation === 'context.sync') return { synced: true };
    throw Error(`Synthetic operation denied: ${operation}`);
  };
  const query = new URLSearchParams(location.search);
  ctx = startController({
    renderUI,
    invoke,
    initialize: (initial) => {
      initial.state.workspace = workspace;
      initial.state.currency = 'USD';
      initial.state.currencyKnown = true;
      initial.actions.setPreferences({
        ...initial.preferences,
        theme: query.get('theme') || 'studio',
        density: query.get('density') || 'comfortable'
      });
      initial.actions.initializeChat();
      void initial.actions.openPage(query.get('fixture') || 'overview');
    }
  });
  globalThis.gigiTest = {
    calls,
    records,
    sessions,
    failNext(operation, message) {
      faults.set(operation, message);
    },
    snapshot: () => ctx.actions.snapshot(),
    open: (page) => ctx.actions.openPage(page),
    render: () => ctx.actions.render(),
    set(patch) {
      Object.assign(ctx.state, patch);
      ctx.actions.render();
    }
  };
}
