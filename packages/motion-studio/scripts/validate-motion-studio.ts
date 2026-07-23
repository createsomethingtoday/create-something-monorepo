import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SPEC as GITHUB_HISTORY_SPEC } from '../src/commercials/github-history/spec';
import { SPEC as GROUND_SPEC } from '../src/commercials/ground/spec';
import { HUB_ONBOARDING_SPEC } from '../src/commercials/hub-onboarding/spec';
import { SPEC as OUTERFIELDS_SPEC } from '../src/commercials/outerfields/spec';
import { SPEC as SEEING_SPEC } from '../src/commercials/seeing/spec';
import { SOUND_LIBRARY } from '../src/commercials/shared/audio/SoundCues';
import { SPEC as TEND_SPEC } from '../src/commercials/tend/spec';
import { WALKTHROUGH_SPEC } from '../src/commercials/tend-walkthrough/spec';
import { TUFTE_MOBILE_SPEC } from '../src/commercials/tufte-mobile/spec';
import { WORKFLOW_REEL_SPEC } from '../src/commercials/workflow-reel/spec';

type TimedScene = {
  start: number;
  duration: number;
};

type TimedSpec = {
  durationInFrames: number;
  scenes: Record<string, TimedScene>;
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '../public');

const timedSpecs: Array<[string, TimedSpec]> = [
  ['GroundCommercial', GROUND_SPEC],
  ['SeeingCommercial', SEEING_SPEC],
  ['GitHubHistoryCommercial', GITHUB_HISTORY_SPEC],
  ['OuterfieldsCommercial', OUTERFIELDS_SPEC],
  ['TendCommercial', TEND_SPEC],
  ['TendWalkthroughCommercial', WALKTHROUGH_SPEC],
  ['TufteMobileCommercial', TUFTE_MOBILE_SPEC],
  ['HubOnboardingCommercial', HUB_ONBOARDING_SPEC],
  ['CreateSomethingWorkflowReel', WORKFLOW_REEL_SPEC],
];

const requiredAssets = [
  ...Object.values(SOUND_LIBRARY),
  'audio/tend-walkthrough/markers.json',
  'audio/tend-walkthrough/voiceover.json',
  'audio/tend-walkthrough/voiceover.mp3',
  'audio/hub-onboarding/markers.json',
  'audio/hub-onboarding/voiceover.json',
  'audio/hub-onboarding/voiceover.mp3',
  ...OUTERFIELDS_SPEC.videoCards.thumbnails.map((thumbnail) => `thumbnails/${thumbnail}`),
];

const errors: string[] = [];

const uniqueAssets = [...new Set(requiredAssets)];
for (const assetPath of uniqueAssets) {
  const absolutePath = join(PUBLIC_DIR, assetPath);
  if (!existsSync(absolutePath)) {
    errors.push(`Missing public asset: ${assetPath}`);
  }
}

for (const [name, spec] of timedSpecs) {
  const scenes = Object.entries(spec.scenes);
  const sceneEnd = Math.max(...scenes.map(([, scene]) => scene.start + scene.duration));

  if (sceneEnd !== spec.durationInFrames) {
    errors.push(
      `${name} duration mismatch: declared ${spec.durationInFrames} frames, timeline ends at ${sceneEnd}`
    );
  }
}

if (errors.length > 0) {
  console.error('motion-studio validation failed:\n');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  `motion-studio validation passed: ${timedSpecs.length} specs, ${uniqueAssets.length} static assets`
);
