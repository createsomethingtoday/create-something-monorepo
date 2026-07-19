import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildAssemblyCommand } from '../dist/scene/index.js';

test('builds a deterministic two-cell stop-motion assembly command', () => {
  const scenePath = fileURLToPath(
    new URL(
      '../../agency/content/assets/brand/create-something-stop-motion-signal-proof.v20260719/source/scene.v3.json',
      import.meta.url
    )
  );
  const scene = JSON.parse(readFileSync(scenePath, 'utf8'));
  const command = buildAssemblyCommand(scene, scenePath);

  assert.equal(command.executable, 'ffmpeg');
  assert.equal(command.inputPaths.length, 2);
  assert.match(command.inputPaths[0], /signal-decision-proof--remix-v2--10s/);
  assert.match(command.inputPaths[1], /proof-resolution--8s/);
  assert.match(command.outputPath, /signal-decision-proof--v3--18s/);
  assert.match(command.filterComplex, /xfade=transition=fade:duration=0.3:offset=9.7/);
  assert.match(command.filterComplex, /fps=12,fps=24/);
});
