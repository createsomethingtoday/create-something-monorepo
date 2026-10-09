import { describe, expect, it } from 'vitest';
import { createDocument } from './document';
import { readCanvasImport } from './import-admission';

describe('asynchronous Canvas import admission', () => {
  const deferred = () => {
    let resolve!: (value: string) => void;
    const promise = new Promise<string>((done) => { resolve = done; });
    return { promise, resolve };
  };

  it.each(['gesture', 'buffered note', 'native recovery', 'agent mutation'])('rejects %s starting during a file read without requiring a timestamp change', async () => {
    const document = createDocument();
    const input = deferred();
    let busy = false;
    const result = readCanvasImport(() => input.promise, () => document, () => busy);
    busy = true;
    input.resolve(JSON.stringify(createDocument()));
    expect(await result).toBeNull();
  });

  it('rejects a newer document even when its ID and timestamp are unchanged', async () => {
    let document = createDocument();
    const input = deferred();
    const result = readCanvasImport(() => input.promise, () => document, () => false);
    document = { ...document, title: 'Newer local work' };
    input.resolve(JSON.stringify(createDocument()));
    expect(await result).toBeNull();
  });

  it('admits valid input when the current canvas remains idle and unchanged', async () => {
    const document = createDocument();
    const imported = createDocument();
    expect(await readCanvasImport(async () => JSON.stringify(imported), () => document, () => false)).toEqual(imported);
  });

  it('rejects malformed input before replacement admission', async () => {
    const document = createDocument();
    await expect(readCanvasImport(async () => '{broken', () => document, () => false)).rejects.toBeInstanceOf(SyntaxError);
  });
});
