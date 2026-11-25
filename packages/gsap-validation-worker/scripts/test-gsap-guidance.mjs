import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { analyseSvgStyles, findProhibitedMarketplaceCustomCode } from '../src/font-custom-code-policy.js';

// A script that uses GSAP but fails "Mixed GSAP usage with unapproved code"
// must come back with guidance a creator can act on: what the script does
// besides GSAP, the line that does it, and the Designer or GSAP way to do the
// same thing. Guidance is advisory: it must never change pass or fail.

const source = fs.readFileSync(new URL('../src/worker.js', import.meta.url), 'utf8');
const start = source.indexOf('var IX2_REJECTION_MESSAGE');
const endMarker = '__name(containsPotentiallyHarmfulCode, "containsPotentiallyHarmfulCode");';
const end = source.indexOf(endMarker) + endMarker.length;
assert.notEqual(start, -1, 'validator slice start not found');
assert.notEqual(end, endMarker.length - 1, 'validator slice end not found');

const sandbox = { console, Set, URL, analyseSvgStyles, findProhibitedMarketplaceCustomCode, __name: (target) => target };
vm.createContext(sandbox);
vm.runInContext(source.slice(start, end), sandbox);

const url = 'https://guidance-fixture.webflow.io/';
const page = (script) => `<!doctype html><html data-wf-site="000000000000000000000000"><head></head><body><script>${script}</script></body></html>`;
const run = (script) => sandbox.validateGsapUsage(page(script), url);
// Arrays from the vm sandbox have another realm's prototype; copy them before comparing.
const mixed = (result) => Array.from(result.details.flaggedCode).filter((item) => item.message === 'Mixed GSAP usage with unapproved code');
const ids = (result) => mixed(result).flatMap((item) => Array.from(item.guidance, (entry) => entry.id));

// A count-up that writes the number itself.
const countUp = `gsap.registerPlugin(ScrollTrigger);

  document.querySelectorAll('[count-up]').forEach((el) => {
    const match = el.textContent.trim().match(/^([+\\-]?)(\\d+)(.*)$/);
    if (!match) return;

    const prefix = match[1];
    const target = Number(match[2]);
    const suffix = match[3];
    const delay = Math.max(0, parseFloat(el.getAttribute('count-up-delay')) || 0);
    const counter = { value: 0 };

    el.textContent = prefix + '0' + suffix;

    const animation = gsap.to(counter, {
      value: target,
      duration: 1.2,
      delay: delay,
      ease: 'power3.out',
      paused: true,
      onUpdate: () => {
        el.textContent = prefix + Math.round(counter.value) + suffix;
      },
    });

    function replay() {
      counter.value = 0;
      el.textContent = prefix + '0' + suffix;
      animation.invalidate().restart(true);
    }

    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: replay,
    });
  });`;
const countUpResult = run(countUp);
assert.equal(countUpResult.passed, false, 'count-up with its own text write stays flagged');
assert.deepEqual(ids(countUpResult), ['text-write']);
const [textWrite] = mixed(countUpResult)[0].guidance;
assert.equal(textWrite.line, "el.textContent = prefix + '0' + suffix;");
assert.match(textWrite.fix, /snap: \{ textContent: 1 \}/);

// The same effect written so GSAP does the write: passes, so no guidance at all.
const gsapOnlyCountUp = `gsap.registerPlugin(ScrollTrigger);
gsap.utils.toArray('[count-up]').forEach((el) => {
  gsap.from(el, {
    textContent: 0,
    duration: 1.2,
    ease: 'power3.out',
    snap: { textContent: 1 },
    scrollTrigger: { trigger: el, start: 'top 85%', once: true }
  });
});`;
assert.equal(run(gsapOnlyCountUp).passed, true, 'the GSAP-only count-up named in the guidance must pass');

// A one-time gsap.set with values read from the page: no motion.
const staticMask = `/*
 * Progress Bar SVG Mask
 */
document.querySelectorAll('[progress-track]').forEach(track => {
  const fill = track.querySelector('[progress-fill]');
  if (!fill) return;
  const bg = getComputedStyle(track);
  gsap.set(fill, {
    maskImage: bg.backgroundImage,
    WebkitMaskImage: bg.backgroundImage,
    maskSize: bg.backgroundSize,
    WebkitMaskSize: bg.backgroundSize,
    maskRepeat: 'repeat-x',
    WebkitMaskRepeat: 'repeat-x'
  });
});`;
const staticResult = run(staticMask);
assert.equal(staticResult.passed, false);
assert.deepEqual(ids(staticResult), ['static-style']);
assert.match(mixed(staticResult)[0].guidance[0].fix, /Custom properties/);
// Comment lines are never quoted back as the offending line.
assert.equal(mixed(staticResult)[0].guidance[0].line, 'gsap.set(fill, {');

// The same set inside a resize listener can run again, so it is not a static
// style and must not get the "no script is needed" advice.
const responsiveMask = `function applyMask() {
  document.querySelectorAll('[progress-track]').forEach(track => {
    const fill = track.querySelector('[progress-fill]');
    const bg = getComputedStyle(track);
    gsap.set(fill, {
      maskImage: bg.backgroundImage,
      maskSize: bg.backgroundSize,
      maskRepeat: 'repeat-x'
    });
  });
}
applyMask();
window.addEventListener('resize', applyMask);`;
const responsiveResult = run(responsiveMask);
assert.equal(responsiveResult.passed, false);
assert.deepEqual(ids(responsiveResult), ['unrecognized']);
// A set that waits for the page to load still runs once.
const onLoad = sandbox.describeUnapprovedGsapScript(`document.addEventListener('DOMContentLoaded', () => {
  const bg = getComputedStyle(track);
  gsap.set(fill, { maskImage: bg.backgroundImage });
});`);
assert.deepEqual(Array.from(onLoad, (entry) => entry.id), ['static-style']);
for (const rerun of ["gsap.ticker.add(update);", "new ResizeObserver(update).observe(el);", "window.matchMedia('(min-width: 992px)').addEventListener('change', update);", "el.onpointermove = update;"]) {
  const result = sandbox.describeUnapprovedGsapScript(`gsap.set(fill, { maskImage: bg.backgroundImage });\n${rerun}`);
  assert.deepEqual(Array.from(result, (entry) => entry.id), ['unrecognized'], rerun);
}

// Several kinds of non-GSAP work: one entry per kind, in a fixed order, capped.
const menu = `document.addEventListener('DOMContentLoaded', () => {
  const panel = document.querySelector('[data-panel]');
  const toggle = document.querySelector('[data-toggle]');
  const saved = panel.getAttribute('style');
  toggle.addEventListener('mouseenter', () => {
    toggle.setAttribute('aria-expanded', 'true');
    panel.classList.add('is-open');
    gsap.to(panel, { height: 240, duration: 0.4 });
  });
  toggle.addEventListener('mouseleave', () => {
    panel.setAttribute('style', saved);
    setTimeout(() => panel.removeAttribute('data-open'), 150);
    panel.textContent = '';
    panel.innerHTML = '<span></span>';
  });
});`;
const menuResult = run(menu);
assert.equal(menuResult.passed, false);
const menuIds = ids(menuResult);
assert.equal(menuIds.length, 4, 'guidance is capped');
assert.deepEqual(menuIds, ['markup', 'timer', 'text-write', 'style-write']);
for (const entry of mixed(menuResult)[0].guidance) {
  assert.ok(entry.reason && entry.fix, 'every entry has a reason and a fix');
  assert.ok(entry.line.length <= 143, 'quoted line is bounded');
}

// Code the rules do not name still gets a usable fallback.
const direct = sandbox.describeUnapprovedGsapScript('const x = somethingUnusual(a, b);\nconst y = other(x);');
assert.deepEqual(Array.from(direct, (entry) => entry.id), ['unrecognized']);
assert.equal(direct[0].line, undefined);

// Comments are not code: a block comment whose lines do not start with "*",
// an inline block comment, and a line comment never produce guidance or a quote.
const commented = sandbox.describeUnapprovedGsapScript(`/*
  The old version called fetch('/old-endpoint') and used setTimeout(run, 100).
  el.innerHTML = '<b>removed</b>';
*/
// localStorage.setItem('seen', '1');
const el = document.querySelector('.counter'); /* el.style.color = 'red'; */
el.textContent = 'done';`);
assert.deepEqual(Array.from(commented, (entry) => entry.id), ['text-write']);
assert.equal(commented[0].line, "el.textContent = 'done';");
// Code after a comment that closes mid-line is still read.
const afterClose = sandbox.describeUnapprovedGsapScript(`/* note
   continues */ setTimeout(run, 100);`);
assert.deepEqual(Array.from(afterClose, (entry) => [entry.id, entry.line]), [['timer', 'setTimeout(run, 100);']]);

// A trailing line comment is not code, and "//" inside a string is not a comment.
const trailing = sandbox.describeUnapprovedGsapScript(`const tween = gsap.to(box, { x: 100 }); // was: setTimeout(run, 100)
const docs = 'https://example.com/docs'; // el.innerHTML = '<b>x</b>'
box.classList.add('is-ready'); // fetch('/old')`);
assert.deepEqual(Array.from(trailing, (entry) => [entry.id, entry.line]), [['class-change', "box.classList.add('is-ready');"]]);
const inString = sandbox.describeUnapprovedGsapScript(`const note = "/* not a comment */ // still a string";
el.textContent = note;`);
assert.deepEqual(Array.from(inString, (entry) => [entry.id, entry.line]), [['text-write', 'el.textContent = note;']]);

// Words inside a string or template literal are text, not code: they never
// produce guidance. The line is still quoted as written when real code on it matches.
const literalText = sandbox.describeUnapprovedGsapScript(`const help = "Call fetch('/api') or setTimeout(run, 100) to refresh";
const example = \`el.innerHTML = '<b>x</b>'; localStorage.clear()\`;
label.textContent = "uses classList.add('x') and location";`);
assert.deepEqual(Array.from(literalText, (entry) => [entry.id, entry.line]), [
  ['text-write', 'label.textContent = "uses classList.add(\'x\') and location";']
]);
// Code inside a template interpolation runs, so it is still read as code; the
// text around it is not.
const interpolation = sandbox.describeUnapprovedGsapScript("const label = `fetch is not called here ${box.classList.add('on')} nor setTimeout`;\nconst nested = `${items.map((item) => `${item.name}`).join(', ')} localStorage`;");
assert.deepEqual(Array.from(interpolation, (entry) => entry.id), ['class-change']);

// Short identifier-like arguments are still read: the style attribute is a style write.
const styleAttribute = sandbox.describeUnapprovedGsapScript("el.setAttribute('style', saved);\nel.setAttribute('aria-expanded', 'true');");
assert.deepEqual(Array.from(styleAttribute, (entry) => entry.id), ['style-write', 'attribute-write']);

// Reading a property is not writing it: only an assignment or a call counts.
const reads = sandbox.describeUnapprovedGsapScript(`const saved = el.innerHTML;
if (el.outerHTML === saved) return;
const label = el.textContent.trim();
const same = el.className === 'x' || el.style.color == 'red' || link.href !== '';`);
assert.deepEqual(Array.from(reads, (entry) => entry.id), ['unrecognized']);
const writes = sandbox.describeUnapprovedGsapScript("el.innerHTML += '<b>x</b>';");
assert.deepEqual(Array.from(writes, (entry) => entry.id), ['markup']);

// Scripts that pass carry no guidance.
const valid = run(`gsap.to('.hero', { opacity: 1, duration: 1 });`);
assert.equal(valid.passed, true);
assert.equal(valid.details.flaggedCode.length, 0);

console.log('gsap guidance: ok');
