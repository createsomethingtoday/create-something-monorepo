export type SoraModel = 'sora-2' | 'sora-2-pro';

export interface SceneFormat {
  width: number;
  height: number;
  aspectRatio: '16:9';
  deliveryDurationSeconds: number;
  authoredFps: number;
  deliveryFps: number;
  burnedInCaptions: false;
}

export interface SceneElement {
  id: string;
  asset: string;
  role: string;
  editable: boolean;
}

export interface SceneBeat {
  id: string;
  startSeconds: number;
  endSeconds: number;
  focus: string[];
  dependsOn?: string[];
  renderCell: string;
  direction?: string;
}

export interface CachedRenderCell {
  id: string;
  startSeconds: number;
  endSeconds: number;
  source: string;
  generation: 'cached';
}

export interface SoraRenderCell {
  id: string;
  startSeconds: number;
  endSeconds: number;
  source: string;
  generation: 'sora';
  inputReference?: string;
  durationSeconds: 4 | 8 | 12;
  draftModel: SoraModel;
  finalModel: SoraModel;
}

export type RenderCell = CachedRenderCell | SoraRenderCell;

export interface CostPolicy {
  draft: {
    model: SoraModel;
    maximumAttemptsPerCell: number;
    maximumSceneSpendUsd: number;
  };
  final: {
    model: SoraModel;
    rerenderInvalidatedCellsOnly: boolean;
    requiresApprovalAboveUsd: number;
    maximumSceneSpendUsd: number;
  };
}

export interface MotionScene {
  id: string;
  format: SceneFormat;
  elements: SceneElement[];
  beats: SceneBeat[];
  renderCells: RenderCell[];
  policy: CostPolicy;
  assembly?: SceneAssembly;
  [key: string]: unknown;
}

export interface SceneAssembly {
  cellOrder: string[];
  transition: {
    kind: 'stop-motion-crossfade';
    durationSeconds: number;
    offsetSeconds: number;
  };
  terminalFramePaddingSeconds: number;
  output: string;
}

export interface AssemblyCommand {
  executable: 'ffmpeg';
  args: string[];
  inputPaths: string[];
  outputPath: string;
  filterComplex: string;
}

export interface VideoProbe {
  streams?: Array<{
    codec_type?: string;
    width?: number;
    height?: number;
    r_frame_rate?: string;
    nb_frames?: string;
    sample_rate?: string;
  }>;
  format?: {
    duration?: string;
  };
}

export interface VideoVerificationReceipt {
  sceneId: string;
  videoPath: string;
  valid: boolean;
  checks: {
    duration: boolean;
    dimensions: boolean;
    frameRate: boolean;
    frameCount: boolean;
    audio: boolean;
    noSubtitleStream: boolean;
  };
}

export type RenderPlanCell = RenderCell & {
  beatIds: string[];
};

export interface RenderPlan {
  sceneId: string;
  durationSeconds: number;
  format: SceneFormat;
  cells: RenderPlanCell[];
}

export interface CostedRenderPlan extends RenderPlan {
  quality: RenderQuality;
  pendingCellIds: string[];
  estimatedSpendUsd: number;
  maximumSpendUsd: number;
  withinBudget: boolean;
  requiresApproval: boolean;
}

export type RenderQuality = 'draft' | 'final';

export interface EditRequest {
  beatId: string;
  quality: RenderQuality;
}

export interface EditPlan {
  sceneId: string;
  targetBeatId: string;
  quality: RenderQuality;
  invalidatedBeatIds: string[];
  invalidatedCellIds: string[];
  estimatedSpendUsd: number;
  maximumSpendUsd: number;
  withinBudget: boolean;
}
