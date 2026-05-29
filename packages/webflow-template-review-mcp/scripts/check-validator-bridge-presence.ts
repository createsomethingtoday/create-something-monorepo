import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

type PolicyState = 'disabled_or_legacy_submission' | 'enabled_for_new_submission';

type CliOptions = {
  url?: string;
  htmlFile?: string;
  outDir: string;
  policyState: PolicyState;
  expectedMarker: string;
  expectedScriptHost: string;
  expectedScriptPath: string;
  assetId?: string;
  versionId?: string;
  policySnapshotId?: string;
};

type BridgePresence = {
  config_object_present: boolean;
  marker_present: boolean;
  expected_marker: string;
  allowed_script_present: boolean;
  expected_script_host: string;
  expected_script_path: string;
  script_src_count: number;
  matched_script_srcs: string[];
  version?: string;
  review_surface?: string;
  review_script_url_host?: string;
  review_script_url_path?: string;
  bridge_token_present: boolean;
  bridge_token_sha256_prefix?: string;
  raw_bridge_token_stored: false;
};

type BridgeCheckArtifact = {
  schema_version: 'validator_app_submission_contract.v0.1';
  lane_id: 'validator_app_submission_contract';
  checked_at: string;
  source_url?: string;
  html_file?: string;
  asset_id?: string;
  version_id?: string;
  policy_snapshot_id?: string;
  policy_state: PolicyState;
  bridge_presence: BridgePresence;
  requirement_status: 'satisfied' | 'missing' | 'not_required';
  finding: {
    rule_id: 'wf.template.validator_app.required_bridge_script';
    status: 'pass' | 'fail' | 'manual';
    severity: 'major' | 'info';
    coverage: 'auto';
    rejectability: 'submission_requirement' | 'not_required';
    confidence: number;
    observed: string;
    expected: string;
    resolution_state: 'open' | 'resolved' | 'needs_human_review';
  };
};

type ArtifactManifestEntry = {
  artifact_type: string;
  path: string;
  sha256: string;
  byte_size: number;
  media_type: string;
  redaction: {
    raw_bridge_token_stored: false;
    secret_like_fields_redacted: boolean;
  };
};

const DEFAULT_OUT_DIR = '/tmp/webflow-template-review-validator-bridge-presence';
const DEFAULT_MARKER = '__wf_review_snippet_v1';
const DEFAULT_SCRIPT_HOST = 'validation-worker.createsomething.workers.dev';
const DEFAULT_SCRIPT_PATH = '/app-validator/snippet/review.js';

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    outDir: DEFAULT_OUT_DIR,
    policyState: 'disabled_or_legacy_submission',
    expectedMarker: DEFAULT_MARKER,
    expectedScriptHost: DEFAULT_SCRIPT_HOST,
    expectedScriptPath: DEFAULT_SCRIPT_PATH,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    if (arg === '--url' && next) {
      options.url = next;
      i += 1;
      continue;
    }
    if ((arg === '--html' || arg === '--html-file') && next) {
      options.htmlFile = next;
      i += 1;
      continue;
    }
    if (arg === '--out' && next) {
      options.outDir = next;
      i += 1;
      continue;
    }
    if (arg === '--policy-state' && next) {
      if (next !== 'disabled_or_legacy_submission' && next !== 'enabled_for_new_submission') {
        throw new Error(`Invalid --policy-state ${next}`);
      }
      options.policyState = next;
      i += 1;
      continue;
    }
    if (arg === '--expected-marker' && next) {
      options.expectedMarker = next;
      i += 1;
      continue;
    }
    if (arg === '--expected-script-host' && next) {
      options.expectedScriptHost = next;
      i += 1;
      continue;
    }
    if (arg === '--expected-script-path' && next) {
      options.expectedScriptPath = next;
      i += 1;
      continue;
    }
    if (arg === '--asset-id' && next) {
      options.assetId = next;
      i += 1;
      continue;
    }
    if (arg === '--version-id' && next) {
      options.versionId = next;
      i += 1;
      continue;
    }
    if (arg === '--policy-snapshot-id' && next) {
      options.policySnapshotId = next;
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.url && !options.htmlFile) throw new Error('Missing required --url <url> or --html-file <file>.');
  if (options.url && options.htmlFile) throw new Error('Pass either --url or --html-file, not both.');

  return {
    url: options.url,
    htmlFile: options.htmlFile,
    outDir: options.outDir ?? DEFAULT_OUT_DIR,
    policyState: options.policyState ?? 'disabled_or_legacy_submission',
    expectedMarker: options.expectedMarker ?? DEFAULT_MARKER,
    expectedScriptHost: options.expectedScriptHost ?? DEFAULT_SCRIPT_HOST,
    expectedScriptPath: options.expectedScriptPath ?? DEFAULT_SCRIPT_PATH,
    assetId: options.assetId,
    versionId: options.versionId,
    policySnapshotId: options.policySnapshotId,
  };
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp validator:bridge:check -- [options]

Options:
  --url <url>                    Published or submitted-asset URL to inspect.
  --html-file <file>             Local HTML snapshot to inspect instead of fetching.
  --out <dir>                    Output directory. Default: ${DEFAULT_OUT_DIR}
  --policy-state <state>         disabled_or_legacy_submission | enabled_for_new_submission.
  --expected-marker <marker>     Expected bridge marker. Default: ${DEFAULT_MARKER}
  --expected-script-host <host>  Allowed script host. Default: ${DEFAULT_SCRIPT_HOST}
  --expected-script-path <path>  Allowed script path. Default: ${DEFAULT_SCRIPT_PATH}
  --asset-id <id>                Optional Airtable Asset id.
  --version-id <id>              Optional Airtable Asset Version id.
  --policy-snapshot-id <id>      Optional policy snapshot id.
  --help                         Show this help.

Behavior:
  Checks for the Validator app bridge script without storing raw bridge tokens.
  Script presence can satisfy a submission contract when policy is enabled.
  It does not claim the template passed Validator app checks unless a separate
  persisted validation result artifact exists.
`);
}

async function loadHtml(options: CliOptions): Promise<{ html: string; finalUrl?: string }> {
  if (options.htmlFile) {
    return { html: await readFile(options.htmlFile, 'utf8') };
  }

  if (!options.url) throw new Error('Missing URL.');
  const response = await fetch(options.url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(20_000),
    headers: {
      'user-agent': 'create-something-template-review-validator-bridge-check/0.1',
      accept: 'text/html,application/xhtml+xml',
    },
  });

  const contentType = response.headers.get('content-type') ?? '';
  if (!response.ok) {
    throw new Error(`Failed to fetch ${options.url}: HTTP ${response.status}`);
  }
  if (!contentType.toLowerCase().includes('text/html')) {
    throw new Error(`Expected HTML from ${options.url}; received ${contentType || 'unknown content type'}`);
  }

  return { html: await response.text(), finalUrl: response.url };
}

function findScriptSrcs(html: string): string[] {
  return Array.from(html.matchAll(/<script\b[^>]*\bsrc=(["'])(.*?)\1[^>]*>/giu), (match) => match[2] ?? '').filter(Boolean);
}

function parseJsStringProperty(html: string, property: string): string | undefined {
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`${escapedProperty}\\s*:\\s*(['"])(.*?)\\1`, 'u'));
  return match?.[2];
}

function safeUrlParts(value: string | undefined): { host?: string; path?: string } {
  if (!value) return {};
  try {
    const url = new URL(value);
    return { host: url.host, path: url.pathname };
  } catch {
    return {};
  }
}

function redactScriptSrc(src: string): string {
  try {
    const url = new URL(src);
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return src.replace(/[?].*$/u, '');
  }
}

function inspectBridge(html: string, options: CliOptions): BridgePresence {
  const scriptSrcs = findScriptSrcs(html);
  const matchedScriptSrcs = scriptSrcs.filter((src) => {
    try {
      const parsed = new URL(src);
      return parsed.host === options.expectedScriptHost && parsed.pathname === options.expectedScriptPath;
    } catch {
      return src.includes(options.expectedScriptHost) && src.includes(options.expectedScriptPath);
    }
  });

  const bridgeToken = parseJsStringProperty(html, 'bridgeToken');
  const reviewScriptUrlParts = safeUrlParts(parseJsStringProperty(html, 'reviewScriptUrl'));

  return {
    config_object_present: html.includes('__WF_REVIEW_BRIDGE'),
    marker_present: html.includes(options.expectedMarker),
    expected_marker: options.expectedMarker,
    allowed_script_present: matchedScriptSrcs.length > 0,
    expected_script_host: options.expectedScriptHost,
    expected_script_path: options.expectedScriptPath,
    script_src_count: scriptSrcs.length,
    matched_script_srcs: matchedScriptSrcs.map(redactScriptSrc),
    version: parseJsStringProperty(html, 'version'),
    review_surface: parseJsStringProperty(html, 'reviewSurface'),
    review_script_url_host: reviewScriptUrlParts.host,
    review_script_url_path: reviewScriptUrlParts.path,
    bridge_token_present: Boolean(bridgeToken),
    bridge_token_sha256_prefix: bridgeToken
      ? createHash('sha256').update(bridgeToken).digest('hex').slice(0, 12)
      : undefined,
    raw_bridge_token_stored: false,
  };
}

function buildArtifact(options: CliOptions, html: string, finalUrl?: string): BridgeCheckArtifact {
  const bridgePresence = inspectBridge(html, options);
  const hasRequiredScript =
    bridgePresence.config_object_present && bridgePresence.marker_present && bridgePresence.allowed_script_present;
  const requirementStatus =
    hasRequiredScript ? 'satisfied' : options.policyState === 'enabled_for_new_submission' ? 'missing' : 'not_required';

  return {
    schema_version: 'validator_app_submission_contract.v0.1',
    lane_id: 'validator_app_submission_contract',
    checked_at: new Date().toISOString(),
    source_url: finalUrl ?? options.url,
    html_file: options.htmlFile ? path.resolve(options.htmlFile) : undefined,
    asset_id: options.assetId,
    version_id: options.versionId,
    policy_snapshot_id: options.policySnapshotId,
    policy_state: options.policyState,
    bridge_presence: bridgePresence,
    requirement_status: requirementStatus,
    finding: {
      rule_id: 'wf.template.validator_app.required_bridge_script',
      status: requirementStatus === 'satisfied' ? 'pass' : requirementStatus === 'missing' ? 'fail' : 'manual',
      severity: requirementStatus === 'missing' ? 'major' : 'info',
      coverage: 'auto',
      rejectability: options.policyState === 'enabled_for_new_submission' ? 'submission_requirement' : 'not_required',
      confidence: hasRequiredScript ? 0.99 : 0.9,
      observed: hasRequiredScript
        ? 'Required Validator app bridge script marker and allowed script source are present.'
        : 'Required Validator app bridge script marker or allowed script source was not found.',
      expected:
        options.policyState === 'enabled_for_new_submission'
          ? 'New submissions include the required Validator app bridge script.'
          : 'Validator app bridge script is optional for legacy or disabled-policy submissions.',
      resolution_state: requirementStatus === 'missing' ? 'needs_human_review' : 'resolved',
    },
  };
}

function buildMarkdown(artifact: BridgeCheckArtifact): string {
  return `# Validator App Bridge Presence

- URL: ${artifact.source_url ?? artifact.html_file ?? 'unknown'}
- Policy state: ${artifact.policy_state}
- Requirement status: ${artifact.requirement_status}
- Config object present: ${artifact.bridge_presence.config_object_present}
- Marker present: ${artifact.bridge_presence.marker_present}
- Allowed script present: ${artifact.bridge_presence.allowed_script_present}
- Version: ${artifact.bridge_presence.version ?? 'unknown'}
- Review surface: ${artifact.bridge_presence.review_surface ?? 'unknown'}
- Bridge token present: ${artifact.bridge_presence.bridge_token_present}
- Raw bridge token stored: false

## Finding

- Rule: ${artifact.finding.rule_id}
- Status: ${artifact.finding.status}
- Severity: ${artifact.finding.severity}
- Observed: ${artifact.finding.observed}

This check only verifies the Validator app submission contract. It does not prove
the template passed Validator app rules unless a separate persisted result
artifact exists.
`;
}

async function buildManifest(runId: string, entries: Array<{ artifactType: string; filePath: string; mediaType: string }>) {
  const artifacts: ArtifactManifestEntry[] = [];
  for (const entry of entries) {
    const bytes = await readFile(entry.filePath);
    artifacts.push({
      artifact_type: entry.artifactType,
      path: entry.filePath,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      byte_size: bytes.byteLength,
      media_type: entry.mediaType,
      redaction: {
        raw_bridge_token_stored: false,
        secret_like_fields_redacted: true,
      },
    });
  }

  return {
    schema_version: 'review_artifact_manifest.v0.1',
    run_id: runId,
    source_lane: 'validator_app_submission_contract',
    created_at: new Date().toISOString(),
    artifacts,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const loaded = await loadHtml(options);
  const artifact = buildArtifact(options, loaded.html, loaded.finalUrl);

  await mkdir(options.outDir, { recursive: true });
  const jsonPath = path.join(options.outDir, 'validator-app-submission-contract.json');
  const markdownPath = path.join(options.outDir, 'validator-app-submission-contract.md');
  const manifestPath = path.join(options.outDir, 'validator-app-submission-contract-manifest.json');

  await writeFile(jsonPath, `${JSON.stringify(artifact, null, 2)}\n`);
  await writeFile(markdownPath, buildMarkdown(artifact));
  const manifest = await buildManifest(artifact.source_url ?? artifact.html_file ?? artifact.checked_at, [
    { artifactType: 'validator_app_submission_contract', filePath: jsonPath, mediaType: 'application/json' },
    { artifactType: 'validator_app_submission_contract_summary', filePath: markdownPath, mediaType: 'text/markdown' },
  ]);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        status: artifact.requirement_status,
        finding_status: artifact.finding.status,
        policy_state: artifact.policy_state,
        raw_bridge_token_stored: false,
        files: {
          artifact: jsonPath,
          summary: markdownPath,
          manifest: manifestPath,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
