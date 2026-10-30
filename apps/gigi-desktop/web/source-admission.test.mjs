import test from 'node:test';
import assert from 'node:assert/strict';

async function settingsFlow(initial, afterSignIn, check) {
  const listeners = new Map(), calls = [];
  const root = { innerHTML: '', classList: { toggle() {} }, addEventListener(name, fn) { listeners.set(name, fn); }, querySelector() { return null; } };
  const prior = { document: globalThis.document, tauri: globalThis.__TAURI__ };
  let signedIn = false;
  globalThis.document = { querySelector: selector => selector === '#app' ? root : null };
  globalThis.__TAURI__ = { core: { invoke: async (_command, { operation, input }) => {
    calls.push(operation);
    if (operation === 'workspace.get') return { id: 'w1', name: 'Synthetic' };
    if (operation === 'records.list') return { items: input.entity === 'profile' ? [{ id: 'p1' }] : [], count: 0 };
    if (operation === 'records.get') return { id: 'p1', fields: { Currency: 'USD' } };
    if (operation === 'auth.login') { signedIn = true; return { email: 'synthetic@example.test' }; }
    if (['sources.status', 'connections.status'].includes(operation)) return { provider: input.provider, ...(signedIn ? afterSignIn : initial) };
    return {};
  } } };
  const settle = async () => { for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve)); };
  const click = async dataset => { listeners.get('click')({ target: { closest: () => ({ dataset }) } }); await settle(); };
  try {
    await import(`./app.mjs?admission=${Math.random()}`); await settle();
    await click({ page: 'settings' });
    await check({ root, calls, click });
    assert.equal(calls.some(op => ['connections.begin', 'connections.openConsent', 'connections.import', 'sources.preview', 'imports.commit'].includes(op)), false);
  } finally { globalThis.document = prior.document; globalThis.__TAURI__ = prior.tauri; }
}

test('admitted disconnected status offers Google connection without another GiGi sign-in', async () => {
  await settingsFlow({ state: 'disconnected' }, {}, async ({ root, calls, click }) => {
    assert.doesNotMatch(root.innerHTML, /data-sign-in="1"/);
    assert.match(root.innerHTML, /data-source-begin="gmail"/);
    assert.match(root.innerHTML, /GiGi source access/);
    assert.equal(calls.includes('auth.login'), false);
    await click({ sourceRefresh: 'gmail' });
    assert.doesNotMatch(root.innerHTML, /data-sign-in="1"/);
  });
});

test('successful Identity sign-in followed by admission denial gives safe guidance, never a consent success prompt', async () => {
  await settingsFlow({ state: 'unavailable', detail: 'session_expired' }, { state: 'unavailable', detail: 'access_denied' }, async ({ root, click }) => {
    await click({ signIn: '1' });
    assert.match(root.innerHTML, /beta access/);
    assert.match(root.innerHTML, /email verification/);
    assert.doesNotMatch(root.innerHTML, /Authorize your sources separately|data-source-begin|data-open-consent/);
    assert.match(root.innerHTML, /GiGi source access<\/strong><span>Current step/);
  });
});

test('sign-in preserves verified Google connection and directs to status and preview', async () => {
  await settingsFlow({ state: 'unavailable', detail: 'session_expired' }, { state: 'connected', connectedAccountId: 'ca_existing' }, async ({ root, click }) => {
    await click({ signIn: '1' });
    assert.match(root.innerHTML, /Account verified/);
    assert.doesNotMatch(root.innerHTML, /Authorize your sources separately|data-source-begin|data-open-consent/);
  });
});

test('pending consent resumes its existing link after GiGi sign-in without a new connection', async () => {
  await settingsFlow({ state: 'unavailable', detail: 'session_expired' }, { state: 'pending', connectedAccountId: 'ca_pending', url: 'https://connect.composio.dev/session/pending', expiresAt: '2030-01-01T00:00:00Z' }, async ({ root, click }) => {
    await click({ signIn: '1' });
    assert.match(root.innerHTML, /data-open-consent="gmail"/);
    assert.doesNotMatch(root.innerHTML, /Authorize your sources separately|data-source-begin/);
    assert.match(root.innerHTML, /Resume the pending Google consent/);
  });
});

test('an unavailable admission check asks for status instead of another sign-in or consent', async () => {
  await settingsFlow({ state: 'unavailable', detail: 'session_expired' }, { state: 'unavailable', detail: 'provider_unavailable' }, async ({ root, calls, click }) => {
    await click({ signIn: '1' });
    assert.match(root.innerHTML, /Check status/);
    assert.doesNotMatch(root.innerHTML, /Authorize your sources separately|data-sign-in="1"|data-source-begin|data-open-consent/);
    assert.equal(calls.filter(op => op === 'auth.login').length, 1);
  });
});
