export type FrameScheduler = (callback: () => void) => number;
export type FrameCanceller = (handle: number) => void;

export interface TextDeltaBatcher {
  push(text: string): void;
  flushNow(): void;
  cancel(): void;
}

/** Coalesces arbitrarily small SSE text deltas into at most one UI update per frame. */
export function createTextDeltaBatcher(
  onFlush: (text: string) => void,
  schedule: FrameScheduler = (callback) => window.requestAnimationFrame(callback),
  cancelFrame: FrameCanceller = (handle) => window.cancelAnimationFrame(handle),
): TextDeltaBatcher {
  let pending = '';
  let frameHandle: number | null = null;

  const flush = () => {
    frameHandle = null;
    if (!pending) return;
    const text = pending;
    pending = '';
    onFlush(text);
  };

  return {
    push(text) {
      if (!text) return;
      pending += text;
      if (frameHandle === null) frameHandle = schedule(flush);
    },
    flushNow() {
      if (frameHandle !== null) cancelFrame(frameHandle);
      flush();
    },
    cancel() {
      if (frameHandle !== null) cancelFrame(frameHandle);
      frameHandle = null;
      pending = '';
    },
  };
}

/**
 * Finds document plus open shadow roots in one bounded traversal. Callers can
 * run many selectors against the returned roots without re-walking the tree.
 */
export function discoverOpenRoots(root: ParentNode, maxDepth = 3): ParentNode[] {
  const roots: ParentNode[] = [];
  const queue: Array<{ root: ParentNode; depth: number }> = [{ root, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    roots.push(current.root);
    if (current.depth >= maxDepth) continue;

    for (const element of Array.from(current.root.querySelectorAll<HTMLElement>('*'))) {
      if (element.shadowRoot) queue.push({ root: element.shadowRoot, depth: current.depth + 1 });
    }
  }

  return roots;
}

export function queryDiscoveredRoots(roots: readonly ParentNode[], selector: string): Element[] {
  return roots.flatMap((root) => Array.from(root.querySelectorAll(selector)));
}

export interface HostOverlayDocument {
  querySelectorAll(selector: string): ArrayLike<Element>;
  elementFromPoint(x: number, y: number): Element | null;
}

/**
 * A host overlay is active only when it owns a point in the mobile composer
 * zone. Presence alone is insufficient because consent hosts remain mounted
 * after dismissal.
 */
export function isHostOverlayBlocking(
  documentLike: HostOverlayDocument,
  selectors: string,
  viewportWidth: number,
  viewportHeight: number,
): boolean {
  if (!selectors.trim() || viewportWidth <= 0 || viewportHeight <= 0) return false;
  let overlays: Element[];
  try {
    overlays = Array.from(documentLike.querySelectorAll(selectors));
  } catch {
    return false;
  }
  if (overlays.length === 0) return false;

  const points = [
    [viewportWidth / 2, viewportHeight - 20],
    [20, viewportHeight - 20],
    [viewportWidth - 20, viewportHeight - 20],
  ];
  return points.some(([x, y]) => {
    const topElement = documentLike.elementFromPoint(x, y);
    return Boolean(topElement && overlays.some((overlay) => overlay === topElement || overlay.contains(topElement)));
  });
}

export interface HighlightMissState {
  add(slugs: readonly string[]): void;
  snapshot(): string[];
  clear(): void;
}

/** Instance-owned feedback state; never shared between TemplateChat mounts. */
export function createHighlightMissState(): HighlightMissState {
  const misses = new Set<string>();
  return {
    add(slugs) {
      for (const slug of slugs) if (slug) misses.add(slug);
    },
    snapshot() {
      return Array.from(misses);
    },
    clear() {
      misses.clear();
    },
  };
}
