import { HubError } from './types.js';

const CURSOR_VERSION = 1;

type OffsetCursor = {
  v: number;
  o: number;
};

function base64Encode(value: string): string {
  return btoa(value);
}

function base64Decode(value: string): string {
  return atob(value);
}

export function encodeOffsetCursor(offset: number): string {
  const payload: OffsetCursor = {
    v: CURSOR_VERSION,
    o: Math.max(0, Math.floor(offset))
  };
  return base64Encode(JSON.stringify(payload));
}

export function decodeOffsetCursor(cursor: string | undefined): number {
  if (!cursor) {
    return 0;
  }

  try {
    const decoded = JSON.parse(base64Decode(cursor)) as Partial<OffsetCursor>;
    if (decoded.v !== CURSOR_VERSION) {
      throw new HubError('HUB_INVALID_CURSOR', 'Unsupported cursor version');
    }
    if (typeof decoded.o !== 'number' || !Number.isFinite(decoded.o) || decoded.o < 0) {
      throw new HubError('HUB_INVALID_CURSOR', 'Invalid cursor offset');
    }
    return Math.floor(decoded.o);
  } catch (error) {
    if (error instanceof HubError) {
      throw error;
    }
    throw new HubError('HUB_INVALID_CURSOR', 'Malformed cursor');
  }
}

export function paginateItems<T>(
  items: readonly T[],
  offset: number,
  limit: number
): { items: T[]; nextCursor?: string } {
  const safeLimit = Math.max(1, Math.min(200, Math.floor(limit)));
  const safeOffset = Math.max(0, Math.floor(offset));

  const pageItems = items.slice(safeOffset, safeOffset + safeLimit);
  const nextOffset = safeOffset + pageItems.length;
  if (nextOffset >= items.length) {
    return { items: pageItems };
  }

  return {
    items: pageItems,
    nextCursor: encodeOffsetCursor(nextOffset)
  };
}
