import { spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export async function prepareMapPreview(resources) {
  if (process.platform !== 'darwin') throw new Error('GiGi map previews require macOS.');
  await mkdir(resources, { recursive: true });
  const output = join(resources, 'gigi-map-preview');
  const result = spawnSync('xcrun', ['swiftc', '-swift-version', '5', '-O', '-target', 'arm64-apple-macosx13.0', join(app, 'src-tauri/native/MapPreview.swift'), '-o', output], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error('Could not compile the macOS map preview helper.');
  return output;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await prepareMapPreview(resolve(process.argv[2] || join(app, 'src-tauri/resources')));
