import { compileScene } from './compile.js';
import type {
  CostedRenderPlan,
  MotionScene,
  RenderQuality,
  SoraModel,
  SoraRenderCell,
} from './types.js';

const PRICE_PER_SECOND_USD: Record<SoraModel, number> = {
  'sora-2': 0.1,
  'sora-2-pro': 0.3,
};

export function priceSoraCell(cell: SoraRenderCell, quality: RenderQuality): number {
  const model = quality === 'draft' ? cell.draftModel : cell.finalModel;
  return Number((cell.durationSeconds * PRICE_PER_SECOND_USD[model]).toFixed(2));
}

export function planRender(scene: MotionScene, quality: RenderQuality): CostedRenderPlan {
  const plan = compileScene(scene);
  const pendingCells = plan.cells.filter(
    (cell): cell is SoraRenderCell & { beatIds: string[] } => cell.generation === 'sora'
  );
  const estimatedSpendUsd = Number(
    pendingCells.reduce((total, cell) => total + priceSoraCell(cell, quality), 0).toFixed(2)
  );
  const maximumSpendUsd = scene.policy[quality].maximumSceneSpendUsd;

  return {
    ...plan,
    quality,
    pendingCellIds: pendingCells.map((cell) => cell.id),
    estimatedSpendUsd,
    maximumSpendUsd,
    withinBudget: estimatedSpendUsd <= maximumSpendUsd,
    requiresApproval:
      quality === 'final' &&
      estimatedSpendUsd > scene.policy.final.requiresApprovalAboveUsd,
  };
}
