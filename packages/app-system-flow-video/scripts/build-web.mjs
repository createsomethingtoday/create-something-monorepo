// Build the wrop web companion from the same data that drives the video.
// Usage: node scripts/build-web.mjs  →  out/app-system-flow.html
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkg = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);

// Compile the data modules to CJS so this script can require them.
execFileSync(
  join(pkg, 'node_modules/.bin/tsc'),
  [
    'src/flow.ts',
    'src/links.ts',
    '--outDir',
    '.web-build',
    '--module',
    'commonjs',
    '--target',
    'es2022',
    '--skipLibCheck',
  ],
  { cwd: pkg, stdio: 'inherit' },
);

const flow = require(join(pkg, '.web-build/flow.js'));
const links = require(join(pkg, '.web-build/links.js'));

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const KIND = {
  proceed: 'var(--green)',
  hold: 'var(--amber)',
  warn: 'var(--amber)',
  block: 'var(--red)',
  info: 'var(--blue)',
};
const LEGEND = {
  blue: 'var(--blue)',
  green: 'var(--green)',
  red: 'var(--red)',
  amber: 'var(--amber)',
  faint: 'var(--faint)',
};

const chip = (c) =>
  c.href
    ? `<a class="chip" href="${esc(c.href)}" target="_blank" rel="noopener">${esc(c.label)}${
        c.note ? `<span class="chipnote">${esc(c.note)}</span>` : ''
      }</a>`
    : `<span class="chip chip-text">${esc(c.label)}${
        c.note ? `<span class="chipnote">${esc(c.note)}</span>` : ''
      }</span>`;

const branchRow = (b) => `
  <div class="row" style="border-left-color:${KIND[b.kind]}">
    <div class="cond"><span class="if">IF</span><span>${esc(b.cond)}</span></div>
    <div class="arrow" style="color:${KIND[b.kind]}">&rarr;</div>
    <div class="then">${esc(b.then)}</div>
  </div>`;

const sceneSection = (key) => {
  const s = flow.branchScenes[key];
  const strip = links.sceneLinks[key] || [];
  return `
  <section id="${key}">
    <div class="eyebrow">${esc(s.step)}</div>
    <h2>${esc(s.heading)}</h2>
    <p class="sub">${esc(s.sub)}</p>
    <div class="rows">${s.branches.map(branchRow).join('')}</div>
    ${
      strip.length
        ? `<div class="machinery"><span class="mlabel">Open the machinery</span>${strip
            .map(chip)
            .join('')}</div>`
        : ''
    }
  </section>`;
};

const stageOrder = [
  'preflight',
  'submit',
  'intake',
  'review',
  'exceptions',
  'gatesApprove',
  'gatesReject',
  'market',
];

const navItems = [
  ['map', 'Map'],
  ['preflight', 'Preflight'],
  ['submit', 'Submit'],
  ['intake', 'Intake'],
  ['review', 'Review'],
  ['exceptions', 'Exceptions'],
  ['gatesApprove', 'Approve'],
  ['gatesReject', 'Reject'],
  ['market', 'Marketplace'],
  ['statuses', 'States'],
  ['surfaces', 'Surfaces'],
  ['operators', 'Operators'],
  ['control', 'Control room'],
];

const surfaceCardHtml = (c) => `
  <div class="scard">
    <h3>${esc(c.name)}</h3>
    <div class="swho">${esc(c.who)}</div>
    ${
      c.where
        ? `<div class="swhere">${
            c.href
              ? `<a href="${esc(c.href)}" target="_blank" rel="noopener">${esc(c.where)}</a>`
              : esc(c.where)
          }</div>`
        : ''
    }
    <ul>${c.actions.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>
    ${c.note ? `<div class="snote">${esc(c.note)}</div>` : ''}
  </div>`;

const allSurfaceCards = [...links.surfaceCards];
// The Dify agents sit right after the decisions MCP they front.
allSurfaceCards.splice(5, 0, links.difyCard);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The app system</title>
<style>
  :root {
    --bg:#0b0c0e; --surface:#14161a; --surface2:#1a1d23; --border:#262a32;
    --border-strong:#343945; --text:#e8eaed; --muted:#9aa0ab; --faint:#6b7280;
    --blue:#146ef5; --green:#3fb950; --red:#f85149; --amber:#d29922;
    --sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    --mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;
  }
  * { box-sizing:border-box; margin:0; }
  html { scroll-behavior:smooth; }
  body { background:var(--bg); color:var(--text); font-family:var(--sans); line-height:1.5; }
  main { max-width:1120px; margin:0 auto; padding:0 28px 120px; }
  a { color:var(--blue); text-decoration:none; }
  a:hover { text-decoration:underline; }

  nav { position:sticky; top:0; z-index:10; background:rgba(11,12,14,.92); backdrop-filter:blur(8px);
        border-bottom:1px solid var(--border); padding:10px 16px; display:flex; flex-wrap:wrap;
        gap:6px; justify-content:center; }
  nav a { font-family:var(--mono); font-size:12.5px; letter-spacing:.5px; color:var(--faint);
          border:1px solid transparent; border-radius:999px; padding:4px 12px; }
  nav a:hover { color:var(--text); border-color:var(--border); text-decoration:none; }

  header { text-align:center; padding:88px 0 30px; }
  .eyebrow { font-family:var(--mono); font-size:12.5px; letter-spacing:4px; text-transform:uppercase; color:var(--faint); }
  header h1 { font-size:56px; font-weight:650; letter-spacing:-1.5px; margin-top:16px; }
  header .tagline { font-size:20px; color:var(--muted); margin-top:12px; }
  header .asof { font-family:var(--mono); font-size:13px; color:var(--faint); margin-top:18px; }

  section { padding-top:72px; }
  h2 { font-size:30px; font-weight:600; letter-spacing:-.3px; margin-top:10px; }
  .sub { color:var(--muted); font-size:16.5px; margin-top:8px; max-width:860px; }

  .mapline { display:flex; flex-wrap:wrap; align-items:center; gap:10px; margin-top:26px; }
  .station { background:var(--surface); border:1.5px solid var(--border-strong); border-radius:12px;
             padding:12px 18px; font-weight:600; font-size:16px; white-space:nowrap; }
  .station .n { font-family:var(--mono); font-size:12px; color:var(--blue); margin-right:8px; }
  .maparrow { color:var(--faint); font-family:var(--mono); }
  .looplabel { font-family:var(--mono); font-size:13.5px; color:var(--amber); margin-top:14px; }

  .rows { display:flex; flex-direction:column; gap:12px; margin-top:24px; }
  .row { background:var(--surface); border:1.5px solid var(--border); border-left:5px solid var(--border-strong);
         border-radius:12px; padding:14px 20px; display:grid;
         grid-template-columns:minmax(0,44fr) 24px minmax(0,52fr); gap:16px; align-items:center; }
  .cond { display:flex; gap:10px; align-items:baseline; font-family:var(--mono); font-size:15px; }
  .if { font-size:11px; letter-spacing:2px; color:var(--faint); flex-shrink:0; }
  .arrow { font-family:var(--mono); font-size:17px; text-align:center; }
  .then { color:var(--muted); font-size:15px; }
  @media (max-width:760px) {
    .row { grid-template-columns:1fr; gap:8px; }
    .arrow { display:none; }
  }

  .machinery { display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-top:16px; }
  .mlabel { font-family:var(--mono); font-size:11px; letter-spacing:2px; text-transform:uppercase;
            color:var(--faint); margin-right:6px; }
  .chip { display:inline-flex; align-items:center; gap:8px; font-family:var(--mono); font-size:12.5px;
          color:var(--text); background:var(--surface2); border:1px solid var(--border-strong);
          border-radius:999px; padding:6px 14px; }
  a.chip:hover { border-color:var(--blue); color:var(--blue); text-decoration:none; }
  .chip-text { color:var(--muted); }
  .chipnote { font-size:10.5px; color:var(--faint); border:1px solid var(--border); border-radius:999px; padding:1px 8px; }

  .legend { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:16px; margin-top:24px; }
  .lgroup { background:var(--surface); border:1.5px solid var(--border); border-top:4px solid var(--border-strong);
            border-radius:12px; padding:16px 18px; }
  .lgroup h3 { font-family:var(--mono); font-size:12px; letter-spacing:2.5px; text-transform:uppercase; margin-bottom:12px; }
  .lchips { display:flex; flex-wrap:wrap; gap:8px; }
  .lchip { font-family:var(--mono); font-size:12.5px; background:var(--surface2);
           border:1px solid var(--border-strong); border-radius:999px; padding:5px 12px; white-space:nowrap; }

  .scards { display:grid; grid-template-columns:repeat(auto-fit,minmax(340px,1fr)); gap:16px; margin-top:24px; }
  .scard { background:var(--surface); border:1.5px solid var(--border); border-radius:12px; padding:20px 22px; }
  .scard h3 { font-size:17px; font-weight:600; }
  .swho { font-family:var(--mono); font-size:12.5px; color:var(--blue); margin-top:6px; }
  .swhere { font-family:var(--mono); font-size:12.5px; color:var(--faint); margin-top:4px; }
  .scard ul { margin:12px 0 0 18px; color:var(--muted); font-size:14px; display:flex; flex-direction:column; gap:8px; }
  .snote { margin-top:12px; font-size:13px; color:var(--faint); border-top:1px solid var(--border); padding-top:10px; }

  .agent { background:var(--surface); border:1.5px solid var(--border); border-left:4px solid var(--green);
           border-radius:12px; padding:22px 24px; margin-top:24px; }
  .agenthead { display:flex; flex-wrap:wrap; align-items:baseline; gap:14px; }
  .agenthead h3 { font-size:18px; font-weight:600; }
  .agentcols { display:grid; grid-template-columns:repeat(auto-fit,minmax(340px,1fr)); gap:28px; margin-top:16px; }
  .agentlabel { font-family:var(--mono); font-size:11px; letter-spacing:2px; text-transform:uppercase; color:var(--faint); margin-bottom:10px; }
  .agent blockquote { border-left:3px solid var(--border-strong); margin:0 0 10px; padding:6px 14px;
                      color:var(--muted); font-size:14.5px; font-style:italic; }
  .agent ol { margin:0 0 0 18px; color:var(--muted); font-size:14.5px; display:flex; flex-direction:column; gap:8px; }

  .chatframe { display:block; margin-top:16px; background:var(--surface);
               border:1.5px solid var(--border-strong); border-radius:12px; }
  .identwarn { margin-top:20px; background:var(--surface); border:1.5px solid var(--red);
               border-left:5px solid var(--red); border-radius:12px; padding:18px 22px;
               color:var(--muted); font-size:14.5px; line-height:1.55; }
  .identwarn b { color:var(--red); font-family:var(--mono); font-size:12.5px; letter-spacing:1px; }

  .gradsteps { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:16px; margin-top:24px; }
  .grad { background:var(--surface); border:1.5px solid var(--border); border-left:4px solid var(--blue);
          border-radius:12px; padding:18px 20px; }
  .grad h3 { font-family:var(--mono); font-size:14px; color:var(--blue); }
  .grad p { color:var(--muted); font-size:14.5px; margin-top:10px; }

  .ops { display:grid; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:16px; margin-top:24px; }
  .op { background:var(--surface); border:1.5px solid var(--border); border-radius:12px; padding:18px 20px; }
  .op h3 { font-size:16px; font-weight:600; }
  .op .does { color:var(--muted); font-size:14.5px; margin-top:8px; }
  .op .cannot { font-size:13.5px; margin-top:10px; color:var(--red); }
  .op .cannot b { font-family:var(--mono); font-size:11px; letter-spacing:2px; color:var(--red); }

  .roster { display:grid; grid-template-columns:repeat(auto-fit,minmax(340px,1fr)); gap:14px; margin-top:24px; }
  .auto { background:var(--surface); border:1.5px solid var(--border); border-radius:12px; padding:16px 18px; }
  .auto a { font-family:var(--mono); font-size:13.5px; color:var(--text); }
  .auto a:hover { color:var(--blue); }
  .auto p { color:var(--muted); font-size:13.5px; margin-top:8px; }
  .chiprow { display:flex; flex-wrap:wrap; gap:8px; margin-top:16px; }
  h4.grouplabel { font-family:var(--mono); font-size:12px; letter-spacing:2.5px; text-transform:uppercase;
                  color:var(--faint); margin-top:34px; }

  footer { margin-top:96px; border-top:1px solid var(--border); padding-top:28px; text-align:center;
           font-family:var(--mono); font-size:12.5px; color:var(--faint); line-height:2; }
</style>
</head>
<body>
<nav>${navItems.map(([id, label]) => `<a href="#${id}">${label}</a>`).join('')}</nav>
<main>
  <header>
    <div class="eyebrow">App Review / Governance</div>
    <h1>${esc(flow.copy.title)}</h1>
    <div class="tagline">${esc(flow.copy.subtitle)} Every link opens the live surface.</div>
    <div class="asof">${esc(flow.AS_OF)} &middot; companion to the flow video</div>
  </header>

  <section id="map">
    <div class="eyebrow">00 / The map</div>
    <h2>${esc(flow.copy.mapHeading)}</h2>
    <p class="sub">${esc(flow.copy.mapSub)}</p>
    <div class="mapline">
      ${flow.stations
        .map(
          (s, i) =>
            `${i > 0 ? '<span class="maparrow">&rarr;</span>' : ''}<span class="station"><span class="n">${String(
              i + 1,
            ).padStart(2, '0')}</span>${esc(s)}</span>`,
        )
        .join('')}
    </div>
    <div class="looplabel">&#8617; ${esc(flow.copy.mapLoopLabel)}</div>
  </section>

  ${stageOrder.map(sceneSection).join('')}

  <section id="statuses">
    <div class="eyebrow">09 / The state space</div>
    <h2>${esc(flow.statusesHeading)}</h2>
    <p class="sub">${esc(flow.statusesSub)}</p>
    <div class="legend">
      ${flow.statusGroups
        .map(
          (g) => `
        <div class="lgroup" style="border-top-color:${LEGEND[g.color]}">
          <h3 style="color:${LEGEND[g.color]}">${esc(g.group)}</h3>
          <div class="lchips">${g.items.map((i) => `<span class="lchip">${esc(i)}</span>`).join('')}</div>
        </div>`,
        )
        .join('')}
    </div>
    <div class="machinery">${(links.sceneLinks.statuses || []).map(chip).join('')}</div>
  </section>

  <section id="surfaces">
    <div class="eyebrow">10 / Surfaces</div>
    <h2>Where actions complete, and who completes them</h2>
    <p class="sub">Every surface writes to the same record, and the record fires the same automations no matter who wrote. The surface changes; the rules do not.</p>
    <div class="scards">${allSurfaceCards.map(surfaceCardHtml).join('')}</div>

    <h4 class="grouplabel">The chat agent, in its own words</h4>
    <div class="agent">
      <div class="agenthead">
        <h3>${esc(links.agentContract.name)}</h3>
        <span class="swhere">${esc(links.agentContract.description)}</span>
      </div>
      <div class="agentcols">
        <div>
          <div class="agentlabel">What it tells the operator, verbatim</div>
          ${links.agentContract.inItsOwnWords
            .map((q) => `<blockquote>${esc(q)}</blockquote>`)
            .join('')}
        </div>
        <div>
          <div class="agentlabel">How to use it</div>
          <ol>${links.agentContract.howTo.map((h) => `<li>${esc(h)}</li>`).join('')}</ol>
          <div class="agentlabel" style="margin-top:18px">Its tools</div>
          <div class="chiprow">${links.agentContract.tools
            .map((t) => `<span class="chip chip-text">${esc(t)}</span>`)
            .join('')}</div>
          <div class="snote">${esc(links.agentContract.variant)}</div>
        </div>
      </div>
    </div>

    ${
      links.chatEmbed?.token
        ? `<h4 class="grouplabel">Talk to it</h4>
    <div class="identwarn">
      <b>THIS CHAT CARRIES AN IDENTITY.</b> It runs under the agent owner's personal decision key: a decision you state here is recorded in Airtable and attributed to <b>Adam Lehman</b> personally, and a version-level denial emails the developer. Browse the queue and ask questions freely — the agent only records a decision when you state one explicitly, and it never infers one from tone. Unless you are Adam, don't state decisions.
    </div>
    <iframe class="chatframe"
      src="${links.chatEmbed.baseUrl}/chatbot/${links.chatEmbed.token}"
      style="width: 100%; height: 100%; min-height: 700px"
      frameborder="0"
      allow="microphone;clipboard-write"></iframe>`
        : ''
    }

    <h4 class="grouplabel">How an operator meets the system</h4>
    <div class="gradsteps">
      ${links.graduation
        .map((g) => `<div class="grad"><h3>${esc(g.step)}</h3><p>${esc(g.text)}</p></div>`)
        .join('')}
    </div>
  </section>

  <section id="operators">
    <div class="eyebrow">11 / Operators</div>
    <h2>The decision chain</h2>
    <p class="sub">Recommendation is shared between people and automation. Decision is not: a person makes every final call, and the servers refuse anything else.</p>
    <div class="ops">
      ${links.operators
        .map(
          (o) => `
        <div class="op">
          <h3>${esc(o.role)}</h3>
          <div class="does">${esc(o.does)}</div>
          ${o.cannot ? `<div class="cannot"><b>CANNOT</b>&nbsp; ${esc(o.cannot)}</div>` : ''}
        </div>`,
        )
        .join('')}
    </div>
  </section>

  <section id="control">
    <div class="eyebrow">12 / Control room</div>
    <h2>The machinery, all of it</h2>
    <p class="sub">Ten live Airtable automations, the working surfaces, and the precedents that shaped the rules.</p>

    <h4 class="grouplabel">Automations</h4>
    <div class="roster">
      ${links.automations
        .map(
          (a) => `
        <div class="auto">
          <a href="${esc(a.href)}" target="_blank" rel="noopener">${esc(a.name)}</a>
          <p>${esc(a.role)}</p>
        </div>`,
        )
        .join('')}
    </div>

    <h4 class="grouplabel">Working surfaces</h4>
    <div class="chiprow">${links.surfaces.map(chip).join('')}</div>

    <h4 class="grouplabel">Examples &amp; precedents</h4>
    <div class="chiprow">${links.examples.map(chip).join('')}</div>

    <h4 class="grouplabel">Related</h4>
    <div class="chiprow">${links.related.map(chip).join('')}</div>
  </section>

  <footer>
    ${esc(flow.copy.closeTakeaway)} ${esc(flow.copy.closeLine)}<br>
    ${esc(flow.AS_OF)} &middot; built from packages/app-system-flow-video/src/flow.ts + links.ts &middot;
    links into #app-review-exceptions require channel membership
  </footer>
</main>
</body>
</html>
`;

mkdirSync(join(pkg, 'out'), { recursive: true });
writeFileSync(join(pkg, 'out/app-system-flow.html'), html);
console.log(`Wrote out/app-system-flow.html (${(html.length / 1024).toFixed(0)} KB)`);
