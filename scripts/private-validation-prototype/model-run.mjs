import { readFile, writeFile, mkdir, rm, open } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseEnv } from 'node:util';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { MODEL_POLICY, CASES, requestFor, executeProposal } from './model-policy.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const [environmentFile, reportPath] = process.argv.slice(2);
if (!environmentFile || !reportPath) throw new Error('Usage: node model-run.mjs ENV_FILE NEW_EVIDENCE_FILE');
const infisicalSecret = ['infisical:OPENAI_API_KEY', 'infisical:WEBFLOW_OPENAI_API_KEY'].includes(environmentFile)
  ? environmentFile.slice('infisical:'.length) : null;
const key = infisicalSecret
  ? execFileSync('infisical', ['secrets', 'get', infisicalSecret, '--env=prod', '--plain',
    '--projectId=e1532079-2f2b-46b5-8972-cf7a025eb803'], { encoding: 'utf8', timeout: 15000 }).trim()
  : parseEnv(await readFile(environmentFile, 'utf8')).OPENAI_API_KEY;
if (!key) throw new Error('OPENAI_API_KEY unavailable');
const lock = path.join(here, '.model-run.lock');
await mkdir(lock); // Never steal a lock or automatically replay a charged request.
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const report = { schema: 'private-owned-agent-evidence/v1', authority: 'prototype-only',
  policy: MODEL_POLICY, startedAt: new Date().toISOString(), receipts: [], attemptsReserved: 0,
  provider: 'OpenAI Responses API', executor: 'owned deterministic Node workflow',
  credentialReference: infisicalSecret ?? 'operator-supplied-env-file',
  codexInvocationTested: false, cloudflareTested: false };
try {
  const output = await open(reportPath, 'wx'); // Existing evidence cannot be overwritten and silently rebilled.
  await output.close();
  const skill = await readFile(path.join(here, 'fixtures/owned-agent/SKILL.md'), 'utf8');
  report.skillSha256 = sha(skill);
  report.sourceSha256 = Object.fromEntries(await Promise.all(['model-run.mjs', 'model-policy.mjs'].map(async file =>
    [file, sha(await readFile(path.join(here, file)))])));
  for (let trial = 0; trial < 2; trial++) for (const scenario of CASES) {
    if (report.attemptsReserved >= MODEL_POLICY.calls) throw new Error('Model call budget exhausted');
    const body = requestFor(skill, scenario.input);
    report.attemptsReserved++;
    await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
    const started = Date.now();
    // Fixed destination, no redirects, retries or credentials exposed to the model/fixture.
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', redirect: 'error',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(MODEL_POLICY.timeoutMs),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(`Provider HTTP ${response.status}: ${data.error?.code ?? 'unknown'}`);
    if (data.status !== 'completed' || data.model !== MODEL_POLICY.model) throw new Error('Incomplete response or model mismatch');
    if (!Number.isSafeInteger(data.usage?.input_tokens) || !Number.isSafeInteger(data.usage?.output_tokens)) {
      throw new Error('Missing authoritative token usage');
    }
    const text = data.output?.flatMap(item => item.content ?? []).filter(c => c.type === 'output_text').map(c => c.text).join('');
    let proposal, outcome, error;
    try { proposal = JSON.parse(text); outcome = executeProposal(proposal); }
    catch (e) { error = e.message; }
    const passed = !error && outcome.tool === scenario.tool && outcome.result === scenario.result;
    report.receipts.push({ case: scenario.id, trial, passed, proposal, outcome, error,
      responseId: data.id, model: data.model, usage: data.usage, elapsedMs: Date.now() - started,
      requestSha256: sha(JSON.stringify(body)) });
    await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
    console.log(`${scenario.id} trial ${trial + 1}: ${passed ? 'passed' : 'failed'}`);
  }
  report.passed = report.receipts.length === MODEL_POLICY.calls && report.receipts.every(r => r.passed);
  report.usage = report.receipts.reduce((a, r) => ({ inputTokens: a.inputTokens + r.usage.input_tokens,
    outputTokens: a.outputTokens + r.usage.output_tokens }), { inputTokens: 0, outputTokens: 0 });
  report.estimatedModelUsd = (report.usage.inputTokens * MODEL_POLICY.inputUsdPerMillion
    + report.usage.outputTokens * MODEL_POLICY.outputUsdPerMillion) / 1e6;
  report.estimateNote = 'List-price estimate using total input without cache discounts; not a provider invoice.';
  report.endedAt = new Date().toISOString();
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
  if (!report.passed) process.exitCode = 1;
} catch (error) {
  // Preserve previous evidence if the output file already exists.
  if (error.code !== 'EEXIST') {
    report.passed = false; report.error = error.message; report.endedAt = new Date().toISOString();
    await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
  }
  console.error(error.message); process.exitCode = 1;
} finally { await rm(lock, { recursive: true }); }
