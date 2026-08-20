import assert from 'node:assert/strict';
import test from 'node:test';

import { createAtlasTranscriptOverlayProps } from '../src/atlas-transcript-overlay';

test('creates deterministic Remotion props from an accepted local text-overlay revision', () => {
  assert.deepEqual(
    createAtlasTranscriptOverlayProps({
      revisionId: 'revision-2',
      media: { durationUs: 2_500_000, width: 1920, height: 1080 },
      overlays: [
        {
          id: 'title-overlay',
          kind: 'text',
          text: 'Local-first edit',
          startUs: 0,
          endUs: 1_500_000
        }
      ]
    }),
    {
      revisionId: 'revision-2',
      durationInFrames: 75,
      overlays: [
        {
          id: 'title-overlay',
          text: 'Local-first edit',
          fromFrame: 0,
          durationInFrames: 45
        }
      ]
    }
  );
});

test('rejects non-text and out-of-range overlay input before render props are created', () => {
  assert.throws(
    () =>
      createAtlasTranscriptOverlayProps({
        revisionId: 'revision-2',
        media: { durationUs: 1_000_000, width: 1920, height: 1080 },
        overlays: [
          { id: 'image-overlay', kind: 'image', startUs: 0, endUs: 500_000 }
        ]
      }),
    /text overlays/i
  );

  assert.throws(
    () =>
      createAtlasTranscriptOverlayProps({
        revisionId: 'revision-2',
        media: { durationUs: 1_000_000, width: 1920, height: 1080 },
        overlays: [
          { id: 'bad-range', kind: 'text', text: 'Too late', startUs: 900_000, endUs: 1_200_000 }
        ]
      }),
    /within media duration/i
  );
});
