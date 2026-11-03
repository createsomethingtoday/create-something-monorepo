import { createHash, randomUUID } from 'node:crypto';
import {
  mkdir,
  readFile,
  writeFile,
  rename,
  readdir,
  lstat,
  realpath,
  open,
  unlink
} from 'node:fs/promises';
import { resolve, relative, join, dirname, isAbsolute, sep } from 'node:path';
import { scanRepository } from './scan.mjs';
import { selectCandidates } from './lifecycle.mjs';

const canonical = (value) =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, canonical(value[key])])
        )
      : value;
const json = (value) => JSON.stringify(canonical(value));
const hash = (value) => `sha256:${createHash('sha256').update(value).digest('hex')}`;
const digest = (value) => hash(json(value));
const OWNER = 'create-something/workflow-discovery-output@1\n';
const PATTERNS = ['package-validation', 'release-evidence', 'contract-reconciliation'];
const safePath = (path) =>
  typeof path === 'string' &&
  path.length > 0 &&
  !isAbsolute(path) &&
  !path.split('/').some((part) => ['..', '.', ''].includes(part)) &&
  !path.includes('\\');
async function exists(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}
async function boundedRead(path, limit = 1048576) {
  const stat = await lstat(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > limit)
    throw new Error('discovery_input_bounds');
  const bytes = await readFile(path);
  if (bytes.length > limit) throw new Error('discovery_input_bounds');
  return bytes;
}
function exact(value, keys) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key))
  )
    throw new Error('discovery_unknown_schema_or_fields');
}

async function historySummary(file, now) {
  if (!file) return { coverage: 'skipped', reason: 'local_history_not_supplied', patterns: [] };
  const value = JSON.parse(await boundedRead(file));
  exact(value, ['schema', 'coverage', 'observedAt', 'events']);
  if (
    value.schema !== 'workflow-discovery-history@1' ||
    value.coverage !== 'bounded_existing_index' ||
    !Array.isArray(value.events) ||
    value.events.length > 200
  )
    throw new Error('discovery_history_invalid');
  const observed = Date.parse(value.observedAt);
  if (
    !Number.isFinite(observed) ||
    new Date(observed).toISOString() !== value.observedAt ||
    observed > now
  )
    throw new Error('discovery_history_time_invalid');
  const groups = new Map();
  for (const event of value.events) {
    exact(event, ['pattern', 'sessionId', 'eventId', 'evidenceSha256']);
    if (
      !PATTERNS.includes(event.pattern) ||
      !/^sha256:[a-f0-9]{64}$/.test(event.evidenceSha256) ||
      ![event.sessionId, event.eventId].every((id) =>
        /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id)
      )
    )
      throw new Error('discovery_history_invalid');
    if (!groups.has(event.pattern))
      groups.set(event.pattern, { sessions: new Set(), hashes: new Set() });
    groups.get(event.pattern).sessions.add(event.sessionId);
    groups.get(event.pattern).hashes.add(event.evidenceSha256);
  }
  return {
    coverage: now - observed > 7 * 86400000 ? 'stale' : 'bounded_local_signals',
    exhaustive: false,
    observedAt: value.observedAt,
    sourceSha256: digest(value),
    patterns: [...groups]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([pattern, group]) => ({
        pattern,
        distinctSessions: group.sessions.size,
        evidenceSha256: [...group.hashes].sort()
      }))
  };
}

function definition(source, pattern, scripts) {
  const identity = hash(`${source.path}\0${pattern}`).slice(7, 27);
  const owner = 'repository-operator';
  const steps = scripts.map((name, index) => ({ id: `review_${index + 1}`, name }));
  return {
    schemaVersion: 'workflow_definition.v0.3',
    workflowId: `discovered.${pattern}.${identity}`,
    version: '0.1.0',
    title: `Review ${pattern} for ${source.name}`,
    businessObjective:
      'Review an evidence-backed recurring repository procedure before authorizing an execution contract.',
    owners: { workflow: owner, policy: owner, technical: owner },
    systems: [
      {
        id: 'repository',
        title: 'Repository contracts',
        tier: 'database',
        owningSurface: source.path,
        sourceOfTruth: true
      }
    ],
    objects: [],
    events: [],
    actors: [
      {
        id: owner,
        title: 'Unassigned repository operator role; requires explicit ownership review'
      }
    ],
    states: [
      { id: 'discovered', title: 'Discovered' },
      ...steps.map((step, index) => ({
        id: `reviewed_${index + 1}`,
        title: `Contract review ${index + 1}`,
        terminal: index === steps.length - 1
      }))
    ],
    actions: steps.map((step) => ({
      id: step.id,
      title: `Review ${source.path} script ${step.name}`,
      kind: 'decision',
      authority: owner,
      autonomy: 'approval_required',
      systemsTouched: ['repository'],
      requiredEvidence: ['source_sha256', 'execution_contract'],
      requiredEvidenceValues: { source_sha256: source.sha256 },
      approval: { required: true, owner },
      receipt: { requiredFields: ['workflow_id', 'action_id', 'correlation_id', 'outcome'] },
      recovery: {
        mode: 'manual_fallback',
        owner,
        path: 'Hold for operator review; never execute or rewrite the discovered source automatically.'
      }
    })),
    transitions: steps.map((step, index) => ({
      id: `transition_${index + 1}`,
      from: index === 0 ? 'discovered' : `reviewed_${index}`,
      to: `reviewed_${index + 1}`,
      actionId: step.id
    })),
    agents: [],
    evaluations: steps.map((step) => ({
      id: `approval_${step.id}`,
      title: 'Execution contract requires explicit review',
      actionId: step.id,
      expectedOutcome: 'approval_required',
      requiredEvidence: ['source_sha256', 'execution_contract']
    }))
  };
}

export async function createWorkflowCatalog(inventory, history, { maximumCandidates = 64 } = {}) {
  const { compileWorkflowDefinition } =
    await import('../../packages/workflow-compiler/dist/index.js');
  if (!Number.isSafeInteger(maximumCandidates) || maximumCandidates < 1 || maximumCandidates > 256)
    throw new Error('discovery_candidate_limit_invalid');
  const proposed = [];
  for (const source of inventory.packages) {
    const names = source.scriptNames;
    const validation = ['build', names.includes('check') ? 'check' : 'typecheck', 'test'].filter(
      (name) => names.includes(name)
    );
    if (validation.length >= 2)
      proposed.push({ source, pattern: 'package-validation', scripts: validation });
    const release = names.filter((name) => /^(deploy|release|publish)(:|$)/.test(name));
    if (release.length)
      proposed.push({ source, pattern: 'release-evidence', scripts: release.slice(0, 8) });
    const contracts = names.filter((name) =>
      /(contract|ontology|reconcil).*(check|test|verify)|^(check|test|verify).*contract/.test(name)
    );
    if (contracts.length)
      proposed.push({ source, pattern: 'contract-reconciliation', scripts: contracts.slice(0, 8) });
  }
  const { selected, deferred } = selectCandidates(proposed, maximumCandidates);
  const candidateIndex = proposed
    .map((entry) => {
      const workflow = definition(entry.source, entry.pattern, entry.scripts);
      return {
        id: workflow.workflowId,
        pattern: entry.pattern,
        source: { path: entry.source.path, sha256: entry.source.sha256 },
        definitionSha256: digest(workflow)
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
  const candidates = selected.map((entry) => {
    const workflow = definition(entry.source, entry.pattern, entry.scripts);
    compileWorkflowDefinition(workflow);
    return {
      id: workflow.workflowId,
      pattern: entry.pattern,
      source: {
        path: entry.source.path,
        sha256: entry.source.sha256,
        pointers: entry.scripts.map(
          (name) => `/scripts/${name.replaceAll('~', '~0').replaceAll('/', '~1')}`
        )
      },
      validation: 'compiler_validated',
      execution: 'not_run',
      authority: 'candidate_only',
      unresolved: ['execution_owner', 'execution_contract', 'activation'],
      historySignal: history.patterns.find((item) => item.pattern === entry.pattern) ?? null,
      definition: workflow
    };
  });
  const existingWorkflows = inventory.workflows.map((source) => {
    compileWorkflowDefinition(source.definition);
    return {
      path: source.path,
      sha256: source.sha256,
      workflowId: source.definition.workflowId,
      validation: 'compiler_validated',
      execution: 'not_run'
    };
  });
  const catalog = {
    schema: 'workflow-discovery-catalog@1',
    authority: 'candidate_only',
    inventoryDigest: inventory.digest,
    coverage: {
      packageSources: inventory.packages.length,
      existingWorkflowSources: inventory.workflows.length,
      githubWorkflowSources: inventory.githubWorkflows.length,
      proposed: proposed.length,
      emitted: candidates.length,
      deferred: proposed.length - candidates.length
    },
    history,
    candidates,
    existingWorkflows,
    candidateIndex,
    deferred: deferred.map((entry) => ({
      path: entry.source.path,
      pattern: entry.pattern,
      reason: 'bounded_candidate_capacity'
    })),
    safety: { commandsExecuted: 0, sourceMutations: 0, policyChanges: 0, activations: 0 }
  };
  return { ...catalog, digest: digest(catalog) };
}

async function collectFiles(root, prefix = '') {
  const result = [];
  for (const entry of (await readdir(join(root, prefix), { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name)
  )) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    const stat = await lstat(join(root, path));
    if (stat.isSymbolicLink() || (!stat.isFile() && !stat.isDirectory()))
      throw new Error('discovery_output_type_invalid');
    if (stat.isDirectory()) result.push(...(await collectFiles(root, path)));
    else if (path !== 'artifacts.json')
      result.push({ path, sha256: hash(await boundedRead(join(root, path), 4 * 1048576)) });
    if (result.length > 8192) throw new Error('discovery_output_limit');
  }
  return result;
}
async function ownedRoot(root) {
  if (
    (await lstat(root)).isSymbolicLink() ||
    (await boundedRead(join(root, '.workflow-discovery-owned'))).toString() !== OWNER
  )
    throw new Error('discovery_output_not_owned');
}
export async function verifyGeneration(outDir, expected) {
  try {
    const root = resolve(outDir);
    await ownedRoot(root);
    const current = expected ?? JSON.parse(await boundedRead(join(root, 'current.json')));
    exact(current, ['schema', 'generation', 'catalogDigest', 'artifactsDigest']);
    if (
      current.schema !== 'workflow-discovery-current@2' ||
      !/^run-[a-f0-9-]{36}$/.test(current.generation)
    )
      throw new Error('discovery_pointer_invalid');
    const directory = join(root, current.generation);
    if ((await lstat(directory)).isSymbolicLink()) throw new Error('discovery_generation_symlink');
    const manifest = JSON.parse(await boundedRead(join(directory, 'artifacts.json')));
    exact(manifest, ['schema', 'catalogDigest', 'files', 'digest']);
    const { digest: claimed, ...body } = manifest;
    if (
      manifest.schema !== 'workflow-discovery-artifacts@1' ||
      claimed !== digest(body) ||
      claimed !== current.artifactsDigest ||
      current.catalogDigest !== manifest.catalogDigest ||
      !Array.isArray(manifest.files) ||
      manifest.files.some((file) => !safePath(file.path))
    )
      throw new Error('discovery_manifest_invalid');
    const files = await collectFiles(directory);
    if (json(files) !== json(manifest.files)) throw new Error('discovery_artifact_mismatch');
    const catalog = JSON.parse(await boundedRead(join(directory, 'catalog.json'), 16 * 1048576));
    const { digest: catalogHash, ...content } = catalog;
    if (catalogHash !== digest(content) || catalogHash !== current.catalogDigest)
      throw new Error('discovery_catalog_mismatch');
    return { valid: true, generation: current.generation, catalogDigest: current.catalogDigest };
  } catch (error) {
    return { valid: false, reason: error.code === 'ENOENT' ? 'missing_artifact' : error.message };
  }
}

export async function runDiscovery({ repoRoot, outDir, historyFile, maximumCandidates = 64 }) {
  const repo = await realpath(repoRoot);
  const out = resolve(outDir);
  const inside = (root, path) => {
    const rel = relative(root, path);
    return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
  };
  const parent = await realpath(dirname(out));
  const physicalOut = join(parent, out.split(/[\\/]/).at(-1));
  if (inside(repo, physicalOut) || inside(physicalOut, repo))
    throw new Error('discovery_output_overlaps_source');
  const inventory = await scanRepository(repo);
  const history = await historySummary(historyFile, Date.now());
  const { compileWorkflowDefinition } =
    await import('../../packages/workflow-compiler/dist/index.js');
  const catalog = await createWorkflowCatalog(inventory, history, { maximumCandidates });
  const prior = await exists(out);
  if (prior) await ownedRoot(out);
  else {
    await mkdir(out, { mode: 0o700 });
    await writeFile(join(out, '.workflow-discovery-owned'), OWNER, { flag: 'wx', mode: 0o600 });
  }
  const lock = await open(join(out, '.discovery-lock'), 'wx', 0o600);
  try {
    const previous = await verifyGeneration(out);
    if (previous.valid && previous.catalogDigest === catalog.digest)
      return {
        schema: 'workflow-discovery-run@1',
        status: 'unchanged',
        repairAttempts: 0,
        generation: previous.generation,
        catalog
      };
    const generation = `run-${randomUUID()}`;
    const directory = join(out, generation);
    await mkdir(directory, { mode: 0o700 });
    await writeFile(join(directory, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n', {
      flag: 'wx',
      mode: 0o600
    });
    for (const candidate of catalog.candidates) {
      const key = hash(candidate.id).slice(7, 31);
      const candidateDir = join(directory, key);
      await mkdir(candidateDir, { mode: 0o700 });
      await writeFile(
        join(candidateDir, 'definition.json'),
        JSON.stringify(candidate.definition, null, 2) + '\n',
        { flag: 'wx', mode: 0o600 }
      );
      await writeFile(
        join(candidateDir, 'compiled-bundle.json'),
        JSON.stringify(compileWorkflowDefinition(candidate.definition), null, 2) + '\n',
        { flag: 'wx', mode: 0o600 }
      );
      await writeFile(
        join(candidateDir, 'review.json'),
        JSON.stringify({
          schema: 'workflow-discovery-review@1',
          workflowId: candidate.id,
          definitionSha256: digest(candidate.definition),
          decision: 'unreviewed',
          executionAuthority: 'none'
        }) + '\n',
        { flag: 'wx', mode: 0o600 }
      );
    }
    const body = {
      schema: 'workflow-discovery-artifacts@1',
      catalogDigest: catalog.digest,
      files: await collectFiles(directory)
    };
    await writeFile(
      join(directory, 'artifacts.json'),
      JSON.stringify({ ...body, digest: digest(body) }, null, 2) + '\n',
      { flag: 'wx', mode: 0o600 }
    );
    const next = {
      schema: 'workflow-discovery-current@2',
      generation,
      catalogDigest: catalog.digest,
      artifactsDigest: digest(body)
    };
    const checked = await verifyGeneration(out, next);
    if (!checked.valid) throw new Error('discovery_generated_output_invalid');
    const temporary = join(out, `current-${randomUUID()}.pending`);
    await writeFile(temporary, JSON.stringify(next) + '\n', { flag: 'wx', mode: 0o600 });
    await rename(temporary, join(out, 'current.json'));
    const verified = await verifyGeneration(out);
    if (!verified.valid) throw new Error('discovery_generated_output_invalid');
    return {
      schema: 'workflow-discovery-run@1',
      status: prior ? (previous.valid ? 'regenerated' : 'repaired') : 'generated',
      repairAttempts: prior && !previous.valid ? 1 : 0,
      previousFailure: previous.valid ? null : previous.reason,
      generation,
      catalog
    };
  } finally {
    await lock.close();
    await unlink(join(out, '.discovery-lock'));
  }
}
