import { describe, expect, it } from 'vitest';

import {
  getHeroArtifactScene,
  heroArtifactSceneRegistry,
  validateHeroArtifactSceneRegistry
} from './physical-artifact.js';

describe('Physical Artifact Engine scene registry', () => {
  it('assigns one distinct provenance-bearing scene to every declared public hero', () => {
    expect(Object.keys(heroArtifactSceneRegistry)).toEqual([
      'agency-folded-playbook',
      'agency-gated-route',
      'agency-three-path',
      'agency-evidence-stack',
      'io-research-specimen',
      'ltd-canon-standard',
      'space-runtime-rig',
      'basketball-procedural-court'
    ]);

    const scenes = Object.values(heroArtifactSceneRegistry);
    expect(new Set(scenes.map((scene) => scene.route)).size).toBe(8);
    expect(new Set(scenes.map((scene) => scene.subject)).size).toBe(8);
    expect(scenes.every((scene) => scene.provenance.source === 'procedural')).toBe(true);
    expect(scenes.every((scene) => scene.provenance.externalUploadAllowed === false)).toBe(true);
    expect(scenes.every((scene) => scene.fallback.kind === 'authored-svg')).toBe(true);
  });

  it('declares responsive poster outputs, semantic roles, and bounded live enhancement', () => {
    for (const scene of Object.values(heroArtifactSceneRegistry)) {
      expect(scene.roles).toEqual(
        expect.arrayContaining(['subject', 'source', 'boundary', 'evidence', 'field'])
      );
      expect(scene.poster.desktop.width).toBeGreaterThanOrEqual(1280);
      expect(scene.poster.mobile.width).toBeGreaterThanOrEqual(720);
      expect(scene.poster.desktop.recipeHash).toMatch(/^[a-f0-9]{64}$/);
      expect(scene.poster.mobile.recipeHash).toMatch(/^[a-f0-9]{64}$/);
    }

    expect(getHeroArtifactScene('space-runtime-rig').liveEnhancement).toBe(true);
    expect(getHeroArtifactScene('basketball-procedural-court').liveEnhancement).toBe(true);
    expect(getHeroArtifactScene('agency-folded-playbook').liveEnhancement).toBe(false);
  });

  it('fails closed on missing coverage, duplicate routes, or an invalid fallback contract', () => {
    expect(validateHeroArtifactSceneRegistry(heroArtifactSceneRegistry)).toEqual([]);

    const duplicateRoute = {
      ...heroArtifactSceneRegistry,
      'io-research-specimen': {
        ...heroArtifactSceneRegistry['io-research-specimen'],
        route: '/'
      }
    };
    expect(validateHeroArtifactSceneRegistry(duplicateRoute)).toContain('duplicate route: /');

    const noFallback = {
      ...heroArtifactSceneRegistry,
      'ltd-canon-standard': {
        ...heroArtifactSceneRegistry['ltd-canon-standard'],
        fallback: { kind: 'none' as const, label: '' }
      }
    };
    expect(validateHeroArtifactSceneRegistry(noFallback)).toContain(
      'ltd-canon-standard must provide an authored SVG fallback'
    );
  });
});
