// Snapshot the approved engine; source checkout is read only. No face geometry lives here.
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
const source = process.argv[2];
if (!source) throw new Error('Pass the canon-animation/studies/ink directory');
const { drawFaceOverlay } = await import(pathToFileURL(`${source}/face-render.mjs`));
const output = new URL('../../static/images/canon-eye-study/', import.meta.url);
await mkdir(output, { recursive: true });
let bytes = 0;
for (const [name, target] of Object.entries({ left: -0.65, front: 0.5, right: 1 })) {
  for (let phase = 0; phase < 9; phase++) {
    // Four transition frames, then five held-gaze lid poses. Playback reverses these.
    const gaze = phase < 4 ? 0.5 + (target - 0.5) * (phase / 4) : target;
    const wink = phase < 4 ? 0 : (phase - 4) / 4;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="460" height="300" viewBox="0 0 460 300"><g transform="translate(230 179) scale(1.55)">${drawFaceOverlay(0, { gaze, wink, smile: 0.35, sketchPhase: 0, feltPortraitStudy: true })}</g></svg>`;
    const buffer = await sharp(Buffer.from(svg)).webp({ quality: 88 }).toBuffer();
    bytes += buffer.length;
    await writeFile(new URL(`${name}-${phase}.webp`, output), buffer);
  }
}
await writeFile(
  new URL('provenance.json', output),
  JSON.stringify(
    {
      source: 'packages/canon-animation/studies/ink/face-render.mjs + felt-head.mjs',
      renderer: 'r68 stitched felt',
      generated: '2026-11-24',
      poses: 27,
      bytes,
      notes:
        'Unmodified engine output; fixed material/sketch phase. feltPortraitStudy:true selects stitched felt; gaze and wink channels only. Rebuild with scripts/canon-eye-study/build.mjs <engine studies/ink directory>.'
    },
    null,
    2
  )
);
console.log({ poses: 27, bytes });
