import { derived } from 'svelte/store';
import { reducedFilmMotion, filmNavigationOpen, filmOverlayOpen } from './filmPlayback';
import { agencySearchOpen } from '../site-search/presentation';

/** Scoped progressive enhancement of the approved single-form process example. */
export function enhancePaperExample(root: HTMLElement) {
  const abort = new AbortController();
  let disposed = false, blocked = false;
  let gsap: typeof import('gsap').gsap | undefined;
  const query = <T = HTMLDivElement>(selector: string): T => {
    const node = root.querySelector(selector);
    if (!node) throw new Error(`Missing paper example element: ${selector}`);
    return node as unknown as T;
  };
  void import('gsap').then(module => { if (!disposed) gsap = module.gsap; }).catch(() => {});

  const stages = {
    plan: {
      title: 'Make the idea tangible.',
      copy: 'A paper interface gives everyone something specific to discuss: what the request asks, and how someone moves forward.',
      deliverable: 'A shared mockup of the request, before connecting any tools.',
      number: '01', bench: 'Paper mockup / agree on the essentials',
      agent: 'Turns your goals and constraints into a first wireframe.',
      team: 'Sets the goal, brings context, and reviews the plan.'
    },
    test: {
      title: 'Review changes the design.',
      copy: 'Two illustrative notes reveal missing context. Add a request type to support routing, and explain what happens next.',
      deliverable: 'A revised paper interface, with each change connected to its review note.',
      number: '02', bench: 'Revised mockup / context changes the design',
      agent: 'Updates the mockup with your feedback and tests the flow.',
      team: 'Adds missing context and approves the changes.'
    },
    run: {
      title: 'Now, use the interface.',
      copy: 'The revised design becomes a usable form. Try the fields and preview the handoff.',
      deliverable: 'A usable interface, plus the checks and guidance to support its release.',
      number: '03', bench: 'Finished interface / local demo only',
      agent: 'Builds the interface, runs checks, and helps deploy the approved release.',
      team: 'Reviews the evidence and approves deployment.'
    }
  };
  const mat = query('.mat');
  const form = query<HTMLFormElement>('#paper-request-form');
  const fields = query<HTMLFieldSetElement>('#paper-form-fields');
  const sheets = [...root.querySelectorAll<HTMLElement>('.sheet')];
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-select]')];
  const summary = query('#paper-confirmation');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const offsets = [[-5,-3,-1.5],[4,0,1.1],[-3,0,-.8],[3,1,-.7],[-2,0,.6],[2,3,1]];
  type Stage = keyof typeof stages;
  let current: Stage = 'plan', settled = true;
  let timeline: gsap.core.Timeline | null = null;

  function target(index: number) {
    const [x,y,r] = current === 'plan' ? offsets[index] : [0,0,0];
    return { '--x': `${x}px`, '--y': `${y}px`, '--r': `${r}deg` };
  }
  function stop() { if (timeline) { timeline.kill(); timeline = null; } }
  function finish() {
    stop();
    sheets.forEach((sheet,index) => {
      Object.entries(target(index)).forEach(([key,value]) => sheet.style.setProperty(key,value));
      sheet.style.removeProperty('opacity');
    });
    form.style.removeProperty('height');
    form.style.setProperty('--paper', current === 'run' ? '0' : '1');
    settled = true;
  }
  function select(stage: string | undefined, animate = true) {
    if (stage !== 'plan' && stage !== 'test' && stage !== 'run') return;
    if (stage === current) { if (!animate) finish(); return; }
    // Preserve the on-screen geometry, including a partially completed transition.
    const previous = sheets.map(sheet => sheet.offsetParent ? sheet.getBoundingClientRect() : null);
    const previousHeight = form.getBoundingClientRect().height;
    stop();
    current = stage;
    const content = stages[stage];
    mat.dataset.stage = stage;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.select === stage)));
    root.querySelectorAll<HTMLElement>('.added').forEach(element => { element.hidden = stage === 'plan'; });
    fields.disabled = stage !== 'run';
    if (stage !== 'run') summary.hidden = true;
    for (const key of ['title','copy','deliverable','number']) query(`#paper-stage-${key}`).textContent = content[key as keyof typeof content];
    query('#paper-bench-label').textContent = content.bench;
    query('#paper-agent-role').textContent = content.agent;
    query('#paper-team-role').textContent = content.team;
    form.style.removeProperty('height');
    if (!animate || motion.matches || !gsap || blocked) { finish(); return; }

    const finalHeight = form.getBoundingClientRect().height;
    const visible = sheets.map(sheet => Boolean(sheet.offsetParent));
    sheets.forEach((sheet,index) => {
      if (!visible[index]) return;
      const after = sheet.getBoundingClientRect();
      const css = getComputedStyle(sheet);
      if (previous[index]) {
        sheet.style.setProperty('--x', `${parseFloat(css.getPropertyValue('--x')) + previous[index]!.left - after.left}px`);
        sheet.style.setProperty('--y', `${parseFloat(css.getPropertyValue('--y')) + previous[index]!.top - after.top}px`);
      } else {
        sheet.style.setProperty('--y','10px');
        sheet.style.opacity = '0';
      }
    });
    form.style.height = `${previousHeight}px`;
    settled = false;
    const next = gsap.timeline({onComplete() { timeline = null; finish(); }});
    timeline = next;
    sheets.forEach((sheet,index) => {
      if (!visible[index]) return;
      if (previous[index]) {
        next.to(sheet, {...target(index), opacity:1, duration:.55, ease:'power2.inOut'}, index * .025);
      } else {
        // Let existing fields make room before revealing the newly learned context.
        next.to(sheet, {...target(index), duration:.55, ease:'power2.inOut'}, index * .025);
        next.to(sheet, {opacity:1, duration:.2, ease:'power1.out'}, .38 + index * .01);
      }
    });
    next.to(form, {height:finalHeight, '--paper':stage === 'run' ? 0 : 1, duration:.68, ease:'power2.inOut'},0);
  }

  form.addEventListener('focusin', () => { if (!settled) finish(); }, {signal: abort.signal});
  form.addEventListener('input', event => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) event.target.setCustomValidity('');
    summary.hidden = true;
  }, {signal: abort.signal});
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (current !== 'run') return;
    for (const id of ['request-name','request-brief']) {
      const field = query<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`#paper-${id}`);
      field.setCustomValidity(field.value.trim() ? '' : 'Please add a little detail.');
    }
    if (!form.reportValidity()) return;
    summary.replaceChildren();
    const heading = document.createElement('h4');
    heading.textContent = 'Handoff preview';
    summary.appendChild(heading);
    for (const [label,id] of [['From','request-name'],['Reply to','request-email'],['Request type','request-type'],['Brief','request-brief']]) {
      const line = document.createElement('p'), strong = document.createElement('strong');
      strong.textContent = `${label}: `;
      line.appendChild(strong);
      line.appendChild(document.createTextNode(query<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`#paper-${id}`).value.trim()));
      summary.appendChild(line);
    }
    const note = document.createElement('p');
    note.textContent = 'Preview complete. Nothing was sent or saved. Your team would review this context before making a change.';
    summary.appendChild(note);
    summary.hidden = false;
    summary.tabIndex = -1;
    summary.focus({preventScroll:true});
  }, {signal: abort.signal});
  buttons.forEach(button => button.addEventListener('click', () => select(button.dataset.select), {signal: abort.signal}));
  window.addEventListener('resize',finish, {signal: abort.signal});
  motion.addEventListener('change',finish, {signal: abort.signal});
  const unsubscribe = derived([reducedFilmMotion, filmNavigationOpen, filmOverlayOpen, agencySearchOpen], values => values.some(Boolean)).subscribe(value => { blocked = value; if (value) finish(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) finish(); }, {signal: abort.signal});
  window.addEventListener('beforeprint', finish, {signal: abort.signal});
  root.classList.add('enhanced');
  finish();
  return () => { disposed = true; stop(); abort.abort(); unsubscribe(); root.classList.remove('enhanced'); };
}
