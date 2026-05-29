import { describe, expect, it } from 'vitest';

import { defaultConfig } from '../policy/default-config';
import { buildInventory } from './inventory';
import { analyzeSourceMaps } from './source-map';
import type { UnzippedFile } from '../types';

const encoder = new TextEncoder();

function textFile(path: string, content: string): UnzippedFile {
  return { path, data: encoder.encode(content) };
}

function sourceMap(path: string, file: string): UnzippedFile {
  return textFile(
    path,
    JSON.stringify({
      version: 3,
      file,
      sources: [`../src/${file.replace(/\.(min\.)?(js|css)$/i, '.ts')}`],
      mappings: ''
    })
  );
}

describe('analyzeSourceMaps', () => {
  it('matches a private source map artifact to a generated bundle file', () => {
    const inventory = buildInventory(
      [textFile('dist/app.min.js', 'function app(){return 1}')],
      defaultConfig
    );

    const summary = analyzeSourceMaps(inventory, [sourceMap('dist/app.min.js.map', 'app.min.js')]);

    expect(summary.status).toBe('matched');
    expect(summary.artifactProvided).toBe(true);
    expect(summary.publicExposure).toBe(false);
    expect(summary.matchedGeneratedFiles).toEqual(['dist/app.min.js']);
    expect(summary.missingGeneratedFiles).toEqual([]);
  });

  it('detects public source map exposure in the production bundle', () => {
    const inventory = buildInventory(
      [
        textFile('assets/app.js', 'console.log("ok");\n//# sourceMappingURL=app.js.map'),
        sourceMap('assets/app.js.map', 'app.js')
      ],
      defaultConfig
    );

    const summary = analyzeSourceMaps(inventory);

    expect(summary.status).toBe('missing');
    expect(summary.publicExposure).toBe(true);
    expect(summary.exposedSourceMapFiles).toEqual(['assets/app.js.map']);
    expect(summary.sourceMappingUrlReferences).toMatchObject([
      {
        filePath: 'assets/app.js',
        target: 'app.js.map',
        resolvedTarget: 'assets/app.js.map',
        inline: false
      }
    ]);
  });
});
