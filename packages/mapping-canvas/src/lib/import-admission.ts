import { parse, type CanvasDocument } from './document';

/** Validate before entering replacement, which cancels queued persistence.
 * Re-check both durable document identity and transient edits after async I/O.
 * Callers must enter replacement synchronously after this promise resolves.
 */
export async function readCanvasImport(
  read: () => Promise<string>,
  current: () => CanvasDocument,
  blocked: () => boolean
): Promise<CanvasDocument | null> {
  const before = current();
  const parsed = parse(await read());
  return blocked() || current() !== before ? null : parsed;
}
