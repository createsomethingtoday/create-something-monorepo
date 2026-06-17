function nowEpochSeconds() {
    return Math.floor(Date.now() / 1000);
}
function normalizeMode(raw, fallback = 'normal') {
    if (typeof raw !== 'string')
        return fallback;
    const value = raw.trim().toLowerCase();
    if (value === 'off' || value === 'disabled' || value === 'deny_all')
        return 'off';
    if (value === 'read_only' || value === 'read-only' || value === 'readonly')
        return 'read_only';
    return 'normal';
}
function defaultAccess(accountId) {
    return {
        account_id: accountId,
        mode: 'normal',
        reason: null,
        incident_id: null,
        updated_by: 'system',
        updated_at: nowEpochSeconds(),
        expires_at: null,
    };
}
function incidentId(accountId) {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 10);
    return `sec_${accountId}_${ts}_${rand}`.replace(/[^a-zA-Z0-9_\-]/g, '_');
}
function toNumber(value) {
    if (typeof value === 'number')
        return value;
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
}
function severityRank(severity) {
    if (severity === 'critical')
        return 4;
    if (severity === 'high')
        return 3;
    if (severity === 'medium')
        return 2;
    return 1;
}
function parseJsonObject(value) {
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    }
    catch {
        return null;
    }
}
function incidentSortByPriority(a, b) {
    const severityDiff = severityRank(b.severity) - severityRank(a.severity);
    if (severityDiff !== 0)
        return severityDiff;
    return a.created_at - b.created_at;
}
function recommendIncidentAction(row) {
    const signal = parseJsonObject(row.signal_json);
    if (row.incident_type === 'abuse_pattern_block_spike') {
        const blockedTotal = toNumber(signal?.blockedTotal);
        const distinctTools = toNumber(signal?.distinctTools);
        const threshold = signal?.threshold;
        const blockedThreshold = threshold && typeof threshold === 'object'
            ? toNumber(threshold.blockedTotal)
            : 0;
        const distinctThreshold = threshold && typeof threshold === 'object'
            ? toNumber(threshold.distinctTools)
            : 0;
        const blockedRatio = blockedThreshold > 0 ? blockedTotal / blockedThreshold : 1;
        const distinctRatio = distinctThreshold > 0 ? distinctTools / distinctThreshold : 1;
        if (row.severity === 'critical' && blockedRatio >= 2 && distinctRatio >= 1.5) {
            return {
                decision: 'enforce_off',
                disposition: 'act',
                confidence: 0.95,
                rationale: 'Critical abuse signal exceeded thresholds by a wide margin; immediate lockout recommended.',
            };
        }
        if (row.severity === 'critical') {
            return {
                decision: 'enforce_off',
                disposition: 'evaluate',
                confidence: 0.8,
                rationale: 'Critical abuse pattern detected; operator validation recommended before full lockout.',
            };
        }
        if (row.severity === 'high') {
            return {
                decision: 'enforce_read_only',
                disposition: 'evaluate',
                confidence: 0.72,
                rationale: 'High severity abuse pattern suggests temporary containment while reviewing account context.',
            };
        }
    }
    if (row.severity === 'critical') {
        return {
            decision: 'enforce_read_only',
            disposition: 'evaluate',
            confidence: 0.68,
            rationale: 'Critical incident requires escalation; contain first, then validate before hard lockout.',
        };
    }
    if (row.severity === 'high') {
        return {
            decision: 'monitor',
            disposition: 'evaluate',
            confidence: 0.62,
            rationale: 'High severity incident needs review context before taking enforcement action.',
        };
    }
    return {
        decision: 'monitor',
        disposition: 'evaluate',
        confidence: 0.55,
        rationale: 'Insufficient confidence for automatic enforcement; queue for analyst review.',
    };
}
function isMissingTableError(error) {
    const message = error instanceof Error ? error.message : String(error);
    return /no such table|no such column|SQLITE_ERROR/i.test(message);
}
export function resolveEffectiveToolAccessMode(globalMode, accountMode) {
    if (globalMode === 'off' || accountMode === 'off')
        return 'off';
    if (globalMode === 'read_only' || accountMode === 'read_only')
        return 'read_only';
    return 'normal';
}
export async function getAccountAccess(db, accountId) {
    if (!db)
        return defaultAccess(accountId);
    try {
        const row = await db
            .prepare(`SELECT account_id, mode, reason, incident_id, updated_by, updated_at, expires_at
         FROM judgment_account_access
         WHERE account_id = ?
         LIMIT 1`)
            .bind(accountId)
            .first();
        if (!row)
            return defaultAccess(accountId);
        if (typeof row.expires_at === 'number' && row.expires_at > 0 && row.expires_at <= nowEpochSeconds()) {
            return defaultAccess(accountId);
        }
        return {
            ...row,
            mode: normalizeMode(row.mode),
        };
    }
    catch (error) {
        if (isMissingTableError(error))
            return defaultAccess(accountId);
        throw error;
    }
}
export async function setAccountAccess(db, input) {
    const row = {
        account_id: input.accountId,
        mode: normalizeMode(input.mode),
        reason: input.reason ?? null,
        incident_id: input.incidentId ?? null,
        updated_by: input.updatedBy,
        updated_at: nowEpochSeconds(),
        expires_at: input.expiresAt ?? null,
    };
    if (!db)
        return row;
    try {
        await db
            .prepare(`INSERT INTO judgment_account_access
         (account_id, mode, reason, incident_id, updated_by, updated_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(account_id) DO UPDATE SET
           mode = excluded.mode,
           reason = excluded.reason,
           incident_id = excluded.incident_id,
           updated_by = excluded.updated_by,
           updated_at = excluded.updated_at,
           expires_at = excluded.expires_at`)
            .bind(row.account_id, row.mode, row.reason, row.incident_id, row.updated_by, row.updated_at, row.expires_at)
            .run();
    }
    catch (error) {
        if (isMissingTableError(error))
            return row;
        throw error;
    }
    return row;
}
export async function createSecurityIncident(db, input) {
    const row = {
        id: incidentId(input.accountId),
        account_id: input.accountId,
        incident_type: input.incidentType,
        severity: input.severity,
        action_mode: normalizeMode(input.actionMode),
        reason: input.reason,
        signal_json: JSON.stringify(input.signal),
        status: 'open',
        correlation_id: input.correlationId ?? null,
        created_at: nowEpochSeconds(),
        resolved_at: null,
        resolved_by: null,
    };
    if (!db)
        return row;
    try {
        await db
            .prepare(`INSERT INTO judgment_security_incidents
         (id, account_id, incident_type, severity, action_mode, reason, signal_json, status, correlation_id, created_at, resolved_at, resolved_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .bind(row.id, row.account_id, row.incident_type, row.severity, row.action_mode, row.reason, row.signal_json, row.status, row.correlation_id, row.created_at, row.resolved_at, row.resolved_by)
            .run();
    }
    catch (error) {
        if (isMissingTableError(error))
            return row;
        throw error;
    }
    return row;
}
export async function listRecentSecurityIncidents(db, input) {
    if (!db)
        return [];
    const limit = Math.max(1, Math.min(50, Math.floor(input.limit ?? 10)));
    try {
        const hasStatus = Boolean(input.status);
        const sql = hasStatus
            ? `SELECT id, account_id, incident_type, severity, action_mode, reason, signal_json, status, correlation_id, created_at, resolved_at, resolved_by
         FROM judgment_security_incidents
         WHERE account_id = ? AND status = ?
         ORDER BY created_at DESC
         LIMIT ?`
            : `SELECT id, account_id, incident_type, severity, action_mode, reason, signal_json, status, correlation_id, created_at, resolved_at, resolved_by
         FROM judgment_security_incidents
         WHERE account_id = ?
         ORDER BY created_at DESC
         LIMIT ?`;
        const args = hasStatus ? [input.accountId, input.status, limit] : [input.accountId, limit];
        const result = await db.prepare(sql).bind(...args).all();
        return result.results;
    }
    catch (error) {
        if (isMissingTableError(error))
            return [];
        throw error;
    }
}
export async function getSecurityIncidentById(db, input) {
    if (!db)
        return null;
    try {
        return await db
            .prepare(`SELECT id, account_id, incident_type, severity, action_mode, reason, signal_json, status, correlation_id, created_at, resolved_at, resolved_by
         FROM judgment_security_incidents
         WHERE account_id = ? AND id = ?
         LIMIT 1`)
            .bind(input.accountId, input.incidentId)
            .first();
    }
    catch (error) {
        if (isMissingTableError(error))
            return null;
        throw error;
    }
}
export async function resolveSecurityIncident(db, input) {
    const incident = await getSecurityIncidentById(db, {
        accountId: input.accountId,
        incidentId: input.incidentId,
    });
    if (!incident)
        return null;
    let accessMode = 'normal';
    if (input.decision === 'enforce_read_only')
        accessMode = 'read_only';
    if (input.decision === 'enforce_off')
        accessMode = 'off';
    const reasonPrefix = input.note ? `${input.note} | ` : '';
    await setAccountAccess(db, {
        accountId: input.accountId,
        mode: accessMode,
        reason: `${reasonPrefix}incident_decision=${input.decision}`,
        incidentId: incident.id,
        updatedBy: input.decidedBy,
    });
    if (db) {
        try {
            await db
                .prepare(`UPDATE judgment_security_incidents
           SET status = 'resolved',
               resolved_at = ?,
               resolved_by = ?
           WHERE account_id = ? AND id = ?`)
                .bind(nowEpochSeconds(), input.decidedBy, input.accountId, input.incidentId)
                .run();
            await db
                .prepare(`DELETE FROM judgment_security_incident_claims
           WHERE account_id = ? AND incident_id = ?`)
                .bind(input.accountId, input.incidentId)
                .run();
        }
        catch (error) {
            if (!isMissingTableError(error))
                throw error;
        }
    }
    return {
        incident: {
            ...incident,
            status: 'resolved',
            resolved_at: nowEpochSeconds(),
            resolved_by: input.decidedBy,
        },
        accessMode,
    };
}
export async function claimNextSecurityIncidentForReview(db, input) {
    if (!db)
        return null;
    const now = nowEpochSeconds();
    const claimTtlSeconds = Math.max(30, Math.min(3600, Math.floor(input.claimTtlSeconds ?? 300)));
    const claimExpiresAt = now + claimTtlSeconds;
    const syntheticClaim = {
        account_id: input.accountId,
        incident_id: '',
        claimed_by: input.reviewerId,
        claimed_at: now,
        claim_expires_at: claimExpiresAt,
    };
    let incident = null;
    let claimsTableUnavailable = false;
    try {
        incident = await db
            .prepare(`SELECT i.id, i.account_id, i.incident_type, i.severity, i.action_mode, i.reason, i.signal_json, i.status, i.correlation_id, i.created_at, i.resolved_at, i.resolved_by
         FROM judgment_security_incidents i
         LEFT JOIN judgment_security_incident_claims c
           ON c.account_id = i.account_id
          AND c.incident_id = i.id
          AND c.claim_expires_at > ?
         WHERE i.account_id = ?
           AND i.status = 'open'
           AND c.incident_id IS NULL
         ORDER BY
           CASE i.severity
             WHEN 'critical' THEN 4
             WHEN 'high' THEN 3
             WHEN 'medium' THEN 2
             ELSE 1
           END DESC,
           i.created_at ASC
         LIMIT 1`)
            .bind(now, input.accountId)
            .first();
    }
    catch (error) {
        if (!isMissingTableError(error))
            throw error;
        claimsTableUnavailable = true;
    }
    if (!incident) {
        if (!claimsTableUnavailable)
            return null;
        const fallback = await listRecentSecurityIncidents(db, {
            accountId: input.accountId,
            status: 'open',
            limit: 25,
        });
        incident = fallback.sort(incidentSortByPriority)[0] ?? null;
        if (!incident)
            return null;
        return {
            incident,
            claim: { ...syntheticClaim, incident_id: incident.id },
            recommendation: recommendIncidentAction(incident),
        };
    }
    try {
        await db
            .prepare(`INSERT INTO judgment_security_incident_claims
         (account_id, incident_id, claimed_by, claimed_at, claim_expires_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(account_id, incident_id) DO UPDATE SET
           claimed_by = excluded.claimed_by,
           claimed_at = excluded.claimed_at,
           claim_expires_at = excluded.claim_expires_at
         WHERE judgment_security_incident_claims.claim_expires_at <= excluded.claimed_at`)
            .bind(input.accountId, incident.id, input.reviewerId, now, claimExpiresAt)
            .run();
        const claim = await db
            .prepare(`SELECT account_id, incident_id, claimed_by, claimed_at, claim_expires_at
         FROM judgment_security_incident_claims
         WHERE account_id = ? AND incident_id = ?
         LIMIT 1`)
            .bind(input.accountId, incident.id)
            .first();
        if (!claim || claim.claimed_by !== input.reviewerId)
            return null;
        return {
            incident,
            claim,
            recommendation: recommendIncidentAction(incident),
        };
    }
    catch (error) {
        if (!isMissingTableError(error))
            throw error;
        return {
            incident,
            claim: { ...syntheticClaim, incident_id: incident.id },
            recommendation: recommendIncidentAction(incident),
        };
    }
}
export async function evaluateAbusePatternAndMitigate(db, input) {
    if (!db || !input.config.enabled)
        return { triggered: false };
    if (!input.readOnly)
        return { triggered: false };
    if (input.currentDecision !== 'block')
        return { triggered: false };
    const cutoff = nowEpochSeconds() - Math.max(60, Math.floor(input.config.windowSeconds));
    const blockThreshold = Math.max(2, Math.floor(input.config.blockThreshold));
    const distinctToolThreshold = Math.max(1, Math.floor(input.config.distinctToolThreshold));
    let blockedTotal = 0;
    let distinctTools = 0;
    try {
        const counts = await db
            .prepare(`SELECT
           COUNT(*) AS blocked_total,
           COUNT(DISTINCT tool_name) AS distinct_tools
         FROM judgment_engine_events
         WHERE account_id = ?
           AND created_at >= ?
           AND final_decision = 'block'`)
            .bind(input.accountId, cutoff)
            .first();
        blockedTotal = toNumber(counts?.blocked_total);
        distinctTools = toNumber(counts?.distinct_tools);
    }
    catch (error) {
        if (isMissingTableError(error))
            return { triggered: false };
        throw error;
    }
    if (blockedTotal < blockThreshold || distinctTools < distinctToolThreshold) {
        return { triggered: false, blockedTotal, distinctTools };
    }
    const currentAccess = await getAccountAccess(db, input.accountId);
    if (currentAccess.mode === 'off') {
        return { triggered: false, blockedTotal, distinctTools };
    }
    const reason = `Abuse pattern detected: ${blockedTotal} blocked tool calls across ${distinctTools} distinct tools` +
        ` in the last ${Math.max(60, Math.floor(input.config.windowSeconds))}s.`;
    const responseMode = input.config.responseMode === 'review' ? 'review' : 'auto_off';
    const actionMode = responseMode === 'review' ? 'normal' : 'off';
    const incident = await createSecurityIncident(db, {
        accountId: input.accountId,
        incidentType: 'abuse_pattern_block_spike',
        severity: 'critical',
        actionMode,
        reason,
        signal: {
            blockedTotal,
            distinctTools,
            windowSeconds: Math.max(60, Math.floor(input.config.windowSeconds)),
            threshold: {
                blockedTotal: blockThreshold,
                distinctTools: distinctToolThreshold,
            },
            triggerToolName: input.currentToolName,
            responseMode,
            recommendedDecision: 'enforce_off',
        },
        correlationId: input.correlationId ?? null,
    });
    if (responseMode === 'auto_off') {
        await setAccountAccess(db, {
            accountId: input.accountId,
            mode: 'off',
            reason: `Auto kill-switch: ${reason}`,
            incidentId: incident.id,
            updatedBy: 'system:abuse-guard',
        });
    }
    return {
        triggered: true,
        actionMode,
        incidentId: incident.id,
        reason: responseMode === 'review' ? `${reason} Review required before enforcement.` : reason,
        blockedTotal,
        distinctTools,
    };
}
//# sourceMappingURL=security.js.map