import { spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export async function prepareNotifications(resources) {
  if (process.platform !== 'darwin') throw new Error('GiGi notifications require macOS.');
  await mkdir(resources, { recursive: true });
  const output = join(resources, 'libgigi_notifications.dylib');
  const result = spawnSync('xcrun', ['swiftc', '-swift-version', '5', '-O', '-emit-library', '-target', 'arm64-apple-macosx13.0', '-module-name', 'GiGiNotifications', '-Xlinker', '-install_name', '-Xlinker', '@rpath/libgigi_notifications.dylib', join(app, 'src-tauri/native/Notifications.swift'), '-o', output], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error('Could not compile the macOS notification bridge.');
  return output;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await prepareNotifications(resolve(process.argv[2] || join(app, 'src-tauri/resources')));
