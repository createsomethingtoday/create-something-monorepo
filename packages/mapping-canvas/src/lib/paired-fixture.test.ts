import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isOperationEnvelope, PAIRING_PROTOCOL_VERSION } from './paired-session';

const fixtures = [
  new URL('../../../draw-pairing-protocol/fixtures/authorized-put-object.json', import.meta.url),
  new URL('../../../draw-pairing-protocol/fixtures/authorized-convert-note.json', import.meta.url)
];

describe('Rust and TypeScript pairing fixture', () => {
  it('loads the shared authorized operation without shape drift', () => {
    const sources: unknown[] = fixtures.map((fixture) => JSON.parse(readFileSync(fixture, 'utf8')));
    expect(sources.every(isOperationEnvelope)).toBe(true);
    expect(sources).toMatchObject([
      { protocolVersion: PAIRING_PROTOCOL_VERSION, operation: { type: 'put_object' } },
      { protocolVersion: PAIRING_PROTOCOL_VERSION, operation: { type: 'convert', resultId: 'note-fixture' } }
    ]);
  });
});
