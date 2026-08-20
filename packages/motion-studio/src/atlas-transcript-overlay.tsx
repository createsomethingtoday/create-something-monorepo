import React from 'react';
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from 'remotion';
import { z } from 'zod';

export const ATLAS_TRANSCRIPT_OVERLAY_COMPOSITION_ID = 'AtlasTranscriptOverlays';
export const ATLAS_TRANSCRIPT_OVERLAY_FPS = 30;

export type AcceptedTranscriptOverlayInput = {
  revisionId: string;
  media: {
    durationUs: number;
    width: number;
    height: number;
  };
  overlays: Array<{
    id: string;
    kind: 'text' | 'image' | 'video' | 'audio';
    startUs: number;
    endUs: number;
    text?: string;
  }>;
};

export type AtlasTranscriptOverlayProps = {
  revisionId: string;
  durationInFrames: number;
  overlays: Array<{
    id: string;
    text: string;
    fromFrame: number;
    durationInFrames: number;
  }>;
};

export const AtlasTranscriptOverlaySchema = z.object({
  revisionId: z.string().min(1),
  durationInFrames: z.number().int().positive(),
  overlays: z.array(
    z.object({
      id: z.string().min(1),
      text: z.string().min(1),
      fromFrame: z.number().int().nonnegative(),
      durationInFrames: z.number().int().positive()
    })
  )
});

const microsecondsToFrameStart = (microseconds: number): number =>
  Math.floor((microseconds * ATLAS_TRANSCRIPT_OVERLAY_FPS) / 1_000_000);

const microsecondsToFrameEnd = (microseconds: number): number =>
  Math.ceil((microseconds * ATLAS_TRANSCRIPT_OVERLAY_FPS) / 1_000_000);

export const createAtlasTranscriptOverlayProps = (
  input: AcceptedTranscriptOverlayInput
): AtlasTranscriptOverlayProps => {
  if (!input.revisionId.trim()) {
    throw new Error('An accepted revision ID is required for an Atlas overlay render.');
  }

  if (!Number.isInteger(input.media.durationUs) || input.media.durationUs <= 0) {
    throw new Error('Media duration must be a positive integer in microseconds.');
  }

  if (!Number.isInteger(input.media.width) || input.media.width <= 0 || !Number.isInteger(input.media.height) || input.media.height <= 0) {
    throw new Error('Media dimensions must be positive integers.');
  }

  const seenOverlayIds = new Set<string>();
  const overlays = input.overlays.map((overlay) => {
    if (overlay.kind !== 'text') {
      throw new Error('Atlas transcript overlay rendering currently supports text overlays only.');
    }

    if (!overlay.id.trim() || seenOverlayIds.has(overlay.id)) {
      throw new Error('Each Atlas text overlay needs a unique non-empty ID.');
    }
    seenOverlayIds.add(overlay.id);

    if (!overlay.text?.trim()) {
      throw new Error(`Text overlay ${overlay.id} needs visible text.`);
    }

    if (
      !Number.isInteger(overlay.startUs) ||
      !Number.isInteger(overlay.endUs) ||
      overlay.startUs < 0 ||
      overlay.endUs <= overlay.startUs ||
      overlay.endUs > input.media.durationUs
    ) {
      throw new Error(`Text overlay ${overlay.id} must stay within media duration.`);
    }

    const fromFrame = microsecondsToFrameStart(overlay.startUs);
    const endFrame = microsecondsToFrameEnd(overlay.endUs);
    return {
      id: overlay.id,
      text: overlay.text,
      fromFrame,
      durationInFrames: Math.max(1, endFrame - fromFrame)
    };
  });

  return {
    revisionId: input.revisionId,
    durationInFrames: microsecondsToFrameEnd(input.media.durationUs),
    overlays
  };
};

const TranscriptTextOverlay: React.FC<AtlasTranscriptOverlayProps['overlays'][number]> = ({
  durationInFrames,
  text
}) => {
  const frame = useCurrentFrame();
  const fadeFrames = Math.min(8, Math.max(1, Math.floor(durationInFrames / 3)));
  const opacity = interpolate(
    frame,
    [0, fadeFrames, Math.max(fadeFrames, durationInFrames - fadeFrames), durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <div
      style={{
        position: 'absolute',
        left: '8%',
        right: '8%',
        bottom: '10%',
        opacity,
        color: '#f7f5ef',
        fontFamily: 'Arial, sans-serif',
        fontSize: 72,
        fontWeight: 700,
        letterSpacing: '-0.04em',
        lineHeight: 1.04,
        textShadow: '0 3px 18px rgba(0, 0, 0, 0.7)'
      }}
    >
      {text}
    </div>
  );
};

/**
 * Deterministic proof composition for accepted Atlas transcript overlays.
 * It intentionally has no media source or provider dependency. A future media
 * composition may place this component over a locally-rendered source timeline.
 */
export const AtlasTranscriptOverlay: React.FC<AtlasTranscriptOverlayProps> = ({
  revisionId,
  overlays
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#12151a' }}>
      <div
        style={{
          position: 'absolute',
          top: 54,
          left: 64,
          color: '#a6b5c7',
          fontFamily: 'Arial, sans-serif',
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase'
        }}
      >
        Accepted local revision · {revisionId}
      </div>
      {overlays.map((overlay) => (
        <Sequence
          key={overlay.id}
          from={overlay.fromFrame}
          durationInFrames={overlay.durationInFrames}
          premountFor={ATLAS_TRANSCRIPT_OVERLAY_FPS}
        >
          <TranscriptTextOverlay {...overlay} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
