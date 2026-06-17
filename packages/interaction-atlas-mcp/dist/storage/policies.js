import { compileConstraintPolicy } from '@create-something/policy-os-engine';
function nowEpochSeconds() {
    return Math.floor(Date.now() / 1000);
}
function randSuffix() {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
function safeIdPart(value) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 64) || 'unknown';
}
function makePolicyVersionId(accountId, entityType, entityId) {
    return ['pol', safeIdPart(accountId), safeIdPart(entityType), safeIdPart(entityId), String(nowEpochSeconds()), randSuffix()].join('_');
}
function makeEstimateReportId(accountId, entityType, entityId) {
    return ['rep', safeIdPart(accountId), safeIdPart(entityType), safeIdPart(entityId), String(nowEpochSeconds()), randSuffix()].join('_');
}
function compilePolicyArtifact(policy) {
    const compiled = compileConstraintPolicy(policy);
    return {
        policy_engine: 'polar_v1',
        policy_polar: compiled.policyPolar,
        policy_hash: compiled.policyHash,
        compiler_version: compiled.compilerVersion,
        fallback_ir_json: compiled.fallbackIrJson,
    };
}
function hasCompiledArtifact(row) {
    return Boolean(row.policy_polar && row.policy_hash && row.compiler_version);
}
async function backfillCompiledArtifact(db, row, policy) {
    if (hasCompiledArtifact(row))
        return row;
    const artifact = compilePolicyArtifact(policy);
    const enriched = { ...row, ...artifact };
    if (!db)
        return enriched;
    await db
        .prepare(`UPDATE judgment_policy_versions
       SET policy_engine = ?, policy_polar = ?, policy_hash = ?, compiler_version = ?, fallback_ir_json = ?
       WHERE id = ? AND account_id = ?`)
        .bind(artifact.policy_engine, artifact.policy_polar, artifact.policy_hash, artifact.compiler_version, artifact.fallback_ir_json, row.id, row.account_id)
        .run();
    return enriched;
}
export function createDefaultPolicy(entityId) {
    return {
        id: `default-${safeIdPart(entityId)}`,
        name: `Default policy for ${entityId}`,
        description: 'Baseline hard-gate policy for Atlas workflow mapping.',
        guardrails: {
            maxReviewDelta: 2,
            maxBlockDelta: 1,
        },
        rules: [
            {
                id: 'jr_block_readonly_write_01',
                priority: 10,
                when: { hasWriteIntent: true, accountIds: ['public'] },
                then: {
                    decision: 'block',
                    reason: 'Public read-only account cannot run write-intent path.',
                },
            },
            {
                id: 'jr_review_introspection_failure_02',
                priority: 20,
                when: { toolNames: ['mcp_map_to_workflow'], introspectionOk: false },
                then: {
                    decision: 'require_human_review',
                    reason: 'Introspection failed; operator review required.',
                },
            },
            {
                id: 'jr_review_missing_human_step_03',
                priority: 30,
                when: { hasWriteIntent: true, hasHumanReviewStep: false },
                then: {
                    decision: 'require_human_review',
                    reason: 'Write-intent path without explicit human review.',
                },
            },
            {
                id: 'jr_allow_default_99',
                priority: 999,
                when: {},
                then: {
                    decision: 'allow',
                    reason: 'No restrictive rules matched.',
                },
            },
        ],
    };
}
export async function savePolicyVersion(db, input) {
    const status = input.status ?? 'draft';
    const artifact = compilePolicyArtifact(input.policy);
    const id = makePolicyVersionId(input.accountId, input.entityType, input.entityId);
    const row = {
        id,
        account_id: input.accountId,
        entity_type: input.entityType,
        entity_id: input.entityId,
        status,
        policy_json: JSON.stringify(input.policy),
        ...artifact,
        created_by: input.createdBy,
        created_at: nowEpochSeconds(),
    };
    if (!db)
        return row;
    await db
        .prepare(`INSERT INTO judgment_policy_versions
       (id, account_id, entity_type, entity_id, status, policy_json, policy_engine, policy_polar, policy_hash, compiler_version, fallback_ir_json, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(row.id, row.account_id, row.entity_type, row.entity_id, row.status, row.policy_json, row.policy_engine ?? 'polar_v1', row.policy_polar ?? null, row.policy_hash ?? null, row.compiler_version ?? null, row.fallback_ir_json ?? null, row.created_by, row.created_at)
        .run();
    return row;
}
export async function getPolicyVersionById(db, accountId, policyVersionId) {
    if (!db)
        return null;
    const row = await db
        .prepare(`SELECT * FROM judgment_policy_versions WHERE account_id = ? AND id = ? LIMIT 1`)
        .bind(accountId, policyVersionId)
        .first();
    if (!row)
        return null;
    let parsed;
    try {
        parsed = JSON.parse(row.policy_json);
    }
    catch {
        return row;
    }
    return backfillCompiledArtifact(db, row, parsed);
}
export async function listPolicyVersions(db, accountId, entityType, entityId) {
    if (!db)
        return [];
    const result = await db
        .prepare(`SELECT * FROM judgment_policy_versions
       WHERE account_id = ? AND entity_type = ? AND entity_id = ?
       ORDER BY created_at DESC`)
        .bind(accountId, entityType, entityId)
        .all();
    const rows = result.results;
    const output = [];
    for (const row of rows) {
        let parsed = null;
        try {
            parsed = JSON.parse(row.policy_json);
        }
        catch {
            // keep raw row on parse failure
        }
        if (!parsed) {
            output.push(row);
            continue;
        }
        output.push(await backfillCompiledArtifact(db, row, parsed));
    }
    return output;
}
export async function getActivePolicySelection(db, accountId, entityType, entityId) {
    if (!db)
        return null;
    const row = await db
        .prepare(`SELECT active_policy_version_id FROM judgment_policy_selection
       WHERE account_id = ? AND entity_type = ? AND entity_id = ?
       LIMIT 1`)
        .bind(accountId, entityType, entityId)
        .first();
    return row?.active_policy_version_id ?? null;
}
export async function activatePolicyVersion(db, input) {
    if (!db)
        return;
    await db
        .prepare(`UPDATE judgment_policy_versions
       SET status = 'draft'
       WHERE account_id = ? AND entity_type = ? AND entity_id = ? AND status = 'active'`)
        .bind(input.accountId, input.entityType, input.entityId)
        .run();
    await db
        .prepare(`INSERT INTO judgment_policy_selection
       (account_id, entity_type, entity_id, active_policy_version_id, updated_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(account_id, entity_type, entity_id) DO UPDATE SET
         active_policy_version_id = excluded.active_policy_version_id,
         updated_by = excluded.updated_by,
         updated_at = excluded.updated_at`)
        .bind(input.accountId, input.entityType, input.entityId, input.policyVersionId, input.updatedBy, nowEpochSeconds())
        .run();
    await db
        .prepare(`UPDATE judgment_policy_versions SET status = 'active' WHERE account_id = ? AND id = ?`)
        .bind(input.accountId, input.policyVersionId)
        .run();
}
export async function resolveActivePolicy(db, input) {
    const fallback = createDefaultPolicy(input.entityId);
    const fallbackCompiled = compilePolicyArtifact(fallback);
    if (!db) {
        return {
            policyVersionId: `default-${safeIdPart(input.entityId)}`,
            policy: fallback,
            compiled: fallbackCompiled,
        };
    }
    const selectedId = await getActivePolicySelection(db, input.accountId, input.entityType, input.entityId);
    if (selectedId) {
        const selected = await getPolicyVersionById(db, input.accountId, selectedId);
        if (selected) {
            const policy = JSON.parse(selected.policy_json);
            const enriched = await backfillCompiledArtifact(db, selected, policy);
            const compiled = compilePolicyArtifact(policy);
            return {
                policyVersionId: enriched.id,
                policy,
                compiled: {
                    policy_engine: 'polar_v1',
                    policy_polar: enriched.policy_polar ?? compiled.policy_polar,
                    policy_hash: enriched.policy_hash ?? compiled.policy_hash,
                    compiler_version: enriched.compiler_version ?? compiled.compiler_version,
                    fallback_ir_json: enriched.fallback_ir_json ?? compiled.fallback_ir_json,
                },
            };
        }
    }
    const latest = await db
        .prepare(`SELECT * FROM judgment_policy_versions
       WHERE account_id = ? AND entity_type = ? AND entity_id = ?
       ORDER BY created_at DESC
       LIMIT 1`)
        .bind(input.accountId, input.entityType, input.entityId)
        .first();
    if (latest) {
        const policy = JSON.parse(latest.policy_json);
        const enriched = await backfillCompiledArtifact(db, latest, policy);
        const compiled = compilePolicyArtifact(policy);
        return {
            policyVersionId: enriched.id,
            policy,
            compiled: {
                policy_engine: 'polar_v1',
                policy_polar: enriched.policy_polar ?? compiled.policy_polar,
                policy_hash: enriched.policy_hash ?? compiled.policy_hash,
                compiler_version: enriched.compiler_version ?? compiled.compiler_version,
                fallback_ir_json: enriched.fallback_ir_json ?? compiled.fallback_ir_json,
            },
        };
    }
    return {
        policyVersionId: `default-${safeIdPart(input.entityId)}`,
        policy: fallback,
        compiled: fallbackCompiled,
    };
}
export async function saveEstimateReport(db, input) {
    const id = makeEstimateReportId(input.accountId, input.entityType, input.entityId);
    const row = {
        id,
        account_id: input.accountId,
        entity_type: input.entityType,
        entity_id: input.entityId,
        before_policy_version_id: input.beforePolicyVersionId,
        after_policy_version_id: input.afterPolicyVersionId,
        scenario_set_json: JSON.stringify(input.scenarioSet),
        summary_json: JSON.stringify(input.summary),
        created_by: input.createdBy,
        created_at: nowEpochSeconds(),
    };
    if (!db)
        return row;
    await db
        .prepare(`INSERT INTO judgment_estimate_reports
       (id, account_id, entity_type, entity_id, before_policy_version_id, after_policy_version_id, scenario_set_json, summary_json, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(row.id, row.account_id, row.entity_type, row.entity_id, row.before_policy_version_id, row.after_policy_version_id, row.scenario_set_json, row.summary_json, row.created_by, row.created_at)
        .run();
    return row;
}
export async function getEstimateReportById(db, accountId, reportId) {
    if (!db)
        return null;
    return db
        .prepare(`SELECT * FROM judgment_estimate_reports WHERE account_id = ? AND id = ? LIMIT 1`)
        .bind(accountId, reportId)
        .first();
}
export async function getLatestEstimateReport(db, accountId, entityType, entityId) {
    if (!db)
        return null;
    return db
        .prepare(`SELECT * FROM judgment_estimate_reports
       WHERE account_id = ? AND entity_type = ? AND entity_id = ?
       ORDER BY created_at DESC
       LIMIT 1`)
        .bind(accountId, entityType, entityId)
        .first();
}
//# sourceMappingURL=policies.js.map