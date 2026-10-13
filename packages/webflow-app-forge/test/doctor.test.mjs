import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { runDoctor } from '../src/doctor.mjs';
import { summarize } from '../src/lib/report.mjs';
import { GOOD_HTML, GOOD_JS, GOOD_MANIFEST, tmp, writeGoodProject } from './helpers.mjs';

const byCheck = (findings, check) => findings.filter((f) => f.check === check);
const only = (findings, check) => {
  const list = byCheck(findings, check);
  assert.equal(list.length, 1, `expected one finding for ${check}`);
  return list[0];
};

test('a clean project is ready with every doctor check passing', () => {
  const dir = writeGoodProject(tmp());
  const { findings } = runDoctor(dir);
  const s = summarize(findings);
  assert.equal(s.ready, true, JSON.stringify(findings.filter((f) => f.status !== 'pass'), null, 2));
  assert.equal(s.blockers, 0);
  assert.equal(s.required, 0);
  for (const f of findings) assert.ok(f.requirements.length > 0, `${f.check} maps to no registry requirement`);
});

test('missing bundle.zip is a blocker', () => {
  const { findings } = runDoctor(tmp());
  assert.equal(only(findings, 'doctor:bundle-size').status, 'fail');
  assert.equal(summarize(findings).ready, false);
});

test('source maps inside the bundle fail, and a missing review artifact fails', () => {
  const dir = writeGoodProject(tmp(), { extraFiles: [{ name: 'bundle.js.map', data: '{"version":3}' }], map: null });
  const { findings } = runDoctor(dir);
  assert.equal(only(findings, 'doctor:no-maps-in-bundle').status, 'fail');
  assert.equal(only(findings, 'doctor:sourcemap-artifact').status, 'fail');
});

test('inline data: source map counts as a map in the bundle', () => {
  const dir = writeGoodProject(tmp(), { js: `${GOOD_JS}\n//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozfQ==` });
  const { findings } = runDoctor(dir);
  assert.equal(only(findings, 'doctor:no-maps-in-bundle').status, 'fail');
});

test('scaffold default names and Webflow marks fail real-name', () => {
  const dir = writeGoodProject(tmp(), {
    manifest: JSON.stringify({ name: 'My React App', publicDir: 'public', apiVersion: '2' }),
    html: GOOD_HTML.replace('<title>Section Namer</title>', '<title>My React App</title>'),
  });
  const f = only(runDoctor(dir).findings, 'doctor:real-name');
  assert.equal(f.status, 'fail');
  assert.equal(f.evidence.length, 2);

  const dir2 = writeGoodProject(tmp(), { manifest: JSON.stringify({ name: 'Webflow Helper', publicDir: 'public', apiVersion: '2' }) });
  assert.equal(only(runDoctor(dir2).findings, 'doctor:real-name').status, 'fail');
});

test('manifest field and telemetry checks', () => {
  const dir = writeGoodProject(tmp(), { manifest: JSON.stringify({ name: 'Section Namer', apiVersion: '1', telemetry: { global: { allowTelemetry: true } } }) });
  const { findings } = runDoctor(dir);
  const fields = only(findings, 'doctor:manifest-fields');
  assert.equal(fields.status, 'fail');
  assert.match(fields.title, /apiVersion "2", publicDir/);
  assert.equal(only(findings, 'doctor:no-telemetry').status, 'fail');
  assert.equal(only(findings, 'doctor:no-telemetry').severity, 'suggested');
});

test('two manifests in the archive fail single-manifest', () => {
  const dir = writeGoodProject(tmp(), { extraFiles: [{ name: 'starter/webflow.json', data: GOOD_MANIFEST }] });
  assert.equal(only(runDoctor(dir).findings, 'doctor:single-manifest').status, 'fail');
});

test('production React error-decoder URL is NOT dev residue, but development markers are', () => {
  const prodReact = `${GOOD_JS};function l(e){for(var n="https://reactjs.org/docs/error-decoder.html?invariant="+e,t=1;t<arguments.length;t++)n+="&args[]="+encodeURIComponent(arguments[t]);return"Minified React error #"+e}`;
  assert.equal(only(runDoctor(writeGoodProject(tmp(), { js: prodReact })).findings, 'doctor:prod-build').status, 'pass');

  const devReact = `${GOOD_JS};console.error("Warning: Each child in a list should have a unique key prop. See react-dom.development.js")`;
  const f = only(runDoctor(writeGoodProject(tmp(), { js: devReact })).findings, 'doctor:prod-build');
  assert.equal(f.status, 'fail');
  assert.equal(f.severity, 'blocker');

  const evalWrapper = `${GOOD_JS};eval("//# sourceURL=webpack://app/./src/index.tsx?")`;
  assert.equal(only(runDoctor(writeGoodProject(tmp(), { js: evalWrapper })).findings, 'doctor:prod-build').status, 'fail');
});

test('dynamic code, secrets, popups, host DOM, non-prod hosts, section-by-type, token storage', () => {
  const js = [
    GOOD_JS,
    'const f = new Function("return 1");',
    'const k = "sk_live_51Habcdefghijklmnop";',
    'alert("done");',
    'window.parent.document.body.innerHTML = "";',
    'fetch("http://localhost:3000/api");',
    'fetch("https://app-staging.example.com/api");',
    'if (el.type === "Section") {}',
    'localStorage.setItem("auth_token", t);',
  ].join('\n');
  const { findings } = runDoctor(writeGoodProject(tmp(), { js }));
  for (const check of ['doctor:no-dynamic-code', 'doctor:no-secrets', 'doctor:no-popups', 'doctor:no-host-dom', 'doctor:no-nonprod-hosts', 'doctor:section-by-tag', 'doctor:no-tokens-in-storage']) {
    assert.equal(only(findings, check).status, 'fail', check);
  }
  assert.equal(only(findings, 'doctor:no-nonprod-hosts').evidence.length, 2);
  assert.equal(summarize(findings).blockers, 2);
});

test('bare localhost literal in a library fallback is not flagged', () => {
  const js = `${GOOD_JS};const base = typeof location === "undefined" ? "http://localhost" : location.origin;`;
  assert.equal(only(runDoctor(writeGoodProject(tmp(), { js })).findings, 'doctor:no-nonprod-hosts').status, 'pass');
});

test('UI preferences in localStorage are fine', () => {
  const js = `${GOOD_JS};localStorage.setItem("section-namer:analytics-consent","denied");`;
  assert.equal(only(runDoctor(writeGoodProject(tmp(), { js })).findings, 'doctor:no-tokens-in-storage').status, 'pass');
});

test('analytics SDK without a consent gate fails; with one, warns', () => {
  const bare = `${GOOD_JS};posthog.init("phc_x",{api_host:"https://app.posthog.com"});`;
  assert.equal(only(runDoctor(writeGoodProject(tmp(), { js: bare })).findings, 'doctor:analytics-consent').status, 'fail');
  const gated = `${bare};if(consent==="granted"){}`;
  assert.equal(only(runDoctor(writeGoodProject(tmp(), { js: gated })).findings, 'doctor:analytics-consent').status, 'warn');
});

test('HTML checks: inline handlers, inline script, inline style, remote script, external iframe', () => {
  const html = '<!doctype html><html><head><title>Section Namer</title><style>body{}</style><script src="https://cdn.example.com/x.js"></script></head><body><div onclick="go()" style="color:red"></div><script>go()</script><iframe src="https://app.example.com/ui"></iframe></body></html>';
  const { findings } = runDoctor(writeGoodProject(tmp(), { html }));
  assert.equal(only(findings, 'doctor:csp-inline-handlers').status, 'fail');
  assert.equal(only(findings, 'doctor:csp-inline-script').status, 'fail');
  assert.equal(only(findings, 'doctor:csp-inline-style').status, 'fail');
  assert.equal(only(findings, 'doctor:no-remote-scripts').status, 'fail');
  assert.equal(only(findings, 'doctor:no-external-iframe').status, 'warn');
});

test('oversized bundle is a blocker', () => {
  const dir = tmp();
  writeGoodProject(dir, { extraFiles: [{ name: 'big.bin', data: Buffer.alloc(5 * 1024 * 1024 + 1, 1) }] });
  assert.equal(only(runDoctor(dir).findings, 'doctor:bundle-size').status, 'fail');
});

test('a keyboard shortcut handler is suggested, not required', () => {
  const js = `${GOOD_JS};document.addEventListener("keydown",e=>{if(e.metaKey&&e.key==="k")open()});`;
  const f = only(runDoctor(writeGoodProject(tmp(), { js })).findings, 'doctor:no-keyboard-shortcut');
  assert.equal(f.status, 'fail');
  assert.equal(f.severity, 'suggested');
});

export { writeFileSync, mkdirSync, join };
