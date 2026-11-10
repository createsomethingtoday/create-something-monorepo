import test from 'node:test';
import assert from 'node:assert/strict';
import { QuestMotion } from './quest-motion.mjs';

function fixture({ reduced = false } = {}) {
  const calls = [], listeners = new Set();
  const preference = { matches: reduced, addEventListener(_, fn) { listeners.add(fn); }, removeEventListener(_, fn) { listeners.delete(fn); } };
  const timeline = { fromTo(target, from, to, at) { calls.push({ target, from, to, at }); return this; }, kill() { calls.push('kill'); } };
  let complete=()=>{};
  const engine = { timeline(options) { complete=options.onComplete; return timeline; }, context(fn) { fn(); return { revert() { calls.push('revert'); } }; } };
  const scene = { dataset: { questPhase: '0', questMotion: '', questRouteReady: 'false' }, querySelector(selector) { return { selector, getBoundingClientRect() { return { width: 400 }; } }; } };
  const host = { querySelector: () => scene };
  const motion = new QuestMotion({ engine, media: () => preference });
  return { motion, scene, host, calls, listeners, complete:()=>complete(), change(value) { preference.matches = value; for (const fn of [...listeners]) fn({ matches: value }); } };
}

test('a new step moves the wayfinder and illustrative objects without touching controls', () => {
  const f = fixture(); f.motion.mount(f.host); f.motion.beforeRender(); f.calls.length = 0;
  f.scene.dataset.questPhase = '1'; f.motion.mount(f.host);
  const marker = f.calls.find(c => c.target?.selector === '.quest-wayfinder');
  assert.equal(marker.from.x, -100); assert.equal(marker.to.x, 0);
  assert(f.calls.some(c => c.target?.selector.includes('gig')));
  assert(f.calls.every(c => typeof c === 'string' || !/input|button|form|mission/.test(c.target.selector)));
  f.motion.leave(); assert.equal(f.listeners.size, 0);
});

test('busy and ordinary rerenders do not replay motion or consume the next saved step', () => {
  const f = fixture(); f.motion.mount(f.host); f.motion.beforeRender(); f.calls.length = 0;
  f.scene.dataset.questPhase = '1'; f.scene.getAttribute = () => 'true';
  f.motion.mount(f.host); assert.equal(f.calls.length, 0);
  f.scene.getAttribute = () => 'false'; f.motion.mount(f.host);
  assert(f.calls.some(c => c.target?.selector === '.quest-wayfinder'));
  f.complete(); f.motion.beforeRender(); f.calls.length = 0; f.motion.mount(f.host);
  assert.equal(f.calls.length, 0);
  f.motion.leave();
});

test('reduced motion stays static and changing the preference reverts a running sequence', () => {
  const f = fixture({ reduced: true }); f.motion.mount(f.host);
  assert.equal(f.calls.length, 0); assert.equal(f.scene.dataset.questAnimation, 'static');
  f.change(false); f.motion.replay(f.host); assert(f.calls.length > 0);
  f.change(true); assert(f.calls.includes('revert')); assert.equal(f.scene.dataset.questAnimation, 'static');
  f.motion.leave(); assert.equal(f.listeners.size, 0);
});

test('only a verified route is drawn; replay and leaving cannot write records', () => {
  const f = fixture(); f.scene.dataset.questPhase = '3'; f.motion.mount(f.host);
  assert(!f.calls.some(c => c.target?.selector.includes('route')));
  f.scene.dataset.questRouteReady = 'true'; f.calls.length = 0; f.motion.replay(f.host);
  const route = f.calls.find(c => c.target?.selector.includes('route'));
  assert.equal(route.from.strokeDashoffset, 100); assert.equal(route.to.strokeDashoffset, 0);
  f.motion.leave(); assert(f.calls.includes('revert')); assert.equal(f.listeners.size, 0);
});

test('an unavailable media or animation engine preserves static onboarding', () => {
  const scene = { dataset: { questPhase: '0' } }, host = { querySelector: () => scene };
  new QuestMotion({ engine: { context() { throw Error('unsupported renderer'); } }, media: () => ({ matches: false }) }).mount(host);
  assert.equal(scene.dataset.questAnimation, 'static');
  assert.doesNotThrow(() => new QuestMotion({ media: () => null }).mount(host));
  assert.doesNotThrow(() => new QuestMotion().mount({ querySelector: () => null }));
});

test('first-run markup remains usable under the desktop policy that blocks inline styles', async () => {
  const { questView } = await import('./quest-view.mjs');
  for (const phase of [0, 1, 2, 3]) {
    const html = questView({ phase, workspace: { name: 'Danny’s space' } });
    assert.doesNotMatch(html, /\sstyle=/, 'static waypoint positioning must work with style-src self');
    assert.match(html, new RegExp(`class="quest-wayfinder" data-current="${phase}"`));
    assert.match(html, /aria-current="step"/);
  }
});

test('a verified gig save places its record into the crate before introducing the collaborator', () => {
  const f = fixture(); f.motion.mount(f.host); f.motion.beforeRender(); f.calls.length = 0;
  f.scene.dataset.questPhase = '2'; f.scene.dataset.questMotion = 'gig'; f.motion.mount(f.host);
  const gig = f.calls.find(c => c.target?.selector === '[data-quest-part="gig"]');
  const person = f.calls.find(c => c.target?.selector === '[data-quest-part="person"]');
  assert(gig.from.y < 0); assert.equal(gig.to.y,0); assert(gig.at < person.at);
  f.motion.leave();
});

test('a newly verified result drops into the crate once within the same step', () => {
  const f = fixture(); f.scene.dataset.questPhase='2'; f.motion.mount(f.host); f.motion.beforeRender(); f.calls.length=0;
  f.scene.dataset.questWin='saved-result';f.scene.dataset.questMotion='gig';f.scene.getAttribute=()=> 'true';f.motion.mount(f.host);assert.equal(f.calls.length,0);
  f.scene.getAttribute=()=> 'false';f.motion.mount(f.host);
  const record=f.calls.find(c=>c.target?.selector==='[data-quest-part="gig"]');
  assert(record?.from.y<0,'an independently checked result enters the crate');
  f.complete();f.motion.beforeRender();f.calls.length=0;f.motion.mount(f.host);assert.equal(f.calls.length,0);f.motion.leave();
});

test('an immediate app rerender preserves an unfinished checked-save animation',()=>{
 const f=fixture();f.scene.dataset.questPhase='2';f.motion.mount(f.host);f.complete();f.motion.beforeRender();f.calls.length=0;
 f.scene.dataset.questWin='checked-save';f.scene.dataset.questMotion='gig';f.motion.mount(f.host);
 assert.equal(f.scene.dataset.questAnimation,'playing');f.motion.beforeRender();f.calls.length=0;f.motion.mount(f.host);
 assert(f.calls.some(c=>c.target?.selector==='[data-quest-part="gig"]'),'replaced nodes continue their pending motion');
 f.complete();f.motion.beforeRender();f.calls.length=0;f.motion.mount(f.host);assert.equal(f.calls.length,0);f.motion.leave();
});
