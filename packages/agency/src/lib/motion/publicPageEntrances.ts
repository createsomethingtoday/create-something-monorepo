import { tick } from 'svelte';
import { scrollEntrance } from '@create-something/canon/motion';
import { marketingPagePortfolio } from '../data/marketingPages';
import { usesAgencyOperatorPalette } from '../data/publicSurfacePolicy';

/** Public reading surfaces only; operational screens keep immediate content. */
export function usesPublicPageEntrances(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/' || /^\/(?:prospects|experiments|account|admin|auth|dashboard|login|logout|mcp-access|delivery|api)(?:\/|$)/.test(path)) return false;
  if (path === '/map' || path.startsWith('/map/')) return false;
  return usesAgencyOperatorPalette(path) || marketingPagePortfolio.some(entry => entry.path === path && entry.decision !== 'archive') || /^\/workflows\/[^/]+$/.test(path);
}

const candidates = '.letter-body > p, section, article, .clear-page-section__copy, .clear-page-section__aside, .performance-narrative-stage__header, .chapter-heading';
const sceneOwner = '[role="tabpanel"], [data-motion-target], .performance-narrative-stage__composition';
const ownedContent = 'form, dialog, canvas, video, iframe, input, select, textarea, [contenteditable], [data-scroll-entrance], [data-scroll-entrance-skip]';

/** Prefer small semantic reading groups, without taking over interactive scenes. */
export function publicEntranceTargets(root: HTMLElement): HTMLElement[] {
  const view = root.ownerDocument.defaultView;
  if (!view) return [];
  const safe = [...root.querySelectorAll<HTMLElement>(candidates)].filter(element => {
    if (element.closest(sceneOwner) || element.querySelector(sceneOwner)) return false;
    if (element.closest('nav, footer, dialog, form, [hidden], [data-scroll-entrance], [data-scroll-entrance-skip]')) return false;
    if ((!element.matches('.letter-body > p') && !element.querySelector('h2, h3')) || element.querySelector('h1') || element.querySelector(ownedContent)) return false;
    const rect = element.getBoundingClientRect();
    if (rect.height <= 0 || rect.height > view.innerHeight * 1.5) return false;
    // A reveal creates a containing block. Do not disturb fixed/sticky layouts,
    // CSS animations, authored transforms, or existing interactive motion.
    for (let parent: HTMLElement | null = element; parent && parent !== root; parent = parent.parentElement) {
      const style = view.getComputedStyle(parent);
      if (['fixed', 'sticky'].includes(style.position)) return false;
      if (parent === element && (style.transform !== 'none' || style.animationName !== 'none')) return false;
    }
    return [...element.querySelectorAll<HTMLElement>('*')].every(child => !['fixed', 'sticky'].includes(view.getComputedStyle(child).position));
  });
  return safe.filter(element => !safe.some(other => other !== element && element.contains(other)));
}

/** Svelte action: reselect after route DOM and top/hash restoration have settled. */
export function publicPageEntrances(root: HTMLElement, pathname: string) {
  let generation = 0;
  let dispose: (() => void) | undefined;
  let targets: HTMLElement[] = [];
  const clear = () => {
    dispose?.(); dispose = undefined;
    for (const element of targets) {
      element.removeAttribute('data-scroll-entrance');
      element.removeAttribute('data-agency-page-entrance');
    }
    targets = [];
  };
  const update = (path: string) => {
    const current = ++generation;
    clear();
    if (!usesPublicPageEntrances(path)) return;
    void tick().then(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))).then(() => {
      if (current !== generation) return;
      targets = publicEntranceTargets(root);
      for (const element of targets) {
        element.setAttribute('data-scroll-entrance', '');
        element.setAttribute('data-agency-page-entrance', '');
      }
      dispose = scrollEntrance(root).destroy;
    });
  };
  update(pathname);
  return { update, destroy() { generation++; clear(); } };
}
