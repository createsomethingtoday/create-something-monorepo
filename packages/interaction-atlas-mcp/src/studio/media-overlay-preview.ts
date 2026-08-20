import {
  compileTranscriptTimeline,
  type MediaOverlay,
  type TranscriptEditorProject
} from '@create-something/atlas-composition';

export const ATLAS_REMOTION_PREVIEW_PLAN_SCHEMA =
  'create-something/atlas-remotion-preview-plan@1' as const;

export type AtlasRemotionPreviewPlan = {
  schema: typeof ATLAS_REMOTION_PREVIEW_PLAN_SCHEMA;
  adapter: 'motion-studio';
  compositionId: 'AtlasTranscriptOverlays';
  revisionId: string;
  media: { durationUs: number; width: number; height: number };
  overlays: Array<Pick<MediaOverlay, 'id' | 'kind' | 'text' | 'startUs' | 'endUs'>>;
};

/**
 * Projects only the accepted revision into the renderer-neutral shape that
 * Motion Studio's local text-overlay adapter consumes. This is a plan, not a
 * render request: it owns no source file path, provider credential, or output.
 */
export function createAcceptedOverlayPreviewPlan(
  project: TranscriptEditorProject
): AtlasRemotionPreviewPlan {
  const timeline = compileTranscriptTimeline(project);
  const revision = project.revisions.find((candidate) => candidate.id === project.currentRevisionId);
  if (!revision) throw new Error(`Current transcript revision ${project.currentRevisionId} is missing.`);

  const sourceAssetId = timeline.clips.find((clip) => clip.kind === 'video')?.sourceAssetId;
  const source = project.sourceAssets.find((asset) => asset.id === sourceAssetId);
  if (!source) throw new Error('The accepted transcript timeline has no local source asset.');

  const overlaysById = new Map(revision.overlays.map((overlay) => [overlay.id, overlay]));
  const overlays = timeline.clips
    .filter((clip) => clip.kind === 'overlay' && clip.overlayId)
    .map((clip) => {
      const overlay = overlaysById.get(clip.overlayId as string);
      if (!overlay) throw new Error(`Accepted overlay ${clip.overlayId} is missing from the revision.`);
      if (overlay.kind !== 'text') {
        throw new Error('The local Motion Studio preview currently supports text overlays only.');
      }
      if (!overlay.text?.trim()) {
        throw new Error(`Accepted text overlay ${overlay.id} has no visible text.`);
      }
      return {
        id: overlay.id,
        kind: overlay.kind,
        text: overlay.text,
        startUs: clip.startUs,
        endUs: clip.endUs
      };
    });

  return {
    schema: ATLAS_REMOTION_PREVIEW_PLAN_SCHEMA,
    adapter: 'motion-studio',
    compositionId: 'AtlasTranscriptOverlays',
    revisionId: revision.id,
    media: {
      durationUs: timeline.durationUs,
      width: source.media.width,
      height: source.media.height
    },
    overlays
  };
}
