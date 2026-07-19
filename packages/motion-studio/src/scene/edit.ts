import { compileScene } from './compile.js';
import { priceSoraCell } from './cost.js';
import type {
  EditPlan,
  EditRequest,
  MotionScene,
  SoraRenderCell,
} from './types.js';

export function planEdit(scene: MotionScene, request: EditRequest): EditPlan {
  const renderPlan = compileScene(scene);
  const target = scene.beats.find((beat) => beat.id === request.beatId);

  if (!target) {
    throw new Error(`Cannot edit unknown beat: ${request.beatId}`);
  }

  const invalidatedBeatIds = new Set<string>([target.id]);
  let discoveredDependent = true;

  while (discoveredDependent) {
    discoveredDependent = false;
    for (const beat of scene.beats) {
      if (invalidatedBeatIds.has(beat.id)) continue;
      if ((beat.dependsOn ?? []).some((dependency) => invalidatedBeatIds.has(dependency))) {
        invalidatedBeatIds.add(beat.id);
        discoveredDependent = true;
      }
    }
  }

  const invalidatedCellIds = renderPlan.cells
    .filter((cell) => cell.beatIds.some((beatId) => invalidatedBeatIds.has(beatId)))
    .map((cell) => cell.id);

  const invalidatedSoraCells = renderPlan.cells.filter(
    (cell): cell is SoraRenderCell & { beatIds: string[] } =>
      invalidatedCellIds.includes(cell.id) && cell.generation === 'sora'
  );

  const estimatedSpendUsd = invalidatedSoraCells
    .reduce((total, cell) => total + priceSoraCell(cell, request.quality), 0);

  const maximumSpendUsd = scene.policy[request.quality].maximumSceneSpendUsd;

  return {
    sceneId: scene.id,
    targetBeatId: target.id,
    quality: request.quality,
    invalidatedBeatIds: scene.beats
      .filter((beat) => invalidatedBeatIds.has(beat.id))
      .map((beat) => beat.id),
    invalidatedCellIds,
    estimatedSpendUsd: Number(estimatedSpendUsd.toFixed(2)),
    maximumSpendUsd,
    withinBudget: estimatedSpendUsd <= maximumSpendUsd,
  };
}
