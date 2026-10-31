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


test('GiGi signup is explicitly enabled and scoped to its application', async () => {
  assert.equal(accountPage('/signup'), null);
  assert.equal(accountPage('/signup', { app: 'gigi' }), null);
  assert.equal(accountPage('/signup', { app: 'private', gigiSignupEnabled: true }), null);
  const response = accountPage('/signup', { app: 'gigi', gigiSignupEnabled: true });
  assert.ok(response);
  const html = await response.text();
  assert.match(html, /Create your GiGi account/);
  assert.match(html, /Email verification link/);
  assert.doesNotMatch(html, /name="password"|by invitation|localStorage|sessionStorage/);
});

async function runAccountForm(path: string, options: Parameters<typeof accountPage>[1], response: Response | Error, search = '?app=gigi') {
  const html = await accountPage(path, options)!.text();
  const fields = [{value:'synthetic-password-123'}, {value:'synthetic-password-123'}];
  const links: Record<string, any> = {};
  const error = {textContent:''};
  const status = {textContent:'', focus() {}};
  const button = {disabled:false};
  let submit: (event: unknown) => Promise<void>;
  let request: {url:string;body:unknown}|undefined;
  let cleared = false;
  const form = {hidden:false, querySelector:()=>button, querySelectorAll:()=>fields, addEventListener:(_:string, handler:typeof submit)=>{submit=handler},reset(){fields.forEach(f=>f.value='')}};
  runInNewContext(html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)![1], {
    URLSearchParams, AbortSignal,
    location:{search,hash:'#token='+'a'.repeat(64),pathname:path},
    history:{replaceState(){cleared=true}},
    document:{querySelector:(selector:string)=>selector==='form'?form:selector==='[role="alert"]'?error:selector==='[role="status"]'?status:(links[selector]??={hidden:true})},
    FormData:class {get(name:string){return name==='email'?'new-user@example.test':name==='password'?fields[0].value:fields[1].value}},
    fetch:async (url:string,init:RequestInit)=>{request={url,body:JSON.parse(String(init.body))};if(response instanceof Error)throw response;return response}
  });
  await submit!({preventDefault(){}});
  return {request,error,status,fields,form,button,cleared,links};
}

test('signup sends mailbox proof request and explains existing account recovery', async () => {
  const result = await runAccountForm('/signup', {app:'gigi',gigiSignupEnabled:true}, Response.json({accepted:true}));
  assert.equal(result.request?.url, '/v1/auth/enrollment/start');
  assert.deepEqual(result.request?.body, {email:'new-user@example.test',purpose:'signup',experience:'identity',app:'gigi'});
  assert.match(result.status.textContent, /15 minutes/);
  assert.match(result.status.textContent, /already have an account/i);
  assert.equal(result.form.hidden,true);
});

test('signup proof completion returns to existing GiGi sign-in without claiming a desktop session', async () => {
  const result = await runAccountForm('/verify', {app:'gigi',verificationMode:'signup'}, Response.json({success:true}), '?app=gigi&mode=signup');
  assert.equal(result.request?.url, '/v1/auth/enrollment/complete');
  assert.deepEqual(result.request?.body, {token:'a'.repeat(64),password:'synthetic-password-123'});
  assert.match(result.status.textContent,/account is ready/i);
  assert.match(result.status.textContent,/sign-in tab/i);
  assert.match(result.status.textContent,/expired/i);
  assert.doesNotMatch(result.status.textContent,/password has been updated|signed in/i);
  assert.equal(result.cleared,true);
  assert.deepEqual(result.fields.map(f=>f.value),['','']);
});

test('signup verification failures retain proof in memory and offer a fresh signup link', async () => {
  const result = await runAccountForm('/verify', {app:'gigi',verificationMode:'signup'}, Response.json({error:'invalid'}, {status:400}), '?app=gigi&mode=signup');
  assert.match(result.error.textContent,/invalid or expired/);
  assert.match(result.error.textContent,/verification link/);
  assert.equal(result.form.hidden,false);
  assert.equal(result.button.disabled,false);
  assert.deepEqual(result.fields.map(f=>f.value),['','']);
});

test('signup network error leaves email form available and does not claim delivery', async () => {
  const result = await runAccountForm('/signup', {app:'gigi',gigiSignupEnabled:true}, new Error('offline'));
  assert.match(result.error.textContent,/could not connect/);
  assert.equal(result.status.textContent,'');
  assert.equal(result.form.hidden,false);
  assert.equal(result.button.disabled,false);
});


test('signup rate limit does not claim delivery and permits a later retry', async () => {
  const result = await runAccountForm('/signup', {app:'gigi',gigiSignupEnabled:true}, Response.json({error:'rate_limit'}, {status:429}));
  assert.match(result.error.textContent,/Too many attempts/);
  assert.equal(result.status.textContent,'');
  assert.equal(result.form.hidden,false);
  assert.equal(result.button.disabled,false);
});

test('existing signup identity conflict offers sign-in or recovery without changing a password', async () => {
  const result = await runAccountForm('/verify', {app:'gigi',verificationMode:'signup'}, Response.json({error:'exists'}, {status:409}), '?app=gigi&mode=signup');
  assert.match(result.error.textContent,/already have an account/);
  assert.match(result.error.textContent,/recover your password/);
  assert.equal(result.status.textContent,'');
  assert.deepEqual(result.fields.map(f=>f.value),['','']);
});
