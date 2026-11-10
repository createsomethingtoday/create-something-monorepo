import { derived } from 'svelte/store';
import { reducedFilmMotion, filmNavigationOpen, filmOverlayOpen } from './filmPlayback';
import { agencySearchOpen } from '../site-search/presentation';
import { createDashboardState, visibleWork, approveWork, workCounts } from './paperDashboard';

/** Local sample data only. Stage changes preserve the visitor's dashboard state. */
export function enhancePaperExample(root: HTMLElement) {
  const abort = new AbortController();
  let disposed = false,
    blocked = false;
  let gsap: typeof import('gsap').gsap | undefined;
  const query = <T extends HTMLElement = HTMLElement>(selector: string): T => {
    const node = root.querySelector<T>(selector);
    if (!node) throw new Error(`Missing paper example element: ${selector}`);
    return node;
  };
  void import('gsap')
    .then((module) => {
      if (!disposed) gsap = module.gsap;
    })
    .catch(() => {});
  const stages = {
    plan: {
      title: 'Make the idea tangible.',
      copy: 'A paper dashboard makes the workflow specific: what needs attention, who owns it, and what someone needs to decide.',
      deliverable: 'A shared view of the work, before connecting any tools.',
      number: '01',
      bench: 'Paper mockup / agree on the essentials',
      agent: 'Turns your goals and constraints into a first dashboard wireframe.',
      team: 'Sets the goal, names the owners, and reviews the plan.'
    },
    test: {
      title: 'Context changes the design.',
      copy: 'Review reveals what matters: put urgent work first, name its owner, and show where the agent waits for a person.',
      deliverable: 'A revised dashboard, with priority, ownership and review built into the flow.',
      number: '02',
      bench: 'Revised mockup / make the decision clear',
      agent: 'Incorporates review notes and tests the decision flow with your team.',
      team: 'Adds real operating context and agrees where human review belongs.'
    },
    run: {
      title: 'Now, move the work forward.',
      copy: 'Search the queue, inspect a request, and approve a sample review. Watch the counts and activity update together.',
      deliverable:
        'Working software, with checks, release guidance and a clear owner for each decision.',
      number: '03',
      bench: 'Working dashboard / try the local demo',
      agent: 'Builds the dashboard, checks behavior, and helps deploy the approved release.',
      team: 'Reviews the working result and approves deployment.'
    }
  };
  type Stage = keyof typeof stages;
  let current: Stage = 'plan';
  let state = createDashboardState();
  const mat = query('.mat');
  const sheets = [...root.querySelectorAll<HTMLElement>('.sheet')];
  const controls = [
    ...root.querySelectorAll<HTMLButtonElement | HTMLInputElement>(
      '.dashboard button, .dashboard input'
    )
  ];
  const rows = [...root.querySelectorAll<HTMLButtonElement>('[data-work-id]')];
  const stageButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-select]')];
  const filterButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-filter]')];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let timeline: gsap.core.Timeline | null = null;
  const offsets = [
    [-2, -2, -0.35],
    [2, 0, 0.45],
    [-3, 0, -0.7],
    [3, 0, 0.6],
    [-1, 2, -0.35],
    [2, 2, 0.6]
  ];
  function target(index: number) {
    const [x, y, r] = current === 'plan' ? offsets[index] : [0, 0, 0];
    return { '--x': `${x}px`, '--y': `${y}px`, '--r': `${r}deg` };
  }
  function stop() {
    timeline?.kill();
    timeline = null;
  }
  function finish() {
    stop();
    root
      .querySelectorAll<HTMLElement>('.priority-signal,.work-owner,.review-boundary')
      .forEach((node) => node.style.removeProperty('opacity'));
    sheets.forEach((sheet, index) => {
      Object.entries(target(index)).forEach(([key, value]) => sheet.style.setProperty(key, value));
      sheet.style.removeProperty('opacity');
    });
  }
  const labels = { review: 'Needs review', active: 'In progress', done: 'Completed' };
  function render() {
    const counts = workCounts(state),
      visible = visibleWork(state);
    Object.entries(counts).forEach(
      ([key, count]) => (query(`[data-metric="${key}"]`).textContent = String(count))
    );
    filterButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.filter === state.filter));
      button.querySelector('span')!.textContent = String(
        button.dataset.filter === 'all'
          ? state.items.length
          : counts[button.dataset.filter as keyof typeof counts]
      );
    });
    rows.forEach((row) => {
      const item = state.items.find((item) => item.id === row.dataset.workId)!;
      row.hidden = !visible.includes(item);
      row.dataset.workStatus = item.status;
      row.dataset.workTitle = item.title;
      row.setAttribute('aria-pressed', String(state.selected === item.id));
      const pill = row.querySelector<HTMLElement>('.status-pill')!;
      pill.dataset.status = item.status;
      pill.textContent = labels[item.status];
    });
    query('#paper-result-count').textContent = String(visible.length);
    query('#paper-empty').hidden = visible.length > 0;
    const item = state.items.find((item) => item.id === state.selected)!;
    query('#paper-detail-title').textContent = item.title;
    query('#paper-detail-id').textContent = `#${item.id}`;
    query('#paper-detail-owner').textContent = `${item.owner} · ${item.project}`;
    query('#paper-detail-context').textContent = item.context;
    query('#paper-detail-recommendation').textContent = item.recommendation;
    query('#paper-boundary-copy').textContent =
      item.status === 'review'
        ? `${item.owner.split(' ')[0]} reviews before any external action.`
        : item.status === 'active'
          ? 'Work is in progress. The owner reviews the evidence before release.'
          : 'Review complete in this sample. No external action occurred.';
    const approve = query<HTMLButtonElement>('#paper-approve');
    approve.disabled = current !== 'run' || item.status !== 'review';
    approve.textContent =
      item.status === 'done'
        ? 'Review complete ✓'
        : item.status === 'active'
          ? 'In progress · review comes next'
          : 'Approve sample review ↗';
    const activity = query('#paper-activity-list');
    activity.querySelectorAll('[data-demo-approval]').forEach((node) => node.remove());
    [...state.approvals].reverse().forEach((id) => {
      const item = state.items.find((item) => item.id === id)!;
      const li = document.createElement('li');
      li.dataset.demoApproval = id;
      const dot = document.createElement('span');
      dot.className = 'activity-dot approved';
      const div = document.createElement('div');
      const strong = document.createElement('strong');
      strong.textContent = `${item.owner.split(' ')[0]} approved “${item.title}”`;
      const p = document.createElement('p');
      p.textContent = 'Local demo · no external action';
      div.appendChild(strong);
      div.appendChild(p);
      li.appendChild(dot);
      li.appendChild(div);
      activity.insertBefore(li, activity.firstChild);
    });
  }
  function select(stage: string | undefined, animate = true) {
    if (stage !== 'plan' && stage !== 'test' && stage !== 'run') return;
    stop();
    current = stage;
    mat.dataset.stage = stage;
    stageButtons.forEach((button) =>
      button.setAttribute('aria-pressed', String(button.dataset.select === stage))
    );
    controls.forEach((control) => (control.disabled = stage !== 'run'));
    for (const key of ['title', 'copy', 'deliverable', 'number'] as const)
      query(`#paper-stage-${key}`).textContent = stages[stage][key];
    query('#paper-bench-label').textContent = stages[stage].bench;
    query('#paper-agent-role').textContent = stages[stage].agent;
    query('#paper-team-role').textContent = stages[stage].team;
    render();
    if (!animate || motion.matches || !gsap || blocked) {
      finish();
      return;
    }
    timeline = gsap.timeline({
      onComplete() {
        timeline = null;
        finish();
      }
    });
    sheets.forEach((sheet, index) =>
      timeline!.to(sheet, { ...target(index), duration: 0.55, ease: 'power2.inOut' }, index * 0.035)
    );
    if (stage === 'test')
      timeline.fromTo(
        root.querySelectorAll('.priority-signal,.work-owner,.review-boundary'),
        { opacity: 0 },
        { opacity: 1, duration: 0.3, clearProps: 'opacity' },
        0.25
      );
  }
  stageButtons.forEach((button) =>
    button.addEventListener('click', () => select(button.dataset.select), { signal: abort.signal })
  );
  filterButtons.forEach((button) =>
    button.addEventListener(
      'click',
      () => {
        state.filter = button.dataset.filter!;
        render();
        query('#paper-dashboard-status').textContent =
          `${visibleWork(state).length} matching requests. Selected detail stays open.`;
      },
      { signal: abort.signal }
    )
  );
  query<HTMLInputElement>('#paper-search').addEventListener(
    'input',
    (event) => {
      state.query = (event.target as HTMLInputElement).value;
      render();
    },
    { signal: abort.signal }
  );
  rows.forEach((row) =>
    row.addEventListener(
      'click',
      () => {
        state.selected = row.dataset.workId!;
        render();
        query('#paper-dashboard-status').textContent = `Opened request ${state.selected}.`;
        if (window.innerWidth <= 850) {
          const title = query('#paper-detail-title');
          title.tabIndex = -1;
          title.focus({ preventScroll: true });
          title.scrollIntoView({ block: 'start' });
        }
      },
      { signal: abort.signal }
    )
  );
  query('#paper-back-to-queue').addEventListener(
    'click',
    () => {
      const row = query<HTMLButtonElement>(`[data-work-id="${state.selected}"]`);
      if (row.hidden) query<HTMLInputElement>('#paper-search').focus();
      else row.focus();
    },
    { signal: abort.signal }
  );
  query('#paper-approve').addEventListener(
    'click',
    () => {
      if (current !== 'run' || !approveWork(state)) return;
      render();
      query('#paper-dashboard-status').textContent =
        'Sample review approved. Counts and activity updated. Nothing was sent or saved.';
    },
    { signal: abort.signal }
  );
  query('#paper-reset').addEventListener(
    'click',
    () => {
      state = createDashboardState();
      query<HTMLInputElement>('#paper-search').value = '';
      render();
      query('#paper-dashboard-status').textContent = 'Demo reset. Five sample requests restored.';
    },
    { signal: abort.signal }
  );
  root.addEventListener('focusin', finish, { signal: abort.signal });
  window.addEventListener('resize', finish, { signal: abort.signal });
  motion.addEventListener('change', finish, { signal: abort.signal });
  const unsubscribe = derived(
    [reducedFilmMotion, filmNavigationOpen, filmOverlayOpen, agencySearchOpen],
    (values) => values.some(Boolean)
  ).subscribe((value) => {
    blocked = value;
    if (value) finish();
  });
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) finish();
    },
    { signal: abort.signal }
  );
  window.addEventListener('beforeprint', finish, { signal: abort.signal });
  root.classList.add('enhanced');
  select('plan', false);
  return () => {
    disposed = true;
    stop();
    abort.abort();
    unsubscribe();
    root.classList.remove('enhanced');
  };
}
