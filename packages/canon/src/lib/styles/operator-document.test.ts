import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { operatorDocumentCss } from './operator-document.js';

const declarations = (css: string) =>
  Object.fromEntries([...css.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2]]));

describe('standalone Canon operator document', () => {
  it('inlines every canonical operator value without changing its role', () => {
    const canonicalCss = readFileSync(new URL('./operator.css', import.meta.url), 'utf8');
    expect(operatorDocumentCss).toMatch(/^:root\{color-scheme:dark;/);
    expect(declarations(operatorDocumentCss)).toEqual(declarations(canonicalCss));
    expect(Object.keys(declarations(operatorDocumentCss))).toHaveLength(28);
    expect(operatorDocumentCss).not.toMatch(/[<>]|@import/i);
  });
});
