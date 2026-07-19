import type {
  MotionScene,
  VideoProbe,
  VideoVerificationReceipt,
} from './types.js';

type VerificationScene = Pick<MotionScene, 'id' | 'format'>;

function parseRate(rate: string | undefined): number {
  if (!rate) return 0;
  const [numerator, denominator] = rate.split('/').map(Number);
  return denominator ? numerator / denominator : 0;
}

export function verifyVideoProbe(
  scene: VerificationScene,
  probe: VideoProbe,
  videoPath: string
): VideoVerificationReceipt {
  const streams = probe.streams ?? [];
  const video = streams.find((stream) => stream.codec_type === 'video');
  const duration = Number(probe.format?.duration ?? 0);
  const expectedFrames = scene.format.deliveryDurationSeconds * scene.format.deliveryFps;
  const checks = {
    duration: Math.abs(duration - scene.format.deliveryDurationSeconds) <= 0.001,
    dimensions:
      video?.width === scene.format.width && video?.height === scene.format.height,
    frameRate: Math.abs(parseRate(video?.r_frame_rate) - scene.format.deliveryFps) <= 0.001,
    frameCount: Number(video?.nb_frames ?? 0) === expectedFrames,
    audio: streams.some((stream) => stream.codec_type === 'audio'),
    noSubtitleStream: !streams.some((stream) => stream.codec_type === 'subtitle'),
  };

  return {
    sceneId: scene.id,
    videoPath,
    valid: Object.values(checks).every(Boolean),
    checks,
  };
}
