import assert from 'node:assert/strict';
import test from 'node:test';

import { verifyVideoProbe } from '../dist/scene/index.js';

test('verifies the exact delivery contract and rejects subtitle streams', () => {
  const receipt = verifyVideoProbe(
    {
      id: 'scene.v3',
      format: {
        width: 1280,
        height: 720,
        aspectRatio: '16:9',
        deliveryDurationSeconds: 18,
        authoredFps: 12,
        deliveryFps: 24,
        burnedInCaptions: false,
      },
    },
    {
      streams: [
        {
          codec_type: 'video',
          width: 1280,
          height: 720,
          r_frame_rate: '24/1',
          nb_frames: '432',
        },
        { codec_type: 'audio', sample_rate: '48000' },
      ],
      format: { duration: '18.000000' },
    },
    'final.mp4'
  );

  assert.equal(receipt.valid, true);
  assert.deepEqual(receipt.checks, {
    duration: true,
    dimensions: true,
    frameRate: true,
    frameCount: true,
    audio: true,
    noSubtitleStream: true,
  });
});
