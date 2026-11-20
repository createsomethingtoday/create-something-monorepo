import { validateLifecycle } from './lifecycle.mjs';
const REPO = 'repos/createsomethingtoday/create-something-monorepo';
export const STATE_BRANCH = 'automation/workflow-discovery-state';
const FILE = `${REPO}/contents/data/workflow-discovery/lifecycle.json`;
const SHA = /^[a-f0-9]{40}$/;
export async function githubApi(method, path, body) {
  try {
    const args = ['api', '--hostname', 'github.com', '--method', method, path];
    if (body !== undefined) args.push('--input', '-');
    // Structured stdin is never interpreted as a shell command.
    const { spawn } = await import('node:child_process');
    return await new Promise((resolve, reject) => {
      const child = spawn('gh', args, { stdio: ['pipe', 'pipe', 'pipe'] });
      let out = '',
        err = '',
        bytes = 0;
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error('state_timeout'));
      }, 15000);
      child.on('error', () => {
        clearTimeout(timer);
        reject(new Error('state_transport_failed'));
      });
      for (const [stream, key] of [
        [child.stdout, 'out'],
        [child.stderr, 'err']
      ])
        stream.on('data', (data) => {
          bytes += data.length;
          if (bytes > 2 * 1048576) {
            child.kill('SIGKILL');
            return;
          }
          if (key === 'out') out += data;
          else err += data;
        });
      child.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          const e = new Error('state_api_failed');
          e.status = /HTTP 404/.test(err) ? 404 : undefined;
          reject(e);
          return;
        }
        try {
          resolve(JSON.parse(out));
        } catch {
          reject(new Error('state_invalid'));
        }
      });
      child.stdin.end(body === undefined ? '' : JSON.stringify(body));
    });
  } catch (error) {
    throw error;
  }
}
function runsShape(runs) {
  if (!Array.isArray(runs) || runs.length > 512) throw new Error('state_invalid');
  const ids = new Set();
  for (const run of runs) {
    const keys = [
      'runId',
      'registrationId',
      'sourceCommit',
      'observedAt',
      'status',
      'evidenceSha256',
      'runUrl'
    ];
    if (
      !run ||
      Object.keys(run).length !== keys.length ||
      keys.some((k) => !Object.hasOwn(run, k)) ||
      typeof run.runId !== 'string' ||
      run.runId.length > 128 ||
      ids.has(run.runId) ||
      typeof run.registrationId !== 'string' ||
      run.registrationId.length > 256 ||
      !SHA.test(run.sourceCommit) ||
      !['passed', 'held'].includes(run.status) ||
      !/^sha256:[a-f0-9]{64}$/.test(run.evidenceSha256) ||
      !Number.isFinite(Date.parse(run.observedAt)) ||
      new Date(run.observedAt).toISOString() !== run.observedAt ||
      !/^https:\/\/github\.com\/createsomethingtoday\/create-something-monorepo\/actions\/runs\/[0-9]+$/.test(
        run.runUrl
      )
    )
      throw new Error('state_invalid');
    ids.add(run.runId);
  }
  return runs;
}
function shape(value) {
  if (!value || Object.keys(value).length !== 3 || value.schema !== 'workflow-discovery-state@1')
    throw new Error('state_invalid');
  validateLifecycle(value.lifecycle);
  runsShape(value.runs);
  return value;
}
export async function loadLifecycle({ api = githubApi } = {}) {
  let value;
  try {
    value = await api('GET', `${FILE}?ref=${encodeURIComponent(STATE_BRANCH)}`);
  } catch (error) {
    if (error.status !== 404) throw error;
    try {
      await api('GET', `${REPO}/git/ref/heads/${STATE_BRANCH}`);
    } catch (refError) {
      if (refError.status === 404) return { ledger: null, sha: null, runs: [] };
      throw refError;
    }
    throw new Error('state_file_missing_existing_branch');
  }
  try {
    if (
      !SHA.test(value.sha) ||
      value.encoding !== 'base64' ||
      typeof value.content !== 'string' ||
      value.content.length > 1400000
    )
      throw new Error();
    const state = shape(JSON.parse(Buffer.from(value.content, 'base64').toString('utf8')));
    return { ledger: state.lifecycle, runs: state.runs, sha: value.sha };
  } catch {
    throw new Error('state_invalid');
  }
}
export async function saveLifecycle({ api = githubApi, ledger, sha, runs = [] }) {
  const state = shape({ schema: 'workflow-discovery-state@1', lifecycle: ledger, runs });
  if (sha !== null && !SHA.test(sha)) throw new Error('state_invalid_sha');
  const serialized = JSON.stringify(state, null, 2) + '\n';
  if (Buffer.byteLength(serialized) > 950000) throw new Error('state_capacity_exceeded');
  if (sha === null) {
    const main = await api('GET', `${REPO}/git/ref/heads/main`);
    if (!SHA.test(main?.object?.sha)) throw new Error('state_invalid_main');
    await api('POST', `${REPO}/git/refs`, {
      ref: `refs/heads/${STATE_BRANCH}`,
      sha: main.object.sha
    });
  }
  const result = await api('PUT', FILE, {
    branch: STATE_BRANCH,
    message: 'chore(workflows): reconcile derived lifecycle state [skip ci]',
    content: Buffer.from(serialized).toString('base64'),
    ...(sha === null ? {} : { sha })
  });
  if (!SHA.test(result?.content?.sha)) throw new Error('state_write_unverified');
  // Independent readback is part of success; no retry on a conflicting write.
  const readback = await loadLifecycle({ api });
  if (
    JSON.stringify(readback.ledger) !== JSON.stringify(ledger) ||
    JSON.stringify(readback.runs) !== JSON.stringify(runs) ||
    readback.sha !== result.content.sha
  )
    throw new Error('state_readback_mismatch');
  return { branch: STATE_BRANCH, sha: result.content.sha };
}
