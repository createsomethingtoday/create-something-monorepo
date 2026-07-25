import type { PublicProductId } from '$lib/data/productFamily';

export type PipelineValveState = 'verified' | 'active' | 'pending';

export interface PipelineValveVisualState {
  id: PublicProductId;
  state: PipelineValveState;
}

export interface PipelineSceneState {
  stage: PublicProductId;
  stageIndex: number;
  progress: number;
  valves: PipelineValveVisualState[];
  safeWorkContinues: boolean;
  protectedActionHeld: boolean;
  proofVisible: boolean;
  outcomeVisible: boolean;
}

const STAGES: PublicProductId[] = ['map', 'build', 'control'];
const PROGRESS: Record<PublicProductId, number> = {
  map: 0.34,
  build: 0.67,
  control: 1
};

export function derivePipelineSceneState(stage: PublicProductId): PipelineSceneState {
  const stageIndex = STAGES.indexOf(stage);
  const isControl = stage === 'control';

  return {
    stage,
    stageIndex,
    progress: PROGRESS[stage],
    valves: STAGES.map((id, index) => ({
      id,
      state: index < stageIndex ? 'verified' : index === stageIndex ? 'active' : 'pending'
    })),
    safeWorkContinues: isControl,
    protectedActionHeld: isControl,
    proofVisible: isControl,
    outcomeVisible: isControl
  };
}
