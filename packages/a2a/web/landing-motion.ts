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
        renderMotion(preview);
        return () => {
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
