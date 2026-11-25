import { readFileSync } from 'node:fs';

const escape = (text) =>
  String(text ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

function inlineAsset(relativePath, type) {
  const bytes = readFileSync(new URL(relativePath, import.meta.url));
  return `data:${type};base64,${bytes.toString('base64')}`;
}

export function renderReview(meeting, { commitments, decisions }) {
  const art = inlineAsset('../docs/canon-meet-avatar.png', 'image/png');
  const font = inlineAsset(
    '../../../packages/agency/static/fonts/agency-geist-latin.woff2',
    'font/woff2'
  );
  const numbers = new Map(meeting.entries.map((entry, i) => [entry.source, i + 1]));
  function quote(entry, full = false) {
    const i = numbers.get(entry.source);
    return `<article ${full ? 'id="source-' + i + '"' : ''}><p>${escape(entry.text)}</p>
      <footer>${escape(entry.speaker)} · ${escape(entry.startTime)} ${full ? '' : ' · <a href="#source-' + i + '">Source ' + i + '</a>'}</footer></article>`;
  }
  function section(title, entries) {
    return `<section><h2>${title}</h2>${entries.length ? entries.map((e) => quote(e)).join('') : '<p>No candidates found. Check the transcript.</p>'}</section>`;
  }
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>Canon Meeting Notes · Host review</title><style>
@font-face{font-family:Geist;src:url('${font}') format('woff2');font-weight:100 900}
*{box-sizing:border-box}html{color-scheme:dark;background:#090909;color:#f3f3f0;font:100%/1.55 Geist,system-ui,sans-serif}
body{max-width:50rem;margin:auto;padding:clamp(1rem,5vw,4rem)}header{display:flex;align-items:center;gap:1.25rem}
header img{width:96px;height:96px;flex:none}h1,h2,p{margin:0}h1{font-size:clamp(1.85rem,6vw,3.3rem);line-height:1.05;letter-spacing:-.04em}
h2{font-size:1.35rem;letter-spacing:-.02em}header p,footer,.note{color:#c9c8c4}section{margin-top:2.2rem;border-top:1px solid #474642;padding-top:1rem}
article{padding:1rem 0;overflow-wrap:anywhere}article+article{border-top:1px solid #302f2c}footer{font-size:.875rem;margin-top:.4rem}
a{color:inherit;text-underline-offset:.2em}a:focus-visible{outline:2px solid currentColor;outline-offset:3px}
:target{outline:1px solid #c5bda9;outline-offset:3px}.note{margin:1.2rem 0}.credit{margin-top:3rem}
@media(max-width:390px){header{display:block}header img{margin-bottom:.6rem}}
@media print{html{background:white;color:black}header p,footer,.note{color:#333}article{break-inside:avoid}}
</style></head><body><main><header><img alt="" src="${art}"><div><p>Host review · Private draft</p><h1>Canon Meeting Notes</h1></div></header>
<p class="note">Check the quoted passages before sharing decisions or assigning work.</p>
${section('Possible decisions', decisions)}${section('Possible commitments', commitments)}
<section><h2>Source transcript</h2>${meeting.entries.map((e) => quote(e, true)).join('')}</section>
</main><footer class="credit">Made by <a href="https://createsomething.agency" rel="noreferrer">CREATE SOMETHING</a></footer></body></html>`;
}
