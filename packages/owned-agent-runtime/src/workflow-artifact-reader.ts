/** R2 transport only. Returned bytes still require compiler signature and policy verification. */
export interface WorkflowArtifactBucket {
  get(key: string): Promise<{ size: number; body: ReadableStream<Uint8Array> } | null>;
}

const MAX_FILES = 512;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_BYTES = 16 * 1024 * 1024;

export class R2WorkflowArtifactReader {
  constructor(private readonly bucket: WorkflowArtifactBucket) {}

  async read(manifestSha256: string): Promise<ReadonlyMap<string, Uint8Array>> {
    if (!/^sha256:[a-f0-9]{64}$/.test(manifestSha256)) throw new Error('artifact_digest_invalid');
    const prefix = `workflow-artifacts/${manifestSha256.slice(7)}/`;
    let total = 0;
    const read = async (path: string, limit = MAX_FILE_BYTES): Promise<Uint8Array> => {
      const object = await this.bucket.get(prefix + path);
      if (!object) throw new Error('artifact_missing');
      if (!Number.isSafeInteger(object.size) || object.size < 0 || object.size > limit || total + object.size > MAX_TOTAL_BYTES) {
        await object.body.cancel();
        throw new Error('artifact_size_limit');
      }
      const reader = object.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          size += chunk.value.byteLength;
          total += chunk.value.byteLength;
          if (size > object.size || size > limit || total > MAX_TOTAL_BYTES) throw new Error('artifact_size_limit');
          chunks.push(chunk.value.slice());
        }
        if (size !== object.size) throw new Error('artifact_size_mismatch');
      } catch (error) {
        await reader.cancel().catch(() => undefined);
        throw error;
      } finally {
        reader.releaseLock();
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      return bytes;
    };
    const manifestBytes = await read('manifest.json', 1024 * 1024);
    const manifest: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(manifestBytes));
    if (!manifest || typeof manifest !== 'object' || !('files' in manifest) || !Array.isArray(manifest.files) || manifest.files.length > MAX_FILES)
      throw new Error('artifact_inventory_invalid');
    const paths = new Set<string>();
    for (const file of manifest.files) {
      const path = file?.path;
      if (typeof path !== 'string' || path.length > 300 || !/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(path) ||
          path.split('/').some(part => part === '.' || part === '..') ||
          path === 'manifest.json' || path === 'attestation.json' || paths.has(path))
        throw new Error('artifact_path_invalid');
      paths.add(path);
    }
    const snapshot = new Map<string, Uint8Array>([['manifest.json', manifestBytes]]);
    snapshot.set('attestation.json', await read('attestation.json', 16 * 1024));
    for (const path of paths) snapshot.set(path, await read(path));
    return snapshot;
  }
}
