export interface InertTarget {
  inert?: boolean;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  hasAttribute(name: string): boolean;
  contains(node: unknown): boolean;
}

/**
 * Makes every host-page branch except the one containing `keep` unreachable
 * while a Marketplace modal is open, then restores only the state it changed.
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
