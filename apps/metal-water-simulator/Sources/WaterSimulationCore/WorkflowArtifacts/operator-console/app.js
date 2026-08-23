const app = document.querySelector('#app');
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const list = (values, empty = 'None') => values?.length ? '<ul class="list">' + values.map((value) => '<li>' + escapeHtml(value) + '</li>').join('') + '</ul>' : '<p>' + empty + '</p>';
const field = (label, value) => '<div class="field"><dt>' + escapeHtml(label) + '</dt><dd>' + value + '</dd></div>';

function renderDetail(entry) {
  const statusCopy = entry.observedOutcome === 'pass'
    ? 'Replay permits this transition. The console remains read-only.'
    : entry.observedOutcome === 'approval_required'
      ? 'Awaiting explicit approval from ' + entry.owner + '.'
      : 'Execution unavailable. Follow the recovery path before another attempt.';
  const detail = document.querySelector('#case-detail');
  detail.innerHTML = '<div class="eyebrow">Historical replay case</div>' +
    '<h2>' + escapeHtml(entry.title) + '</h2>' +
    '<span class="badge ' + escapeHtml(entry.observedOutcome) + '">' + escapeHtml(entry.observedOutcome.replaceAll('_',' ')) + '</span>' +
    '<div class="detail-grid">' +
      field('Decision reason', escapeHtml(entry.reasonCode)) +
      field('State', escapeHtml(entry.stateBefore) + ' → ' + escapeHtml(entry.stateAfter)) +
      field('Authority', escapeHtml(entry.authority)) +
      field('Owner', escapeHtml(entry.owner)) +
      field('Evidence references', list(entry.evidenceReferences)) +
      field('Missing evidence', list(entry.missingEvidence, 'Complete')) +
    '</div>' +
    '<h3>Recovery</h3><p>' + escapeHtml(entry.recovery.path) + '</p>' +
    '<h3>Receipt</h3><div class="hash">' + escapeHtml(JSON.stringify(entry.receipt.receiptFields)) + '</div>' +
    '<p class="policy ' + escapeHtml(entry.observedOutcome) + '">' + escapeHtml(statusCopy) + '</p>';
}

function render(data) {
  const counts = data.acceptanceSummary.counts;
  const cases = data.replayReport.cases;
  app.innerHTML = '<div class="eyebrow">CREATE SOMETHING / Workflow Compiler</div>' +
    '<h1>' + escapeHtml(data.title) + '</h1>' +
    '<p class="objective">' + escapeHtml(data.businessObjective) + '</p>' +
    '<p class="hash">' + escapeHtml(data.definitionHash) + '</p>' +
    '<section class="metrics" aria-label="Replay summary">' +
      '<div class="metric"><strong data-testid="count-total">' + cases.length + '</strong><span>Historical cases</span></div>' +
      '<div class="metric pass"><strong data-testid="count-pass">' + counts.pass + '</strong><span>Passed</span></div>' +
      '<div class="metric approval_required"><strong data-testid="count-approval">' + counts.approval_required + '</strong><span>Approval required</span></div>' +
      '<div class="metric blocked"><strong data-testid="count-blocked">' + counts.blocked + '</strong><span>Blocked</span></div>' +
    '</section>' +
    '<section class="workspace">' +
      '<aside class="panel"><h2>Replay cases</h2><div class="case-list">' + cases.map((entry, index) =>
        '<button class="case" data-case-id="' + escapeHtml(entry.caseId) + '" aria-current="' + (index === 0 ? 'true' : 'false') + '">' +
          escapeHtml(entry.title) + '<small><span class="badge ' + escapeHtml(entry.observedOutcome) + '">' + escapeHtml(entry.observedOutcome.replaceAll('_',' ')) + '</span> · ' + escapeHtml(entry.reasonCode) + '</small></button>'
      ).join('') + '</div></aside>' +
      '<article id="case-detail" class="panel"></article>' +
    '</section>' +
    '<div class="topology"><span>' + data.workflowMap.nodes.length + ' map nodes</span><span>' + data.workflowMap.edges.length + ' map edges</span><span>' + data.decisionInventory.decisions.length + ' decisions</span><span>' + data.approvalSurfaces.actions.length + ' controlled actions</span></div>';
  document.querySelectorAll('.case').forEach((button) => button.addEventListener('click', () => {
    document.querySelectorAll('.case').forEach((candidate) => candidate.setAttribute('aria-current','false'));
    button.setAttribute('aria-current','true');
    renderDetail(cases.find((entry) => entry.caseId === button.dataset.caseId));
  }));
  renderDetail(cases[0]);
}

fetch('./data.json')
  .then((response) => { if (!response.ok) throw new Error('Console data failed: ' + response.status); return response.json(); })
  .then(render)
  .catch((error) => { app.innerHTML = '<pre class="error">' + escapeHtml(error.stack || error) + '</pre>'; console.error(error); });
