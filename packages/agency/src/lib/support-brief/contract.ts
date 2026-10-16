/** A preparation artifact, never a support ticket or authorization receipt. */
export const SUPPORT_BRIEF_VERSION = '1.0.0' as const;
export const briefFields = {
  workflow: { label: 'Workflow', maxLength: 200, required: true },
  problem: { label: 'What is happening?', maxLength: 4000, required: true },
  desiredOutcome: { label: 'What should happen?', maxLength: 2000, required: true },
  tools: { label: 'Tools involved', maxLength: 1000, required: false },
  owner: { label: 'Who can decide the next step?', maxLength: 200, required: false },
  constraints: { label: 'Boundaries and constraints', maxLength: 2000, required: false },
  evidence: { label: 'Evidence and source dates', maxLength: 4000, required: false },
  unknowns: { label: 'What is still unknown?', maxLength: 2000, required: false }
} as const;
export type BriefField = keyof typeof briefFields;
export type SupportBrief = { version: typeof SUPPORT_BRIEF_VERSION } & Record<BriefField, string>;
export const supportBriefSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'CREATE SOMETHING support brief',
  description: 'User-supplied preparation context. Does not authorize execution or submit a support request.',
  type: 'object', additionalProperties: false,
  required: ['version', ...Object.keys(briefFields)],
  properties: {
    version: { const: SUPPORT_BRIEF_VERSION },
    ...Object.fromEntries(Object.entries(briefFields).map(([key, field]) => [key, {
      type: 'string', maxLength: field.maxLength,
      ...(field.required ? { minLength: 1, pattern: '\\S' } : {})
    }]))
  }
} as const;
export function emptyBrief(): SupportBrief {
  return { version: SUPPORT_BRIEF_VERSION, ...Object.fromEntries(Object.keys(briefFields).map(key => [key, ''])) } as SupportBrief;
}
export function parseBrief(value: unknown): SupportBrief {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a support brief object.');
  const record = value as Record<string, unknown>;
  if (record.version !== SUPPORT_BRIEF_VERSION) throw new Error(`Unsupported brief version. Expected ${SUPPORT_BRIEF_VERSION}.`);
  if (Object.keys(record).some(key => key !== 'version' && !(Object.hasOwn(briefFields, key)))) throw new Error('The brief contains unsupported fields. Remove them before importing.');
  for (const [key, field] of Object.entries(briefFields)) {
    const text = record[key];
    if (typeof text !== 'string') throw new Error(`${field.label}: expected text.`);
    if (field.required && !text.trim()) throw new Error(`${field.label}: enter a value.`);
    if ([...text].length > field.maxLength) throw new Error(`${field.label}: limit is ${field.maxLength} characters.`);
  }
  return Object.fromEntries(['version', ...Object.keys(briefFields)].map(key => [key, record[key]])) as SupportBrief;
}
export function importBrief(text: string): SupportBrief {
  if (text.length > 40000) throw new Error('Brief JSON exceeds the 40,000-character import limit.');
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('Invalid JSON. Check the text and try again.'); }
  return parseBrief(value);
}
/** Quote untrusted values as indented literal blocks; never render them as HTML. */
export function briefMarkdown(value: SupportBrief): string {
  const brief = parseBrief(value);
  return ['# Support brief', '', `Contract: ${brief.version}`, '',
    'Prepared locally. Not submitted. No work, access, purchase, or publication authorized.', '',
    ...Object.entries(briefFields).flatMap(([key, field]) => [
      `## ${field.label}`, '', ...(brief[key as BriefField] || 'Not provided.').split(/\r\n?|\n/).map(line => `    ${line}`), ''
    ])].join('\n');
}
