/** Public reading routes share one grid cut; operational screens remain immediate. */
function isPublicRoute(path: string) {
  return !/^\/(?:account|admin|dashboard|login|logout|auth|mcp-access|delivery|api|experiments)(?:\/|$)/.test(path)
    && !/^\/map\/(?:workspace|subscribe|share)(?:\/|$)/.test(path);
}
export function shouldUseGridTransition({ from, to, type }: { from?: string; to?: URL; type: string }): boolean {
  return Boolean(from && to && type !== 'popstate' && type !== 'enter'
    && from !== to.pathname && isPublicRoute(from) && isPublicRoute(to.pathname));
}

type Cover = { panels: HTMLElement[]; rules: HTMLElement[]; remove: () => void };
type Timeline = { fromTo: (target: HTMLElement | HTMLElement[], from: object, to: object, position?: number | string) => Timeline; kill: () => void };
type Runtime = { timeline: (options: { onComplete: () => void }) => Timeline };

/** A decorative layer only: the route, focus and history never wait on animation. */
function mountCover(): Cover {
  const cover = document.createElement('div');
  cover.className = 'agency-route-grid';
  cover.setAttribute('data-agency-grid-cover', '');
  cover.setAttribute('aria-hidden', 'true');
  Object.assign(cover.style, { position: 'fixed', inset: '0', zIndex: '1100', pointerEvents: 'none', overflow: 'hidden', display: 'grid', gridTemplateColumns: '6vw repeat(4,minmax(0,1fr)) 6vw' });
  const mobile = matchMedia('(max-width:600px)').matches;
  if (mobile) cover.style.gridTemplateColumns = '6vw repeat(2,minmax(0,1fr)) 6vw';
  const count = mobile ? 4 : 6;
  const panels: HTMLElement[] = [], rules: HTMLElement[] = [];
  for (let i = 0; i < count; i++) {
    const panel = document.createElement('div');
    panel.className = 'agency-route-grid__panel';
    panel.setAttribute('data-agency-grid-panel', String(i));
    Object.assign(panel.style, { position: 'relative', background: '#101112', height: '100%', willChange: 'transform' });
    if (i > 0) {
      const rule = document.createElement('span');
      rule.className = 'agency-route-grid__rule';
      rule.setAttribute('data-agency-grid-rule', String(i));
      Object.assign(rule.style, { position: 'absolute', top: '0', bottom: '0', left: '0', width: '1px', background: i === count - 1 ? '#c0d3bd' : '#414346', transformOrigin: 'top', transform: 'scaleY(0)' });
      panel.appendChild(rule); rules.push(rule);
    }
    cover.appendChild(panel); panels.push(panel);
  }
  document.body.appendChild(cover);
  return { panels, rules, remove: () => cover.remove() };
}

export function createRouteEntrance(
  load: () => Promise<Runtime> = async () => (await import('gsap')).gsap,
  mount: () => Cover = mountCover,
  deadline = 1300
) {
  let generation = 0;
  let active: Cover | undefined;
  let timeline: Timeline | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => {
    generation++; clearTimeout(timer); timeline?.kill(); timeline = undefined;
    active?.remove(); active = undefined;
  };
  return {
    cancel,
    start(complete: Promise<unknown>, enabled: () => boolean = () => true) {
      cancel();
      const current = generation;
      if (!enabled()) return;
      try { active = mount(); } catch { return; }
      const cover = active;
      timer = setTimeout(cancel, deadline);
      const valid = () => current === generation && enabled();
      // A rejected/superseded navigation must uncover immediately, even when the
      // animation module or its timeline has not resolved yet.
      void complete.catch(() => { if (current === generation) cancel(); });
      void load().then(async runtime => {
        if (!valid()) { if (current === generation) cancel(); return; }
        await new Promise<void>(resolve => {
          timeline = runtime.timeline({ onComplete: resolve });
          timeline.fromTo(cover.rules, { scaleY: 0 }, { scaleY: 1, duration: .18, stagger: .035, ease: 'power2.out' }, 0);
        });
        try { await complete; } catch { return; }
        if (!valid()) { if (current === generation) cancel(); return; }
        timeline = runtime.timeline({ onComplete: () => { if (current === generation) cancel(); } });
        cover.panels.forEach((panel, index) => timeline!.fromTo(panel,
          { yPercent: 0 }, { yPercent: index % 2 ? -101 : 101, duration: .48, ease: 'power3.inOut' }, index * .035));
      }).catch(() => { if (current === generation) cancel(); });
    }
  };
}
