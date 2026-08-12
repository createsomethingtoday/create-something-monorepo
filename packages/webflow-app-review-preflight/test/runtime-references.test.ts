import { describe, expect, test } from 'vitest';
import { discoverRuntimeReferences } from '../src/index';

describe('discoverRuntimeReferences', () => {
  test('does not combine runtime paths with example or asset origins', () => {
    const references = discoverRuntimeReferences([
      {
        path: 'assets/index.js',
        sizeBytes: 300,
        ext: '.js',
        isTextCandidate: true,
        isIgnored: false,
        tags: [],
        content: [
          'const API = "https://api.consentpro.com";',
          'const example = "https://api.example.com/consent";',
          'const asset = "https://cdn.prod.website-files.com/file.svg";',
          'const runtime = "/v2/cdn/runtime.js";',
          'const versioned = "/v2/cdn/runtime/${id}.js";'
        ].join('\n')
      }
    ]);

    expect(references).toEqual([
      'https://api.consentpro.com/v2/cdn/runtime.js',
      'https://api.consentpro.com/v2/cdn/runtime/{id}.js'
    ]);
  });
});
