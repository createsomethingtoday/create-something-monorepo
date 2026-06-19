function nowEpochSeconds() {
    return Math.floor(Date.now() / 1000);
}
function randSuffix() {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
function makeVisualizationId(sourceType, sourceKey, versionId) {
    const normalized = `${sourceType}-${sourceKey}-${versionId}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 96);
    return `viz_${normalized}_${nowEpochSeconds()}_${randSuffix()}`;
}
export async function recordVisualization(db, input) {
    const id = makeVisualizationId(input.sourceType, input.sourceKey, input.versionId);
    if (!db)
        return id;
    await db
        .prepare(`INSERT INTO atlas_visualizations
       (id, account_id, version_id, source_type, source_key, decision, decision_reason, workflow_json, mermaid_text, page_path, estimate_report_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(id, input.accountId, input.versionId, input.sourceType, input.sourceKey, input.decision, input.decisionReason, JSON.stringify(input.workflowJson ?? null), input.mermaidText ?? null, input.pagePath, input.estimateReportId ?? null, nowEpochSeconds())
        .run();
    return id;
}
//# sourceMappingURL=visualizations.js.map