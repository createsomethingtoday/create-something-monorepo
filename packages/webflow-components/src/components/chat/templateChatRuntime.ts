/** Host-environment probes and small scheduling primitives for TemplateChat. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

/**
 * Properties that make an ancestor the containing block for `position: fixed`.
 * Any of them turns the floating launcher and panel from viewport-anchored into
 * ancestor-anchored, which puts them in the wrong place with no error.
 */
const FIXED_POSITION_BREAKERS = [
  'transform',
  'filter',
  'backdropFilter',
  'perspective',
  'contain',
  'willChange',
] as const;

export interface StyleProbe {
  getPropertyValue?(property: string): string;
  transform?: string;
  filter?: string;
  backdropFilter?: string;
  perspective?: string;
  contain?: string;
  willChange?: string;
}

export interface PlacementAncestor {
  tagName?: string;
  className?: string;
  parentElement?: PlacementAncestor | null;
}

export interface PlacementProblem {
  property: string;
  value: string;
  /** Best-effort identifier for the offending element, for a log line. */
  ancestor: string;
}

function describeAncestor(element: PlacementAncestor): string {
  const tag = (element.tagName ?? 'element').toLowerCase();
  const className = typeof element.className === 'string' ? element.className.trim() : '';
  return className ? `${tag}.${className.split(/\s+/).slice(0, 2).join('.')}` : tag;
}

/**
 * Walks up from the component's host element looking for an ancestor that
 * captures fixed positioning. Returns the first problem found, or null.
 *
 * Placement is a Designer-time mistake with a silent runtime symptom, so
 * detecting it is the difference between "the chat is in the wrong corner" and
 * a report nobody can reproduce.
 */
export function findFixedPositionBreaker(
  start: PlacementAncestor | null,
  computeStyle: (element: PlacementAncestor) => StyleProbe | null,
  maxDepth = 40,
): PlacementProblem | null {
  let current = start;
  let depth = 0;

  while (current && depth < maxDepth) {
    const style = computeStyle(current);
    if (style) {
      for (const property of FIXED_POSITION_BREAKERS) {
        const value =
          style.getPropertyValue?.(property.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)) ??
          style[property] ??
          '';
        const normalized = value.trim();
        if (!normalized || normalized === 'none' || normalized === 'auto' || normalized === 'normal') {
          continue;
        }
        // `contain` only breaks fixed positioning for paint/layout containment.
        if (property === 'contain' && !/paint|layout|strict|content/.test(normalized)) continue;
        // `will-change` only matters when it names a breaking property.
        if (property === 'willChange' && !/transform|filter|perspective/.test(normalized)) continue;
        return { property, value: normalized, ancestor: describeAncestor(current) };
      }
    }
    current = current.parentElement ?? null;
    depth += 1;
  }

  return null;
}

export interface InertTarget {
  inert?: boolean;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  hasAttribute(name: string): boolean;
  contains(node: unknown): boolean;
}

/**
 * Makes everything on the host page except `keep` unreachable while a modal
 * conversation is open, then restores it.
 *
 * `aria-modal` alone does not stop a screen reader from wandering into the page
 * behind the panel, and nothing stopped Tab from reaching host controls once
 * focus left the trap. Only elements this call changed are restored, so a host
 * page (or another modal) that already set inert keeps its own state.
 */
export function applyHostInert(
  siblings: readonly InertTarget[],
  keep: unknown,
): () => void {
  const changed: InertTarget[] = [];

  for (const element of siblings) {
    if (element.contains(keep)) continue;
    if (element.inert === true || element.hasAttribute('aria-hidden')) continue;
    element.inert = true;
    element.setAttribute('aria-hidden', 'true');
    changed.push(element);
  }

  return () => {
    for (const element of changed) {
      element.inert = false;
      element.removeAttribute('aria-hidden');
    }
    changed.length = 0;
  };
}

/**
 * Resolves the top-level page element that contains this component. Webflow
 * mounts code components inside a shadow root, so the panel's own ancestors
 * stop at the shadow boundary and have to be crossed via the host element.
 */
export function findHostPageBranch(node: Node | null): Element | null {
  const body = node?.ownerDocument?.body ?? null;
  if (!body) return null;

  let current: Node | null = node;
  while (current) {
    const parent: Node | null = current.parentNode;
    if (parent === body) return current.nodeType === 1 ? (current as Element) : null;
    if (parent) {
      current = parent;
      continue;
    }
    // No parent means a shadow root (or a detached tree): cross the boundary.
    const root = current.getRootNode?.();
    const host = root && (root as ShadowRoot).host ? (root as ShadowRoot).host : null;
    if (!host) return null;
    current = host;
  }

  return null;
}

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

/** Returns the visible height of a bottom-anchored host overlay that owns interaction. */
export function getHostOverlayBottomInset(
  documentLike: HostOverlayDocument,
  selectors: string,
  viewportWidth: number,
  viewportHeight: number,
): number {
  if (!isHostOverlayBlocking(documentLike, selectors, viewportWidth, viewportHeight)) return 0;

  let overlays: Element[];
  try {
    overlays = Array.from(documentLike.querySelectorAll(selectors));
  } catch {
    return 0;
  }

  return overlays.reduce((largest, overlay) => {
    const rect = overlay.getBoundingClientRect();
    const intersectsViewport = rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.left < viewportWidth;
    const reachesViewportBottom = rect.bottom >= viewportHeight - 1 && rect.top < viewportHeight;
    if (!intersectsViewport || !reachesViewportBottom) return largest;
    return Math.max(largest, Math.ceil(viewportHeight - Math.max(0, rect.top)));
  }, 0);
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
