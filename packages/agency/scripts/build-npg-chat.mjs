// Build a complete React document client without importing Astryx CSS into SvelteKit.
import { build } from 'vite';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
await build({ root, configFile: fileURLToPath(new URL('../npg.vite.config.ts', import.meta.url)) });
const manifest = JSON.parse(
  await readFile(new URL('../static/npg-chat/.vite/manifest.json', import.meta.url), 'utf8')
);
const entry = Object.values(manifest).find((item) => item.isEntry);
if (!entry?.file || !entry.css?.length)
  throw new Error('NPG client entry or styles were not built.');
const assets = {
  script: '/npg-chat/' + entry.file,
  styles: entry.css.map((file) => '/npg-chat/' + file)
};
await writeFile(
  new URL('../src/lib/server/npg/astryx-assets.generated.json', import.meta.url),
  JSON.stringify(assets, null, 2) + '\n'
);
console.log('NPG React/Astryx assets built: ' + assets.script);

const notices = [];
for (const name of [
  '@astryxdesign/core',
  '@astryxdesign/theme-neutral',
  '@fontsource-variable/figtree',
  'react',
  'react-dom',
  'lucide-react'
]) {
  notices.push(
    name +
      '\n' +
      (await readFile(
        new URL(
          '../node_modules/' +
            (name === '@astryxdesign/core' ? '@astryxdesign/theme-neutral' : name) +
            '/LICENSE',
          import.meta.url
        ),
        'utf8'
      ))
  );
}
await writeFile(
  new URL('../static/npg-chat/LICENSES.txt', import.meta.url),
  notices.join('\n\n--------------------\n\n')
);
