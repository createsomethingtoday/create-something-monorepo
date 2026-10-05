/** Shared Identity UI. Credentials and proof stay in memory; app access remains separate. */
export function accountPage(path: string): Response | null {
  if (!['/login', '/recover', '/verify'].includes(path)) return null;
  const mode = path === '/recover' ? 'recovery' : path === '/verify' ? 'verify' : 'entry';
  const title = mode === 'recovery' ? 'Recover your account' : mode === 'verify' ? 'Choose a new password' : 'Your account';
  const script = `
const params = new URLSearchParams(location.search);
const app = params.get('app') === 'gigi' ? 'gigi' : '';
const mode = ${JSON.stringify(mode)};
const recovery = document.querySelector('#recovery');
const login = document.querySelector('#login');
if (recovery) recovery.href = '/recover' + (app ? '?app=gigi' : '');
if (mode === 'recovery' && recovery) recovery.hidden = true;
if (login) login.href = '/login' + (app ? '?app=gigi' : '');
const returnLink = document.querySelector('#return');
if (app) { returnLink.hidden = false; returnLink.href = 'https://createsomething.agency/gigi/beta'; }
`;
  const formScript = mode === 'entry' ? '' : `
const form = document.querySelector('form');
const status = document.querySelector('[role="status"]');
const error = document.querySelector('[role="alert"]');
const button = form.querySelector('button');
let proof = mode === 'verify' ? new URLSearchParams(location.hash.slice(1)).get('token') : null;
if (mode === 'verify') {
  history.replaceState(null, '', location.pathname + location.search);
  if (!proof || proof.length < 40 || proof.length > 128) {
    error.textContent = 'This link is missing or invalid. Request a new recovery link.';
    form.hidden = true;
  }
}
form.addEventListener('submit', async event => {
  event.preventDefault(); error.textContent = ''; status.textContent = ''; button.disabled = true;
  const fields = new FormData(form);
  const password = fields.get('password');
  if (mode === 'verify' && password !== fields.get('confirmation')) {
    error.textContent = 'The passwords do not match.'; button.disabled = false; return;
  }
  const endpoint = 'enrollment/' + (mode === 'verify' ? 'complete' : 'start');
  const body = mode === 'verify' ? {token: proof, password} : {email: fields.get('email'), purpose: 'recovery', experience: 'identity', app};
  try {
    const response = await fetch('/v1/auth/' + endpoint, {method: 'POST', credentials: 'omit', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body), signal: AbortSignal.timeout(15000)});
    if (!response.ok) {
      error.textContent = response.status === 429 ? 'Too many attempts. Please wait before trying again.' : response.status >= 500 ? 'Account access is temporarily unavailable. Please try again later.' : mode === 'verify' ? 'This link is invalid or expired. Request a new recovery link.' : 'Unable to request a link. Check your email and try again.';
      return;
    }
    form.reset(); form.hidden = true; proof = null;
    status.textContent = mode === 'recovery' ? 'If your address can receive account verification, a link will arrive shortly. It expires in 15 minutes. Check your spam folder too.' : 'Your password has been updated. Sign in again in the app you want to use.';
    status.focus();
  } catch { error.textContent = 'We could not connect. Check your connection and try again.'; }
  finally { button.disabled = false; form.querySelectorAll('input[type="password"]').forEach(field => { field.value = ''; }); }
});`;
  // Nonce scopes the only executable code on this sensitive document.
  const nonce = crypto.randomUUID();
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title} | CREATE SOMETHING Identity</title><style nonce="${nonce}">
:root{color-scheme:dark;font-family:Arial,Helvetica,system-ui,sans-serif;color:oklch(98.5% 0 0);background:oklch(20.5% 0 0)}*{box-sizing:border-box}body{margin:0}a{color:inherit;text-underline-offset:5px}header,main,footer{width:min(100% - 48px,1120px);margin:auto}header{padding:28px 0;border-bottom:1px solid oklch(100% 0 0 / .1);display:flex;justify-content:space-between;gap:16px;font-size:12px;letter-spacing:.12em}main{padding:80px 0 96px;display:grid;grid-template-columns:1fr 1fr;gap:80px}.eyebrow{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:oklch(70.8% 0 0)}h1{font-size:clamp(40px,6vw,72px);line-height:1.06;letter-spacing:-.05em;font-weight:500;margin:24px 0}p{line-height:1.65;color:oklch(70.8% 0 0);max-width:44ch}form{padding-top:28px}label{display:block;font-size:14px;margin-bottom:24px}input{display:block;width:100%;margin-top:10px;background:oklch(26.9% 0 0);color:inherit;border:1px solid oklch(100% 0 0 / .2);border-radius:6px;padding:16px;font:inherit;min-height:52px}button{width:100%;min-height:54px;border:0;border-radius:6px;padding:16px;background:oklch(98.5% 0 0);color:oklch(20.5% 0 0);font:600 16px Arial;cursor:pointer}button:disabled{opacity:.6;cursor:wait}:focus-visible{outline:3px solid oklch(70.8% 0 0);outline-offset:5px}[role=alert]{color:#ffb4ab}[role=status]{color:inherit}footer{border-top:1px solid oklch(100% 0 0 / .1);padding:24px 0;font-size:12px}nav{display:flex;flex-wrap:wrap;gap:24px;margin-top:24px}[hidden]{display:none!important}@media(max-width:720px){header,main,footer{width:calc(100% - 40px)}main{grid-template-columns:1fr;gap:24px;padding:48px 0 64px}form{padding-top:0}header{font-size:10px}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}
</style></head><body><header><a href="/login">CREATE SOMETHING</a><span>IDENTITY</span></header><main><section><p class="eyebrow">One account. Your choice of apps.</p><h1>${title}.</h1><p>${mode === 'recovery' ? 'Verify your email to choose a new password for your CREATE SOMETHING account.' : mode === 'verify' ? 'Choose a password with at least 12 characters. Your verification link can be used once.' : 'Open the app you want to use and sign in there. You can recover your CREATE SOMETHING password here. App access and connected tools remain your choice.'}</p><p>Beta account creation is by invitation.</p></section><section aria-label="Account access">${mode === 'entry' ? '<h2>Choose your next step</h2><nav aria-label="Applications"><a href="https://createsomething.agency/gigi/beta">GiGi for Mac</a><a href="https://private.createsomething.agency/login">Private networks</a></nav><p>For GiGi, return to the app on your Mac. Account access does not connect tools or grant app access.</p>' : `<form>${mode !== 'verify' ? '<label>Email<input name="email" type="email" autocomplete="username" maxlength="254" required></label>' : ''}${mode !== 'recovery' ? `<label>Password<input name="password" type="password" autocomplete="${mode === 'verify' ? 'new-password' : 'current-password'}" ${mode === 'verify' ? 'minlength="12" maxlength="256"' : ''} required></label>` : ''}${mode === 'verify' ? '<label>Confirm password<input name="confirmation" type="password" autocomplete="new-password" minlength="12" maxlength="256" required></label>' : ''}<button>${mode === 'recovery' ? 'Email recovery link' : 'Save password'}</button></form>`}<p role="alert"></p><p role="status" tabindex="-1"></p><nav><a id="recovery" href="/recover">Forgot your password?</a><a id="login" href="/login">Back to your account</a><a id="return" hidden href="https://createsomething.agency/gigi/beta">Return to GiGi</a></nav><noscript><p>Enable JavaScript to use this account form.</p></noscript></section></main><footer><a href="https://createsomething.agency/privacy">Privacy</a> · <a href="https://createsomething.agency/terms">Terms</a></footer><script nonce="${nonce}">${script}${formScript}</script></body></html>`, {headers: {
    'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow',
    'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'`
  }});
}
