import { dirname, resolve } from 'node:path';

import { compileScene } from './compile.js';
import type { AssemblyCommand, MotionScene } from './types.js';

export function buildAssemblyCommand(
  scene: MotionScene,
  scenePath: string,
  outputOverride?: string
): AssemblyCommand {
  const plan = compileScene(scene);
  const assembly = scene.assembly;

  if (!assembly) throw new Error('Scene does not define an assembly plan');
  if (assembly.cellOrder.length !== 2) {
    throw new Error('The pilot assembler requires exactly two render cells');
  }

  const orderedCells = assembly.cellOrder.map((cellId) => {
    const cell = plan.cells.find((candidate) => candidate.id === cellId);
    if (!cell) throw new Error(`Assembly references unknown render cell: ${cellId}`);
    return cell;
  });

  const sceneDirectory = dirname(resolve(scenePath));
  const inputPaths = orderedCells.map((cell) => resolve(sceneDirectory, cell.source));
  const outputPath = outputOverride
    ? resolve(outputOverride)
    : resolve(sceneDirectory, assembly.output);
  const transitionDuration = assembly.transition.durationSeconds;
  const transitionOffset = assembly.transition.offsetSeconds;
  const secondCellDuration = Number(
    (
      scene.format.deliveryDurationSeconds -
      orderedCells[0].endSeconds +
      transitionDuration
    ).toFixed(3)
  );
  const padding = assembly.terminalFramePaddingSeconds;
  const filterComplex = [
    '[0:v]fps=24,format=yuv420p[v0]',
    `[1:v]trim=duration=${secondCellDuration},setpts=PTS-STARTPTS,fps=24,tpad=stop_mode=clone:stop_duration=${padding},format=yuv420p[v1]`,
    `[v0][v1]xfade=transition=fade:duration=${transitionDuration}:offset=${transitionOffset},tpad=stop_mode=clone:stop_duration=${padding},fps=${scene.format.authoredFps},fps=${scene.format.deliveryFps}[v]`,
    '[0:a]aresample=48000[a0]',
    `[1:a]atrim=duration=${secondCellDuration},asetpts=PTS-STARTPTS,aresample=48000[a1]`,
    `[a0][a1]acrossfade=d=${transitionDuration}:c1=tri:c2=tri,apad=pad_dur=0.2[a]`,
  ].join(';');
  const args = [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    inputPaths[0],
    '-i',
    inputPaths[1],
    '-filter_complex',
    filterComplex,
    '-map',
    '[v]',
    '-map',
    '[a]',
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '17',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-movflags',
    '+faststart',
    '-t',
    String(scene.format.deliveryDurationSeconds),
    outputPath,
  ];

  return {
    executable: 'ffmpeg',
    args,
    inputPaths,
    outputPath,
    filterComplex,
  };
}
