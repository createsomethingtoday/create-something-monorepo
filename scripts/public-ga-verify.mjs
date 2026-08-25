#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdir, mkdtemp, readFile, realpath, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { createPublicDistribution } from './public-distribution.mjs';
import {
  selectMapBurnIn,
  validateBrowserEvidence,
  validateCodeowners,
  validateGaConfig,
  validatePackageReadback,
  validatePricingReadbacks,
  validateRepositoryReadback
} from './public-ga-policy.mjs';

const execFileAsync = promisify(execFile);
const MAX_BUFFER = 100 * 1024 * 1024;

function parseArgs(argv) {
  const options = {
    root: process.cwd(),
    config: 'config/public-ga.v1.json',
    ref: 'HEAD'
  };
  const args = argv.slice(2).filter((arg) => arg !== '--');
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--root' && args[index + 1]) options.root = args[++index];
    else if (arg === '--config' && args[index + 1]) options.config = args[++index];
    else if (arg === '--ref' && args[index + 1]) options.ref = args[++index];
    else if (arg === '--output-dir' && args[index + 1]) options.outputDir = args[++index];
    else if (arg === '--browser-evidence' && args[index + 1])
      options.browserEvidence = args[++index];
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown or incomplete argument: ${arg}`);
  }
  return options;
}

function usage() {
  console.log(`Usage:
  node scripts/public-ga-verify.mjs --output-dir <new-dir> --browser-evidence <manifest.json> [options]

Runs the live, fail-closed CREATE SOMETHING public-distribution GA verifier.
The GitHub CLI must be authenticated, npm must be authenticated for \`npm trust list\`,
Cloudflare Wrangler must have remote D1 read access, and the browser-evidence manifest
must contain fresh desktop/mobile production captures.

Options:
  --ref <git-ref>              Committed GA source ref (default: HEAD)
  --config <path>              GA policy (default: config/public-ga.v1.json)
  --root <path>                Repository root (default: current directory)
  --output-dir <new-dir>       Required new receipt/artifact directory
  --browser-evidence <path>    Required real-browser evidence manifest
  --help                       Show this help
`);
}

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function sha256(contents) {
  return createHash('sha256').update(contents).digest('hex');
}

async function command(commandName, args, options = {}) {
  return execFileAsync(commandName, args, {
    encoding: 'utf8',
    maxBuffer: MAX_BUFFER,
    ...options
  });
}

async function githubToken(root) {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  const { stdout } = await command('gh', ['auth', 'token'], { cwd: root });
  if (!stdout.trim()) throw new Error('GitHub authentication is unavailable');
  return stdout.trim();
}

async function fetchJson(url, init = {}) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.json();
}

async function fetchGitHubPages(url, token, key, maxPages = 10) {
  const values = [];
  let next = url;
  let pages = 0;
  while (next && pages < maxPages) {
    const response = await fetch(next, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
    const payload = await response.json();
    values.push(...(key ? (payload[key] ?? []) : payload));
    const link = response.headers.get('link') ?? '';
    next = /<([^>]+)>; rel="next"/.exec(link)?.[1] ?? '';
    pages += 1;
  }
  if (next) throw new Error(`${url} exceeded the bounded ${maxPages}-page readback`);
  return values;
}

async function githubReadback(config, token) {
  const base = `https://api.github.com/repos/${config.repository.owner}/${config.repository.name}`;
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28'
  };
  const get = (suffix) => fetchJson(`${base}${suffix}`, { headers });
  const [
    repository,
    main,
    ruleset,
    collaborators,
    secretAlerts,
    dependabotAlerts,
    workflowPermissions
  ] = await Promise.all([
    get(''),
    get(`/branches/${config.repository.mainBranch}`),
    get(`/rulesets/${config.repository.rulesetId}`),
    fetchGitHubPages(`${base}/collaborators?affiliation=all&per_page=100`, token),
    fetchGitHubPages(`${base}/secret-scanning/alerts?state=open&per_page=100`, token),
    fetchGitHubPages(`${base}/dependabot/alerts?state=open&per_page=100`, token),
    get('/actions/permissions/workflow')
  ]);
  return {
    repository,
    main,
    ruleset,
    collaborators,
    secretAlerts,
    dependabotAlerts,
    workflowPermissions,
    base
  };
}

async function npmTrustReadback(packageName, root) {
  const { stdout } = await command(
    'npx',
    ['--yes', 'npm@11.15.0', 'trust', 'list', packageName, '--json'],
    { cwd: root }
  );
  return JSON.parse(stdout);
}

async function packRegistryPackage(packagePolicy, artifactRoot) {
  const spec = `${packagePolicy.name}@${packagePolicy.version}`;
  const { stdout } = await command(
    'npm',
    ['pack', spec, '--ignore-scripts', '--json', '--pack-destination', artifactRoot],
    { cwd: artifactRoot }
  );
  const report = JSON.parse(stdout)[0];
  return {
    tarballPath: path.join(artifactRoot, report.filename),
    files: report.files.map((entry) => entry.path).sort()
  };
}

async function cleanRegistryInstall(config, packed, root) {
  const installRoot = await mkdtemp(path.join(os.tmpdir(), 'public-ga-npm-install-'));
  const npmPrefix = path.join(installRoot, 'npm');
  const project = path.join(installRoot, 'project');
  const piConfig = path.join(installRoot, 'pi-config');
  await Promise.all([mkdir(npmPrefix), mkdir(project), mkdir(piConfig)]);
  const packageSpecs = config.packages.map((entry) => `${entry.name}@${entry.version}`);
  await command(
    'npm',
    [
      'install',
      '--prefix',
      npmPrefix,
      '--ignore-scripts',
      '--no-package-lock',
      '--no-save',
      ...packageSpecs,
      config.npm.piPackage
    ],
    { cwd: root }
  );

  const pi = path.join(npmPrefix, 'node_modules', '.bin', 'pi');
  const env = { ...process.env, PI_CODING_AGENT_DIR: piConfig };
  for (const packagePolicy of config.packages) {
    const packageDirectory = path.join(npmPrefix, 'node_modules', ...packagePolicy.name.split('/'));
    await command(pi, ['install', packageDirectory, '-l', '--approve'], { cwd: project, env });
  }
  const { stdout: list } = await command(pi, ['list', '--approve'], { cwd: project, env });
  const status = new Map();
  for (const packagePolicy of config.packages) {
    status.set(packagePolicy.name, {
      installed: await exists(
        path.join(npmPrefix, 'node_modules', ...packagePolicy.name.split('/'), 'package.json')
      ),
      piLoaded: list.includes(packagePolicy.name.split('/').at(-1))
    });
  }
  return { installRoot, status, packed };
}

async function npmReadbacks(config, gaCommit, root) {
  const artifactRoot = await mkdtemp(path.join(os.tmpdir(), 'public-ga-npm-artifacts-'));
  const preliminaries = [];
  for (const packagePolicy of config.packages) {
    const encoded = encodeURIComponent(packagePolicy.name);
    const metadata = await fetchJson(`${config.npm.registry}/${encoded}`);
    const version = metadata.versions?.[packagePolicy.version];
    if (!version) throw new Error(`${packagePolicy.name}@${packagePolicy.version} is missing`);
    const attestationUrl = version.dist?.attestations?.url;
    if (!attestationUrl)
      throw new Error(`${packagePolicy.name}@${packagePolicy.version} lacks attestations`);
    const [attestations, trust, packed] = await Promise.all([
      fetchJson(attestationUrl),
      npmTrustReadback(packagePolicy.name, root),
      packRegistryPackage(packagePolicy, artifactRoot)
    ]);
    preliminaries.push({ packagePolicy, metadata, attestations, trust, packed });
  }
  const clean = await cleanRegistryInstall(
    config,
    new Map(preliminaries.map((entry) => [entry.packagePolicy.name, entry.packed])),
    root
  );
  return preliminaries.map((entry) => {
    const readback = {
      metadata: entry.metadata,
      attestations: entry.attestations,
      trust: entry.trust,
      packedFiles: entry.packed.files,
      cleanInstall: clean.status.get(entry.packagePolicy.name)
    };
    const validation = validatePackageReadback(readback, entry.packagePolicy, config, gaCommit);
    if (validation.issues.length > 0) throw new Error(validation.issues.join('\n'));
    const version = entry.metadata.versions[entry.packagePolicy.version];
    const provenance = validation.provenance?.predicate ?? {};
    return {
      name: entry.packagePolicy.name,
      version: entry.packagePolicy.version,
      registryUrl: `https://www.npmjs.com/package/${entry.packagePolicy.name}/v/${entry.packagePolicy.version}`,
      integrity: version.dist.integrity,
      tarball: version.dist.tarball,
      attestations: version.dist.attestations.url,
      packedFiles: entry.packed.files,
      cleanInstall: readback.cleanInstall,
      trustedPublisher: {
        repository: config.npm.repository,
        workflowFile: config.npm.workflowFile,
        environment: config.npm.environment,
        readback: entry.trust
      },
      provenance: {
        workflow: provenance.buildDefinition?.externalParameters?.workflow,
        resolvedDependencies: provenance.buildDefinition?.resolvedDependencies,
        invocationId: provenance.runDetails?.metadata?.invocationId ?? null
      }
    };
  });
}

async function pricingReadbacks(config) {
  const results = [];
  for (const route of config.pricing.routes) {
    const url = new URL(route.path, config.pricing.baseUrl).href;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'CREATE-SOMETHING-public-GA-verifier/1.0' },
      redirect: 'follow'
    });
    results.push({
      path: route.path,
      url: response.url,
      status: response.status,
      text: await response.text()
    });
  }
  const issues = validatePricingReadbacks(results, config);
  if (issues.length > 0) throw new Error(issues.join('\n'));
  return results.map((entry) => ({ path: entry.path, url: entry.url, status: entry.status }));
}

async function browserReadback(filePath, config, gaCommit, committedAt) {
  const absolute = path.resolve(filePath);
  const evidence = JSON.parse(await readFile(absolute, 'utf8'));
  const directory = path.dirname(absolute);
  const captures = [];
  for (const capture of evidence.captures ?? []) {
    const screenshotPath = path.resolve(directory, capture.screenshotPath ?? '');
    const contents = await readFile(screenshotPath);
    captures.push({
      ...capture,
      screenshotPath,
      screenshotVerified: sha256(contents) === capture.screenshotSha256
    });
  }
  const verified = { ...evidence, captures };
  const issues = validateBrowserEvidence(verified, config, gaCommit, {
    minimumCapturedAt: committedAt
  });
  if (issues.length > 0) throw new Error(issues.join('\n'));
  return {
    manifest: absolute,
    capturedAt: evidence.capturedAt,
    captures: captures.map((capture) => ({
      path: capture.path,
      url: capture.url,
      viewport: capture.viewport,
      screenshotPath: capture.screenshotPath,
      screenshotSha256: capture.screenshotSha256,
      httpStatus: capture.httpStatus
    }))
  };
}

export function parseMapMonitorD1Result(payload) {
  if (!Array.isArray(payload) || payload.length !== 1) {
    throw new Error('Cloudflare D1 Map receipt readback must contain exactly one result set');
  }
  const result = payload[0];
  if (result?.success !== true || !Array.isArray(result.results)) {
    throw new Error('Cloudflare D1 Map receipt readback was not successful');
  }
  return result.results.map((row) => {
    if (!row || typeof row !== 'object') {
      throw new Error('Cloudflare D1 Map receipt row is malformed');
    }
    let checks;
    try {
      checks = JSON.parse(row.checks_json);
    } catch {
      throw new Error(`Cloudflare D1 Map receipt ${row.receipt_id ?? 'unknown'} has invalid checks JSON`);
    }
    if (!Array.isArray(checks)) {
      throw new Error(`Cloudflare D1 Map receipt ${row.receipt_id ?? 'unknown'} checks must be an array`);
    }
    return {
      receiptId: row.receipt_id,
      schemaVersion: row.schema_version,
      trigger: row.trigger,
      scheduledAt: row.scheduled_at,
      completedAt: row.completed_at,
      sourceSha: row.source_sha,
      workerVersion: row.worker_version,
      baseUrl: row.base_url,
      status: row.status,
      complete: row.complete === 1,
      customerDataUsed: row.customer_data_used === 1,
      agentMutationUsed: row.agent_mutation_used === 1,
      bookingSubmitted: row.booking_submitted === 1,
      checks
    };
  });
}

export function validateMapMonitorHealth(body, receiptSource) {
  const issues = [];
  if (body?.schemaVersion !== 1) issues.push('Map monitor health schema version is invalid');
  if (body?.status !== 'ready') issues.push('Map monitor health is not ready');
  if (body?.worker !== receiptSource.workerName) issues.push('Map monitor health worker identity is invalid');
  if (body?.receiptStore !== receiptSource.kind) issues.push('Map monitor health receipt store is invalid');
  if (body?.scheduledOnly !== true) issues.push('Map monitor health exposes a non-scheduled execution mode');
  return issues;
}

async function mapReceiptReadback(config, root) {
  const receiptSource = config.map.receiptSource;
  const query = `SELECT receipt_id, schema_version, trigger, scheduled_at, completed_at, source_sha, worker_version, base_url, status, complete, customer_data_used, agent_mutation_used, booking_submitted, checks_json FROM ${receiptSource.table} ORDER BY scheduled_at ASC`;
  const { stdout } = await command(
    'pnpm',
    [
      'exec',
      'wrangler',
      'd1',
      'execute',
      receiptSource.databaseName,
      '--remote',
      '--config',
      receiptSource.wranglerConfig,
      '--command',
      query,
      '--json'
    ],
    { cwd: root }
  );
  return parseMapMonitorD1Result(JSON.parse(stdout));
}

async function mapMonitorHealthReadback(config) {
  const receiptSource = config.map.receiptSource;
  const body = await fetchJson(receiptSource.workerHealthUrl, {
    headers: { 'User-Agent': 'CREATE-SOMETHING-public-GA-verifier/1.0' }
  });
  const issues = validateMapMonitorHealth(body, receiptSource);
  if (issues.length > 0) throw new Error(issues.join('\n'));
  return {
    url: receiptSource.workerHealthUrl,
    schemaVersion: body.schemaVersion,
    status: body.status,
    worker: body.worker,
    receiptStore: body.receiptStore,
    scheduledOnly: body.scheduledOnly
  };
}

async function localSecurityReadback(config, root) {
  await command(process.execPath, ['scripts/security-advisory-exceptions.mjs'], { cwd: root });
  const policy = JSON.parse(
    await readFile(path.join(root, 'config/security-advisory-exceptions.v1.json'), 'utf8')
  );
  const declared = [...new Set(policy.exceptions.map((entry) => entry.advisoryId))].sort();
  const allowed = [...new Set(config.repository.allowedRuntimeAdvisories)].sort();
  if (JSON.stringify(declared) !== JSON.stringify(allowed)) {
    throw new Error('GA runtime advisory allowlist must exactly match the owned exception policy');
  }
  let stdout = '';
  try {
    ({ stdout } = await command('pnpm', ['audit', '--prod', '--json'], { cwd: root }));
  } catch (error) {
    stdout = error.stdout ?? '';
    if (!stdout) throw error;
  }
  const audit = JSON.parse(stdout);
  const unowned = Object.values(audit.advisories ?? {}).filter(
    (entry) =>
      ['critical', 'high'].includes(entry.severity) && !allowed.includes(entry.github_advisory_id)
  );
  if (unowned.length > 0) {
    throw new Error(
      `Production audit has unowned critical/high advisories: ${unowned
        .map((entry) => entry.github_advisory_id)
        .join(', ')}`
    );
  }
  return {
    vulnerabilities: audit.metadata?.vulnerabilities,
    ownedExceptions: policy.exceptions.map((entry) => ({
      advisoryId: entry.advisoryId,
      package: entry.package,
      owner: entry.owner,
      reviewBy: entry.reviewBy,
      trackingIssue: entry.trackingIssue
    }))
  };
}

function publicRepositoryEvidence(readback) {
  const statusRule = readback.ruleset.rules.find((rule) => rule.type === 'required_status_checks');
  const pullRule = readback.ruleset.rules.find((rule) => rule.type === 'pull_request');
  return {
    url: readback.repository.html_url,
    visibility: readback.repository.visibility,
    mainSha: readback.main.commit.sha,
    ruleset: {
      id: readback.ruleset.id,
      url: readback.ruleset._links?.html?.href ?? null,
      enforcement: readback.ruleset.enforcement,
      requiredChecks: statusRule.parameters.required_status_checks.map((entry) => entry.context),
      pullRequest: pullRule.parameters
    },
    maintainers: readback.collaborators
      .filter(
        (entry) =>
          entry.permissions?.admin || entry.permissions?.maintain || entry.permissions?.push
      )
      .map((entry) => entry.login)
      .sort(),
    openSecretAlerts: readback.secretAlerts.length,
    openDependabotAlerts: readback.dependabotAlerts.length,
    workflowPermissions: readback.workflowPermissions
  };
}

export async function verifyPublicGa(options) {
  if (!options.outputDir) throw new Error('--output-dir is required');
  if (!options.browserEvidence) throw new Error('--browser-evidence is required');
  const root = await realpath(path.resolve(options.root));
  const outputDir = path.resolve(options.outputDir);
  if (await exists(outputDir))
    throw new Error(`Refusing to overwrite output directory: ${outputDir}`);
  await mkdir(outputDir, { recursive: true });

  const configPath = path.resolve(root, options.config);
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  const configIssues = validateGaConfig(config);
  if (configIssues.length > 0) throw new Error(configIssues.join('\n'));
  const { stdout: commitOutput } = await command(
    'git',
    ['rev-parse', '--verify', `${options.ref}^{commit}`],
    { cwd: root }
  );
  const gaCommit = commitOutput.trim();
  const { stdout: committedAtOutput } = await command(
    'git',
    ['show', '-s', '--format=%cI', gaCommit],
    { cwd: root }
  );
  const committedAt = committedAtOutput.trim();
  const checks = [];
  const evidence = {};

  async function run(id, operation) {
    const started = Date.now();
    try {
      evidence[id] = await operation();
      checks.push({ id, ok: true, durationMs: Date.now() - started });
    } catch (error) {
      checks.push({
        id,
        ok: false,
        durationMs: Date.now() - started,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  await run('distribution', async () => {
    const artifact = path.join(
      outputDir,
      `create-something-public-${gaCommit.slice(0, 12)}.tar.gz`
    );
    return createPublicDistribution({
      root,
      policy: 'config/public-distribution.v1.json',
      ref: gaCommit,
      output: artifact
    });
  });
  await run('local_security', () => localSecurityReadback(config, root));

  let github;
  await run('github', async () => {
    const token = await githubToken(root);
    github = await githubReadback(config, token);
    const validation = validateRepositoryReadback(github, config, gaCommit);
    const { stdout: codeowners } = await command(
      'git',
      ['show', `${gaCommit}:.github/CODEOWNERS`],
      { cwd: root }
    );
    const codeownerValidation = validateCodeowners(
      codeowners,
      validation.maintainers,
      config.repository.minimumCodeOwners
    );
    const issues = [...validation.issues, ...codeownerValidation.issues];
    if (issues.length > 0) throw new Error(issues.join('\n'));
    return { ...publicRepositoryEvidence(github), codeOwners: codeownerValidation.owners };
  });
  await run('npm_packages', () => npmReadbacks(config, gaCommit, root));
  await run('pricing', () => pricingReadbacks(config));
  await run('browser', () =>
    browserReadback(options.browserEvidence, config, gaCommit, committedAt)
  );
  await run('map_burn_in', async () => {
    const [receipts, health] = await Promise.all([
      mapReceiptReadback(config, root),
      mapMonitorHealthReadback(config)
    ]);
    const result = selectMapBurnIn(receipts, config.map, committedAt, gaCommit);
    if (result.issues.length > 0) throw new Error(result.issues.join('\n'));
    return {
      receiptSource: config.map.receiptSource,
      health,
      requiredDays: config.map.requiredConsecutiveDays,
      days: result.days
    };
  });

  const receipt = {
    schemaVersion: 1,
    id: 'create-something-public-distribution-ga',
    generatedAt: new Date().toISOString(),
    status: checks.every((entry) => entry.ok) ? 'passed' : 'failed',
    gaCommit,
    committedAt,
    sourcePrice: { currency: 'USD', amount: 0, license: 'MIT' },
    managedControl: { currency: 'USD', startsAt: 900, interval: 'month' },
    checks,
    evidence
  };
  const receiptPath = path.join(outputDir, 'public-ga-receipt.json');
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' });
  console.log(JSON.stringify({ receipt: receiptPath, status: receipt.status, gaCommit }));
  if (receipt.status !== 'passed') {
    throw new Error(
      `Public GA verification failed: ${checks
        .filter((entry) => !entry.ok)
        .map((entry) => entry.id)
        .join(', ')}`
    );
  }
  return { receipt, receiptPath };
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    usage();
    return;
  }
  await verifyPublicGa(options);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
