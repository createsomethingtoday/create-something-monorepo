export function canonicalToolName(value) {
  if (typeof value !== 'string') throw new TypeError('tool name must be a string');

  const canonical = value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '-');

  if (canonical.length === 0) throw new RangeError('tool name must not be empty');
  if (canonical.length > 48) throw new RangeError('tool name exceeds 48 characters');
  if (!/^[a-z][a-z0-9-]*$/.test(canonical)) {
    throw new RangeError('tool name has an invalid shape');
  }

  return canonical;
}
