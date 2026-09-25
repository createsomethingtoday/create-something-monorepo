import { readFileSync } from 'node:fs';
const schema = JSON.parse(readFileSync(new URL('./assignment.schema.json', import.meta.url), 'utf8'));

// Implements only the vocabulary used by this bundled schema. Unknown keywords
// reject so a future schema extension cannot silently weaken validation.
const supported = new Set(['$schema', '$id', 'title', 'type', 'const', 'required', 'additionalProperties', 'properties', 'minLength', 'pattern', 'minItems', 'uniqueItems', 'items']);
export function validateAssignmentSchema(value) {
 function visit(rule, input, path) {
  const fail = message => { throw new Error(`Assignment schema ${path}: ${message}`); };
  for (const key of Object.keys(rule)) if (!supported.has(key)) fail(`unsupported keyword ${key}`);
  if ('const' in rule && input !== rule.const) fail('unexpected constant');
  if (rule.type === 'object') {
   if (input === null || typeof input !== 'object' || Array.isArray(input)) fail('object required');
   for (const key of rule.required ?? []) if (!Object.hasOwn(input, key)) fail(`${key} required`);
   for (const key of Object.keys(input)) {
    if (!Object.hasOwn(rule.properties ?? {}, key)) { if (rule.additionalProperties === false) fail(`unknown property ${key}`); }
    else visit(rule.properties[key], input[key], `${path}.${key}`);
   }
  } else if (rule.type === 'array') {
   if (!Array.isArray(input) || input.length < (rule.minItems ?? 0)) fail('nonempty array required');
   if (rule.uniqueItems && new Set(input.map(x => JSON.stringify(x))).size !== input.length) fail('duplicate items');
   input.forEach((item, index) => visit(rule.items, item, `${path}[${index}]`));
  } else if (rule.type === 'string') {
   if (typeof input !== 'string' || input.length < (rule.minLength ?? 0)) fail('string required');
   if (rule.pattern && !new RegExp(rule.pattern).test(input)) fail('pattern mismatch');
  } else if (rule.type !== undefined) fail('unsupported type');
 }
 visit(schema, value, '$');
 return value;
}
