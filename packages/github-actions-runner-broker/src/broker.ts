export const RUNNER_LABEL = 'cloudflare-ephemeral';
export const RUNNER_LABELS = ['self-hosted', 'Linux', 'X64', RUNNER_LABEL] as const;
export const GITHUB_API_VERSION = '2026-03-10';

const encoder = new TextEncoder();

type UnknownRecord = Record<string, unknown>;

export interface RunnerLaunch {
  kind: 'launch';
  installationId: number;
  repositoryId: number;
  repository: string;
  jobId: number;
  jobName: string;
  workflowName: string;
}

export interface IgnoredWorkflowJob {
  kind: 'ignore';
  reason:
    | 'not-queued'
    | 'missing-installation'
    | 'missing-repository'
    | 'repository-not-allowed'
    | 'missing-job'
    | 'label-mismatch';
}

export type WorkflowJobClassification = RunnerLaunch | IgnoredWorkflowJob;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function readNumber(record: UnknownRecord | undefined, key: string): number | undefined {
  const value = record?.[key];
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : undefined;
}

function readString(record: UnknownRecord | undefined, key: string): string | undefined {
  const value = record?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

export function parseAllowedRepositories(value: string): Set<string> {
  return new Set(
    value
      .split(',')
      .map((repository) => repository.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function classifyWorkflowJob(
  payload: unknown,
  allowedRepositories: ReadonlySet<string>
): WorkflowJobClassification {
  if (!isRecord(payload) || payload.action !== 'queued') {
    return { kind: 'ignore', reason: 'not-queued' };
  }

  const installation = isRecord(payload.installation) ? payload.installation : undefined;
  const installationId = readNumber(installation, 'id');
  if (!installationId) {
    return { kind: 'ignore', reason: 'missing-installation' };
  }

  const repository = isRecord(payload.repository) ? payload.repository : undefined;
  const repositoryId = readNumber(repository, 'id');
  const repositoryName = readString(repository, 'full_name')?.toLowerCase();
  if (!repositoryId || !repositoryName) {
    return { kind: 'ignore', reason: 'missing-repository' };
  }
  if (!allowedRepositories.has(repositoryName)) {
    return { kind: 'ignore', reason: 'repository-not-allowed' };
  }

  const workflowJob = isRecord(payload.workflow_job) ? payload.workflow_job : undefined;
  const jobId = readNumber(workflowJob, 'id');
  const jobName = readString(workflowJob, 'name');
  const workflowName = readString(workflowJob, 'workflow_name');
  if (!jobId || !jobName || !workflowName) {
    return { kind: 'ignore', reason: 'missing-job' };
  }

  const labels = Array.isArray(workflowJob?.labels)
    ? workflowJob.labels.filter((label): label is string => typeof label === 'string')
    : [];
  if (!labels.includes(RUNNER_LABEL)) {
    return { kind: 'ignore', reason: 'label-mismatch' };
  }

  return {
    kind: 'launch',
    installationId,
    repositoryId,
    repository: repositoryName,
    jobId,
    jobName,
    workflowName
  };
}

function hexToBytes(value: string): Uint8Array | null {
  if (!/^[0-9a-f]{64}$/i.test(value)) return null;
  return new Uint8Array(value.match(/.{2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? []);
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

export async function verifyWebhookSignature(
  body: string,
  signatureHeader: string | null,
  secret: string
): Promise<boolean> {
  if (!signatureHeader?.startsWith('sha256=') || secret.length === 0) return false;
  const expected = hexToBytes(signatureHeader.slice('sha256='.length));
  if (!expected) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const actual = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(body)));
  return equalBytes(actual, expected);
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function encodeJson(value: unknown): string {
  return base64Url(encoder.encode(JSON.stringify(value)));
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const normalized = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  if (!normalized) throw new Error('GITHUB_APP_PRIVATE_KEY_PKCS8 is empty or invalid');
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0)).buffer;
}

export async function createAppJwt(
  appId: string,
  privateKeyPkcs8Pem: string,
  nowSeconds = Math.floor(Date.now() / 1000)
): Promise<string> {
  const header = encodeJson({ alg: 'RS256', typ: 'JWT' });
  const payload = encodeJson({
    iat: nowSeconds - 60,
    exp: nowSeconds + 9 * 60,
    iss: appId
  });
  const signingInput = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToPkcs8(privateKeyPkcs8Pem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    encoder.encode(signingInput)
  );
  return `${signingInput}.${base64Url(new Uint8Array(signature))}`;
}

async function githubJson<T>(
  url: string,
  token: string,
  init: RequestInit = {},
  fetcher: typeof fetch = fetch
): Promise<T> {
  const response = await fetcher(url, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'create-something-cloudflare-runner-broker',
      'X-GitHub-Api-Version': GITHUB_API_VERSION,
      ...init.headers
    }
  });
  if (!response.ok) {
    const responseBody = (await response.text()).slice(0, 1_000);
    throw new Error(`GitHub API ${response.status} for ${url}: ${responseBody}`);
  }
  return response.json() as Promise<T>;
}

export async function createInstallationToken(
  appId: string,
  privateKeyPkcs8Pem: string,
  installationId: number,
  repositoryId: number,
  fetcher: typeof fetch = fetch
): Promise<string> {
  const appJwt = await createAppJwt(appId, privateKeyPkcs8Pem);
  const response = await githubJson<{ token: string }>(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    appJwt,
    {
      method: 'POST',
      body: JSON.stringify({
        repository_ids: [repositoryId],
        permissions: { administration: 'write' }
      })
    },
    fetcher
  );
  return response.token;
}

export async function createJitConfiguration(
  repository: string,
  jobId: number,
  installationToken: string,
  fetcher: typeof fetch = fetch
): Promise<{ encodedJitConfig: string; runnerId: number; runnerName: string }> {
  const runnerName = `cf-${jobId}`;
  const response = await githubJson<{
    encoded_jit_config: string;
    runner: { id: number; name: string };
  }>(
    `https://api.github.com/repos/${repository}/actions/runners/generate-jitconfig`,
    installationToken,
    {
      method: 'POST',
      body: JSON.stringify({
        name: runnerName,
        runner_group_id: 1,
        labels: RUNNER_LABELS,
        work_folder: '_work'
      })
    },
    fetcher
  );
  return {
    encodedJitConfig: response.encoded_jit_config,
    runnerId: response.runner.id,
    runnerName: response.runner.name
  };
}
