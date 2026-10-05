import assert from 'node:assert/strict';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { accountPage } from '../src/services/account-page.ts';
import identityWorker from '../src/index.ts';

test('account pages prevent cache, referrer, storage and framing leaks', async () => {
  for (const path of ['/login', '/recover', '/verify']) {
    const response = accountPage(path)!;
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
    const html = await response.text();
    const nonce = html.match(/<script nonce="([^"]+)"/)![1];
    assert.ok(response.headers.get('Content-Security-Policy')?.includes(`script-src 'nonce-${nonce}'`));
    assert.ok(response.headers.get('Content-Security-Policy')?.includes("frame-ancestors 'none'"));
    if (path === '/verify') assert.match(html, /history.replaceState/);
    assert.doesNotMatch(html, /localStorage|sessionStorage|document.cookie|console\.log/);
  }
  assert.equal(accountPage('/'), null);
  assert.equal(accountPage('/signup'), null);
});

test('generic account entry has no credential form, auth request or token issuance', async () => {
  const response = await identityWorker.fetch(new Request('https://id.createsomething.space/login?app=gigi&next=https://evil.example'), {
    DB: { prepare() { throw new Error('Generic entry must not access auth storage'); } }
  } as any);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.doesNotMatch(html, /<form\b|<input\b|fetch\(|\/v1\/auth\/login|access_token|refresh_token/);
  assert.match(html, /Open the app you want to use and sign in there/);
  const links: Record<string, { href?: string; hidden?: boolean }> = {
    '#recovery': {}, '#login': {}, '#return': {}
  };
  let requests = 0;
  runInNewContext(html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)![1], {
    URLSearchParams,
    location: { search: '?app=gigi&next=https://evil.example' },
    document: { querySelector: (selector: string) => links[selector] },
    fetch: () => { requests++; throw new Error('No auth request allowed'); }
  });
  assert.equal(requests, 0);
  assert.equal(links['#recovery'].href, '/recover?app=gigi');
  assert.equal(links['#return'].href, 'https://createsomething.agency/gigi/beta');
});

test('each request gets a fresh CSP nonce', () => {
  assert.notEqual(accountPage('/login')!.headers.get('Content-Security-Policy'), accountPage('/login')!.headers.get('Content-Security-Policy'));
});

test('verification mismatch clears both fields and never sends credentials', async () => {
  const html = await accountPage('/verify')!.text();
  const script = html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)![1];
  const fields = [{ value: 'different-password-a' }, { value: 'different-password-b' }];
  const button = { disabled: false };
  const error = { textContent: '' };
  let submit: (event: unknown) => Promise<void>;
  const link = { href: '', hidden: true };
  const form = { hidden: false, querySelector: () => button, querySelectorAll: () => fields, addEventListener: (_: string, handler: typeof submit) => { submit = handler; } };
  runInNewContext(script, {
    URLSearchParams, location: { search: '', hash: '#token=' + 'a'.repeat(64), pathname: '/verify' },
    history: { replaceState() {} },
    document: { querySelector: (selector: string) => selector === 'form' ? form : selector === '[role="alert"]' ? error : link, getElementById: () => link },
    FormData: class { get(name: string) { return name === 'password' ? fields[0].value : fields[1].value; } },
    fetch() { throw new Error('Mismatch must not send credentials'); }
  });
  await submit!({ preventDefault() {} });
  assert.deepEqual(fields.map(field => field.value), ['', '']);
  assert.equal(error.textContent, 'The passwords do not match.');
  assert.equal(button.disabled, false);
});
