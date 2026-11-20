import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { mkdir, open, realpath, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createDecisionService,
  type DecisionRequest,
  type DecisionSelector
} from '../../packages/owned-agent-runtime/src/decisions.js';
import { FileDecisionRepository } from '../../packages/owned-agent-runtime/src/decision-files.js';
import { createJevHttpDecisionSelector } from '../../packages/owned-agent-runtime/src/decision-transport.js';

const sha = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const POLICY = {
  version: 'internal-workflow-priority.v1',
  authority: 'advisory_only',
  scope: 'internal read-only repository validation',
  effects: 'no command execution or source mutation',
  fallback: 'defer',
  timeoutMs: 5000,
  retries: 0
};
const VALIDATORS = [
  {
    id: 'ontology-check',
    script: 'ontology:check',
    command: 'node scripts/ontology.mjs check',
    path: 'packages/database-layer/scripts/ontology.mjs',
    description:
      'Read-only structural ontology validation of the repository topology; local Node command, no external engine prerequisite.'
  },
  {
    id: 'agent-commercial-check',
    script: 'agent-commercial:contract:check',
    command: 'node scripts/verify-agent-commercial-contract.mjs',
    path: 'packages/database-layer/scripts/verify-agent-commercial-contract.mjs',
    description:
      'Read-only schema and invariant validation of the agent-commercial contract and disabled production charging controls.'
  },
  {
    id: 'business-thread-check',
    script: 'business-thread:contract:check',
    command: 'node scripts/verify-business-digital-thread-contract.mjs',
    path: 'packages/database-layer/scripts/verify-business-digital-thread-contract.mjs',
    description:
      'Read-only business digital-thread contract and example checks in default mode; explicit --write mode is excluded from this shortlist.'
  }
];
const fail = () => {
  throw new Error('ranking_source_or_output_invalid');
};
async function source(root: string, path: string) {
  const target = join(root, path);
  if ((await realpath(target)) !== target) fail();
  const handle = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const before = await handle.stat();
    if (!before.isFile() || before.size > 1048576) fail();
    const bytes = Buffer.alloc(1048577);
    const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0);
    const after = await handle.stat();
    if (bytesRead !== before.size || before.size !== after.size || before.mtimeMs !== after.mtimeMs)
      fail();
    return {
      path,
      sha256: `sha256:${sha(bytes.subarray(0, bytesRead))}`,
      text: bytes.subarray(0, bytesRead).toString('utf8')
    };
  } finally {
    await handle.close();
  }
}
async function snapshot(root: string) {
  const manifest = await source(root, 'packages/database-layer/package.json');
  const pkg = JSON.parse(manifest.text);
  if (VALIDATORS.some((v) => pkg.scripts?.[v.script] !== v.command)) fail();
  const inspected = [
    manifest,
    ...(await Promise.all(VALIDATORS.map((v) => source(root, v.path))))
  ].map(({ path, sha256 }) => ({ path, sha256 }));
  return {
    inspected,
    stateVersion: sha(JSON.stringify({ policy: POLICY, inspected })),
    candidates: [
      ...VALIDATORS.map((v) => ({
        id: v.id,
        description: `${v.description} Source: ${v.path}; ${inspected.find((x) => x.path === v.path)!.sha256}.`
      })),
      {
        id: 'defer',
        description:
          'Defer promotion when supplied evidence does not justify prioritizing an offered internal validator. Grants no execution authority.'
      }
    ]
  };
}
/** Real transport by default. Injected selectors are explicitly labeled test/non-live evidence. */
export async function rankInternalValidators({
  repoRoot,
  outDir,
  selector
}: {
  repoRoot: string;
  outDir: string;
  selector?: DecisionSelector;
}) {
  const repo = await realpath(resolve(repoRoot));
  const out = resolve(outDir),
    parent = await realpath(dirname(out));
  const physical = join(parent, out.split(/[\\/]/).at(-1)!);
  const rel = relative(repo, physical);
  if (rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel))) fail();
  const observed = await snapshot(repo);
  const id = `internal-priority.${randomUUID()}`;
  const request = (state: Awaited<ReturnType<typeof snapshot>>): DecisionRequest => ({
    id,
    scope: 'workflow-discovery-internal-priority',
    policyVersion: POLICY.version,
    stateVersion: state.stateVersion,
    question:
      'Which observed internal read-only validator should an operator inspect first for the first registered workflow canary? Prefer bounded local prerequisites and clear verifiable output; consider source evidence only. This recommendation does not authorize execution or activation.',
    candidates: state.candidates,
    fallbackId: 'defer',
    mode: 'fresh'
  });
  const live = selector === undefined;
  const provider = selector ?? createJevHttpDecisionSelector(process.env.TYPESAFE_API_KEY ?? '');
  await mkdir(out, { mode: 0o700 });
  const repository = new FileDecisionRepository(join(out, 'decisions'));
  const receipt = await createDecisionService({
    repository,
    selector: provider,
    timeoutMs: 5000
  }).decide(request(observed), async () => request(await snapshot(repo)));
  const verified = await repository.getDecision(receipt.request.scope, receipt.request.id);
  if (!verified || verified.requestHash !== receipt.requestHash) fail();
  const report = {
    schema: 'workflow-discovery-priority@1',
    recordedAt: new Date().toISOString(),
    authority: 'advisory_only',
    liveProviderVerified: live && ['selected', 'abstained'].includes(receipt.reason),
    policySha256: `sha256:${sha(JSON.stringify(POLICY))}`,
    candidateEvidenceSha256: `sha256:${observed.stateVersion}`,
    inspectedSources: observed.inspected,
    requestHash: receipt.requestHash,
    requestedModel: provider.model,
    servedModel: live && receipt.reason === 'selected' ? provider.model : null,
    timeoutMs: 5000,
    retries: 0,
    downstreamImprovement: 'not_established',
    receipt
  };
  await writeFile(join(out, 'ranking.json'), JSON.stringify(report, null, 2) + '\n', {
    flag: 'wx',
    mode: 0o600
  });
  return report;
}
async function main(args: string[]) {
  const flags = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    if (!['--repo', '--out', '--provider'].includes(args[i]) || !args[i + 1] || flags.has(args[i]))
      fail();
    flags.set(args[i], args[i + 1]);
  }
  if (flags.get('--provider') !== 'jev' || !flags.has('--out')) fail();
  const result = await rankInternalValidators({
    repoRoot: flags.get('--repo') ?? process.cwd(),
    outDir: flags.get('--out')!
  });
  console.log(
    JSON.stringify({
      schema: result.schema,
      authority: result.authority,
      liveProviderVerified: result.liveProviderVerified,
      selectedId: result.receipt.selectedId,
      reason: result.receipt.reason,
      fallback: result.receipt.fallback,
      elapsedMs: result.receipt.elapsedMs,
      requestedModel: result.requestedModel,
      requestHash: result.requestHash
    })
  );
  if (!result.liveProviderVerified) process.exitCode = 1;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  main(args[0] === 'run' ? args.slice(1) : args).catch(() => {
    console.error(
      'Workflow ranking held: verify source contracts, private output and configured Jev access.'
    );
    process.exitCode = 1;
  });
}
