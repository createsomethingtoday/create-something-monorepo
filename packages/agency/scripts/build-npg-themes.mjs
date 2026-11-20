import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
// Compile the scoped Neutral descendants before bundling so first paint and CI
// use exactly the same tokens as local development.
execFileSync(
  fileURLToPath(new URL('../node_modules/.bin/astryx', import.meta.url)),
  ['theme', 'build', 'src/lib/npg/astryx/npgTheme.ts', 'src/lib/npg/astryx/npgComposerTheme.ts'],
  { cwd: root, stdio: 'inherit' }
);
