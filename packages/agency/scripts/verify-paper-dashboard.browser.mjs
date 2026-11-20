// Shared browser-context checks. Execute this function in the rendered page.
// Uses only the local sample dashboard; never submits data or calls an API.
export async function verifyPaperDashboard() {
  const root = document.querySelector('.paper-example.enhanced');
  if (!root) throw new Error('Enhanced paper dashboard is not mounted');
  const checks = [];
  const check = (name, pass, detail) => checks.push({ name, pass: Boolean(pass), detail });
  const $ = (selector) => root.querySelector(selector);
  const rows = () =>
    [...root.querySelectorAll('[data-work-id]')].filter(
      (n) => n.getClientRects().length && !n.hidden
    );
  const metrics = () =>
    Object.fromEntries(
      ['review', 'active', 'done'].map((key) => [
        key,
        Number($(`[data-metric="${key}"]`).textContent.match(/\d+/)?.[0])
      ])
    );
  const pause = () => new Promise((resolve) => setTimeout(resolve, 1000));
  const search = (text) => {
    const input = $('#paper-search');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  for (const stage of ['plan', 'test', 'run']) {
    $(`[data-select="${stage}"]`).click();
    await pause();
    check(`${stage}: selected stage`, $('.mat').dataset.stage === stage);
    check(
      `${stage}: one selected stage button`,
      root.querySelectorAll('[data-select][aria-pressed="true"]').length === 1
    );
    check(`${stage}: no page overflow`, document.documentElement.scrollWidth <= innerWidth);
    check(
      `${stage}: shared chapter edge`,
      Math.abs(
        root.getBoundingClientRect().x -
          document.querySelector('#together').getBoundingClientRect().x
      ) < 1
    );
    check(
      `${stage}: useful team and agent roles`,
      $('#paper-agent-role').textContent.length > 20 &&
        $('#paper-team-role').textContent.length > 20
    );
    check(
      `${stage}: dashboard controls match stage`,
      [...root.querySelectorAll('#paper-search,[data-filter],[data-work-id]')].every(
        (n) => n.disabled === (stage !== 'run')
      )
    );
  }

  $('[data-select="plan"]').click();
  $('[data-select="plan"]').focus();
  window.dispatchEvent(new Event('resize'));
  $('[data-select="test"]').click();
  $('[data-select="run"]').focus();
  check(
    'Focus interruption leaves new review context visible',
    [...root.querySelectorAll('.priority-signal,.work-owner,.review-boundary')].every(
      (node) => node.style.opacity === '' && getComputedStyle(node).opacity === '1'
    )
  );
  $('[data-select="run"]').click();
  await pause();
  check(
    'Dashboard touch controls are at least 44px high',
    [...root.querySelectorAll('.dashboard button,.queue-search')]
      .filter((node) => node.getClientRects().length)
      .every((node) => node.getBoundingClientRect().height >= 44)
  );

  $('#paper-reset').click();
  $('[data-filter="all"]').click();
  const initial = metrics();
  check(
    'Summary matches sample queue',
    rows().length === initial.review + initial.active + initial.done,
    { initial, rows: rows().length }
  );
  $('[data-filter="review"]').click();
  check(
    'Review filter matches queue and count',
    rows().length === initial.review && rows().every((n) => n.dataset.workStatus === 'review')
  );
  $('[data-filter="active"]').click();
  check(
    'Active filter matches queue and count',
    rows().length === initial.active && rows().every((n) => n.dataset.workStatus === 'active')
  );
  $('[data-filter="done"]').click();
  check(
    'Completed filter matches queue and count',
    rows().length === initial.done && rows().every((n) => n.dataset.workStatus === 'done')
  );
  $('[data-filter="all"]').click();
  const first = rows().find((n) => n.dataset.workStatus === 'review');
  const id = first.dataset.workId;
  const title = first.dataset.workTitle;
  search(title);
  check('Search narrows to matching work', rows().length === 1 && rows()[0].dataset.workId === id);
  search('no-matching-sample-work-987');
  check(
    'Empty search has an explicit empty state',
    rows().length === 0 && $('#paper-empty').getClientRects().length > 0
  );
  search('');
  $(`[data-work-id="${id}"]`).click();
  check('Selected work opens its context', $('#paper-detail-title').textContent.includes(title));
  $('#paper-approve').click();
  const approved = metrics();
  check(
    'Demo approval updates counts exactly once',
    approved.review === initial.review - 1 &&
      approved.done === initial.done + 1 &&
      approved.active === initial.active,
    { initial, approved }
  );
  check(
    'Demo approval updates selected row',
    $(`[data-work-id="${id}"]`).dataset.workStatus === 'done'
  );
  check(
    'Approval announces local feedback',
    /demo|sample|nothing (?:was|is)/i.test($('#paper-dashboard-status').textContent)
  );
  check(
    'Approval leaves an activity receipt',
    $('#paper-activity-list').textContent.includes(title)
  );
  $('#paper-approve').click();
  check('Repeated approval is idempotent', JSON.stringify(metrics()) === JSON.stringify(approved));
  $('[data-select="test"]').click();
  await pause();
  $('[data-select="run"]').click();
  await pause();
  check(
    'Local work survives changing design stage',
    JSON.stringify(metrics()) === JSON.stringify(approved)
  );
  $('#paper-reset').click();
  $('[data-filter="all"]').click();
  check(
    'Reset restores original sample data',
    JSON.stringify(metrics()) === JSON.stringify(initial) &&
      rows().find((n) => n.dataset.workId === id)?.dataset.workStatus === 'review'
  );
  check(
    'Original team, terms and CTA remain',
    document.querySelector('#together').textContent.includes('Huzaifa') &&
      document.querySelector('#together').textContent.includes('After full payment') &&
      document.querySelector('#next a.button').getAttribute('href') ===
        '/book?source=agency&intent=workflow-mapping&lane=workflow_infrastructure'
  );
  check('No replacement form remains', root.querySelectorAll('form').length === 0);
  return { width: innerWidth, checks, failures: checks.filter((c) => !c.pass).map((c) => c.name) };
}
