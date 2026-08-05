import JSZip from 'jszip';
import { describe, expect, test } from 'vitest';
import { createBundleReview, SourceMapValidationError } from '../src/index';
import { boundedEvidenceSnippet } from '../src/create-review';

async function createDesignerExtensionFixture(): Promise<ArrayBuffer> {
  const zip = new JSZip();

  zip.file(
    'webflow.json',
    JSON.stringify({
      name: 'Consent Pro',
      apiVersion: '2',
      publicDir: 'dist',
      size: 'large'
    })
  );

  zip.file(
    'dist/index.js',
    [
      'const runtimeUrl = "https://api.consentpro.com/v2/cdn/runtime.js";',
      'const script = document.createElement("script");',
      'script.src = runtimeUrl;',
      'document.head.appendChild(script);'
    ].join('\n')
  );

  return zip.generateAsync({ type: 'arraybuffer' });
}

async function createMinifiedFixture(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    'webflow.json',
    JSON.stringify({ name: 'Consent Pro', apiVersion: '2', publicDir: 'dist' })
  );
  zip.file('dist/app.min.js', 'function app(){return 1}');
  return zip.generateAsync({ type: 'arraybuffer' });
}

async function validSourceMapArtifact(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    'dist/app.min.js.map',
    JSON.stringify({
      version: 3,
      file: 'app.min.js',
      sources: ['../src/app.ts'],
      mappings: 'AAAA'
    })
  );
  return zip.generateAsync({ type: 'arraybuffer' });
}

describe('createBundleReview', () => {
  test('creates a scope-aware review without claiming production runtime coverage', async () => {
    const review = await createBundleReview({
      bundle: await createDesignerExtensionFixture(),
      fileName: 'consent-pro.zip'
    });

    expect(review.artifactScope.primary).toBe('designer_extension');
    expect(review.coverage).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ surface: 'designer_extension', status: 'reviewed' }),
        expect.objectContaining({ surface: 'production_runtime', status: 'needs_verification' })
      ])
    );
    expect(review.runtime.references).toContain('https://api.consentpro.com/v2/cdn/runtime.js');
    expect(review.summary.securityBlockers).toBeGreaterThan(0);
    expect(review.summary.readiness).toBe('changes_required');
    expect(review.guidance[0]).toEqual(
      expect.objectContaining({ label: 'Security blocker', nextMove: expect.any(String) })
    );
    expect(review.policySnapshot.rulesetVersion).toBeTruthy();
    expect(review.policySnapshot.configVersion).toBeTruthy();
    expect(review.officialDecision).toBeNull();
  });

  test('keeps a useful bounded excerpt from a large minified source line', () => {
    const prefix = 'const a=1;'.repeat(20_000);
    const trigger = 'document.createElement("script")';
    const line = `${prefix}${trigger}${'const b=2;'.repeat(20_000)}`;
    const excerpt = boundedEvidenceSnippet(line, prefix.length + 1, 'createElement');

    expect(excerpt).toContain(trigger);
    expect(excerpt.length).toBeLessThanOrEqual(500);
    expect(excerpt.startsWith('…')).toBe(true);
    expect(excerpt.endsWith('…')).toBe(true);
  });

  test('creates a versioned artifact set for a minified bundle and its private source map', async () => {
    const review = await createBundleReview({
      bundle: await createMinifiedFixture(),
      fileName: 'consent-pro.zip',
      sourceMapArtifact: {
        fileName: 'consent-pro-source-maps.zip',
        content: await validSourceMapArtifact()
      }
    });

    expect(review.artifactSet).toMatchObject({
      schemaVersion: 'submission_artifact_set.v1',
      bundle: {
        kind: 'bundle',
        fileName: 'consent-pro.zip',
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/)
      },
      sourceMapArtifact: {
        kind: 'source_maps',
        fileName: 'consent-pro-source-maps.zip',
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/)
      },
      sha256: expect.stringMatching(/^[a-f0-9]{64}$/)
    });
    expect(review.sourceMapPolicy).toMatchObject({
      policyVersion: 'source_maps.v1',
      required: true,
      status: 'matched',
      reason: 'Generated or minified executable files require matching private source maps.'
    });
  });

  test('requires a private source map when the bundle contains generated code', async () => {
    const promise = createBundleReview({
      bundle: await createMinifiedFixture(),
      fileName: 'consent-pro.zip'
    });

    await expect(promise).rejects.toBeInstanceOf(SourceMapValidationError);
    await expect(promise).rejects.toMatchObject({ code: 'source_map_required' });
  });

  test('records why an authored unminified bundle can proceed without a source map', async () => {
    const review = await createBundleReview({
      bundle: await createDesignerExtensionFixture(),
      fileName: 'consent-pro.zip'
    });

    expect(review.sourceMapPolicy).toMatchObject({
      policyVersion: 'source_maps.v1',
      required: false,
      status: 'not_provided',
      reason: 'No generated or minified executable files were detected.'
    });
    expect(review.artifactSet?.sourceMapArtifact).toBeNull();
  });
});
