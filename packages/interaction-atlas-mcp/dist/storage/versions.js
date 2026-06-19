function nowEpochSeconds() {
    return Math.floor(Date.now() / 1000);
}
function safeIdPart(value) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 64) || 'unknown';
}
function makeVersionId(entityType, entityId, commitSha, policyVersionId) {
    return [
        'ver',
        safeIdPart(entityType),
        safeIdPart(entityId),
        safeIdPart(commitSha).slice(0, 16),
        safeIdPart(policyVersionId).slice(0, 16),
        String(nowEpochSeconds()),
    ].join('_');
}
export async function ensureVersion(db, input) {
    if (!db) {
        const fallbackId = makeVersionId(input.entityType, input.entityId, input.defaultCommitSha, input.policyVersionId);
        return {
            id: fallbackId,
            account_id: input.accountId,
            entity_type: input.entityType,
            entity_id: input.entityId,
            commit_sha: input.defaultCommitSha,
            runtime_ref: input.runtimeRef ?? null,
            policy_version_id: input.policyVersionId,
            parent_version_id: null,
            created_at: nowEpochSeconds(),
        };
    }
    const existing = await db
        .prepare(`SELECT * FROM atlas_versions
       WHERE account_id = ? AND entity_type = ? AND entity_id = ? AND commit_sha = ? AND policy_version_id = ?
       ORDER BY created_at DESC
       LIMIT 1`)
        .bind(input.accountId, input.entityType, input.entityId, input.defaultCommitSha, input.policyVersionId)
        .first();
    if (existing)
        return existing;
    const parent = await db
        .prepare(`SELECT id FROM atlas_versions
       WHERE account_id = ? AND entity_type = ? AND entity_id = ?
       ORDER BY created_at DESC
       LIMIT 1`)
        .bind(input.accountId, input.entityType, input.entityId)
        .first();
    const id = makeVersionId(input.entityType, input.entityId, input.defaultCommitSha, input.policyVersionId);
    await db
        .prepare(`INSERT INTO atlas_versions
       (id, account_id, entity_type, entity_id, commit_sha, runtime_ref, policy_version_id, parent_version_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(id, input.accountId, input.entityType, input.entityId, input.defaultCommitSha, input.runtimeRef ?? null, input.policyVersionId, parent?.id ?? null, nowEpochSeconds())
        .run();
    return {
        id,
        account_id: input.accountId,
        entity_type: input.entityType,
        entity_id: input.entityId,
        commit_sha: input.defaultCommitSha,
        runtime_ref: input.runtimeRef ?? null,
        policy_version_id: input.policyVersionId,
        parent_version_id: parent?.id ?? null,
        created_at: nowEpochSeconds(),
    };
}
export async function getVersionById(db, accountId, versionId) {
    if (!db)
        return null;
    return db
        .prepare(`SELECT * FROM atlas_versions WHERE account_id = ? AND id = ? LIMIT 1`)
        .bind(accountId, versionId)
        .first();
}
export async function getVersionByCommit(db, accountId, entityType, entityId, commitSha) {
    if (!db)
        return null;
    return db
        .prepare(`SELECT * FROM atlas_versions
       WHERE account_id = ? AND entity_type = ? AND entity_id = ? AND commit_sha = ?
       ORDER BY created_at DESC
       LIMIT 1`)
        .bind(accountId, entityType, entityId, commitSha)
        .first();
}
export async function getLatestVersion(db, accountId, entityType, entityId) {
    if (!db)
        return null;
    return db
        .prepare(`SELECT * FROM atlas_versions
       WHERE account_id = ? AND entity_type = ? AND entity_id = ?
       ORDER BY created_at DESC
       LIMIT 1`)
        .bind(accountId, entityType, entityId)
        .first();
}
export async function getDefaultSelectedVersionId(db, accountId, entityType, entityId) {
    if (!db)
        return null;
    const row = await db
        .prepare(`SELECT default_version_id FROM atlas_version_selection
       WHERE account_id = ? AND entity_type = ? AND entity_id = ?
       LIMIT 1`)
        .bind(accountId, entityType, entityId)
        .first();
    return row?.default_version_id ?? null;
}
export async function setDefaultSelectedVersion(db, input) {
    if (!db)
        return;
    await db
        .prepare(`INSERT INTO atlas_version_selection
       (account_id, entity_type, entity_id, default_version_id, updated_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(account_id, entity_type, entity_id) DO UPDATE SET
         default_version_id = excluded.default_version_id,
         updated_by = excluded.updated_by,
         updated_at = excluded.updated_at`)
        .bind(input.accountId, input.entityType, input.entityId, input.versionId, input.updatedBy, nowEpochSeconds())
        .run();
}
export async function bindPolicyToVersion(db, input) {
    if (!db)
        return;
    await db
        .prepare(`INSERT OR REPLACE INTO atlas_version_policy_bindings
       (version_id, policy_version_id, policy_snapshot_json, enforcement_mode, created_at)
       VALUES (?, ?, ?, ?, ?)`)
        .bind(input.versionId, input.policyVersionId, JSON.stringify(input.policySnapshot), input.enforcementMode, nowEpochSeconds())
        .run();
}
export async function resolveActiveVersion(db, input) {
    const ensured = await ensureVersion(db, {
        accountId: input.accountId,
        entityType: input.entityType,
        entityId: input.entityId,
        policyVersionId: input.policyVersionId,
        defaultCommitSha: input.defaultCommitSha,
        runtimeRef: input.runtimeRef,
    });
    if (input.allowOverride && input.overrideVersionId) {
        const byId = await getVersionById(db, input.accountId, input.overrideVersionId);
        if (byId) {
            return {
                versionId: byId.id,
                selectionSource: 'request_override',
                commitSha: byId.commit_sha,
                policyVersionId: byId.policy_version_id,
            };
        }
    }
    if (input.allowOverride && input.overrideCommitSha) {
        const byCommit = await getVersionByCommit(db, input.accountId, input.entityType, input.entityId, input.overrideCommitSha);
        if (byCommit) {
            return {
                versionId: byCommit.id,
                selectionSource: 'request_override',
                commitSha: byCommit.commit_sha,
                policyVersionId: byCommit.policy_version_id,
            };
        }
    }
    const defaultVersionId = await getDefaultSelectedVersionId(db, input.accountId, input.entityType, input.entityId);
    if (defaultVersionId) {
        const selected = await getVersionById(db, input.accountId, defaultVersionId);
        if (selected) {
            return {
                versionId: selected.id,
                selectionSource: 'account_default',
                commitSha: selected.commit_sha,
                policyVersionId: selected.policy_version_id,
            };
        }
    }
    const latest = (await getLatestVersion(db, input.accountId, input.entityType, input.entityId)) ?? ensured;
    return {
        versionId: latest.id,
        selectionSource: 'latest',
        commitSha: latest.commit_sha,
        policyVersionId: latest.policy_version_id,
    };
}
//# sourceMappingURL=versions.js.map