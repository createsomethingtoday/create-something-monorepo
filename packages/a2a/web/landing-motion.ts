/** A local illustration, never a message send or a claim of live connection status. */
export function startHandoffStudy() {
  const figure = document.querySelector<HTMLElement>('.handoff-figure');
  const drawing = figure?.querySelector<SVGSVGElement>('.handoff-drawing');
  if (!figure || !drawing) return;
  const copy = [
    'An owner allows the sender. That permission opens the inbox, not the receiving agent’s tools.',
    'The inbox stores the message. A receipt confirms arrival; it does not confirm that work has started.',
    'A connected agent can claim the request. Its owner’s policy still governs every action.',
    'The agent records an outcome separately. Delivery, completed work, and human acceptance remain distinct.'
  ];
  const panel = document.createElement('div');
  panel.className = 'handoff-explorer';
  panel.innerHTML = `<p class="small" id="handoff-guidance">Select a stage to explore.<span class="pointer-guidance"> Hover previews without changing your selection.</span></p><div class="handoff-stages" role="group" aria-label="Explore the illustrated handoff" aria-describedby="handoff-guidance">${['Permission', 'Receipt', 'Work', 'Result'].map((label, i) => `<button type="button" aria-pressed="${i === 0}" data-stage="${i}">${label}</button>`).join('')}</div><p class="handoff-explanation"></p><span class="sr-only" role="status" aria-live="polite"></span>`;
  figure.append(panel);
  const explanation = panel.querySelector<HTMLElement>('.handoff-explanation')!;
  const status = panel.querySelector<HTMLElement>('[role=status]')!;
  const buttons = Array.from(panel.querySelectorAll<HTMLButtonElement>('button'));
  let selected = 0;
  let preview = -1;
  let renderMotion = (_stage: number) => {};
  let playStage = (_stage: number) => {};
  const show = (stage: number) => {
    if (preview === stage) return;
    preview = stage;
    explanation.textContent = copy[stage];
    buttons.forEach((button, i) => button.toggleAttribute('data-preview', i === stage));
    figure.dataset.handoffStage = String(stage);
    renderMotion(stage);
  };
  show(selected);
  buttons.forEach((button, i) => {
    button.addEventListener('click', () => {
      selected = i;
      buttons.forEach((item, j) => item.setAttribute('aria-pressed', String(j === i)));
      show(i);
      playStage(i);
      status.textContent = copy[i];
    });
    button.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'mouse') show(i);
    });
    button.addEventListener('pointerleave', () => show(selected));
    button.addEventListener('focus', () => show(selected));
  });
  let media: ReturnType<(typeof import('gsap'))['gsap']['matchMedia']> | undefined;
  let suspended = false;
  const paths = Array.from(
    drawing.querySelectorAll<SVGElement>(
      '.gate-drawing,.inbox-drawing,.agent-drawing,.diagram-line path'
    )
  );
  const groups = [
    drawing.querySelectorAll('.gate-drawing'),
    drawing.querySelectorAll('.inbox-drawing,.diagram-line path:first-child'),
    [
      drawing.querySelectorAll('.agent-drawing')[1],
      drawing.querySelector('.diagram-line path:nth-child(2)')
    ],
    drawing.querySelectorAll('.diagram-line path:last-child')
  ];
  // Preview the object under the pointer, using the same stage groups as the drawing.
  // Empty drawing space restores the selected stage; keyboard buttons remain the controls.
  const hotspots = new Map<Element, number>();
  groups.forEach((targets, stage) => {
    for (const target of Array.from(targets)) {
      if (target instanceof Element) hotspots.set(target, stage);
    }
  });
  const objects = [
    drawing.querySelector('.gate-drawing'),
    drawing.querySelector('.inbox-drawing'),
    drawing.querySelector('.receiving-agent')
  ];
  drawing.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' || event.buttons) return;
    const target =
      event.target instanceof Element
        ? event.target.closest('.gate-drawing,.inbox-drawing,.receiving-agent,.diagram-line path')
        : null;
    let stage = target ? hotspots.get(target) : undefined;
    // Open paths can leave unpainted space inside a visible object. Its real
    // bounds still belong to that object, rather than an unrelated SVG quarter.
    if (stage === undefined) {
      const object = objects.findIndex((element) => {
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        return (
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
        );
      });
      if (object >= 0) stage = object;
    }
    show(stage ?? selected);
  });
  drawing.addEventListener('pointerleave', () => show(selected));
  const mount = async () => {
    try {
      const { gsap } = await import('gsap');
      if (suspended) return;
      media?.revert();
      media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        // One reusable tween per path: pointer scrubbing cannot accumulate timelines.
        const opacity = paths.map((path) =>
          gsap.quickTo(path, 'opacity', { duration: 0.2, ease: 'power2.out' })
        );
        renderMotion = (stage) => {
          const highlighted = Array.from(groups[stage]);
          paths.forEach((path, i) => opacity[i](highlighted.includes(path) ? 1 : 0.72));
        };
        const envelope = drawing.querySelector<SVGGElement>('.study-envelope')!;
        const routes = drawing.querySelectorAll<SVGPathElement>('.diagram-line path');
        const travel = { progress: 0 };
        let route = routes[0];
        let length = route.getTotalLength();
        const hide = () => envelope.setAttribute('visibility', 'hidden');
        const position = () => {
          const point = route.getPointAtLength(travel.progress * length);
          envelope.setAttribute('transform', `translate(${point.x} ${point.y})`);
        };
        const flight = gsap.to(travel, { progress: 1, paused: true, ease: 'power1.inOut',
          duration: .6, onUpdate: position, onComplete: hide });
        const shackle = drawing.querySelector('.gate-drawing path:last-child');
        const unlock = gsap.timeline({ paused: true })
          .to(shackle, { y: -4, duration: .16, ease: 'power2.out' })
          .to(shackle, { y: 0, duration: .22, ease: 'power2.inOut' });
        playStage = (stage) => {
          flight.pause(0);
          unlock.pause(0);
          hide();
          if (stage === 0) { unlock.restart(); return; }
          route = routes[stage - 1];
          length = route.getTotalLength();
          position();
          envelope.setAttribute('visibility', 'visible');
          flight.duration(stage === 3 ? .85 : .5).restart();
        };
        renderMotion(preview);
        return () => {
          hide();
          playStage = () => {};
          renderMotion = () => {};
        };
      });
      figure.dataset.studyMotion = 'ready';
    } catch {
      figure.dataset.studyMotion = 'unavailable';
    }
  };
  window.addEventListener('pagehide', () => {
    suspended = true;
    media?.revert();
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      suspended = false;
      void mount();
    }
  });
  void mount();
}

/** Editorial motion follows the reader; it never advances the example's meaning. */
export function startLandingChoreography() {
  let media: ReturnType<(typeof import('gsap'))['gsap']['matchMedia']> | undefined;
  let suspended = false;
  const mount = async () => {
    try {
      const { gsap } = await import('gsap');
      if (suspended) return;
      media?.revert();
      media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        let frame = 0;
        const studies = Array.from(document.querySelectorAll<HTMLElement>('.audience-card,.example-section'));
        const timelines = studies.map((section) => {
          const timeline = gsap.timeline({ paused: true });
          if (section.matches('.audience-card')) {
            timeline.fromTo(section.querySelector('.card-illustration'), { y: 13 }, { y: -9, duration: 1, ease: 'none', immediateRender: false });
          } else {
            // The request arrives first; the reply settles a little later. Every
            // word remains visible, including without JS or before the chunk loads.
            timeline.fromTo(section.querySelector('.example-message:not(.reply)'), { y: 10 }, { y: -3, duration: .8, ease: 'none', immediateRender: false }, 0)
              .fromTo(section.querySelector('.reply'), { y: 16 }, { y: -5, duration: 1, ease: 'none', immediateRender: false }, .12);
          }
          return timeline;
        });
        const update = () => {
          frame = 0;
          if (document.hidden) return;
          studies.forEach((section, i) => {
            const bounds = section.getBoundingClientRect();
            const progress = Math.max(0, Math.min(1, (window.innerHeight - bounds.top) / (window.innerHeight + bounds.height)));
            timelines[i].progress(progress);
          });
        };
        const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule, { passive: true });
        document.addEventListener('visibilitychange', schedule);
        update();
        const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
        const cleanups: Array<() => void> = [];
        studies.forEach((section) => {
          const targets = Array.from(section.querySelectorAll<HTMLElement>('.desk-sheet,.desk-stamp,.mini-envelope,.mini-receipt,.example-thread'));
          const motions = targets.map((target, i) => ({
            x: gsap.quickTo(target, 'x', { duration: .45, ease: 'power2.out' }),
            y: gsap.quickTo(target, 'y', { duration: .45, ease: 'power2.out' }),
            depth: section.matches('.example-section') ? 2 : i % 2 ? 6 : 3
          }));
          const reset = () => motions.forEach(({ x, y }) => { x(0); y(0); });
          const move = (event: PointerEvent) => {
            if (!fine.matches || event.pointerType !== 'mouse' || event.buttons || section.contains(document.activeElement)) return;
            const bounds = section.getBoundingClientRect();
            const x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
            const y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
            motions.forEach((motion) => { motion.x(x * motion.depth); motion.y(y * motion.depth); });
          };
          section.addEventListener('pointermove', move);
          section.addEventListener('pointerleave', reset);
          section.addEventListener('pointercancel', reset);
          section.addEventListener('focusin', reset);
          window.addEventListener('blur', reset);
          fine.addEventListener('change', reset);
          cleanups.push(() => {
            section.removeEventListener('pointermove', move);
            section.removeEventListener('pointerleave', reset);
            section.removeEventListener('pointercancel', reset);
            section.removeEventListener('focusin', reset);
            window.removeEventListener('blur', reset);
            fine.removeEventListener('change', reset);
          });
        });
        return () => {
          cancelAnimationFrame(frame);
          window.removeEventListener('scroll', schedule);
          window.removeEventListener('resize', schedule);
          document.removeEventListener('visibilitychange', schedule);
          cleanups.forEach((cleanup) => cleanup());
        };
      });
    } catch {
      // The static illustrations and the complete thread are the fallback.
    }
  };
  window.addEventListener('pagehide', () => { suspended = true; media?.revert(); });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) { suspended = false; void mount(); }
  });
  void mount();
}
