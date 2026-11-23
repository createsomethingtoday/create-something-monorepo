#!/usr/bin/env node
/** Synthetic labeled vocabulary benchmark. No repository or customer data is read. */
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';

const item = (id, name, description) => ({ id, name, description, excerpt: description });
// Ground truth stays outside the subject/candidates supplied to either ranker.
export const benchmarkCases = [
  { id: 'v01', subject: item('s01', 'Incident response', 'Coordinate service outage recovery.'), candidates: [item('c01', 'Incident response', 'Coordinate service outage recovery.'), item('c02', 'Change management', 'Approve planned service changes.')], expected: 'c01' },
  { id: 'v02', subject: item('s02', '  CUSTOMER   ONBOARDING ', 'Activate a newly signed customer account.'), candidates: [item('c03', 'Customer onboarding', 'Activate a newly signed customer account.'), item('c04', 'Employee onboarding', 'Provision access for a new hire.')], expected: 'c03' },
  { id: 'v03', subject: item('s03', 'New client activation', 'Move a signed customer through setup, training and first successful use.'), candidates: [item('c05', 'Customer onboarding', 'Set up and train newly signed customers through first successful use.'), item('c06', 'Lead qualification', 'Assess prospects before a contract is signed.')], expected: 'c05' },
  { id: 'v04', subject: item('s04', 'DR', 'Restore production services from backups after a regional outage.'), candidates: [item('c07', 'Disaster recovery', 'Restore services and data after infrastructure failure.'), item('c08', 'Design review', 'Evaluate visual and interaction design before implementation.')], expected: 'c07' },
  { id: 'v05', subject: item('s05', 'Queue', 'An ordered backlog of human support requests.'), candidates: [item('c09', 'Queue', 'A broker buffer holding messages for asynchronous consumers.'), item('c10', 'Support backlog', 'Human support requests waiting to be handled.')], expected: 'c10' },
  { id: 'v06', subject: item('s06', 'Release', 'Publish a tested application version to production.'), candidates: [item('c11', 'Release', 'Publish a tested application version to production.'), item('c12', 'Release', 'Free a reserved warehouse inventory allocation.')], expected: 'c11' },
  { id: 'v07', subject: item('s07', 'Billing reconciliation', 'Compare invoices to payments and resolve accounting discrepancies.'), candidates: [item('c13', 'Invoice generation', 'Create invoices from billable usage.'), item('c14', 'Payment retry', 'Retry failed card charges.')], expected: 'no_match' },
  { id: 'v08', subject: item('s08', 'Access review', 'Periodically verify that existing staff permissions remain appropriate.'), candidates: [item('c15', 'Access provisioning', 'Grant initial permissions to staff.'), item('c16', 'Access revocation', 'Remove permissions when a staff member leaves.')], expected: 'no_match' },
  { id: 'v09', subject: item('s09', 'Renewal forecast', 'Estimate which annual customer contracts will renew.'), candidates: [item('c17', 'Contract renewal prediction', 'Estimate the likelihood of existing customer contracts renewing.'), item('c18', 'Revenue forecast', 'Estimate total future revenue across all sources.')], expected: 'c17' },
  { id: 'v10', subject: item('s10', 'Escalation', 'Route an urgent security alert to an on-call responder.'), candidates: [item('c19', 'Escalation', 'Route a sales negotiation to a senior account executive.'), item('c20', 'Security incident routing', 'Send urgent security alerts to on-call responders.')], expected: 'c20' },
  { id: 'v11', subject: item('s11', 'Quarterly planning', 'Set team goals and capacity for the next quarter.'), candidates: [], expected: 'no_match' },
  { id: 'v12', subject: item('s12', 'Retention', 'Define the duration for which audit logs must be stored.'), candidates: [item('c21', 'Retention', 'Keep customers subscribed to a product.'), item('c22', 'Archival', 'Move infrequently accessed files into lower-cost storage.')], expected: 'no_match' },
];

export function normalizeName(name) {
  return name.normalize('NFKC').trim().toLowerCase().replace(/\s+/gu, ' ');
}

export function exactNameBaseline({ subject, candidates }) {
  const matches = candidates.filter(candidate => normalizeName(candidate.name) === normalizeName(subject.name));
  return { choice: matches.length === 1 ? matches[0].id : 'no_match', model: 'exact-normalized-name' };
}

function score(expected, actual) {
  return {
    correct: actual === expected,
    incorrectMerge: actual !== 'no_match' && actual !== expected,
    missedDuplicate: expected !== 'no_match' && actual !== expected,
  };
}

export async function evaluateRanker(cases, ranker) {
  const started = performance.now();
  const results = [];
  for (const testCase of cases) {
    const caseStarted = performance.now();
    // Explicit projection prevents expected labels and case IDs reaching the provider.
    const input = { subject: structuredClone(testCase.subject), candidates: structuredClone(testCase.candidates) };
    try {
      const result = await ranker(input);
      if (!result || (result.choice !== 'no_match' && !input.candidates.some(candidate => candidate.id === result.choice))) {
        throw new Error('Ranker returned an invalid candidate choice');
      }
      results.push({ id: testCase.id, expected: testCase.expected, choice: result.choice, model: result.model ?? null, ...score(testCase.expected, result.choice), elapsedMs: Math.round((performance.now() - caseStarted) * 100) / 100, providerError: null });
    } catch (error) {
      // Provider failures are errors, never successful abstentions or scored model decisions.
      results.push({ id: testCase.id, expected: testCase.expected, choice: null, correct: false, incorrectMerge: false, missedDuplicate: false, elapsedMs: Math.round((performance.now() - caseStarted) * 100) / 100, providerError: { status: Number.isInteger(error?.status) ? error.status : null, name: error?.name ?? 'Error', message: String(error?.message ?? error).replace(/Bearer\s+\S+|sk-[\w-]+/gi, '[redacted]').slice(0, 400) } });
    }
  }
  const successful = results.filter(result => !result.providerError);
  return {
    elapsedMs: Math.round((performance.now() - started) * 100) / 100,
    totalCases: results.length,
    scoredCases: successful.length,
    correct: successful.filter(result => result.correct).length,
    incorrectMerges: successful.filter(result => result.incorrectMerge).length,
    missedDuplicates: successful.filter(result => result.missedDuplicate).length,
    providerErrors: results.length - successful.length,
    results,
  };
}

export async function main(args = process.argv.slice(2)) {
  if (args.includes('--help')) {
    console.log('Usage: node evaluate-vocabulary-shadow.mjs [--live jev|openai]\nDefault: offline exact normalized name baseline. --live jev|openai also sends only the built-in synthetic cases to rankVocabulary. Output is JSON. Operator time is not measured.');
    return;
  }
  const liveProvider = args[0] === '--live' ? args[1] : null;
  if (args.length && !(args.length === 2 && args[0] === '--live' && ['jev', 'openai'].includes(liveProvider))) throw new Error('Unknown arguments. Use --live jev, --live openai, or --help.');
  const baseline = await evaluateRanker(benchmarkCases, exactNameBaseline);
  let shadow = null;
  if (liveProvider) {
    const { rankVocabulary } = await import('./lib/vocabulary-decision.mjs');
    shadow = await evaluateRanker(benchmarkCases, input => input.candidates.length ? rankVocabulary(input, { provider: liveProvider }) : {choice: 'no_match', model: 'empty-shortlist-local'});
  }
  console.log(JSON.stringify({
    schemaVersion: 1,
    dataset: 'synthetic-vocabulary-v1',
    live: Boolean(liveProvider),
    provider: liveProvider,
    operatorTime: { measured: false, value: null },
    limitations: ['Small synthetic fixture, not a production accuracy estimate.', 'Elapsed time measures script/ranker wall time, not operator effort.', 'A wrong candidate for a true duplicate counts as both an incorrect merge and a missed duplicate.', 'Provider errors are reported separately and excluded from decision counts.'],
    baseline,
    shadow,
  }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
