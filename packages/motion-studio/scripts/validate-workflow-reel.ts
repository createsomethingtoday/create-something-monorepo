import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type ReelScene = {
  start: number;
  duration: number;
  caption: string;
};

type WorkflowReelSpec = {
  compositionId: string;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  safeArea: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  scenes: Record<string, ReelScene>;
  closingPromise: string;
  callToAction: string;
  music: {
    asset: string;
    character: string;
    bpm: number;
    beatFrames: number;
    hitFrames: Record<string, number>;
  };
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '..');
const reelRoot = join(packageRoot, 'src/commercials/workflow-reel');
const specPath = join(reelRoot, 'spec.ts');
const compositionPath = join(reelRoot, 'WorkflowReel.tsx');
const performancePath = join(reelRoot, 'performance.ts');
const musicGeneratorPath = join(packageRoot, 'scripts/generate-workflow-score.ts');
const rootPath = join(packageRoot, 'src/Root.tsx');

const errors: string[] = [];

for (const [label, path] of [
  ['workflow reel spec', specPath],
  ['workflow reel composition', compositionPath],
  ['Performance token projection', performancePath],
  ['workflow score generator', musicGeneratorPath]
] as const) {
  if (!existsSync(path)) errors.push(`Missing ${label}: ${path}`);
}

if (existsSync(musicGeneratorPath)) {
  const musicGeneratorSource = readFileSync(musicGeneratorPath, 'utf8');
  if (/Math\.random\(|Date\.now\(|new Date\(/.test(musicGeneratorSource)) {
    errors.push('Workflow jazz generator contains nondeterministic time or randomness');
  }
  for (const productFilmVoice of [
    'addWarmPad',
    'addFeltPianoNote',
    'addSoftPulse',
    'addGlassNote'
  ]) {
    if (!musicGeneratorSource.includes(productFilmVoice)) {
      errors.push(`Workflow score generator does not contain ${productFilmVoice}`);
    }
  }
  if (!musicGeneratorSource.includes('originalClarityMotif')) {
    errors.push('Workflow score generator does not declare its original clarity motif');
  }
  if (!/spatial texture/i.test(musicGeneratorSource)) {
    errors.push('Workflow score generator does not declare its restrained spatial texture');
  }
}

if (existsSync(rootPath)) {
  const rootSource = readFileSync(rootPath, 'utf8');
  if (!rootSource.includes('id="CreateSomethingWorkflowReel"')) {
    errors.push('Root.tsx does not register CreateSomethingWorkflowReel');
  }
}

if (existsSync(compositionPath)) {
  const compositionSource = readFileSync(compositionPath, 'utf8');
  if (/Math\.random\(|Date\.now\(|new Date\(/.test(compositionSource)) {
    errors.push('Workflow reel composition contains nondeterministic time or randomness');
  }
  if (!compositionSource.includes('WORKFLOW_REEL_SPEC.music.asset')) {
    errors.push('Workflow reel composition does not load its score from the timing contract');
  }
  if (!compositionSource.includes('ProductFilmAccent')) {
    errors.push(
      'Workflow reel composition does not contain score-synchronized product-film accents'
    );
  }
}

if (existsSync(performancePath)) {
  const performanceSource = readFileSync(performancePath, 'utf8');
  const requiredTokenNames = [
    '--color-performance-paper',
    '--color-performance-ink',
    '--color-performance-signal',
    '--color-performance-pressure',
    '--color-performance-growth',
    '--color-performance-risk'
  ];
  for (const tokenName of requiredTokenNames) {
    if (!performanceSource.includes(tokenName)) {
      errors.push(`Performance projection does not declare canonical token ${tokenName}`);
    }
  }
}

if (existsSync(specPath)) {
  const imported = await import(pathToFileURL(specPath).href);
  const spec = imported.WORKFLOW_REEL_SPEC as WorkflowReelSpec | undefined;
  if (!spec) {
    errors.push('spec.ts does not export WORKFLOW_REEL_SPEC');
  } else {
    if (spec.compositionId !== 'CreateSomethingWorkflowReel') {
      errors.push(`Unexpected composition id: ${spec.compositionId}`);
    }
    if (spec.fps !== 30 || spec.width !== 1080 || spec.height !== 1920) {
      errors.push(
        `Expected 1080x1920 at 30 fps, received ${spec.width}x${spec.height} at ${spec.fps} fps`
      );
    }
    if (spec.durationInFrames !== 900) {
      errors.push(`Expected 900 frames, received ${spec.durationInFrames}`);
    }

    const scenes = Object.entries(spec.scenes).sort(
      (left, right) => left[1].start - right[1].start
    );
    let expectedStart = 0;
    for (const [name, scene] of scenes) {
      if (scene.start !== expectedStart) {
        errors.push(`${name} starts at ${scene.start}; expected contiguous start ${expectedStart}`);
      }
      if (scene.duration <= 0) errors.push(`${name} must have a positive duration`);
      if (!scene.caption.trim()) errors.push(`${name} must include sound-off narration`);
      expectedStart = scene.start + scene.duration;
    }
    if (expectedStart !== spec.durationInFrames) {
      errors.push(`Scene timeline ends at ${expectedStart}; expected ${spec.durationInFrames}`);
    }

    if (
      spec.safeArea.top < 120 ||
      spec.safeArea.right < 72 ||
      spec.safeArea.bottom < 220 ||
      spec.safeArea.left < 72
    ) {
      errors.push('Social safe area is smaller than the reel contract minimum');
    }
    if (spec.closingPromise !== 'Less chasing. Clear decisions. Proof that work moved.') {
      errors.push('Closing promise has drifted from the approved story contract');
    }
    if (spec.callToAction !== 'Map one workflow.') {
      errors.push('Call to action has drifted from the approved story contract');
    }

    if (!spec.music) {
      errors.push('Workflow reel spec does not define a music timing contract');
    } else {
      const calculatedBeatFrames = Math.round((60 / spec.music.bpm) * spec.fps);
      if (spec.music.bpm !== 120 || spec.music.beatFrames !== calculatedBeatFrames) {
        errors.push('Workflow score must use the approved 120 BPM / 15-frame beat grid');
      }
      if (spec.music.character !== 'minimal product-film score') {
        errors.push('Workflow score must preserve the approved minimal product-film direction');
      }

      const sceneStarts = Object.values(spec.scenes).map((scene) => scene.start);
      const hitFrames = Object.values(spec.music.hitFrames);
      for (const frame of [...sceneStarts, ...hitFrames]) {
        if (frame % spec.music.beatFrames !== 0) {
          errors.push(
            `Music hit at frame ${frame} falls outside the ${spec.music.beatFrames}-frame beat grid`
          );
        }
      }

      const expectedHits = {
        signal: spec.scenes.signal.start,
        scatter: spec.scenes.scatter.start,
        map: spec.scenes.map.start,
        decision: spec.scenes.decision.start,
        approval: spec.scenes.decision.start + 90,
        proof: spec.scenes.proof.start,
        receipt: spec.scenes.proof.start + 60,
        close: spec.scenes.close.start,
        cta: spec.scenes.close.start + 60
      };
      for (const [name, expectedFrame] of Object.entries(expectedHits)) {
        if (spec.music.hitFrames[name] !== expectedFrame) {
          errors.push(
            `${name} music hit is frame ${spec.music.hitFrames[name]}; expected ${expectedFrame}`
          );
        }
      }

      const musicPath = join(packageRoot, 'public', spec.music.asset);
      if (!existsSync(musicPath)) {
        errors.push(`Missing workflow score: ${musicPath}`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error('workflow reel validation failed:\n');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  'workflow reel validation passed: 1080x1920, 900 frames, deterministic, sound-off safe'
);
