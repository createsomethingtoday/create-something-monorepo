import { compileConstraintPolicy } from '@create-something/policy-os-engine';
function nowEpochSeconds() {
    return Math.floor(Date.now() / 1000);
}
function safeIdPart(value) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || 'unknown';
}
function newId(prefix, ...parts) {
    const normalized = parts
        .filter((part) => part !== null && part !== undefined)
        .map((part) => safeIdPart(String(part)));
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 10);
    return [prefix, ...normalized, ts, rand].join('_');
}
function toNumber(value, fallback = 0) {
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (typeof value === 'string') {
        const numeric = Number(value);
        if (Number.isFinite(numeric))
            return numeric;
    }
    return fallback;
}
function toFlag(value) {
    return value ? 1 : 0;
}
async function nextVersion(db, table, accountId, idColumn, entityId) {
    if (!db)
        return 1;
    const row = await db
        .prepare(`SELECT COALESCE(MAX(version), 0) AS version FROM ${table} WHERE account_id = ? AND ${idColumn} = ?`)
        .bind(accountId, entityId)
        .first();
    return toNumber(row?.version, 0) + 1;
}
export async function savePolicyOsManifestVersion(db, input) {
    const compiled = compileConstraintPolicy(input.constraintPolicy);
    const version = input.version ?? (await nextVersion(db, 'policy_os_manifest_versions', input.accountId, 'policy_id', input.policyId));
    const row = {
        id: newId('pman', input.accountId, input.policyId, version),
        account_id: input.accountId,
        policy_id: input.policyId,
        version,
        status: input.status ?? 'draft',
        description: input.description ?? input.constraintPolicy.description ?? null,
        constraint_policy_json: JSON.stringify(input.constraintPolicy),
        polar_source: compiled.policyPolar,
        fallback_ir_json: compiled.fallbackIrJson,
        compiler_version: compiled.compilerVersion,
        policy_hash: compiled.policyHash,
        commit_sha: input.commitSha,
        rollout_defaults_json: input.rolloutDefaults ? JSON.stringify(input.rolloutDefaults) : null,
        created_by: input.createdBy,
        created_at: nowEpochSeconds(),
    };
    if (!db)
        return row;
    await db
        .prepare(`INSERT INTO policy_os_manifest_versions
       (id, account_id, policy_id, version, status, description, constraint_policy_json, polar_source, fallback_ir_json, compiler_version, policy_hash, commit_sha, rollout_defaults_json, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(row.id, row.account_id, row.policy_id, row.version, row.status, row.description, row.constraint_policy_json, row.polar_source, row.fallback_ir_json, row.compiler_version, row.policy_hash, row.commit_sha, row.rollout_defaults_json, row.created_by, row.created_at)
        .run();
    return row;
}
export async function savePolicyOsJudgmentPackVersion(db, input) {
    const version = input.version ?? (await nextVersion(db, 'policy_os_judgment_pack_versions', input.accountId, 'pack_id', input.packId));
    const row = {
        id: newId('ppack', input.accountId, input.packId, version),
        account_id: input.accountId,
        pack_id: input.packId,
        version,
        label: input.label,
        description: input.description ?? null,
        sandbox_policy_json: JSON.stringify(input.sandboxPolicy),
        approval_policy: input.approvalPolicy,
        non_interactive_decision: input.nonInteractiveDecision,
        auto_approve_json: input.autoApprove ? JSON.stringify(input.autoApprove) : null,
        developer_instructions: input.developerInstructions ?? null,
        status: input.status ?? 'draft',
        created_by: input.createdBy,
        created_at: nowEpochSeconds(),
    };
    if (!db)
        return row;
    await db
        .prepare(`INSERT INTO policy_os_judgment_pack_versions
       (id, account_id, pack_id, version, label, description, sandbox_policy_json, approval_policy, non_interactive_decision, auto_approve_json, developer_instructions, status, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(row.id, row.account_id, row.pack_id, row.version, row.label, row.description, row.sandbox_policy_json, row.approval_policy, row.non_interactive_decision, row.auto_approve_json, row.developer_instructions, row.status, row.created_by, row.created_at)
        .run();
    return row;
}
export async function upsertPolicyOsBinding(db, input) {
    const now = nowEpochSeconds();
    const row = {
        binding_id: input.bindingId ?? newId('pbind', input.accountId, input.environment ?? 'production', input.workflowId ?? 'default'),
        account_id: input.accountId,
        environment: input.environment ?? 'production',
        workflow_id: input.workflowId ?? null,
        tool_prefix: input.toolPrefix ?? null,
        resource_kind: input.resourceKind ?? null,
        access_type: input.accessType ?? null,
        risk_level: input.riskLevel ?? null,
        service_tier: input.serviceTier ?? null,
        authz_policy_version_id: input.authzPolicyVersionId,
        judgment_pack_version_id: input.judgmentPackVersionId,
        priority: input.priority ?? 100,
        active: input.active === false ? 0 : 1,
        created_by: input.createdBy ?? input.updatedBy,
        updated_by: input.updatedBy,
        created_at: now,
        updated_at: now,
    };
    if (!db)
        return row;
    const existing = await db
        .prepare(`SELECT created_by, created_at FROM policy_os_bindings WHERE binding_id = ? LIMIT 1`)
        .bind(row.binding_id)
        .first();
    if (existing) {
        row.created_by = existing.created_by;
        row.created_at = toNumber(existing.created_at, now);
    }
    await db
        .prepare(`INSERT INTO policy_os_bindings
       (binding_id, account_id, environment, workflow_id, tool_prefix, resource_kind, access_type, risk_level, service_tier, authz_policy_version_id, judgment_pack_version_id, priority, active, created_by, updated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(binding_id) DO UPDATE SET
         account_id = excluded.account_id,
         environment = excluded.environment,
         workflow_id = excluded.workflow_id,
         tool_prefix = excluded.tool_prefix,
         resource_kind = excluded.resource_kind,
         access_type = excluded.access_type,
         risk_level = excluded.risk_level,
         service_tier = excluded.service_tier,
         authz_policy_version_id = excluded.authz_policy_version_id,
         judgment_pack_version_id = excluded.judgment_pack_version_id,
         priority = excluded.priority,
         active = excluded.active,
         updated_by = excluded.updated_by,
         updated_at = excluded.updated_at`)
        .bind(row.binding_id, row.account_id, row.environment, row.workflow_id, row.tool_prefix, row.resource_kind, row.access_type, row.risk_level, row.service_tier, row.authz_policy_version_id, row.judgment_pack_version_id, row.priority, row.active, row.created_by, row.updated_by, row.created_at, row.updated_at)
        .run();
    return row;
}
export async function resolvePolicyOsBinding(db, input) {
    if (!db)
        return null;
    const environment = input.environment ?? 'production';
    return db
        .prepare(`SELECT * FROM policy_os_bindings
       WHERE account_id = ?
         AND environment = ?
         AND active = 1
         AND (workflow_id IS NULL OR workflow_id = ?)
         AND (tool_prefix IS NULL OR ? LIKE tool_prefix || '%')
         AND (resource_kind IS NULL OR resource_kind = ?)
         AND (access_type IS NULL OR access_type = ?)
         AND (risk_level IS NULL OR risk_level = ?)
         AND (service_tier IS NULL OR service_tier = ?)
       ORDER BY priority ASC, updated_at DESC, created_at DESC
       LIMIT 1`)
        .bind(input.accountId, environment, input.workflowId ?? null, input.toolName ?? '', input.resourceKind ?? null, input.accessType ?? null, input.riskLevel ?? null, input.serviceTier ?? null)
        .first();
}
export async function createPolicyOsApprovalCase(db, input) {
    const row = {
        approval_id: newId('papr', input.accountId, input.actionName, input.resourceKind),
        correlation_id: input.correlationId ?? null,
        account_id: input.accountId,
        actor_id: input.actorId ?? null,
        agent_id: input.agentId ?? null,
        action_name: input.actionName,
        resource_kind: input.resourceKind,
        resource_id: input.resourceId ?? null,
        request_payload_json: JSON.stringify(input.requestPayload ?? {}),
        binding_id: input.bindingId ?? null,
        status: input.status ?? 'pending',
        reason: input.reason,
        decision_note: null,
        decided_by: null,
        expires_at: input.expiresAt ?? null,
        created_at: nowEpochSeconds(),
        decided_at: null,
    };
    if (!db)
        return row;
    await db
        .prepare(`INSERT INTO policy_os_approval_cases
       (approval_id, correlation_id, account_id, actor_id, agent_id, action_name, resource_kind, resource_id, request_payload_json, binding_id, status, reason, decision_note, decided_by, expires_at, created_at, decided_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(row.approval_id, row.correlation_id, row.account_id, row.actor_id, row.agent_id, row.action_name, row.resource_kind, row.resource_id, row.request_payload_json, row.binding_id, row.status, row.reason, row.decision_note, row.decided_by, row.expires_at, row.created_at, row.decided_at)
        .run();
    return row;
}
export async function recordPolicyOsDecisionEvent(db, input) {
    const row = {
        id: newId('pdev', input.accountId, input.actionName, input.finalDecision),
        correlation_id: input.correlationId ?? null,
        account_id: input.accountId,
        actor_id: input.actorId ?? null,
        agent_id: input.agentId ?? null,
        action_name: input.actionName,
        resource_kind: input.resourceKind,
        resource_id: input.resourceId ?? null,
        resource_access_type: input.resourceAccessType ?? null,
        binding_id: input.bindingId ?? null,
        authz_policy_version_id: input.authzPolicyVersionId ?? null,
        judgment_pack_version_id: input.judgmentPackVersionId ?? null,
        approval_id: input.approvalId ?? null,
        final_decision: input.finalDecision,
        reason: input.reason,
        matched_rule_ids_json: JSON.stringify(input.matchedRuleIds ?? []),
        policy_hash: input.policyHash ?? null,
        evaluation_path: input.evaluationPath ?? 'legacy',
        fallback_reason: input.fallbackReason ?? null,
        latency_ms: input.latencyMs ?? null,
        metadata_json: JSON.stringify(input.metadata ?? {}),
        created_at: nowEpochSeconds(),
    };
    if (!db)
        return row;
    await db
        .prepare(`INSERT INTO policy_os_decision_events
       (id, correlation_id, account_id, actor_id, agent_id, action_name, resource_kind, resource_id, resource_access_type, binding_id, authz_policy_version_id, judgment_pack_version_id, approval_id, final_decision, reason, matched_rule_ids_json, policy_hash, evaluation_path, fallback_reason, latency_ms, metadata_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(row.id, row.correlation_id, row.account_id, row.actor_id, row.agent_id, row.action_name, row.resource_kind, row.resource_id, row.resource_access_type, row.binding_id, row.authz_policy_version_id, row.judgment_pack_version_id, row.approval_id, row.final_decision, row.reason, row.matched_rule_ids_json, row.policy_hash, row.evaluation_path, row.fallback_reason, row.latency_ms, row.metadata_json, row.created_at)
        .run();
    return row;
}
export async function recordPolicyOsAndonEvent(db, input) {
    const row = {
        andon_id: newId('andon', input.accountId, input.source, input.severity),
        correlation_id: input.correlationId ?? null,
        account_id: input.accountId,
        source: input.source,
        severity: input.severity,
        question: input.question,
        context: input.context,
        proposed_action: input.proposedAction,
        confidence: input.confidence ?? null,
        approval_id: input.approvalId ?? null,
        resolved_by: input.resolvedBy ?? null,
        created_at: nowEpochSeconds(),
        resolved_at: input.resolvedAt ?? null,
    };
    if (!db)
        return row;
    await db
        .prepare(`INSERT INTO policy_os_andon_events
       (andon_id, correlation_id, account_id, source, severity, question, context, proposed_action, confidence, approval_id, resolved_by, created_at, resolved_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(row.andon_id, row.correlation_id, row.account_id, row.source, row.severity, row.question, row.context, row.proposed_action, row.confidence, row.approval_id, row.resolved_by, row.created_at, row.resolved_at)
        .run();
    return row;
}
export async function recordPolicyOsEntitlementSnapshot(db, input) {
    const effectiveAt = input.effectiveAt ?? nowEpochSeconds();
    const row = {
        snapshot_id: newId('pent', input.accountId, input.serviceTier, effectiveAt),
        account_id: input.accountId,
        tenant_id: input.tenantId ?? null,
        service_tier: input.serviceTier,
        service_entitled: toFlag(input.serviceEntitled),
        policy_accepted: toFlag(input.policyAccepted),
        contract_active: toFlag(input.contractActive),
        billing_active: toFlag(input.billingActive),
        approved_exception_json: input.approvedException ? JSON.stringify(input.approvedException) : null,
        effective_at: effectiveAt,
        recorded_by: input.recordedBy,
        created_at: nowEpochSeconds(),
    };
    if (!db)
        return row;
    await db
        .prepare(`INSERT INTO policy_os_entitlement_snapshots
       (snapshot_id, account_id, tenant_id, service_tier, service_entitled, policy_accepted, contract_active, billing_active, approved_exception_json, effective_at, recorded_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(row.snapshot_id, row.account_id, row.tenant_id, row.service_tier, row.service_entitled, row.policy_accepted, row.contract_active, row.billing_active, row.approved_exception_json, row.effective_at, row.recorded_by, row.created_at)
        .run();
    return row;
}
export async function getLatestPolicyOsEntitlementSnapshot(db, accountId) {
    if (!db)
        return null;
    return db
        .prepare(`SELECT * FROM policy_os_entitlement_snapshots
       WHERE account_id = ?
       ORDER BY effective_at DESC, created_at DESC
       LIMIT 1`)
        .bind(accountId)
        .first();
}
//# sourceMappingURL=policy-os.js.map