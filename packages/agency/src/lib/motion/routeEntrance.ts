/** Homepage route cuts commit immediately; the new page then settles into view. */
export function shouldEnterHomeBoundary({ from, to, type }: { from?: string; to?: URL; type: string }): boolean {
  return Boolean(from && to && type !== 'popstate' && type !== 'enter' && !to.hash
    && from !== to.pathname && (from === '/' || to.pathname === '/'));
}

type EntranceRuntime = { fromTo: (node: HTMLElement, from: object, to: object) => { revert: () => void } };
export function createRouteEntrance(load: () => Promise<EntranceRuntime> = async () => (await import('gsap')).gsap) {
  let generation = 0;
  let active: { revert: () => void } | undefined;
  const cancel = () => { generation++; active?.revert(); active = undefined; };
  return {
    cancel,
    async enter(node: HTMLElement, enabled: () => boolean = () => true) {
      cancel();
      const current = generation;
      if (!enabled()) return;
      try {
        const runtime = await load();
        if (current !== generation || !enabled()) return;
        // Opacity only: never create a transform containing block around fixed
        // content or move the focused target. Native reading is always available.
        active = runtime.fromTo(node, { opacity: .72 }, { opacity: 1, duration: .24, ease: 'power2.out', clearProps: 'opacity' });
      } catch { /* A failed enhancement leaves the committed page readable. */ }
    }
  };
}
