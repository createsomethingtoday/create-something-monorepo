import test from 'node:test';
import assert from 'node:assert/strict';

async function fixture(run, { currency = 'CAD', status = () => ({ state: 'connected' }), count = 1 } = {}) {
  const previous = { document: globalThis.document, tauri: globalThis.__TAURI__, scrollTo: globalThis.scrollTo, scrollX: globalThis.scrollX, scrollY: globalThis.scrollY };
  const listeners = new Map(), calls = [], scrolls = [], focuses = [];
  const root = { innerHTML: '', classList: { toggle() {} }, addEventListener(name, handler) { listeners.set(name, handler); }, querySelector(selector) { return selector.startsWith('[data-edit]') || selector.startsWith('[data-new=') ? { focus(options) { focuses.push({ selector, options }); } } : null; } };
  globalThis.document = { querySelector: () => root };
  globalThis.scrollX = 0; globalThis.scrollY = 0; globalThis.scrollTo = (...args) => scrolls.push(args);
  globalThis.__TAURI__ = { core: { invoke: async (_command, { operation, input }) => {
    calls.push({ operation, input });
    if (operation === 'workspace.get') return { id: 'w1', name: 'Synthetic review' };
    if (operation === 'records.list') return { items: input.entity === 'profile' ? [{ id: 'p1' }] : count ? [{ id: 'r1', title: 'Saved record', date: '2026-10-03T16:00:00-05:00' }] : [], count };
    if (operation === 'records.get') return input.entity === 'profile' ? { id: 'p1', title: 'Owner', fields: { Currency: currency } } : { id: 'r1', title: 'Saved record', fields: { Date: '2026-10-03T16:00:00-05:00', Requirements: 'Saved detail', 'Estimated Time': 2, Recurring: 'Custom value' }, relations: [] };
    if (operation === 'connections.status') return status(input.provider);
    return {};
  } } };
  const settle = () => new Promise(resolve => setImmediate(resolve));
  const click = async dataset => { listeners.get('click')({ target: { closest: () => ({ dataset }) } }); await settle(); };
  try { await import(`./app.mjs?polish=${Math.random()}`); await settle(); await run({ root, calls, click, scrolls, focuses, listeners, settle }); }
  finally { Object.assign(globalThis, { document: previous.document, __TAURI__: previous.tauri, scrollTo: previous.scrollTo, scrollX: previous.scrollX, scrollY: previous.scrollY }); }
}

test('existing People, Gig and Task editors return to the originating detail and position without writes', async () => {
  await fixture(async ({ root, calls, click, scrolls, focuses }) => {
    for (const entity of ['contacts', 'gigs', 'tasks']) {
      await click({ page: entity }); await click({ open: 'r1', entity });
      for (const action of ['cancel', 'cancel']) {
        globalThis.scrollY = 380;
        await click({ edit: '1' });
        assert.match(root.innerHTML, /id="record-form"/);
        await click({ [action]: '1' });
        assert.match(root.innerHTML, /Record detail/);
        assert.doesNotMatch(root.innerHTML, /id="record-form"/);
        assert.deepEqual(scrolls.at(-1), [0, 380]);
        assert.equal(focuses.at(-1)?.selector, '[data-edit]');
      }
      await click({ back: '1' });
      assert.match(root.innerHTML, /Your records/);
    }
    assert.equal(calls.some(({ operation }) => /save|link|delete|import/.test(operation)), false);
  });
});

test('new record Cancel returns to its collection without creating a record', async () => {
  await fixture(async ({ root, calls, click, focuses }) => {
    await click({ page: 'contacts' }); await click({ new: 'contacts' }); await click({ cancel: '1' });
    assert.match(root.innerHTML, /Your records/);
    assert.doesNotMatch(root.innerHTML, /Record detail/);
    assert.equal(focuses.at(-1)?.selector, '[data-new="contacts"]');
    assert.equal(calls.some(({ operation }) => operation === 'records.save'), false);
  });
});

test('editors use verified labels and accessible date and actual-currency help without changing field names', async () => {
  await fixture(async ({ root, click }) => {
    await click({ new: 'contacts' });
    assert.ok(/for="title">Name /.test(root.innerHTML));
    assert.ok(/id="title" name="title"/.test(root.innerHTML));
    await click({ page: 'gigs' }); await click({ open: 'r1', entity: 'gigs' }); await click({ edit: '1' });
    assert.ok(/id="field-date"[^>]+aria-describedby="field-date-help"/.test(root.innerHTML));
    assert.ok(/id="field-date-help"[^>]*>Use YYYY-MM-DD/.test(root.innerHTML));
    assert.ok(/id="field-fee-help"[^>]*>Enter an amount in CAD/.test(root.innerHTML));
    await click({ page: 'tasks' }); await click({ open: 'r1', entity: 'tasks' }); await click({ edit: '1' });
    assert.ok(/for="field-do-date">Do Date<\/label>/.test(root.innerHTML));
    assert.ok(/name="Estimated Time" value="2"/.test(root.innerHTML));
    assert.ok(/name="Recurring" value="Custom value"/.test(root.innerHTML));
  });
  await fixture(async ({ root, click }) => {
    await click({ new: 'finances' });
    assert.ok(/Currency is not set/.test(root.innerHTML));
    assert.ok(!/amount in USD/.test(root.innerHTML));
  }, { currency: null });
});

test('collections use singular and plural nouns including financial records', async () => {
  for (const count of [0, 1, 3]) await fixture(async ({ root, click }) => {
    for (const [entity, singular, plural] of [['tasks', 'task', 'tasks'], ['finances', 'financial record', 'financial records'], ['contacts', 'person', 'people']]) {
      await click({ page: entity });
      assert.ok(root.innerHTML.includes(`<h2>${count} ${count === 1 ? singular : plural}</h2>`));
    }
  }, { count });
});

test('rejected refresh receipts remain checking while genuine outages and retry recovery are distinct', async () => {
  let failure = 'refresh_in_progress';
  await fixture(async ({ root, calls, click }) => {
    await click({ page: 'settings' });
    assert.ok(/Checking session/.test(root.innerHTML));
    assert.ok(!/>Unavailable</.test(root.innerHTML));
    assert.ok(/1 of 2 verified/.test(root.innerHTML));
    assert.ok(!/data-source-begin="gmail"/.test(root.innerHTML));
    failure = 'refresh_outcome_unknown'; await click({ sourceRefresh: 'gmail' });
    assert.ok(/refresh outcome is uncertain/.test(root.innerHTML));
    failure = 'unavailable'; await click({ sourceRefresh: 'gmail' });
    assert.ok(/>Unavailable</.test(root.innerHTML));
    failure = null; await click({ sourceRefresh: 'gmail' });
    assert.ok(/2 of 2 verified/.test(root.innerHTML));
    assert.equal(calls.some(({ operation }) => /begin|auth|reconcile|import|save/.test(operation)), false);
  }, { status(provider) { if (provider === 'gmail' && failure) throw new Error(failure); return { state: 'connected', connectedAccountId: 'synthetic' }; } });
});

test('pending status reads display Checking consistently until a receipt arrives', async () => {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  await fixture(async ({ root, click, settle }) => {
    await click({ page: 'settings' });
    assert.ok(/Checking status/.test(root.innerHTML));
    assert.ok(/Checking 2 sources/.test(root.innerHTML));
    assert.ok(!/>Unavailable</.test(root.innerHTML));
    release({ state: 'connected' }); await settle();
    assert.ok(/2 of 2 verified/.test(root.innerHTML));
  }, { status: () => pending });
});

test('new record from Overview Cancel loads the destination collection rather than reusing prior rows', async () => {
  await fixture(async ({ calls, click }) => {
    await click({ page: 'contacts' }); await click({ page: 'overview' });
    await click({ new: 'gigs' }); await click({ cancel: '1' });
    assert.ok(calls.some(({ operation, input }) => operation === 'records.list' && input.entity === 'gigs'));
    assert.equal(calls.some(({ operation }) => operation === 'records.save'), false);
  });
});
