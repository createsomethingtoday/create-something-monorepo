import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from './index';

const baseEnv = {
  ENVIRONMENT: 'production',
  ALLOWED_ORIGINS: ''
};

function scanRequest(body: Record<string, unknown>): Request {
  return new Request('https://bundle-scanner-api.test/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(target: Uint8Array, offset: number, value: number): void {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32(target: Uint8Array, offset: number, value: number): void {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
}

function zip(entries: Record<string, string>): ArrayBuffer {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const [path, content] of Object.entries(entries)) {
    const name = encoder.encode(path);
    const data = encoder.encode(content);
    const checksum = crc32(data);

    const local = new Uint8Array(30 + name.length + data.length);
    writeUint32(local, 0, 0x04034b50);
    writeUint16(local, 4, 20);
    writeUint16(local, 8, 0);
    writeUint32(local, 14, checksum);
    writeUint32(local, 18, data.length);
    writeUint32(local, 22, data.length);
    writeUint16(local, 26, name.length);
    local.set(name, 30);
    local.set(data, 30 + name.length);
    localParts.push(local);

    const central = new Uint8Array(46 + name.length);
    writeUint32(central, 0, 0x02014b50);
    writeUint16(central, 4, 20);
    writeUint16(central, 6, 20);
    writeUint16(central, 10, 0);
    writeUint32(central, 16, checksum);
    writeUint32(central, 20, data.length);
    writeUint32(central, 24, data.length);
    writeUint16(central, 28, name.length);
    writeUint32(central, 42, offset);
    central.set(name, 46);
    centralParts.push(central);

    offset += local.length;
  }

  const centralOffset = offset;
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  writeUint32(end, 0, 0x06054b50);
  writeUint16(end, 8, centralParts.length);
  writeUint16(end, 10, centralParts.length);
  writeUint32(end, 12, centralSize);
  writeUint32(end, 16, centralOffset);

  const archive = new Uint8Array(centralOffset + centralSize + end.length);
  let cursor = 0;
  for (const part of [...localParts, ...centralParts, end]) {
    archive.set(part, cursor);
    cursor += part.length;
  }
  return archive.buffer;
}

describe('bundle scanner source-map artifact intake flag', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects source-map artifacts when the feature flag is disabled', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await worker.fetch(
      scanRequest({
        bundleUrl: 'https://private.example/app.zip',
        sourceMapUrl: 'https://private.example/source-maps.zip'
      }),
      baseEnv
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'Source map artifact intake is disabled for this deployment.'
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fetches and reports source-map artifacts when the feature flag is enabled', async () => {
    const bundleBuffer = zip({
      'dist/app.min.js': 'function add(a,b){return a+b}'
    });
    const sourceMapBuffer = zip({
      'dist/app.min.js.map': JSON.stringify({
        version: 3,
        file: 'app.min.js',
        sources: ['../src/app.ts'],
        names: [],
        mappings: ''
      })
    });

    const fetchMock = vi.fn(async (url: string) => {
      if (url === 'https://private.example/app.zip') {
        return new Response(bundleBuffer, {
          status: 200,
          headers: { 'Content-Type': 'application/zip' }
        });
      }
      if (url === 'https://private.example/source-maps.zip') {
        return new Response(sourceMapBuffer, {
          status: 200,
          headers: { 'Content-Type': 'application/zip' }
        });
      }
      return new Response('not found', { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await worker.fetch(
      scanRequest({
        submissionId: 'review-test',
        bundleUrl: 'https://private.example/app.zip',
        sourceMapUrl: 'https://private.example/source-maps.zip'
      }),
      {
        ...baseEnv,
        ENVIRONMENT: 'reviewers',
        SOURCE_MAP_ARTIFACT_INTAKE_ENABLED: 'true'
      }
    );
    const payload = (await response.json()) as {
      artifacts: { sourceMap: { sha256: string } };
      report: { sourceMapSummary: { status: string } };
    };

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      submissionId: 'review-test',
      report: {
        sourceMapSummary: {
          status: 'matched',
          artifactProvided: true,
          matchedGeneratedFiles: ['dist/app.min.js']
        }
      }
    });
    expect(payload.artifacts.sourceMap.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
