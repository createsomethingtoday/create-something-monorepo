import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const stages = ['prototype', 'local', 'merged', 'released', 'business-accepted'];
const gateNames = ['functional', 'product', 'release'];
const text = value => typeof value === 'string' && value.trim().length > 0;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const strings = value => Array.isArray(value) && value.every(text);
const nonempty = value => strings(value) && value.length > 0;
const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const identity = value => typeof value === 'string' ? value.trim().toLowerCase() : '';

export function initialize() {
  return {
    version: 1, issue: '', request: '', repository: '', owner: '', builder: '', scope: '',
    changeType: 'maintenance', acceptance: [], policy: [], allowedActions: [],
    sourceRevision: '', stage: 'local',
    gates: Object.fromEntries(gateNames.map(name => [name, { status: 'untested', evidence: [], limits: 'Pending' }])),
    independentReview: { status: 'pending', reviewer: '', sourceRevision: '', evidence: [] },
    merge: { receipt: '', revision: '' },
    release: { authorization: '', artifact: '', sourceRevision: '', liveVerification: [], rollback: '' },
    businessAcceptance: '', followUp: [], metrics: []
  };
}

// Structural consistency only. Receipt contents, identities and authorization must
// be verified by the owning reviewer. This function never opens or executes evidence.
export function validate(record) {
  const errors = [];
  const need = (condition, message) => { if (!condition) errors.push(message); };
  if (!object(record)) return ['record must be an object'];
  need(record.version === 1, 'unsupported version');
  for (const key of ['issue', 'request', 'repository', 'owner', 'builder', 'scope']) need(text(record[key]), `${key} required`);
  need(typeof record.issue === 'string' && /^[A-Z][A-Z0-9]*-\d+$/.test(record.issue), 'Linear issue required');
  need(sha(record.sourceRevision), 'sourceRevision must be full evaluated Git SHA');
  need(['feature', 'bug', 'maintenance'].includes(record.changeType), 'invalid changeType');
  for (const key of ['acceptance', 'policy', 'allowedActions', 'followUp']) need(nonempty(record[key]), `${key} must contain text`);
  need(stages.includes(record.stage), 'invalid stage');
  for (const key of gateNames) {
    const gate = record.gates?.[key];
    need(object(gate), `${key} gate required`);
    need(['passed', 'failed', 'untested', 'not-applicable'].includes(gate?.status), `${key} status invalid`);
    need(strings(gate?.evidence), `${key} evidence invalid`);
    need(text(gate?.limits), `${key} limits required`);
    if (gate?.status === 'passed') need(nonempty(gate.evidence), `${key} passed requires evidence`);
  }
  const review = record.independentReview;
  need(object(review) && ['pending', 'passed', 'failed'].includes(review.status), 'review status invalid');
  need(typeof review?.reviewer === 'string' && strings(review?.evidence), 'review fields invalid');
  if (review?.status === 'passed') {
    need(text(review.reviewer) && nonempty(review.evidence), 'review proof required');
    need(identity(review.reviewer) !== identity(record.builder), 'reviewer must differ from builder');
    need(review.sourceRevision === record.sourceRevision, 'review must cover evaluated revision');
  }
  const release = record.release;
  need(object(release), 'release must be an object');
  for (const key of ['authorization', 'artifact', 'sourceRevision', 'rollback']) need(typeof release?.[key] === 'string', `release ${key} must be text`);
  need(strings(release?.liveVerification), 'liveVerification must be a list');
  need(object(record.merge) && typeof record.merge.receipt === 'string' && typeof record.merge.revision === 'string', 'merge fields invalid');
  if (stages.indexOf(record.stage) >= stages.indexOf('merged')) {
    need(text(record.merge?.receipt) && sha(record.merge?.revision), 'merge proof required');
    need(review?.status === 'passed', 'independent review required');
    need(record.gates?.functional?.status === 'passed', 'functional must pass before promotion');
    need(['passed', 'not-applicable'].includes(record.gates?.product?.status), 'product must pass or be not-applicable before promotion');
  }
  if (['released', 'business-accepted'].includes(record.stage)) {
    for (const key of ['authorization', 'artifact', 'rollback']) need(text(release?.[key]), `release ${key} required`);
    need(nonempty(release?.liveVerification), 'live verification required');
    need(release?.sourceRevision === record.sourceRevision, 'release must bind evaluated revision');
    need(record.gates?.release?.status === 'passed', 'release must pass before release');
  }
  if (record.stage === 'business-accepted') need(text(record.businessAcceptance), 'business acceptance receipt required');
  need(Array.isArray(record.metrics), 'metrics must be a list');
  const metricKeys = new Set();
  for (const metric of Array.isArray(record.metrics) ? record.metrics : []) {
    if (!object(metric)) { errors.push('metric must be an object'); continue; }
    for (const key of ['name', 'unit', 'source', 'limits', 'cohort', 'window']) need(text(metric[key]), `metric ${key} required`);
    need(['baseline', 'observation'].includes(metric.period), 'invalid metric period');
    need(Number.isInteger(metric.sampleSize) && metric.sampleSize >= 0, 'invalid sampleSize');
    need(metric.value === null || (Number.isFinite(metric.value) && metric.value >= 0), 'invalid metric value');
    if (metric.value === null) need(text(metric.reason), 'unavailable metric needs reason');
    else need(metric.sampleSize > 0, 'measured values require samples');
    const key = JSON.stringify([metric.name, metric.period, metric.cohort, metric.window]);
    need(!metricKeys.has(key), 'duplicate metric observation');
    metricKeys.add(key);
  }
  return errors;
}

export function report(record) {
  return {
    ...record,
    measurement: {
      status: record.metrics.length ? 'reported' : 'unavailable',
      limits: 'Caller-reported observations; no causal uplift inferred. Empty metrics means not collected, never zero.',
      baselineCount: record.metrics.filter(metric => metric.period === 'baseline').length,
      observationCount: record.metrics.filter(metric => metric.period === 'observation').length
    },
    authority: 'Descriptive evidence only; validation does not authenticate receipts or grant permission.'
  };
}

export function main(args) {
  const [command, file, ...extra] = args;
  if (extra.length || !file || !['init', 'validate', 'report'].includes(command)) throw Error('Usage: init|validate|report FILE');
  if (command === 'init') {
    writeFileSync(file, `${JSON.stringify(initialize(), null, 2)}\n`, { flag: 'wx' });
    return;
  }
  const record = JSON.parse(readFileSync(file, 'utf8'));
  const errors = validate(record);
  if (errors.length) throw Error(errors.join('\n'));
  console.log(command === 'report' ? JSON.stringify(report(record), null, 2) : 'Valid change evidence v1');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
