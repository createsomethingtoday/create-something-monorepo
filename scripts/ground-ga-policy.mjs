function issue(condition, message, issues) {
  if (!condition) issues.push(message);
}

function uniqueIds(entries) {
  return (
    Array.isArray(entries) && new Set(entries.map((entry) => entry?.id)).size === entries.length
  );
}

export function validateGroundGaConfig(config) {
  const issues = [];
  issue(config?.schemaVersion === 1, 'Ground GA config schemaVersion must equal 1', issues);
  issue(config?.mode === 'advisory', 'Ground GA mode must remain advisory', issues);
  issue(
    config?.package?.name === '@createsomething/ground-mcp',
    'Ground npm package is required',
    issues
  );
  issue(
    /^\d+\.\d+\.\d+$/.test(config?.package?.version ?? ''),
    'Ground package version is invalid',
    issues
  );
  issue(
    Number.isInteger(config?.package?.minimumToolCount),
    'Ground tool-count floor is required',
    issues
  );
  issue(
    uniqueIds(config?.languages) && config.languages.length === 3,
    'Ground requires three unique language lanes',
    issues
  );
  issue(
    uniqueIds(config?.platforms) && config.platforms.length === 5,
    'Ground requires five unique native platform lanes',
    issues
  );
  issue(
    uniqueIds(config?.clients) && config.clients.length === 4,
    'Ground requires four unique client lanes',
    issues
  );
  issue(
    Array.isArray(config?.tests) && config.tests.length > 0,
    'Ground required tests are missing',
    issues
  );
  issue(
    Array.isArray(config?.surfaces?.routes) && config.surfaces.routes.length === 2,
    'Ground requires Agency and IO production routes',
    issues
  );
  issue(
    Array.isArray(config?.surfaces?.widths) &&
      config.surfaces.widths.includes(1440) &&
      config.surfaces.widths.includes(390),
    'Ground browser widths must include desktop and mobile',
    issues
  );
  issue(
    config?.calibration?.minimumCompleteReceipts >= 1,
    'Ground requires a complete-receipt threshold',
    issues
  );
  issue(
    config?.calibration?.minimumAdjudicatedFindings >= 10,
    'Ground requires at least 10 adjudicated findings',
    issues
  );
  issue(
    config?.calibration?.minimumPrecision >= 0.9,
    'Ground precision threshold must be at least 90%',
    issues
  );
  issue(
    config?.calibration?.minimumRecall >= 0.9,
    'Ground recall threshold must be at least 90%',
    issues
  );
  issue(
    config?.calibration?.maximumFalsePositiveRate <= 0.1,
    'Ground false-positive threshold must be at most 10%',
    issues
  );
  issue(
    config?.calibration?.maximumExecutionFailures === 0,
    'Ground representative calibration must allow zero execution failures',
    issues
  );
  issue(
    config?.calibration?.releaseReceipt === 'ground-calibration-receipt.json',
    'Ground calibration release receipt is required',
    issues
  );
  issue(
    config?.calibration?.fixtureExecution?.receiptSchema ===
      'ground-calibration-execution-receipt.v1',
    'Ground calibration fixture receipt schema is required',
    issues
  );
  issue(
    config?.calibration?.fixtureExecution?.manifest === 'packages/ground/Cargo.toml',
    'Ground calibration fixture manifest is required',
    issues
  );
  issue(
    config?.calibration?.fixtureExecution?.testTarget === 'ga_calibration',
    'Ground calibration fixture target is required',
    issues
  );
  issue(
    config?.calibration?.fixtureExecution?.minimumPassedTests >= 12,
    'Ground calibration fixture test-count floor must be at least 12',
    issues
  );
  return issues;
}

function record(reasons, condition, reason) {
  if (!condition) reasons.push(reason);
}

function publishedConsumerSmokeIsValid(smoke, platform, config, sourceSha) {
  return (
    smoke?.schema_version === 'ground-published-consumer-smoke.v1' &&
    smoke?.ready === true &&
    smoke?.platform === platform.id &&
    smoke?.version === config.package.version &&
    smoke?.source_sha === sourceSha &&
    smoke?.package?.name === config.package.name &&
    smoke?.package?.fresh_directory === true &&
    smoke?.package?.lifecycle_scripts_enabled === true &&
    /^sha512-/.test(smoke?.package?.integrity ?? '') &&
    smoke?.mcp?.initialized === true &&
    smoke?.mcp?.tool_count >= config.package.minimumToolCount &&
    smoke?.trust_contract?.invalid_policy_rejected === true &&
    smoke?.trust_contract?.stale_evidence_rejected === true &&
    smoke?.trust_contract?.inferred_fixes_review_only === true &&
    smoke?.trust_contract?.workspace_discovery_verified === true &&
    smoke?.trust_contract?.policy_digest_verified === true &&
    config.languages.every((language) => {
      const lane = smoke?.language_smokes?.[language.id];
      return lane?.verification_status === 'FAIL' && typeof lane?.finding === 'string';
    })
  );
}

export function evaluateGroundCalibration(config, calibration) {
  const configIssues = validateGroundGaConfig(config);
  if (configIssues.length > 0) {
    throw new Error(`Invalid Ground GA config: ${configIssues.join('; ')}`);
  }
  const reasons = [];
  for (const reason of calibration?.promotion?.reasons ?? ['summary_missing']) {
    reasons.push(`calibration:${reason}`);
  }
  record(
    reasons,
    calibration?.schema_version === 'ground-adjudication-summary.v1',
    'calibration:schema_invalid'
  );
  record(reasons, calibration?.promotion?.ready === true, 'calibration:not_ready');
  record(
    reasons,
    calibration?.receipts?.complete >= config.calibration.minimumCompleteReceipts,
    'calibration:insufficient_complete_receipts'
  );
  record(
    reasons,
    calibration?.findings?.adjudicated >= config.calibration.minimumAdjudicatedFindings,
    'calibration:insufficient_adjudicated_findings'
  );
  record(
    reasons,
    calibration?.precision >= config.calibration.minimumPrecision,
    'calibration:precision_below_threshold'
  );
  record(
    reasons,
    calibration?.recall >= config.calibration.minimumRecall,
    'calibration:recall_below_threshold'
  );
  record(
    reasons,
    calibration?.false_positive_rate <= config.calibration.maximumFalsePositiveRate,
    'calibration:false_positive_rate_above_threshold'
  );
  record(
    reasons,
    calibration?.execution?.failures <= config.calibration.maximumExecutionFailures,
    'calibration:execution_failures_above_threshold'
  );
  for (const [check, minimum] of Object.entries(config.calibration.minimumAdjudicatedByCheck)) {
    record(
      reasons,
      calibration?.checks?.[check]?.adjudicated >= minimum,
      `calibration:insufficient_adjudicated_findings:${check}`
    );
  }

  return {
    schema_version: 'ground-calibration-receipt.v1',
    mode: 'advisory',
    version: config.package.version,
    calibration,
    promotion: { ready: reasons.length === 0, reasons: [...new Set(reasons)] }
  };
}

export function evaluateGroundCalibrationExecution(config, execution, sourceSha) {
  const fixture = config.calibration.fixtureExecution;
  const expectedCommand = `cargo test --manifest-path ${fixture.manifest} --test ${fixture.testTarget} -- --nocapture`;
  const reasons = [];
  record(
    reasons,
    execution?.schema_version === fixture.receiptSchema,
    'calibration:fixture_execution_schema_invalid'
  );
  record(
    reasons,
    execution?.source_sha === sourceSha,
    'calibration:fixture_execution_source_mismatch'
  );
  record(
    reasons,
    execution?.manifest === fixture.manifest,
    'calibration:fixture_execution_manifest_mismatch'
  );
  record(
    reasons,
    execution?.test_target === fixture.testTarget,
    'calibration:fixture_execution_target_mismatch'
  );
  record(
    reasons,
    execution?.command === expectedCommand,
    'calibration:fixture_execution_command_mismatch'
  );
  record(
    reasons,
    execution?.result?.completed === true,
    'calibration:fixture_execution_incomplete'
  );
  record(reasons, execution?.result?.exit_code === 0, 'calibration:fixture_execution_exit_nonzero');
  record(
    reasons,
    execution?.result?.summary_seen === true,
    'calibration:fixture_execution_summary_missing'
  );
  record(
    reasons,
    execution?.result?.passed >= fixture.minimumPassedTests,
    'calibration:fixture_execution_insufficient_passed_tests'
  );
  record(reasons, execution?.result?.failed === 0, 'calibration:fixture_execution_failed_tests');
  record(reasons, execution?.ready === true, 'calibration:fixture_execution_not_ready');
  return [...new Set(reasons)];
}

export function evaluateGroundGa(config, calibration, evidence, now = new Date()) {
  const calibrationReceipt = evaluateGroundCalibration(config, calibration);
  const reasons = [...calibrationReceipt.promotion.reasons];

  record(reasons, evidence?.schema_version === 'ground-ga-evidence.v1', 'evidence_schema_invalid');
  const sourceSha = evidence?.source_sha;
  record(reasons, /^[0-9a-f]{40}$/.test(sourceSha ?? ''), 'source_sha_invalid');
  record(reasons, evidence?.version === config.package.version, 'package_version_mismatch');

  for (const requiredTest of config.tests) {
    record(reasons, evidence?.tests?.[requiredTest] === true, `test_failed:${requiredTest}`);
  }

  const release = evidence?.release ?? {};
  record(reasons, release.tag === `ground-v${config.package.version}`, 'release_tag_mismatch');
  record(reasons, release.source_sha === sourceSha, 'release_source_sha_mismatch');
  record(reasons, release.checksums_verified === true, 'release_checksums_unverified');
  record(
    reasons,
    release.consumer_checksums_verified === true,
    'release_consumer_checksums_unverified'
  );
  record(reasons, release.provenance_verified === true, 'release_provenance_unverified');
  const releaseAssets = new Set(release.assets ?? []);
  record(
    reasons,
    releaseAssets.has('CONSUMER-SHA256SUMS'),
    'release_asset_missing:CONSUMER-SHA256SUMS'
  );
  record(
    reasons,
    releaseAssets.has(config.calibration.releaseReceipt),
    `release_asset_missing:${config.calibration.releaseReceipt}`
  );
  for (const platform of config.platforms) {
    const assetPresent = releaseAssets.has(platform.asset);
    const consumerReceiptAsset = `ground-${platform.id}-consumer-smoke.json`;
    record(reasons, assetPresent, `release_asset_missing:${platform.asset}`);
    record(
      reasons,
      releaseAssets.has(consumerReceiptAsset),
      `release_asset_missing:${consumerReceiptAsset}`
    );
    record(
      reasons,
      assetPresent &&
        publishedConsumerSmokeIsValid(
          evidence?.npm?.platform_smokes?.[platform.id],
          platform,
          config,
          sourceSha
        ),
      `platform_smoke_missing:${platform.id}`
    );
  }

  const npm = evidence?.npm ?? {};
  record(reasons, npm.name === config.package.name, 'npm_name_mismatch');
  record(reasons, npm.version === config.package.version, 'npm_version_mismatch');
  record(reasons, npm.source_sha === sourceSha, 'npm_source_sha_mismatch');
  record(reasons, npm.provenance_verified === true, 'npm_provenance_unverified');
  record(reasons, npm.tool_count >= config.package.minimumToolCount, 'mcp_tool_count_below_policy');

  for (const client of config.clients) {
    record(reasons, evidence?.clients?.[client.id] === true, `client_smoke_missing:${client.id}`);
  }
  for (const language of config.languages) {
    record(
      reasons,
      evidence?.language_smokes?.[language.id] === true,
      `language_smoke_missing:${language.id}`
    );
  }

  const browser = evidence?.browser ?? {};
  record(reasons, browser.source_sha === sourceSha, 'browser_source_sha_mismatch');
  const capturedAt = Date.parse(browser.captured_at ?? '');
  const ageMs = now.getTime() - capturedAt;
  const maxAgeMs = config.surfaces.browserEvidenceMaxAgeHours * 60 * 60 * 1000;
  record(
    reasons,
    Number.isFinite(capturedAt) && ageMs >= 0 && ageMs <= maxAgeMs,
    'browser_evidence_stale_or_invalid'
  );
  for (const route of config.surfaces.routes) {
    const routeEvidence = browser.routes?.[route];
    record(
      reasons,
      Array.isArray(routeEvidence?.widths) &&
        config.surfaces.widths.every((width) => routeEvidence.widths.includes(width)),
      `browser_width_missing:${route}`
    );
    for (const check of config.surfaces.checks) {
      record(reasons, routeEvidence?.[check] === true, `browser_check_failed:${route}:${check}`);
    }
  }

  return {
    schema_version: 'ground-ga-receipt.v1',
    mode: 'advisory',
    version: config.package.version,
    source_sha: sourceSha ?? null,
    calibration,
    evidence,
    promotion: { ready: reasons.length === 0, reasons: [...new Set(reasons)] }
  };
}
