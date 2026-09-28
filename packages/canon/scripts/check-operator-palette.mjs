import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Dependency-free contract/contrast gate for the separately scoped palette.
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const css = read('src/lib/styles/operator.css');
const artifact = JSON.parse(read('src/lib/styles/operator.tokens.json'));
const pkg = JSON.parse(read('package.json'));
const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '').trim();
assert.equal(artifact.version, 1);
assert.equal(artifact.selector, '[data-canon-palette="operator"]');
assert.equal(artifact.source, 'operator.css');
assert.equal(stripped.split('{').length, 2, 'Only the opt-in selector may emit tokens');
assert.ok(stripped.startsWith(`${artifact.selector} {`));
assert.ok(stripped.endsWith('}'));
const declarations = [...stripped.matchAll(/(--[\w-]+):\s*([^;]+);/g)];
assert.equal(declarations.length, 28);
assert.equal(new Set(declarations.map((m) => m[1])).size, 28);
assert.deepEqual(Object.fromEntries(declarations.map((m) => [m[1], m[2]])), artifact.tokens);
assert.equal(stripped.slice(stripped.indexOf('{') + 1, -1).replace(/--[\w-]+:\s*[^;]+;/g, '').trim(), '');
for (const name of Object.keys(artifact.tokens)) assert.match(name, /^--(?:color|radius)-operator-/);
for (const name of ['operator.css', 'operator.tokens.json']) {
  assert.equal(pkg.exports[`./styles/${name}`], `./dist/styles/${name}`);
}
assert.ok(!read('src/lib/styles/canon.css').includes('operator.css'), 'Full Canon must not auto-import palette');
const token = (name) => artifact.tokens[`--color-operator-${name}`];
const expected = {
  background: 'oklch(20.5% 0 0)', panel: 'oklch(20.5% 0 0)',
  secondary: 'oklch(26.9% 0 0)', raised: 'oklch(32% 0 0)', hover: 'oklch(32% 0 0)',
  foreground: 'oklch(98.5% 0 0)', muted: 'oklch(70.8% 0 0)',
  border: 'oklch(100% 0 0 / .1)', 'input-border': 'oklch(100% 0 0 / .15)',
  'focus-ring': 'oklch(55.6% 0 0)',
  'status-running': '#2563eb', 'status-review': '#7c3aed', 'status-done': '#22c55e',
  'status-blocked': '#dc2626', 'status-paused': '#f59e0b'
};
for (const [name, value] of Object.entries(expected)) assert.equal(token(name), value);
assert.equal(artifact.tokens['--radius-operator-control'], '6px');
assert.equal(artifact.tokens['--radius-operator-panel'], '10px');

// Neutral OKLCH has linear sRGB luminance L^3. Hex values use WCAG sRGB transfer.
function luminance(value) {
  const neutral = /^oklch\(([\d.]+)% 0 0\)$/.exec(value);
  if (neutral) return (Number(neutral[1]) / 100) ** 3;
  assert.match(value, /^#[\da-f]{6}$/i, 'Contrast pairs must be opaque supported colors');
  const rgb = value.slice(1).match(/../g).map((hex) => parseInt(hex, 16) / 255);
  const linear = rgb.map((c) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return linear.reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
}
function contrast(a, b) {
  const values = [luminance(token(a)), luminance(token(b))].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
for (const surface of ['background', 'panel', 'secondary', 'raised', 'hover']) {
  for (const text of ['foreground', 'muted', ...['running', 'review', 'done', 'blocked', 'paused'].map((s) => `status-${s}-text`)]) {
    assert.ok(contrast(text, surface) >= 4.5, `${text} on ${surface} must meet 4.5:1`);
  }
  assert.ok(contrast('focus-ring-accessible', surface) >= 3, `Focus on ${surface} must meet 3:1`);
}
for (const status of ['running', 'review', 'done', 'blocked', 'paused']) {
  const ratio = contrast(`status-${status}-on`, `status-${status}`);
  assert.ok(ratio >= 4.5, `${status} filled badge text must meet 4.5:1`);
  console.log(`${status}: label on raised ${contrast(`status-${status}-text`, 'raised').toFixed(2)}:1; filled badge ${ratio.toFixed(2)}:1`);
}
console.log(`Foreground / muted on raised: ${contrast('foreground', 'raised').toFixed(2)} / ${contrast('muted', 'raised').toFixed(2)}:1`);
console.log(`Reference focus / accessible focus on raised: ${contrast('focus-ring', 'raised').toFixed(2)} / ${contrast('focus-ring-accessible', 'raised').toFixed(2)}:1`);
console.log('PASS: 28 scoped tokens, CSS/JSON parity, exact references, exports and contrast');
