import { describe, expect, it } from 'vitest';
import { glossary } from './data.js';
import { getSharedLanguageScene, sharedLanguageScenes } from './shared-language-scenes.js';

describe('shared language animation scenes', () => {
  it('gives every shared-language term a court picture and coaching cue', () => {
    expect(Object.keys(sharedLanguageScenes)).toHaveLength(glossary.length);

    for (const [term, meaning] of glossary) {
      const scene = getSharedLanguageScene(term);
      expect(scene.term).toBe(term);
      expect(scene.meaning).toBe(meaning);
      expect(scene.caption.length).toBeGreaterThan(20);
      expect(scene.cue.length).toBeGreaterThan(8);
      expect(scene.actors.length).toBeGreaterThan(0);
    }
  });

  it('keeps the ball with the guard until help commits in the Advantage picture', () => {
    const scene = getSharedLanguageScene('Advantage');
    const guard = scene.actors.find((actor) => actor.id === 'guard');
    const ball = scene.actors.find((actor) => actor.id === 'ball');
    const helper = scene.actors.find((actor) => actor.id === 'helper');
    const openPlayer = scene.actors.find((actor) => actor.id === 'open-player');

    expect(scene.cue).toBe('Beat one. Make two decide. Finish or find the open player.');
    expect(guard?.timing).toBe(ball?.timing);
    expect(ball?.path.slice(0, 3)).toEqual(guard?.path.slice(0, 3));
    expect(guard?.path.at(-1)).toEqual(guard?.path.at(-2));
    expect(helper?.path.at(-1)).toEqual(guard?.path.at(-1));
    expect(ball?.path.at(-1)).toEqual(openPlayer?.path.at(-1));
  });

  it('shows Freeze as a dribble that commits the helper before the pass', () => {
    const scene = getSharedLanguageScene('Freeze');
    const guard = scene.actors.find((actor) => actor.id === 'guard');
    const ball = scene.actors.find((actor) => actor.id === 'ball');
    const helper = scene.actors.find((actor) => actor.id === 'helper');
    const teammate = scene.actors.find((actor) => actor.id === 'teammate');

    expect(scene.meaning).toBe('Dribble at a helper so they commit to the ball and cannot recover to a teammate.');
    expect(scene.cue).toBe('Dribble at the helper. Make them commit. Pass behind the help.');
    expect(guard?.timing).toBe(ball?.timing);
    expect(ball?.path.slice(0, 3)).toEqual(guard?.path.slice(0, 3));
    expect(guard?.path.at(-1)).toEqual(guard?.path.at(-2));
    expect(helper?.path.at(-1)).toEqual(guard?.path.at(-1));
    expect(ball?.path.at(-1)).toEqual(teammate?.path.at(-1));
  });
});
