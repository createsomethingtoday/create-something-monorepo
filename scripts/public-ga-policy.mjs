import { Buffer } from 'node:buffer';

function issue(condition, message, issues) {
  if (!condition) issues.push(message);
}

const REQUIRED_MAP_CHECK_IDS = new Set(
  ['desktop', 'mobile'].flatMap((viewport) => [
    `${viewport}_route_and_responsive_render`,
    `${viewport}_starter_booking_context`,
    `${viewport}_edit_booking_context`,
    `${viewport}_restore_booking_context`,
    `${viewport}_reset_booking_context`,
    `${viewport}_mapping_agent_non_mutating_boundary`,
    `${viewport}_map_health`,
    `${viewport}_console_health`
  ])
);

function hasCompletePassingMapChecks(checks) {
  if (!Array.isArray(checks) || checks.length !== REQUIRED_MAP_CHECK_IDS.size) return false;
  const seen = new Set();
  for (const check of checks) {
    if (
      !check ||
      typeof check.id !== 'string' ||
      !REQUIRED_MAP_CHECK_IDS.has(check.id) ||
      seen.has(check.id) ||
      check.ok !== true ||
      !Number.isFinite(check.durationMs) ||
      check.durationMs < 0
    ) {
      return false;
    }
    seen.add(check.id);
  }
  return seen.size === REQUIRED_MAP_CHECK_IDS.size;
}

function stringValues(value, output = []) {
  if (typeof value === 'string') output.push(value);
  else if (Array.isArray(value)) value.forEach((entry) => stringValues(entry, output));
  else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, entry]) => {
      output.push(key);
      stringValues(entry, output);
    });
  }
  return output;
}

export function validateGaConfig(config) {
  const issues = [];
  issue(config?.schemaVersion === 2, 'GA config schemaVersion must equal 2', issues);
  issue(config?.repository?.owner, 'GA config requires repository.owner', issues);
  issue(config?.repository?.name, 'GA config requires repository.name', issues);
  issue(
    Number.isInteger(config?.repository?.rulesetId),
    'GA config requires repository.rulesetId',
    issues
  );
  issue(
    Array.isArray(config?.repository?.requiredChecks) &&
      config.repository.requiredChecks.length >= 2,
    'GA config requires at least two universal status checks',
    issues
  );
  issue(
    config?.repository?.governanceMode === 'sole-operator',
    'GA config requires sole-operator governance mode',
    issues
  );
  issue(
    typeof config?.repository?.soleOperator === 'string' && config.repository.soleOperator.length > 0,
    'GA config requires a named sole operator',
    issues
  );
  issue(
    config?.repository?.minimumApprovingReviews === 0,
    'sole-operator GA config must not require an unavailable peer approval',
    issues
  );
  issue(
    config?.repository?.requireCodeOwnerReview === false,
    'sole-operator GA config must not require an unavailable code-owner approval',
    issues
  );
  issue(
    config?.repository?.requireReviewThreadResolution === true,
    'sole-operator GA config must require review-thread resolution',
    issues
  );
  issue(
    config?.repository?.requireLastPushApproval === false,
    'sole-operator GA config must not require an unavailable last-push approval',
    issues
  );
  issue(
    config?.repository?.minimumMaintainers === 1,
    'sole-operator GA config requires exactly one write-capable maintainer',
    issues
  );
  issue(
    config?.repository?.minimumCodeOwners === 1,
    'sole-operator GA config requires exactly one write-capable code owner',
    issues
  );
  issue(
    Array.isArray(config?.packages) && config.packages.length === 2,
    'GA config requires two packages',
    issues
  );
  issue(
    config?.npm?.trustedPublisherMode === 'stage-only',
    'GA config requires stage-only npm trusted publishing',
    issues
  );
  const receiptSource = config?.map?.receiptSource;
  issue(
    receiptSource?.kind === 'cloudflare-d1',
    'GA config requires the Cloudflare D1 Map receipt source',
    issues
  );
  issue(
    receiptSource?.workerName === 'map-production-monitor',
    'GA config requires the map-production-monitor Worker',
    issues
  );
  issue(
    receiptSource?.workerHealthUrl ===
      'https://map-production-monitor.createsomething.workers.dev/health',
    'GA config requires the Map monitor health URL',
    issues
  );
  issue(
    receiptSource?.databaseName === 'create-something-db' &&
      receiptSource?.wranglerConfig === 'packages/agency/wrangler.jsonc',
    'GA config requires the shared CREATE SOMETHING D1 receipt binding',
    issues
  );
  issue(
    receiptSource?.table === 'map_production_monitor_receipts',
    'GA config requires the Map receipt table',
    issues
  );
  issue(
    receiptSource?.receiptRetentionDays === 30,
    'GA config requires thirty-day Map receipt retention',
    issues
  );
  issue(config?.map?.requiredConsecutiveDays === 7, 'GA config requires seven Map days', issues);
  return issues;
}

export function validateRepositoryReadback(readback, config, gaCommit) {
  const issues = [];
  const repository = config.repository;
  issue(
    readback.repository?.visibility === 'public',
    'GitHub repository must remain public',
    issues
  );
  issue(
    readback.repository?.default_branch === repository.mainBranch,
    'GitHub default branch must be main',
    issues
  );
  issue(
    readback.main?.commit?.sha === gaCommit,
    'GA commit must be the current GitHub main SHA',
    issues
  );
  issue(
    readback.ruleset?.id === repository.rulesetId,
    'GitHub ruleset ID does not match policy',
    issues
  );
  issue(readback.ruleset?.enforcement === 'active', 'GitHub ruleset must be active', issues);
  issue(
    readback.ruleset?.conditions?.ref_name?.include?.includes(
      `refs/heads/${repository.mainBranch}`
    ),
    'GitHub ruleset must target main',
    issues
  );

  const statusRule = readback.ruleset?.rules?.find(
    (rule) => rule.type === 'required_status_checks'
  );
  const actualChecks = new Set(
    statusRule?.parameters?.required_status_checks?.map((entry) => entry.context) ?? []
  );
  for (const requiredCheck of repository.requiredChecks) {
    issue(
      actualChecks.has(requiredCheck),
      `GitHub ruleset is missing required check: ${requiredCheck}`,
      issues
    );
  }
  issue(
    statusRule?.parameters?.strict_required_status_checks_policy === true,
    'GitHub required checks must be strict',
    issues
  );

  const pullRequestRule = readback.ruleset?.rules?.find((rule) => rule.type === 'pull_request');
  const pull = pullRequestRule?.parameters ?? {};
  issue(
    pull.required_approving_review_count === repository.minimumApprovingReviews,
    'GitHub sole-operator ruleset must exactly match declared approving reviews',
    issues
  );
  issue(
    pull.require_code_owner_review === repository.requireCodeOwnerReview,
    'GitHub sole-operator ruleset must exactly match declared code-owner review policy',
    issues
  );
  issue(
    pull.required_review_thread_resolution === repository.requireReviewThreadResolution,
    'GitHub sole-operator ruleset must exactly match declared review-thread resolution policy',
    issues
  );
  issue(
    pull.require_last_push_approval === repository.requireLastPushApproval,
    'GitHub sole-operator ruleset must exactly match declared last-push approval policy',
    issues
  );

  const maintainers = (readback.collaborators ?? []).filter(
    (entry) => entry.permissions?.admin || entry.permissions?.maintain || entry.permissions?.push
  );
  issue(
    new Set(maintainers.map((entry) => entry.login)).size >= repository.minimumMaintainers,
    `GitHub requires at least ${repository.minimumMaintainers} write-capable maintainers`,
    issues
  );
  issue(
    maintainers.some((entry) => entry.login === repository.soleOperator),
    `GitHub sole operator is missing write-capable access: ${repository.soleOperator}`,
    issues
  );
  issue(
    (readback.secretAlerts ?? []).length === 0,
    'GitHub has open secret-scanning alerts',
    issues
  );
  issue(
    readback.workflowPermissions?.default_workflow_permissions === 'read',
    'GitHub Actions default workflow permission must be read',
    issues
  );
  issue(
    readback.workflowPermissions?.can_approve_pull_request_reviews === false,
    'GitHub Actions may not approve pull-request reviews',
    issues
  );

  const allowed = new Set(repository.allowedRuntimeAdvisories ?? []);
  const unownedAlerts = (readback.dependabotAlerts ?? []).filter((alert) => {
    const severity = alert.security_advisory?.severity;
    return (
      alert.state === 'open' &&
      alert.dependency?.scope === 'runtime' &&
      ['critical', 'high'].includes(severity) &&
      !allowed.has(alert.security_advisory?.ghsa_id)
    );
  });
  issue(
    unownedAlerts.length === 0,
    `GitHub has unowned critical/high runtime alerts: ${unownedAlerts
      .map((alert) => `${alert.number}:${alert.security_advisory?.ghsa_id}`)
      .join(', ')}`,
    issues
  );

  return { issues, maintainers: maintainers.map((entry) => entry.login).sort(), unownedAlerts };
}

export function validateCodeowners(contents, maintainers, minimumCodeOwners) {
  const maintainerSet = new Set(maintainers);
  const owners = new Set();
  for (const line of contents.split(/\r?\n/)) {
    const rule = line.replace(/\s+#.*$/, '').trim();
    if (!rule || rule.startsWith('#')) continue;
    for (const token of rule.split(/\s+/).slice(1)) {
      if (token.startsWith('@') && !token.includes('/')) owners.add(token.slice(1));
    }
  }
  const eligible = [...owners].filter((owner) => maintainerSet.has(owner)).sort();
  const issues = [];
  issue(
    eligible.length >= minimumCodeOwners,
    `CODEOWNERS requires at least ${minimumCodeOwners} write-capable individual owners`,
    issues
  );
  return { issues, owners: eligible };
}

export function decodeProvenanceStatements(attestationReadback) {
  return (attestationReadback?.attestations ?? [])
    .filter((entry) => entry.predicateType === 'https://slsa.dev/provenance/v1')
    .map((entry) => {
      const payload = entry.bundle?.dsseEnvelope?.payload;
      if (typeof payload !== 'string') return null;
      try {
        return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

export function validatePackageReadback(readback, packagePolicy, config, gaCommit) {
  const issues = [];
  const version = readback.metadata?.versions?.[packagePolicy.version];
  issue(
    Boolean(version),
    `${packagePolicy.name}@${packagePolicy.version} is missing from npm`,
    issues
  );
  issue(
    version?.name === packagePolicy.name,
    `${packagePolicy.name} registry name mismatch`,
    issues
  );
  issue(
    version?.version === packagePolicy.version,
    `${packagePolicy.name} registry version mismatch`,
    issues
  );
  issue(version?.license === 'MIT', `${packagePolicy.name} registry license must be MIT`, issues);
  issue(
    version?.repository?.url === `git+https://github.com/${config.npm.repository}.git`,
    `${packagePolicy.name} registry repository mismatch`,
    issues
  );
  issue(
    Boolean(version?.dist?.integrity),
    `${packagePolicy.name} registry integrity is missing`,
    issues
  );
  issue(
    Boolean(version?.dist?.tarball),
    `${packagePolicy.name} registry tarball is missing`,
    issues
  );
  issue(
    version?.dist?.attestations?.provenance?.predicateType === 'https://slsa.dev/provenance/v1',
    `${packagePolicy.name} registry provenance pointer is missing`,
    issues
  );

  const provenance = decodeProvenanceStatements(readback.attestations);
  const expectedRepository = `https://github.com/${config.npm.repository}`;
  const expectedWorkflow = `.github/workflows/${config.npm.workflowFile}`;
  const expectedSubject = `pkg:npm/${packagePolicy.name.replace(/^@/, '%40')}@${packagePolicy.version}`;
  const matchingProvenance = provenance.find((statement) => {
    const predicate = statement.predicate ?? {};
    const workflow = predicate.buildDefinition?.externalParameters?.workflow ?? {};
    const dependencies = predicate.buildDefinition?.resolvedDependencies ?? [];
    return (
      statement.subject?.some((subject) => subject.name === expectedSubject) &&
      workflow.repository === expectedRepository &&
      workflow.path === expectedWorkflow &&
      workflow.ref === 'refs/heads/main' &&
      predicate.runDetails?.builder?.id === 'https://github.com/actions/runner/github-hosted' &&
      dependencies.some((entry) => entry.digest?.gitCommit === gaCommit)
    );
  });
  issue(
    Boolean(matchingProvenance),
    `${packagePolicy.name} provenance does not resolve to the GA main workflow and commit`,
    issues
  );

  const trustText = stringValues(readback.trust).join(' ').toLowerCase();
  issue(
    trustText.includes('github'),
    `${packagePolicy.name} trusted publisher must be GitHub`,
    issues
  );
  issue(
    trustText.includes(config.npm.repository.toLowerCase()),
    `${packagePolicy.name} trusted publisher repository mismatch`,
    issues
  );
  issue(
    trustText.includes(config.npm.workflowFile.toLowerCase()),
    `${packagePolicy.name} trusted publisher workflow mismatch`,
    issues
  );
  issue(
    trustText.includes(config.npm.environment.toLowerCase()),
    `${packagePolicy.name} trusted publisher environment mismatch`,
    issues
  );
  issue(
    trustText.includes('create staged package'),
    `${packagePolicy.name} trusted publisher must have restricted create staged package authority`,
    issues
  );

  const packedFiles = [...(readback.packedFiles ?? [])].sort();
  issue(
    packedFiles.length === packagePolicy.expectedFileCount,
    `${packagePolicy.name} packed file count must equal ${packagePolicy.expectedFileCount}`,
    issues
  );
  for (const required of ['package.json', 'README.md', 'LICENSE', 'CHANGELOG.md']) {
    issue(
      packedFiles.includes(required),
      `${packagePolicy.name} tarball is missing ${required}`,
      issues
    );
  }
  issue(
    readback.cleanInstall?.installed === true,
    `${packagePolicy.name} clean registry install failed`,
    issues
  );
  issue(
    readback.cleanInstall?.piLoaded === true,
    `${packagePolicy.name} did not load in Pi`,
    issues
  );

  return { issues, provenance: matchingProvenance ?? null };
}

export function validatePricingReadbacks(readbacks, config) {
  const issues = [];
  for (const route of config.pricing.routes) {
    const readback = readbacks.find((entry) => entry.path === route.path);
    issue(Boolean(readback), `Pricing readback is missing ${route.path}`, issues);
    issue(readback?.status === 200, `Pricing route ${route.path} did not return 200`, issues);
    for (const requiredText of route.requiredText) {
      issue(
        readback?.text?.includes(requiredText),
        `Pricing route ${route.path} is missing: ${requiredText}`,
        issues
      );
    }
  }
  return issues;
}

export function validateBrowserEvidence(evidence, config, gaCommit, options = {}) {
  const issues = [];
  issue(evidence?.schemaVersion === 1, 'Browser evidence schemaVersion must equal 1', issues);
  issue(evidence?.gaCommit === gaCommit, 'Browser evidence must target the GA commit', issues);
  const capturedAt = new Date(evidence?.capturedAt ?? 'invalid');
  const now = new Date(options.now ?? Date.now());
  issue(
    !Number.isNaN(capturedAt.valueOf()),
    'Browser evidence requires a valid capturedAt',
    issues
  );
  issue(
    Number.isNaN(capturedAt.valueOf()) ||
      now - capturedAt <= config.pricing.browserEvidenceMaxAgeHours * 3_600_000,
    `Browser evidence must be no older than ${config.pricing.browserEvidenceMaxAgeHours} hours`,
    issues
  );
  issue(
    !options.minimumCapturedAt || capturedAt >= new Date(options.minimumCapturedAt),
    'Browser evidence must be captured after the GA commit',
    issues
  );
  for (const route of config.pricing.routes) {
    for (const width of config.pricing.browserWidths) {
      const capture = evidence?.captures?.find(
        (entry) => entry.path === route.path && entry.viewport?.width === width
      );
      issue(Boolean(capture), `Browser evidence is missing ${route.path} at ${width}px`, issues);
      issue(
        capture?.httpStatus === 200,
        `Browser evidence ${route.path} at ${width}px is not 200`,
        issues
      );
      issue(
        capture?.screenshotVerified === true,
        `Browser screenshot is unverified for ${route.path} at ${width}px`,
        issues
      );
      issue(
        (capture?.consoleErrors ?? []).length === 0,
        `Browser console errors exist for ${route.path} at ${width}px`,
        issues
      );
      issue(
        (capture?.requestFailures ?? []).length === 0,
        `Browser request failures exist for ${route.path} at ${width}px`,
        issues
      );
      issue(
        capture?.requiredTextPass === true,
        `Browser pricing copy failed for ${route.path} at ${width}px`,
        issues
      );
      issue(
        capture?.horizontalOverflowPixels <= 1,
        `Browser overflow exceeds one pixel for ${route.path} at ${width}px`,
        issues
      );
    }
  }
  return issues;
}

function calendarDay(value, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date(value));
  const pick = (type) => parts.find((entry) => entry.type === type)?.value;
  const label = `${pick('year')}-${pick('month')}-${pick('day')}`;
  return { label, ordinal: Date.parse(`${label}T00:00:00Z`) / 86_400_000 };
}

export function selectMapBurnIn(receipts, mapPolicy, minimumCreatedAt, expectedSourceSha, now = new Date()) {
  const issues = [];
  const minimum = minimumCreatedAt ? new Date(minimumCreatedAt) : null;
  issue(
    minimum === null || !Number.isNaN(minimum.valueOf()),
    'Map receipt selector requires a valid minimum timestamp',
    issues
  );
  issue(
    typeof expectedSourceSha === 'string' && /^[0-9a-f]{40}$/i.test(expectedSourceSha),
    'Map receipt selector requires the exact GA source SHA',
    issues
  );

  const grouped = new Map();
  for (const receipt of receipts ?? []) {
    const scheduledAt = new Date(receipt?.scheduledAt ?? 'invalid');
    if (Number.isNaN(scheduledAt.valueOf())) {
      issues.push(`Map receipt ${receipt?.receiptId ?? 'unknown'} has an invalid scheduled timestamp`);
      continue;
    }
    if (minimum && scheduledAt < minimum) continue;
    const day = calendarDay(scheduledAt.toISOString(), mapPolicy.timeZone);
    const entry = { receipt, scheduledAt, day };
    const entries = grouped.get(day.label) ?? [];
    entries.push(entry);
    grouped.set(day.label, entries);
  }

  let streak = [];
  let currentStreakIssues = [];
  for (const entries of [...grouped.values()].sort(
    (left, right) => left[0].day.ordinal - right[0].day.ordinal
  )) {
    const { day } = entries[0];
    const invalid = entries.find(({ receipt, scheduledAt }) => {
      const completedAt = new Date(receipt?.completedAt ?? 'invalid');
      return (
        receipt?.schemaVersion !== 1 ||
        receipt?.trigger !== 'scheduled' ||
        receipt?.complete !== true ||
        receipt?.status !== 'passed' ||
        receipt?.sourceSha !== expectedSourceSha ||
        receipt?.baseUrl !== 'https://createsomething.agency' ||
        receipt?.customerDataUsed !== false ||
        receipt?.agentMutationUsed !== false ||
        receipt?.bookingSubmitted !== false ||
        typeof receipt?.workerVersion !== 'string' ||
        receipt.workerVersion.length === 0 ||
        !hasCompletePassingMapChecks(receipt?.checks) ||
        Number.isNaN(completedAt.valueOf()) ||
        completedAt < scheduledAt
      );
    });
    if (invalid) {
      const receiptId = invalid.receipt?.receiptId ?? 'unknown';
      if (invalid.receipt?.sourceSha !== expectedSourceSha) {
        currentStreakIssues = [`Map receipt ${receiptId} source SHA does not match the GA commit`];
      } else if (!hasCompletePassingMapChecks(invalid.receipt?.checks)) {
        currentStreakIssues = [
          `Map receipt ${receiptId} does not contain complete passing synthetic checks`
        ];
      } else {
        currentStreakIssues = [`Map receipt ${receiptId} is not a complete passing scheduled receipt`];
      }
      // A single red, incomplete, or malformed receipt invalidates the whole calendar day.
      // Later same-day greens are diagnostic only and never recover the streak.
      streak = [];
      continue;
    }

    const selected = entries
      .slice()
      .sort((left, right) => left.scheduledAt - right.scheduledAt)[0];
    const prior = streak.at(-1);
    if (!prior) {
      streak = [{ date: day.label, ordinal: day.ordinal, receipt: selected.receipt }];
      currentStreakIssues = [];
    } else if (day.ordinal === prior.ordinal + 1) {
      streak.push({ date: day.label, ordinal: day.ordinal, receipt: selected.receipt });
    } else {
      streak = [{ date: day.label, ordinal: day.ordinal, receipt: selected.receipt }];
      currentStreakIssues = [];
    }
  }

  const selected = streak.slice(-mapPolicy.requiredConsecutiveDays);
  issues.push(...currentStreakIssues);
  issue(
    streak.length >= mapPolicy.requiredConsecutiveDays,
    `Map requires ${mapPolicy.requiredConsecutiveDays} consecutive green days; current streak is ${streak.length}`,
    issues
  );
  const currentDay = calendarDay(now.toISOString(), mapPolicy.timeZone).label;
  issue(
    selected.at(-1)?.date === currentDay,
    `Map streak must end on the current ${mapPolicy.timeZone} calendar day`,
    issues
  );
  return {
    issues,
    days: selected.map(({ date, receipt }) => ({
      date,
      receiptId: receipt.receiptId,
      workerVersion: receipt.workerVersion,
      sourceSha: receipt.sourceSha,
      scheduledAt: receipt.scheduledAt,
      completedAt: receipt.completedAt,
      status: receipt.status
    }))
  };
}
