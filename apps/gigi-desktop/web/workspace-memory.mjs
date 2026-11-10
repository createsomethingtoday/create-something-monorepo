// Controller owns all native writes, revision checks and readback; UI is a view.
export function createWorkspaceMemory({ call, workspaceId, changed, notice }) {
  const state = {
    items: [],
    requests: [],
    nextOffset: null,
    query: '',
    busy: false,
    error: '',
    draft: null,
    receipt: null,
    recovery: null
  };
  let generation = 0;
  let owner = workspaceId();
  function bindWorkspace() {
    if (owner !== workspaceId()) {
      owner = workspaceId();
      generation++;
      Object.assign(state, {
        items: [],
        requests: [],
        nextOffset: null,
        query: '',
        busy: false,
        error: '',
        draft: null,
        receipt: null,
        recovery: null
      });
      changed();
    }
    return owner;
  }
  const input = (v) => ({ ...v, workspaceId: workspaceId() });
  async function read() {
    bindWorkspace();
    const version = ++generation,
      workspace = workspaceId();
    const [entries, requests] = await Promise.all([
      call(
        state.query.trim() ? 'memory.search' : 'memory.list',
        input(state.query.trim() ? { query: state.query.trim(), limit: 5 } : {})
      ),
      call('memory.requests', input({}))
    ]);
    if (version !== generation || workspace !== workspaceId()) return;
    state.items = entries.items;
    state.nextOffset = entries.nextOffset;
    state.requests = requests.items;
    changed();
  }
  async function run(fn) {
    const workspace = bindWorkspace();
    if (state.busy) return;
    state.busy = true;
    state.error = '';
    changed();
    try {
      await fn();
    } catch (e) {
      if (workspace === workspaceId()) state.error = e.message || String(e);
    } finally {
      if (workspace === workspaceId()) {
        state.busy = false;
        changed();
      }
    }
  }
  async function verify() {
    const pending = state.recovery;
    if (!pending) return;
    const status = await call('memory.receipt', {
      workspaceId: pending.workspaceId,
      requestId: pending.requestId
    });
    if (pending !== state.recovery || pending.workspaceId !== workspaceId()) return;
    if (status.state === 'pending_user_approval') {
      state.recovery = null;
      state.error =
        'No completed change is recorded. Review the pending request before trying again.';
      await read();
      return;
    }
    const result = status.receipt;
    if (!result || !['verified', 'rejected'].includes(result.state))
      throw Error('Memory outcome is unresolved. Refresh the receipt before further changes.');
    if (result.state === 'verified' && result.action !== 'forget') {
      const actual = await call('memory.get', {
        workspaceId: pending.workspaceId,
        id: result.memoryId
      });
      if (pending !== state.recovery || pending.workspaceId !== workspaceId()) return;
      if (actual.revision !== result.revision || actual.text !== pending.text)
        throw Error(
          'Memory readback changed or is unresolved. Review the saved entry before further changes.'
        );
    }
    state.receipt = result;
    state.recovery = null;
    await read();
  }
  return {
    state,
    read,
    run,
    recover() {
      return run(verify);
    },
    canLeave() {
      if (!state.draft) return true;
      notice('Save your memory or cancel editing before leaving.');
      return false;
    },
    edit(item = null, action = 'save') {
      bindWorkspace();
      if (state.recovery || state.busy) return;
      state.receipt = null;
      state.draft = {
        requestId: crypto.randomUUID(),
        action,
        ...(item ? { id: item.id, expectedRevision: item.revision } : {}),
        workspaceId: workspaceId(),
        entry: {
          kind: item?.kind || 'preference',
          text: item?.text || '',
          state: item?.state || 'inferred',
          scope: 'workspace',
          source: { kind: item?.source?.kind || 'user', reference: item?.source?.reference || '' }
        }
      };
      changed();
    },
    cancel() {
      if (state.busy || state.recovery) return;
      state.draft = null;
      changed();
    },
    update(field, value) {
      if (state.busy || state.recovery || !state.draft) return;
      if (field === 'reference') state.draft.entry.source.reference = value;
      else if (field === 'sourceKind') state.draft.entry.source.kind = value;
      else state.draft.entry[field] = value;
      changed();
    },
    search(query) {
      state.query = query;
      return run(read);
    },
    more() {
      return run(async () => {
        if (state.nextOffset == null) return;
        const result = await call('memory.list', input({ offset: state.nextOffset }));
        state.items.push(...result.items);
        state.nextOffset = result.nextOffset;
      });
    },
    save() {
      return run(async () => {
        if (state.recovery) throw Error('Check the pending memory receipt first.');
        const draft = structuredClone(state.draft);
        if (!draft) return;
        const workspace = workspaceId();
        if (draft.workspaceId !== workspace)
          throw Error('Workspace changed. Cancel this draft and reopen memory.');
        await call('memory.request', { ...draft, workspaceId: workspace });
        // The exact request is durable. A lost approval response must never be retried blindly.
        if (workspace !== workspaceId()) return;
        state.draft = null;
        state.recovery = {
          requestId: draft.requestId,
          text: draft.entry.text,
          workspaceId: workspace
        };
        await call('memory.review', {
          workspaceId: workspace,
          requestId: draft.requestId,
          decision: 'approve'
        });
        await verify();
      });
    },
    review(requestId, decision) {
      return run(async () => {
        if (state.recovery) throw Error('Check the pending memory receipt first.');
        const request = state.requests.find((x) => x.requestId === requestId);
        state.recovery = {
          requestId,
          text: request?.request.entry?.text,
          workspaceId: workspaceId()
        };
        await call('memory.review', input({ requestId, decision }));
        await verify();
      });
    }
  };
}
