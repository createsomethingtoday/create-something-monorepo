import path from 'node:path';

const MAX_DEPTH = 12;
const genericCollections = new Set(['data', 'items', 'records', 'results', 'entries', 'nodes', 'edges']);
const explicitFields = new Set(['type', '@type', 'entityType', 'entity_type', 'entity-type']);
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const normalize = (value) => String(value).replace(/([a-z\d])([A-Z])/g, '$1-$2').trim().toLowerCase()
  .replace(/[^a-z\d]+/g, '-').replace(/^-|-$/g, '');
const singular = (value) => {
  const irregular = { people: 'person', companies: 'company', entities: 'entity', children: 'child' };
  if (Object.hasOwn(irregular, value)) return irregular[value];
  if (/ies$/.test(value)) return value.slice(0, -3) + 'y';
  if (/(ches|shes|sses|xes|zes)$/.test(value)) return value.slice(0, -2);
  return /s$/.test(value) && !/(ss|us|is)$/.test(value) ? value.slice(0, -1) : value;
};
const excerpt = (value) => value.length > 280 ? `${value.slice(0, 277)}...` : value;
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Discover candidate vocabulary from local source evidence; this does not approve a type. */
export function discoverTypes(filename, content) {
  if (typeof filename !== 'string' || typeof content !== 'string') throw new TypeError('filename and content must be strings');
  const found = new Map();
  const add = (label, evidence, collection = false) => {
    let name = normalize(label);
    if (collection) name = singular(name);
    if (!name || name.length > 80 || !/^[a-z]/.test(name) || name.split('-').length > 6) return;
    if (!found.has(name)) found.set(name, { name, evidence: `${filename}: ${excerpt(evidence)}` });
  };
  let parsed;
  let isJson = false;
  try { parsed = JSON.parse(content); isJson = true; } catch (error) {
    if (path.extname(filename).toLowerCase() === '.json') throw new Error(`Invalid JSON in ${filename}: ${error.message}`);
  }
  if (isJson) {
    const visit = (value, location, depth, collectionName) => {
      if (depth > MAX_DEPTH) return;
      if (Array.isArray(value)) {
        const sample = value.find(object);
        if (sample && collectionName && !genericCollections.has(normalize(collectionName))) {
          add(collectionName, `${location}: ${JSON.stringify(sample)}`, true);
        }
        for (let i = 0; i < value.length; i++) visit(value[i], `${location}[${i}]`, depth + 1);
      } else if (object(value)) {
        for (const key of Object.keys(value).sort(compare)) {
          const child = value[key];
          if (explicitFields.has(key)) {
            for (const label of Array.isArray(child) ? child : [child]) {
              if (typeof label === 'string') add(label, `${location}.${key}: ${JSON.stringify(label)}`);
            }
          }
          visit(child, `${location}.${key}`, depth + 1, key);
        }
      }
    };
    visit(parsed, '$', 0, path.basename(filename).replace(/\.[^.]+$/, ''));
  } else {
    // Bounded, affirmative definitions only. Avoid consuming following clauses or lines.
    const definition = /(?:^|(?<=[.!?])\s+|\n)[ \t]*(?:[-*][ \t]+)?([A-Z][\p{L}\d &'’_-]{0,79}?)\s+(?:is|are)\s+(?:a|an)\s+([a-zA-Z][a-zA-Z-]*(?:[ \t]+[a-zA-Z][a-zA-Z-]*){0,4})[ \t]*[.!?](?=\s|$)/gu;
    for (const match of content.matchAll(definition)) add(match[2], match[0].trim());
  }
  return [...found.values()].sort((a, b) => compare(a.name, b.name));
}
