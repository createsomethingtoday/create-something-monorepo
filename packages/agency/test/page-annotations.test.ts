import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { annotationTargets, installPageAnnotations, type AnnotationDocument } from '../src/lib/annotations/page-annotations.ts';

// DOM and host API fixtures only; these do not establish actual host acceptance.
const require = createRequire(new URL('../../canon/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
function fixture(html = '<section id="support-scope"><header><h2>Public scope</h2></header><p>Public explanation.</p></section>') {
  const dom = new JSDOM(`<main id="main-content">${html}</main>`, { url: 'https://createsomething.agency/services?private=never-copy' });
  const doc = dom.window.document as AnnotationDocument;
  const calls: Array<{ target: Element; options: { initialComment: string; metadata: Record<string, string> } }> = [];
  doc.oai = { annotation: { request: (target, options) => { calls.push({ target, options }); return { accepted: true }; } } };
  return { doc, calls, root: doc.getElementById('main-content')! };
}

test('only the twelve reviewed exact public routes have annotations with bounded static metadata', () => {
  assert.deepEqual(Object.keys(annotationTargets).sort(), ['/', '/services', '/products', '/field-reports', '/practice', '/stack', '/about', '/agent-foundation', '/field-reports/template-review', '/field-reports/upstream-contributions', '/workflows/human-in-the-loop-ai', '/workflows/ai-agent-evaluation'].sort());
  for (const [route, targets] of Object.entries(annotationTargets)) for (const target of targets) {
    assert.ok(target.prompt.length <= 240);
    assert.ok(!target.question || target.question.length <= 60);
    assert.equal(targets.filter((entry) => entry.selector === target.selector).length, 1);
    const metadata = { title: target.title, route, kind: 'public editorial context' };
    assert.ok(Object.keys(metadata).length <= 6);
    assert.ok(Object.values(metadata).every((value) => value.length <= 256));
    assert.ok(Buffer.byteLength(JSON.stringify(metadata)) <= 2048);
  }
});

test('editorial questions keep a bounded public context and support a reviewed h3 without changing heading semantics', () => {
  const { root, calls } = fixture('<article class="outerfields-story"><h3 id="outerfields-title">Published project timeline</h3><p>Prototype, funded development, in-house handoff.</p></article>');
  const cleanup = installPageAnnotations(root, '/');
  const button = root.querySelector('button')!;
  assert.equal(button.textContent, 'What carried forward from this project?');
  assert.equal(button.getAttribute('aria-label'), 'Ask: What carried forward from this project?');
  assert.ok(button.closest('[data-analytics-ignore]'));
  assert.ok(button.hasAttribute('data-no-track'));
  assert.equal(root.querySelector('h3')!.textContent, 'Published project timeline');
  button.click();
  assert.match(calls[0].options.initialComment, /lessons this page does not spell out/);
  assert.equal(calls[0].target, root.querySelector('article'));
  cleanup();
  assert.equal(root.querySelector('h3')!.textContent, 'Published project timeline');
});

test('newly inserted private inputs prevent requests and detached controls do nothing', () => {
  const { root, calls } = fixture();
  installPageAnnotations(root, '/services');
  const button = root.querySelector('button')!;
  const secret = root.ownerDocument.createElement('input');
  secret.value = 'never-share';
  root.querySelector('section')!.appendChild(secret);
  button.click();
  assert.equal(calls.length, 0);
  assert.match(root.querySelector('[role="status"]')!.textContent!, /unavailable/);
  secret.remove();
  root.querySelector('section')!.remove();
  button.click();
  assert.equal(calls.length, 0);
});

test('unsupported API, iframe, and private or ambiguous routes add nothing', () => {
  for (const path of ['/account', '/mcp-access', '/services/private', '/services/', '/__proto__']) {
    const { root } = fixture();
    installPageAnnotations(root, path);
    assert.equal(root.querySelector('[oai-annotatable]'), null);
  }
  const { doc, root } = fixture();
  delete doc.oai;
  installPageAnnotations(root, '/services');
  assert.equal(root.querySelector('button'), null);
  const frame = doc.createElement('iframe'); root.appendChild(frame);
  const framedoc = frame.contentDocument! as AnnotationDocument;
  framedoc.body.innerHTML = '<main><section id="support-scope"><h2>Scope</h2></section></main>';
  framedoc.oai = { annotation: { request: () => { assert.fail('iframe request'); } } };
  installPageAnnotations(framedoc.querySelector('main')!, '/services');
  assert.equal(framedoc.querySelector('button'), null);
});

test('click requests contextual annotation without copying URL or form data; cleanup removes owned effects', () => {
  const { root, calls } = fixture();
  const cleanup = installPageAnnotations(root, '/services');
  assert.equal(calls.length, 0);
  const target = root.querySelector('header')!;
  const button = root.querySelector('button')!;
  assert.equal(button.type, 'button');
  button.click();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].target, root.querySelector('#support-scope'));
  assert.ok(target.hasAttribute('oai-annotatable'));
  assert.equal(calls[0].options.metadata.route, '/services');
  assert.doesNotMatch(JSON.stringify(calls), /never-copy|private=/);
  assert.match(root.querySelector('[role="status"]')!.textContent!, /Request accepted/);
  cleanup(); cleanup();
  assert.equal(root.querySelector('[oai-annotatable]'), null);
  assert.equal(root.querySelector('[oai-annotation-container]'), null);
  assert.equal(root.querySelector('.agency-annotation-controls'), null);
  button.click();
  assert.equal(calls.length, 1);
  const again = installPageAnnotations(root, '/services');
  assert.equal(root.querySelectorAll('button').length, 1);
  again();
});

test('rejected or throwing host requests remain readable and never claim sent', () => {
  for (const throwing of [false, true]) {
    const { doc, root } = fixture();
    doc.oai!.annotation!.request = () => { if (throwing) throw new Error('host disabled'); return { accepted: false }; };
    installPageAnnotations(root, '/services');
    root.querySelector('button')!.click();
    assert.match(root.querySelector('[role="status"]')!.textContent!, /unavailable/);
    assert.doesNotMatch(root.querySelector('[role="status"]')!.textContent!, /sent|saved/);
  }
});

test('forms, editable regions, and existing annotation targets are skipped without overlapping targets', () => {
  for (const unsafe of ['<input value="secret">', '<form>secret</form>', '<textarea>secret</textarea>', '<div contenteditable>secret</div>', '<div oai-annotatable="Existing">Public</div>']) {
    const { root } = fixture(`<section id="support-scope"><h2>Scope</h2>${unsafe}</section>`);
    installPageAnnotations(root, '/services');
    assert.equal(root.querySelector('.agency-annotation-controls'), null);
  }
  const { root } = fixture();
  const cleanup = installPageAnnotations(root, '/services');
  const duplicate = installPageAnnotations(root, '/services');
  assert.equal(root.querySelectorAll('.agency-annotation-controls').length, 1);
  duplicate(); cleanup();
});

test('route changes dispose old listeners before installing new contextual prompts', () => {
  const { root, calls } = fixture();
  const cleanup = installPageAnnotations(root, '/services');
  const stale = root.querySelector('button')!;
  cleanup();
  root.innerHTML = '<section id="reports"><header><h2>Field reports</h2></header></section>';
  const next = installPageAnnotations(root, '/field-reports');
  stale.click();
  assert.equal(calls.length, 0);
  root.querySelector('button')!.click();
  assert.equal(calls[0].options.metadata.route, '/field-reports');
  next();
});
