export const GROUND_WALKTHROUGH_FPS = 30;
export const GROUND_WALKTHROUGH_DURATION = 5490;

export const groundWalkthroughScenes = {
  opening: { from: 0, duration: 360 },
  install: { from: 360, duration: 450 },
  agentSetup: { from: 810, duration: 510 },
  agentGuidance: { from: 1320, duration: 840 },
  mechanics: { from: 2160, duration: 900 },
  claim: { from: 3060, duration: 900 },
  rust: { from: 3960, duration: 810 },
  receipt: { from: 4770, duration: 510 },
  close: { from: 5280, duration: 210 },
} as const;

export const GROUND_OPERATOR_WALKTHROUGH_CONFIG = {
  id: 'GroundOperatorWalkthrough',
  durationInFrames: GROUND_WALKTHROUGH_DURATION,
  fps: GROUND_WALKTHROUGH_FPS,
  width: 1920,
  height: 1080,
  defaultProps: { voiceoverPath: '' },
} as const;
