import assert from 'node:assert/strict';
import { test } from 'node:test';
import { enhanceHeroPlayback } from '../src/lib/motion/heroPlayback';
import { reducedFilmMotion, filmOverlayOpen, filmNavigationOpen } from '../src/lib/motion/filmPlayback';

function fixture() {
  let enter: (entries: unknown[]) => void = () => {};
  const doc = Object.assign(new EventTarget(), { hidden: false });
  const connection = Object.assign(new EventTarget(), { saveData: false });
  const attrs = new Map<string, string>();
  let plays = 0, loads = 0, disconnected = false;
  const stage = {}; let observed: unknown;
  const video = Object.assign(new EventTarget(), { paused: true, ended: false, currentTime: 0, muted: false, hidden: true,
    setAttribute: (k: string, v: string) => attrs.set(k, v), removeAttribute: (k: string) => attrs.delete(k), hasAttribute: (k: string) => attrs.has(k),
    load() { loads++; }, pause() { this.paused = true; }, play() { plays++; this.paused = false; return Promise.resolve(); }
  });
  const button = Object.assign(new EventTarget(), { hidden: true, textContent: '', setAttribute() {} });
  const view = { navigator: { connection }, IntersectionObserver: class { constructor(cb: typeof enter) { enter = cb; } observe(target: unknown) { observed = target; } disconnect() { disconnected = true; } } };
  Object.assign(doc, { defaultView: view });
  const root = { ownerDocument: doc, querySelector: (s: string) => s === 'video' ? video : s === '.hero-motion' ? stage : button };
  reducedFilmMotion.set(true); filmOverlayOpen.set(false); filmNavigationOpen.set(false);
  const control = enhanceHeroPlayback(root as unknown as HTMLElement);
  return { control, video, button, doc, connection, attrs, get plays() { return plays; }, get loads() { return loads; }, get disconnected() { return disconnected; }, get observesArtwork() { return observed === stage; }, enter(visible = true) { enter([{ isIntersecting: visible, intersectionRatio: visible ? 1 : 0 }]); }, click() { button.dispatchEvent(new Event('click')); } };
}

test('still mode never attaches a video source, then visible motion plays once', () => {
  const f = fixture(); f.enter();
  assert.equal(f.attrs.has('src'), false); assert.equal(f.plays, 0);
  reducedFilmMotion.set(false);
  assert.equal(f.attrs.has('src'), true); assert.equal(f.plays, 1);
  f.video.ended = true; f.video.paused = true; f.video.dispatchEvent(new Event('ended')); f.enter(false); f.enter();
  assert.equal(f.plays, 1); assert.match(f.button.textContent, /Replay/);
  f.control.destroy();
});

test('manual pause survives visibility, document and overlay interruptions; replay is explicit', () => {
  const f = fixture(); reducedFilmMotion.set(false); f.enter();
  f.click(); assert.equal(f.video.paused, true);
  f.enter(false); f.enter(); f.doc.hidden = true; f.doc.dispatchEvent(new Event('visibilitychange'));
  f.doc.hidden = false; f.doc.dispatchEvent(new Event('visibilitychange'));
  filmOverlayOpen.set(true); filmOverlayOpen.set(false);
  assert.equal(f.plays, 1);
  f.click(); assert.equal(f.plays, 2);
  f.video.dispatchEvent(new Event('playing')); assert.equal(f.video.hidden, false);
  f.video.ended = true; f.video.paused = true; f.video.dispatchEvent(new Event('ended')); f.click();
  assert.equal(f.video.currentTime, 0); assert.equal(f.plays, 3);
  f.control.destroy();
});

test('system pauses resume, motion and data saving detach source, error stays still, destroy releases listeners', () => {
  const f = fixture(); reducedFilmMotion.set(false); f.enter();
  f.enter(false); assert.equal(f.video.paused, true); f.enter(); assert.equal(f.plays, 2);
  filmNavigationOpen.set(true); assert.equal(f.video.paused, true); filmNavigationOpen.set(false);
  reducedFilmMotion.set(true); assert.equal(f.attrs.has('src'), false); assert.equal(f.video.hidden, true);
  reducedFilmMotion.set(false); assert.equal(f.attrs.has('src'), true);
  f.connection.saveData = true; f.connection.dispatchEvent(new Event('change')); assert.equal(f.attrs.has('src'), false);
  f.connection.saveData = false; f.connection.dispatchEvent(new Event('change'));
  f.video.dispatchEvent(new Event('error')); assert.equal(f.attrs.has('src'), false); assert.equal(f.button.hidden, true);
  const plays = f.plays; f.enter(); assert.equal(f.plays, plays);
  f.control.destroy(); assert.equal(f.disconnected, true);
  reducedFilmMotion.set(true); reducedFilmMotion.set(false); f.click(); f.doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(f.plays, plays); assert.equal(f.attrs.has('src'), false);
});

test('data saving at initialization and offscreen starts never request video', () => {
  const f = fixture(); f.connection.saveData = true; reducedFilmMotion.set(false); f.enter();
  assert.equal(f.attrs.has('src'), false); assert.equal(f.loads, 0);
  f.connection.saveData = false; f.enter(false); f.connection.dispatchEvent(new Event('change'));
  assert.equal(f.attrs.has('src'), false); f.control.destroy();
});

test('a completed or manually paused hero remains controllable after still mode is toggled', () => {
  const f = fixture(); reducedFilmMotion.set(false); f.enter();
  f.video.paused = true; f.video.ended = true; f.video.dispatchEvent(new Event('ended'));
  reducedFilmMotion.set(true); reducedFilmMotion.set(false);
  assert.equal(f.button.hidden, false); assert.match(f.button.textContent, /Replay/);
  f.click(); assert.equal(f.attrs.has('src'), true);
  f.click(); reducedFilmMotion.set(true); reducedFilmMotion.set(false);
  assert.equal(f.button.hidden, false); assert.match(f.button.textContent, /Play/);
  f.control.destroy();
});

test('visibility belongs to the artwork rather than the tall mobile copy region', () => {
  const f = fixture(); assert.equal(f.observesArtwork, true); f.control.destroy();
});
