import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
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
const pianoRoot = join(packageRoot, 'public/audio/workflow-reel/instruments/vcsl-upright-knight');
const pianoManifestPath = join(pianoRoot, 'manifest.json');
const pianoReadmePath = join(pianoRoot, 'README.md');
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
    errors.push('Workflow score generator contains nondeterministic time or randomness');
  }
  for (const productFilmVoice of [
    'addWarmPad',
    'addSampledPianoNote',
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
  for (const pianoDetail of ['loadPianoSample', 'pcm_f32le', 'CC0-1.0']) {
    if (!musicGeneratorSource.includes(pianoDetail)) {
      errors.push(`Workflow sampled-piano path does not contain ${pianoDetail}`);
    }
  }
  if (musicGeneratorSource.includes('addFeltPianoNote')) {
    errors.push('Workflow score still contains the superseded procedural felt-piano voice');
  }
  if (/https?:\/\//.test(musicGeneratorSource)) {
    errors.push('Workflow score generator must not fetch piano samples over the network');
  }
  if (!/spatial texture/i.test(musicGeneratorSource)) {
    errors.push('Workflow score generator does not declare its restrained spatial texture');
  }
}

for (const [label, path] of [
  ['VCSL piano manifest', pianoManifestPath],
  ['VCSL piano provenance README', pianoReadmePath]
] as const) {
  if (!existsSync(path)) errors.push(`Missing ${label}: ${path}`);
}

if (existsSync(pianoManifestPath)) {
  type ManifestFile = { localPath: string; sha256: string };
  type ManifestRegion = {
    keyCenter: number;
    keyRange: [number, number];
    sustain: ManifestFile;
    release: ManifestFile;
  };
  type PianoManifest = {
    license: { spdx: string; sourcePage: string };
    source: { archiveUrl: string; archiveSha256: string; instrument: string };
    selection: { requiredMidiNotes: number[] };
    regions: ManifestRegion[];
  };

  const manifest = JSON.parse(readFileSync(pianoManifestPath, 'utf8')) as PianoManifest;
  if (manifest.license.spdx !== 'CC0-1.0') {
    errors.push(`Workflow piano license must be CC0-1.0, received ${manifest.license.spdx}`);
  }
  if (manifest.license.sourcePage !== 'https://versilian-studios.com/vcsl-keys/') {
    errors.push('Workflow piano manifest must cite the official VCSL Keys source page');
  }
  if (manifest.source.archiveUrl !== 'https://versilian-studios.com/Distro/VCSL_Keys.zip') {
    errors.push('Workflow piano manifest must cite the official VCSL Keys archive');
  }
  if (!/^[a-f0-9]{64}$/.test(manifest.source.archiveSha256)) {
    errors.push('Workflow piano manifest must record the source archive SHA-256');
  }
  if (manifest.source.instrument !== 'Upright Piano, Knight') {
    errors.push(`Unexpected workflow piano instrument: ${manifest.source.instrument}`);
  }

  const requiredNotes = [57, 59, 62, 64, 66, 69, 74];
  if (manifest.selection.requiredMidiNotes.join(',') !== requiredNotes.join(',')) {
    errors.push('Workflow piano required-note set has drifted from the score');
  }
  for (const note of requiredNotes) {
    const region = manifest.regions.find(
      ({ keyRange }) => note >= keyRange[0] && note <= keyRange[1]
    );
    if (!region) errors.push(`Workflow piano manifest does not cover MIDI note ${note}`);
    if (region && Math.abs(note - region.keyCenter) > 1) {
      errors.push(`Workflow piano MIDI note ${note} requires more than a one-semitone shift`);
    }
  }

  const manifestedFiles = new Set<string>();
  let subsetBytes = 0;
  for (const region of manifest.regions) {
    for (const file of [region.sustain, region.release]) {
      if (file.localPath.startsWith('/') || file.localPath.includes('..')) {
        errors.push(`Unsafe workflow piano path: ${file.localPath}`);
        continue;
      }
      if (manifestedFiles.has(file.localPath)) {
        errors.push(`Duplicate workflow piano sample mapping: ${file.localPath}`);
      }
      manifestedFiles.add(file.localPath);
      const path = join(pianoRoot, file.localPath);
      if (!existsSync(path)) {
        errors.push(`Missing workflow piano sample: ${path}`);
        continue;
      }
      const data = readFileSync(path);
      subsetBytes += statSync(path).size;
      const hash = createHash('sha256').update(data).digest('hex');
      if (hash !== file.sha256) {
        errors.push(`Workflow piano sample hash mismatch: ${file.localPath}`);
      }
    }
  }

  const actualFiles = ['sustains', 'releases'].flatMap((folder) =>
    readdirSync(join(pianoRoot, folder))
      .filter((name) => name.endsWith('.flac'))
      .map((name) => `${folder}/${name}`)
  );
  for (const path of actualFiles) {
    if (!manifestedFiles.has(path)) errors.push(`Unmanifested workflow piano sample: ${path}`);
  }
  if (actualFiles.length !== manifestedFiles.size || manifestedFiles.size !== 14) {
    errors.push(
      `Workflow piano subset must contain 14 exact samples; found ${actualFiles.length} files and ${manifestedFiles.size} mappings`
    );
  }
  if (subsetBytes >= 20 * 1024 * 1024) {
    errors.push(`Workflow piano subset is too large: ${subsetBytes} bytes`);
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
