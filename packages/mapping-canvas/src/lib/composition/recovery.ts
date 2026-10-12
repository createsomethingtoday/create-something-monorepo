import { parseDocument, serialize, updateContent, type Document, type Content } from './model';
export const RECOVERY_KEY = 'draw.composition.recovery.v1';
export type Recovery = { version: 1; document: Document; fields: Content; baseline: string };
export function parseRecovery(text: string): Recovery {
  if (text.length > 100000) throw Error('Draft recovery is too large.');
  const value = JSON.parse(text);
  if (!value || value.version !== 1 || typeof value.baseline !== 'string' || Object.keys(value).some(key => !['version', 'document', 'fields', 'baseline'].includes(key))) throw Error('Unsupported draft recovery.');
  const fields = value.fields;
  if (!fields || Object.keys(fields).some(key => !['title', 'description', 'buttonLabel', 'variant'].includes(key)) ||
    typeof fields.title !== 'string' || fields.title.length > 70 ||
    typeof fields.description !== 'string' || fields.description.length > 180 ||
    typeof fields.buttonLabel !== 'string' || fields.buttonLabel.length > 32 ||
    !['primary', 'secondary'].includes(fields.variant)) throw Error('Invalid draft fields.');
  return { version: 1, document: parseDocument(JSON.stringify(value.document)), fields: { ...fields }, baseline: serialize(parseDocument(value.baseline)) };
}
export function serializeRecovery(document: Document, fields: Content, baseline: string): string {
  return JSON.stringify(parseRecovery(JSON.stringify({ version: 1, document, fields, baseline })));
}

export function recoveryMatchesSaved(recovery: Recovery, saved: string): boolean {
  try {
    const { document, fields } = recovery;
    const unchanged = Object.entries(fields).every(([key, value]) => document.content[key as keyof Content] === value);
    return serialize(unchanged ? document : updateContent(document, fields)) === saved;
  } catch { return false; }
}
