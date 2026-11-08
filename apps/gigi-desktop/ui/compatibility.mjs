// Astryx documents light-dark and anchor positioning as capability boundaries.
// Controls use modal sheets when anchors are unavailable. Resolve theme colors
// explicitly on older WebKit while keeping Astryx's own semantic token values.
export function resolveMode(value, mode = 'dark') {
  if (Array.isArray(value)) return String(value[mode === 'dark' ? 1 : 0]);
  if (typeof value !== 'string' || !value.startsWith('light-dark(')) return value;
  const inner = value.slice(11, -1);
  let depth = 0,
    split = -1;
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === '(') depth++;
    else if (inner[i] === ')') depth--;
    else if (inner[i] === ',' && depth === 0) {
      split = i;
      break;
    }
  }
  if (split < 0) return value;
  return (mode === 'dark' ? inner.slice(split + 1) : inner.slice(0, split)).trim();
}
let previous = [];
export function installCompatibility(theme, mode) {
  if (globalThis.CSS?.supports?.('color', 'light-dark(#000, #fff)')) return;
  for (const key of previous) document.documentElement.style.removeProperty(key);
  previous = [];
  for (const [key, value] of Object.entries(theme.tokens || {}))
    if (key.startsWith('--')) {
      document.documentElement.style.setProperty(key, resolveMode(value, mode));
      previous.push(key);
    }
  document.documentElement.style.colorScheme = mode;
}
