import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { analyseSvgStyles, findProhibitedMarketplaceCustomCode } from '../src/font-custom-code-policy.js';

// A GSAP script needs wiring around its tweens: a DOMContentLoaded handler,
// early-return guards, click listeners, an "is animating" flag, tween vars,
// and DOM reordering for a looping CMS slider. That wiring cannot do anything
// by itself, so it must not count as "unapproved code". A CMS slider template
// (Nov 2026) failed "Mixed GSAP usage with unapproved code" on every slider
// page at 26-27% GSAP blocks against a 30% threshold. Scripts whose behavior
// is not GSAP (style writes, content writes, timers, storage, network, script
// injection) must stay flagged.

const source = fs.readFileSync(new URL('../src/worker.js', import.meta.url), 'utf8');
const start = source.indexOf('var IX2_REJECTION_MESSAGE');
const endMarker = '__name(containsPotentiallyHarmfulCode, "containsPotentiallyHarmfulCode");';
const end = source.indexOf(endMarker) + endMarker.length;
assert.notEqual(start, -1, 'validator slice start not found');
assert.notEqual(end, endMarker.length - 1, 'validator slice end not found');

const sandbox = { console, Set, URL, analyseSvgStyles, findProhibitedMarketplaceCustomCode, __name: (target) => target };
vm.createContext(sandbox);
vm.runInContext(source.slice(start, end), sandbox);

const url = 'https://glue-fixture.webflow.io/';
const page = (script) => `<!doctype html><html data-wf-site="000000000000000000000000"><head></head><body><script>${script}</script></body></html>`;

function run(script) {
  const result = sandbox.validateGsapUsage(page(script), url);
  return { passed: result.passed, messages: Array.from(result.details.flaggedCode, (item) => item.message) };
}

// Looping prev/next slider: GSAP moves the track, the DOM reorders the items.
const loopSlider = `document.addEventListener("DOMContentLoaded", () => {
  if (typeof gsap === "undefined") return;

  const rail = document.querySelector('.w-dyn-items');
  const forward = document.getElementById('rail-next');
  const back = document.getElementById('rail-prev');
  if (!rail || !forward || !back) return;

  gsap.set(rail, { willChange: "transform", force3D: true, backfaceVisibility: "hidden" });

  let busy = false;

  function step(direction) {
    if (busy) return;

    const cards = gsap.utils.toArray('.w-dyn-item', rail);
    if (cards.length < 2) return;
    busy = true;

    const lead = cards[0];
    const spacing = parseFloat(window.getComputedStyle(rail).columnGap) || 0;
    const distance = lead.offsetWidth + spacing;

    if (direction === 1) {
      gsap.to(rail, {
        x: -distance,
        duration: 0.7,
        ease: "power2.out",
        overwrite: "auto",
        onComplete: () => {
          rail.appendChild(lead);
          gsap.set(rail, { x: 0 });
          busy = false;
        }
      });
    } else {
      rail.insertBefore(cards[cards.length - 1], lead);
      gsap.set(rail, { x: -distance });
      gsap.to(rail, {
        x: 0,
        duration: 0.7,
        ease: "power2.out",
        overwrite: "auto",
        onComplete: () => { busy = false; }
      });
    }
  }

  forward.addEventListener("click", (e) => { e.preventDefault(); step(1); });
  back.addEventListener("click", (e) => { e.preventDefault(); step(-1); });
});`;
assert.deepEqual(run(loopSlider), { passed: true, messages: [] }, 'GSAP slider wiring must not count as unapproved code');

// Plain show/hide panels with no GSAP keep the existing finding.
const plainPanels = `document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.panel-group').forEach(function (group) {
    var tabs = group.querySelectorAll('.panel-tab');
    var bodies = group.querySelectorAll('.panel-body');
    bodies.forEach(function (body, i) { body.style.display = i === 0 ? 'block' : 'none'; });
    function show(index) {
      tabs.forEach(function (tab, i) { tab.classList.toggle('active', i === index); });
      bodies.forEach(function (body, i) { body.style.display = i === index ? 'block' : 'none'; });
    }
    tabs.forEach(function (tab, index) { tab.addEventListener('click', function () { show(index); }); });
  });
});`;
assert.deepEqual(
  run(plainPanels),
  { passed: false, messages: ['Custom script detected without approved GSAP patterns'] },
  'non-GSAP script stays flagged'
);

// Scripts whose behavior is not GSAP stay flagged even with a GSAP call in them.
const nonGsapBehavior = {
  'style and text writes on a timer': `document.addEventListener('DOMContentLoaded', () => {
  gsap.to('.hero', { opacity: 1, duration: 1 });
  const slides = document.querySelectorAll('.custom-slide');
  const label = document.querySelector('.custom-counter');
  let current = 0;
  setInterval(() => {
    slides[current].style.display = 'none';
    slides[current].style.transform = 'translateX(-100%)';
    current = (current + 1) % slides.length;
    slides[current].style.display = 'block';
    slides[current].style.transform = 'translateX(0)';
    label.textContent = (current + 1) + ' / ' + slides.length;
    document.body.dataset.slide = String(current);
  }, 4000);
});`,
  'script injection': `document.addEventListener('DOMContentLoaded', () => {
  gsap.to('.hero', { opacity: 1, duration: 1 });
  const loader = document.createElement('script');
  loader.async = true;
  loader.src = 'https://cdn.example.com/widget.js';
  loader.onload = () => { window.widget.init(document.querySelector('.widget')); };
  document.head.appendChild(loader);
  const frame = document.createElement('iframe');
  frame.src = 'https://widget.example.com/embed';
  document.body.appendChild(frame);
});`,
  'class-driven panel toggle': `document.addEventListener('DOMContentLoaded', () => {
  gsap.to('.hero', { opacity: 1, duration: 1 });
  const trigger = document.querySelector('.panel-trigger');
  const panel = document.querySelector('.panel');
  if (!trigger || !panel) return;
  let open = false;
  function togglePanel() {
    if (!panel) return;
    open = !open;
    panel.classList.toggle('is-open');
  }
  trigger.addEventListener('click', (e) => { e.preventDefault(); togglePanel(); });
});`,
  'dataset and attribute state': `document.addEventListener('DOMContentLoaded', () => {
  gsap.to('.hero', { opacity: 1, duration: 1 });
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.menu');
  if (!toggle || !menu) return;
  function flip() {
    if (!menu) return;
    menu.dataset.state = menu.dataset.state === 'open' ? 'closed' : 'open';
    menu.toggleAttribute('hidden');
  }
  toggle.addEventListener('click', (e) => { e.preventDefault(); flip(); });
});`,
  'network request': `document.addEventListener('DOMContentLoaded', () => {
  gsap.from('.feed', { opacity: 0, duration: 0.5 });
  const feed = document.querySelector('.feed');
  const endpoint = 'https://api.example.com/posts';
  fetch(endpoint).then((response) => response.json()).then((posts) => {
    posts.forEach((post) => {
      const card = document.createElement('article');
      card.className = 'post-card';
      card.textContent = post.title;
      feed.appendChild(card);
    });
  });
});`
};
for (const [name, script] of Object.entries(nonGsapBehavior)) {
  assert.equal(run(script).passed, false, `non-GSAP behavior stays flagged: ${name}`);
}

// Only call-free wiring is exempt; a call hidden in a guard or argument is behavior.
for (const block of ['if (busy) return', 'if (!rail || !forward || !back) return', 'if (typeof gsap === "undefined") return', 'rail.insertBefore(cards[cards.length - 1], lead)']) {
  assert.equal(sandbox.isGsapWiringBlock(block), true, `wiring: ${block}`);
}
for (const block of ['if (beacon.send(data)) return', 'if ((0, track)(id))', 'rail.appendChild(build(lead))', 'x: makeValue(),', 'busy = getFlag()']) {
  assert.equal(sandbox.isGsapWiringBlock(block), false, `not wiring: ${block}`);
}

console.log('GSAP DOM glue checks passed.');
