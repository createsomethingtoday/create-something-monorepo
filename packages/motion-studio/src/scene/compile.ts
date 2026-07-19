import type { MotionScene, RenderPlan } from './types.js';

function requireScene(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Invalid motion scene: ${message}`);
  }
}

export function compileScene(scene: MotionScene): RenderPlan {
  requireScene(scene.id.length > 0, 'id is required');
  requireScene(scene.format.aspectRatio === '16:9', 'only 16:9 scenes are supported');
  requireScene(
    scene.format.width === 1280 && scene.format.height === 720,
    'the pilot format must be 1280x720'
  );
  requireScene(
    scene.format.deliveryDurationSeconds >= 15 &&
      scene.format.deliveryDurationSeconds <= 20,
    'pilot duration must be between 15 and 20 seconds'
  );
  requireScene(scene.format.burnedInCaptions === false, 'captions must remain player-rendered');

  const elementIds = new Set(scene.elements.map((element) => element.id));
  const beatIds = new Set(scene.beats.map((beat) => beat.id));
  const cellIds = new Set(scene.renderCells.map((cell) => cell.id));

  requireScene(elementIds.size === scene.elements.length, 'element ids must be unique');
  requireScene(beatIds.size === scene.beats.length, 'beat ids must be unique');
  requireScene(cellIds.size === scene.renderCells.length, 'render cell ids must be unique');

  for (const beat of scene.beats) {
    requireScene(beat.startSeconds >= 0, `beat ${beat.id} starts before zero`);
    requireScene(beat.endSeconds > beat.startSeconds, `beat ${beat.id} has no duration`);
    requireScene(
      beat.endSeconds <= scene.format.deliveryDurationSeconds,
      `beat ${beat.id} exceeds the delivery duration`
    );
    requireScene(cellIds.has(beat.renderCell), `beat ${beat.id} references an unknown render cell`);
    for (const focusId of beat.focus) {
      requireScene(elementIds.has(focusId), `beat ${beat.id} focuses unknown element ${focusId}`);
    }
    for (const dependencyId of beat.dependsOn ?? []) {
      requireScene(beatIds.has(dependencyId), `beat ${beat.id} depends on unknown beat ${dependencyId}`);
    }
  }

  return {
    sceneId: scene.id,
    durationSeconds: scene.format.deliveryDurationSeconds,
    format: scene.format,
    cells: scene.renderCells.map((cell) => ({
      ...cell,
      beatIds: scene.beats
        .filter((beat) => beat.renderCell === cell.id)
        .map((beat) => beat.id),
    })),
  };
}
