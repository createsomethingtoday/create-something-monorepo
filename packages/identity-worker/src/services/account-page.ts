/** Shared Identity UI. Credentials and proof stay in memory; app access remains separate. */
export interface AccountPageOptions {
  gigiSignupEnabled?: boolean;
  app?: string;
  verificationMode?: string;
}

export function accountPage(path: string, options: AccountPageOptions = {}): Response | null {
  const gigiSignup = options.gigiSignupEnabled === true && options.app === 'gigi';
  if (!['/login', '/recover', '/verify', '/signup'].includes(path)) return null;
  if (path === '/signup' && !gigiSignup) return null;
  const mode = path === '/signup' ? 'signup' : path === '/recover' ? 'recovery' : path === '/verify' ? 'verify' : 'entry';
  // Presentation only: the completion endpoint derives purpose/application from stored proof.
  const signupVerification = mode === 'verify' && options.app === 'gigi' && options.verificationMode === 'signup';
  const title = mode === 'signup' ? 'Create your GiGi account' : mode === 'recovery' ? 'Recover your account' : mode === 'verify' ? signupVerification ? 'Set your GiGi password' : 'Choose a new password' : 'Your account';
  const script = `
const params = new URLSearchParams(location.search);
const app = params.get('app') === 'gigi' ? 'gigi' : '';
const mode = ${JSON.stringify(mode)};
const signupVerification = ${JSON.stringify(signupVerification)};
const recovery = document.querySelector('#recovery');
const login = document.querySelector('#login');
if (recovery) recovery.href = '/recover' + (app ? '?app=gigi' : '');
if (mode === 'recovery' && recovery) recovery.hidden = true;
const signup = document.querySelector('#signup');
if (signup) signup.href = '/signup?app=gigi';
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
    error.textContent = signupVerification ? 'This link is missing or invalid. Request a new verification link.' : 'This link is missing or invalid. Request a new recovery link.';
    form.hidden = true;
  }
}
form.addEventListener('submit', async event => {
  event.preventDefault(); error.textContent = ''; status.textContent = ''; button.disabled = true;
  const fields = new FormData(form);
  const password = fields.get('password');
  if (mode === 'verify' && password !== fields.get('confirmation')) {
    form.querySelectorAll('input[type="password"]').forEach(field => { field.value = ''; });
    error.textContent = 'The passwords do not match.'; button.disabled = false; return;
  }
  const endpoint = 'enrollment/' + (mode === 'verify' ? 'complete' : 'start');
  const body = mode === 'verify' ? {token: proof, password} : {email: fields.get('email'), purpose: mode === 'signup' ? 'signup' : 'recovery', experience: 'identity', app};
  try {
    const response = await fetch('/v1/auth/' + endpoint, {method: 'POST', credentials: 'omit', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body), signal: AbortSignal.timeout(15000)});
    if (!response.ok) {
      error.textContent = response.status === 429 ? 'Too many attempts. Please wait before trying again.' : response.status >= 500 ? 'Account access is temporarily unavailable. Please try again later.' : mode === 'verify' ? response.status === 409 ? signupVerification ? 'This account could not be created. If you already have an account, sign in or recover your password.' : 'This account cannot be recovered. Contact CREATE SOMETHING for help.' : signupVerification ? 'This link is invalid or expired. Request a new verification link.' : 'This link is invalid or expired. Request a new recovery link.' : 'Unable to request a link. Check your email and try again.';
      return;
    }
    form.reset(); form.hidden = true; proof = null;
    status.textContent = mode === 'signup'
      ? 'If this address can create an account, a verification link will arrive shortly. It expires in 15 minutes. Check your spam folder too. If you already have an account, return to sign-in or recover your password.'
      : mode === 'recovery'
        ? 'If your address can receive account verification, a link will arrive shortly. It expires in 15 minutes. Check your spam folder too.'
        : signupVerification
          ? 'Your GiGi account is ready. Return to the GiGi sign-in tab and enter your email and password. If that request expired, return to GiGi on your Mac and choose Sign in to GiGi sources again. Google consent is a separate next step.'
          : 'Your password has been updated. Sign in again in the app you want to use.';
    status.focus();
  } catch { error.textContent = 'We could not connect. Check your connection and try again.'; }
  finally { button.disabled = false; form.querySelectorAll('input[type="password"]').forEach(field => { field.value = ''; }); }
});`;
  const step = mode === 'signup' ? '1 / Verify your email' : mode === 'recovery' ? 'Password recovery' : mode === 'verify' ? signupVerification ? '2 / Choose your password' : 'Password update' : 'Account access';
  const description = mode === 'signup'
    ? 'Use your email to create a free GiGi account. Verify your address, choose a password, then return to GiGi on your Mac.'
    : mode === 'recovery'
    ? 'Verify your email to choose a new password for your CREATE SOMETHING account.'
    : mode === 'verify'
      ? 'Choose a password with at least 12 characters. Your verification link can be used once.'
      : 'Open the app you want to use and sign in there. You can recover your CREATE SOMETHING password here.';
  // Nonce scopes the only executable code on this sensitive document.
  // This self-contained token subset follows Canon styles/tokens.css. Account
  // documents deliberately load no external fonts, styles, images, or scripts.
  const nonce = crypto.randomUUID();
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title} | CREATE SOMETHING Identity</title><style nonce="${nonce}">
:root{
  color-scheme:light;
  --color-performance-paper:#f3f3f0;
  --color-performance-panel:#ffffff;
  --color-performance-ink:#090909;
  --color-performance-ink-soft:#262626;
  --color-performance-muted:#5e6268;
  --color-performance-line:#d7d7d2;
  --color-performance-line-strong:#9c9c96;
  --color-performance-signal:#0057b8;
  --color-performance-growth:#007a4d;
  --color-performance-growth-soft:#dcece5;
  --color-performance-risk:#c62026;
  --color-performance-risk-soft:#f3dadd;
  --font-performance-sans:'Geist Variable',Arial,'Helvetica Neue',Helvetica,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  --font-performance-display:var(--font-performance-sans);
  --font-performance-mono:'IBM Plex Mono','SFMono-Regular','SF Mono',Menlo,Monaco,Consolas,monospace;
  --radius-performance-sm:0;
  font-family:var(--font-performance-sans);
  color:var(--color-performance-ink);
  background:var(--color-performance-paper);
}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;min-height:100svh;display:flex;flex-direction:column}
a{color:inherit;text-underline-offset:4px;text-decoration-thickness:1px}
a:hover{text-decoration-thickness:2px}
header{background:var(--color-performance-ink);color:var(--color-performance-panel)}
.header-inner,main,.footer-inner{width:min(100% - 64px,1120px);margin-inline:auto}
.header-inner{min-height:88px;display:flex;align-items:center;justify-content:space-between;gap:20px}
.brand{display:inline-flex;align-items:center;gap:14px;font-size:12px;font-weight:700;letter-spacing:.04em;text-decoration:none}
.product-label,.eyebrow,.record-label{font-family:var(--font-performance-mono);font-size:11px;line-height:1.5;letter-spacing:.04em;text-transform:uppercase}
.product-label{padding-left:20px;border-left:1px solid currentColor}
main{flex:1;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(40px,8vw,112px);align-content:start;padding-block:80px 96px}
section{min-width:0}
.eyebrow{margin:0 0 24px;color:var(--color-performance-muted)}
h1{font-family:var(--font-performance-display);font-size:clamp(38px,4.8vw,64px);line-height:1.04;letter-spacing:-.04em;font-weight:500;margin:0 0 24px;max-width:12ch;text-wrap:balance}
h2{font-size:24px;line-height:1.2;letter-spacing:-.025em;font-weight:500;margin:0 0 24px}
p{line-height:1.65;color:var(--color-performance-muted);max-width:48ch;margin:0 0 20px}
.boundary{border-top:1px solid var(--color-performance-line);margin-top:40px;padding-top:20px}
.boundary .record-label{display:block;color:var(--color-performance-ink);margin-bottom:8px}
.boundary p{font-size:14px;margin:0}
.workspace{background:var(--color-performance-panel);border:1px solid var(--color-performance-line);border-top:3px solid var(--color-performance-ink);padding:32px;align-self:start}
.workspace>.record-label{color:var(--color-performance-muted);margin:0 0 20px}
form{margin:0}
label{display:block;font-size:14px;font-weight:600;margin-bottom:24px}
input{display:block;width:100%;margin-top:10px;background:var(--color-performance-panel);color:var(--color-performance-ink);border:1px solid var(--color-performance-line-strong);border-radius:var(--radius-performance-sm);padding:14px;font:400 16px var(--font-performance-sans);min-height:52px;box-shadow:none}
button{width:100%;min-height:52px;border:1px solid var(--color-performance-ink);border-radius:var(--radius-performance-sm);padding:14px 18px;background:var(--color-performance-ink);color:var(--color-performance-panel);font:600 16px var(--font-performance-sans);cursor:pointer}
button:hover{background:var(--color-performance-ink-soft)}
button:disabled{opacity:.6;cursor:wait}
:focus-visible{outline:3px solid var(--color-performance-signal);outline-offset:4px}
header :focus-visible{outline-color:var(--color-performance-panel)}
[role=alert],[role=status]{margin:24px 0 0;padding:14px 16px;border-left:3px solid;font-size:14px;overflow-wrap:anywhere}
[role=alert]{color:var(--color-performance-risk);background:var(--color-performance-risk-soft);border-color:var(--color-performance-risk)}
[role=status]{color:var(--color-performance-growth);background:var(--color-performance-growth-soft);border-color:var(--color-performance-growth)}
[role=alert]:empty,[role=status]:empty{display:none}
nav{display:flex;flex-wrap:wrap;gap:16px 24px;margin-top:24px;font-size:14px;line-height:1.5}
.applications{display:block;margin:0}
.applications a{display:flex;justify-content:space-between;align-items:center;gap:20px;min-height:64px;border-top:1px solid var(--color-performance-line);padding:16px 0;font-size:16px;font-weight:600;text-decoration:none}
.applications a:last-child{border-bottom:1px solid var(--color-performance-line)}
.applications a:hover{text-decoration:underline}
.application-arrow{font-family:var(--font-performance-mono);font-weight:400}
.workspace-note{font-size:14px;margin-top:20px;margin-bottom:0}
.account-links{padding-top:24px;border-top:1px solid var(--color-performance-line)}
footer{border-top:1px solid var(--color-performance-line)}
.footer-inner{min-height:88px;display:flex;align-items:center;justify-content:space-between;gap:16px 32px;padding-block:24px;color:var(--color-performance-muted);font-size:12px}
.footer-links{display:flex;gap:24px}
[hidden]{display:none!important}
@media(max-width:720px){
  .header-inner,main,.footer-inner{width:calc(100% - 40px)}
  .header-inner{min-height:72px}
  main{grid-template-columns:1fr;gap:32px;padding-block:40px 56px}
  h1{max-width:18ch;font-size:clamp(36px,8vw,52px)}
  .boundary{margin-top:24px}
  .workspace{padding:24px}
  .footer-inner{flex-wrap:wrap}
}
@media(max-width:360px){.brand{font-size:10px;gap:10px}.product-label{font-size:10px;padding-left:12px}.workspace{padding:20px}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}
</style></head><body>
<header><div class="header-inner"><a class="brand" href="/login">CREATE SOMETHING</a><span class="product-label">Identity</span></div></header>
<main><section aria-labelledby="account-title"><p class="eyebrow">One account. Your choice of apps.</p><h1 id="account-title">${title}.</h1><p>${description}</p><div class="boundary"><span class="record-label">Your access stays separate</span><p>${mode === 'signup' || signupVerification || gigiSignup ? 'Local GiGi records need no account. Connecting Google sources requires separate consent. Other applications keep their own access rules.' : 'Account access does not connect tools or grant app access. Beta account creation is by invitation.'}</p></div></section>
<section class="workspace" aria-label="Account access"><p class="record-label">${step}</p>${mode === 'entry' ? '<h2>Choose your next step</h2><nav class="applications" aria-label="Applications"><a href="https://createsomething.agency/gigi/beta">GiGi for Mac<span class="application-arrow" aria-hidden="true">↗</span></a><a href="https://private.createsomething.agency/login">Private networks<span class="application-arrow" aria-hidden="true">↗</span></a></nav><p class="workspace-note">For GiGi, return to the app on your Mac.</p>' : `<form>${mode !== 'verify' ? '<label>Email<input name="email" type="email" autocomplete="username" maxlength="254" required></label>' : ''}${mode === 'verify' ? `<label>Password<input name="password" type="password" autocomplete="${mode === 'verify' ? 'new-password' : 'current-password'}" ${mode === 'verify' ? 'minlength="12" maxlength="256"' : ''} required></label>` : ''}${mode === 'verify' ? '<label>Confirm password<input name="confirmation" type="password" autocomplete="new-password" minlength="12" maxlength="256" required></label>' : ''}<button>${mode === 'signup' ? 'Email verification link' : mode === 'recovery' ? 'Email recovery link' : signupVerification ? 'Create account' : 'Save password'}</button></form>`}<p role="alert"></p><p role="status" tabindex="-1"></p><nav class="account-links">${(gigiSignup && mode !== 'signup') || signupVerification ? `<a id="signup" href="/signup?app=gigi">${signupVerification ? 'Request a new verification link' : 'Create a GiGi account'}</a>` : ''}<a id="recovery" href="/recover">Forgot your password?</a>${mode === 'entry' ? '' : '<a id="login" href="/login">Back to your account</a>'}<a id="return" hidden href="https://createsomething.agency/gigi/beta">Return to GiGi</a></nav><noscript><p class="workspace-note">Enable JavaScript to use this account form.</p></noscript></section></main>
<footer><div class="footer-inner"><span>CREATE SOMETHING / Identity</span><div class="footer-links"><a href="https://createsomething.agency/privacy">Privacy</a><a href="https://createsomething.agency/terms">Terms</a></div></div></footer><script nonce="${nonce}">${script}${formScript}</script></body></html>`, {headers: {
    'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow',
    'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'`
  }});
}
