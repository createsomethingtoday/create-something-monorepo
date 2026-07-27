import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import {
  createPipelineEnvironmentPixels,
  createPipelineSurfacePixels,
  derivePipelineRenderProfile
} from '../src/lib/visual/pipelineRenderProfile.ts';

const palette = {
  ink: [9, 9, 9] as const,
  court: [230, 230, 224] as const,
  signal: [0, 87, 184] as const,
  signalSoft: [220, 232, 245] as const
};

test('desktop and compact profiles declare bounded web-quality budgets', () => {
  const desktop = derivePipelineRenderProfile(false);
  const compact = derivePipelineRenderProfile(true);

  assert.deepEqual(desktop, {
    version: 1,
    id: 'pipeline-web-quality-desktop-v1',
    antialias: true,
    maximumPixelRatio: 1.6,
    environment: { width: 48, height: 96 },
    surfaceTextureSize: 64,
    packetCount: 22,
    budgets: { drawCalls: 40, geometries: 28, textures: 4 }
  });
  assert.deepEqual(compact, {
    version: 1,
    id: 'pipeline-web-quality-compact-v1',
    antialias: false,
    maximumPixelRatio: 1.2,
    environment: { width: 24, height: 64 },
    surfaceTextureSize: 32,
    packetCount: 14,
    budgets: { drawCalls: 40, geometries: 28, textures: 4 }
  });
});

test('the repository-authored environment and surface pixels are deterministic', () => {
  const profile = derivePipelineRenderProfile(false);
  const environment = createPipelineEnvironmentPixels(profile.environment, palette);
  const roughness = createPipelineSurfacePixels('roughness', profile.surfaceTextureSize, 1426);
  const normal = createPipelineSurfacePixels('normal', profile.surfaceTextureSize, 1426);

  assert.equal(environment.byteLength, 48 * 96 * 4);
  assert.equal(roughness.byteLength, 64 * 64 * 4);
  assert.equal(normal.byteLength, 64 * 64 * 4);
  assert.equal(
    sha256(environment),
    '03a268d25e8af211de678529eb68777c1266bf5917e359c525d7db0b46df922a'
  );
  assert.equal(
    sha256(roughness),
    '3f2d0b827c78493a04cc9f7e49f9258af1306456f5d05a1564697cb792cc6a62'
  );
  assert.equal(sha256(normal), 'e1142058706e3e2351af79e287f452a1e8ef41bc9db401ded5bca22f6d78153d');
});

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}
