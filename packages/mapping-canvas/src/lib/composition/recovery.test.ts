import { expect, it } from 'vitest';
import { createDocument, serialize, updateContent } from './model';
import { parseRecovery, serializeRecovery, recoveryMatchesSaved } from './recovery';
it('preserves invalid pending fields separately from the last valid composition and saved baseline', () => {
  const doc = createDocument(), baseline = serialize(doc), fields = { ...doc.content, title: '   ', description: '' };
  const recovered = parseRecovery(serializeRecovery(doc, fields, baseline));
  expect(recovered.fields).toEqual(fields);
  expect(recovered.document).toEqual(doc);
  expect(recovered.baseline).toBe(baseline);
});
it('rejects malformed, oversized and incompatible recovery without changing source bytes', () => {
  const doc = createDocument(), baseline = serialize(doc);
  for (const text of ['{bad', 'x'.repeat(100001), JSON.stringify({ version: 2 }), JSON.stringify({version:1,document:doc,baseline,fields:{...doc.content,title:'x'.repeat(71)}})]) expect(() => parseRecovery(text)).toThrow();
  expect(serialize(doc)).toBe(baseline);
});

it('recognizes a draft already saved even when recovery cleanup failed', () => {
  const doc = createDocument(), fields = {...doc.content, title: 'Saved new title'};
  const recovery = parseRecovery(serializeRecovery(doc, fields, serialize(doc)));
  expect(recoveryMatchesSaved(recovery, serialize(updateContent(doc, fields)))).toBe(true);
  expect(recoveryMatchesSaved(recovery, serialize(doc))).toBe(false);
});
