import { readFileSync, writeFileSync } from 'node:fs';
// This source deliberately uses the CSS-compatible subset of Sass. No runtime
// compiler or external assets are needed. Sass 1.93.2 also validates the source.
const source = new URL('../src/lib/server/gigi-landing.scss', import.meta.url);
const target = new URL('../src/lib/server/gigi-landing-styles.ts', import.meta.url);
const generated = '// Generated from gigi-landing.scss. Run node scripts/build-gigi-landing-styles.mjs.\nexport const gigiLandingStyles = ' + JSON.stringify(readFileSync(source, 'utf8')) + ';\n';
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== generated) throw new Error('GiGi landing styles are stale. Run node scripts/build-gigi-landing-styles.mjs.');
} else writeFileSync(target, generated);
