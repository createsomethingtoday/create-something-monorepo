import { AI_TASKS, CONSTRAINTS, HUMAN_TASKS, SYSTEM_TASKS, TOUCHPOINTS, isAiTask, isHumanTask, isSystemTask, } from '@quietloudlab/ai-interaction-atlas';
function escapeMermaidLabel(text) {
    // Mermaid flowchart node labels are quoted; keep it conservative.
    return text.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}
function displayNameForNode(node) {
    if (node.type === 'touchpoint') {
        return TOUCHPOINTS.find((t) => t.id === node.referenceId)?.name ?? node.referenceId;
    }
    if (node.type === 'constraint') {
        return CONSTRAINTS.find((c) => c.id === node.referenceId)?.name ?? node.referenceId;
    }
    if (node.type === 'data') {
        return node.referenceId;
    }
    // task/annotation/actor fallbacks
    const allTasks = [...AI_TASKS, ...HUMAN_TASKS, ...SYSTEM_TASKS];
    return allTasks.find((t) => t.id === node.referenceId)?.name ?? node.referenceId;
}
function classForNode(node) {
    if (node.type === 'touchpoint')
        return 'touchpoint';
    if (node.type === 'constraint')
        return 'constraint';
    if (node.type === 'data')
        return 'data';
    if (node.type === 'annotation')
        return 'annotation';
    if (node.type === 'actor')
        return 'actor';
    const allTasks = [...AI_TASKS, ...HUMAN_TASKS, ...SYSTEM_TASKS];
    const task = allTasks.find((t) => t.id === node.referenceId);
    if (task) {
        if (isAiTask(task))
            return 'ai';
        if (isHumanTask(task))
            return 'human';
        if (isSystemTask(task))
            return 'system';
    }
    return 'task';
}
export function workflowTemplateToMermaid(template) {
    const idMap = new Map();
    template.nodes.forEach((node, idx) => {
        idMap.set(node.id, `n${idx + 1}`);
    });
    const lines = [];
    lines.push('flowchart LR');
    // Nodes
    for (const node of template.nodes) {
        const mid = idMap.get(node.id);
        if (!mid)
            continue;
        const label = node.customLabel?.trim() || displayNameForNode(node);
        const finalLabel = escapeMermaidLabel(`${label}\\n(${node.referenceId})`);
        lines.push(`  ${mid}["${finalLabel}"]`);
    }
    // Edges
    for (const edge of template.edges) {
        const s = idMap.get(edge.source);
        const t = idMap.get(edge.target);
        if (!s || !t)
            continue;
        const lbl = edge.label ? `|${escapeMermaidLabel(edge.label)}|` : '';
        lines.push(`  ${s} -->${lbl} ${t}`);
    }
    // Styling
    lines.push('');
    lines.push('  classDef ai fill:#dbeafe,stroke:#1d4ed8,color:#0f172a,stroke-width:1px;');
    lines.push('  classDef human fill:#fef3c7,stroke:#b45309,color:#0f172a,stroke-width:1px;');
    lines.push('  classDef system fill:#dcfce7,stroke:#15803d,color:#0f172a,stroke-width:1px;');
    lines.push('  classDef touchpoint fill:#ede9fe,stroke:#6d28d9,color:#0f172a,stroke-width:1px;');
    lines.push('  classDef constraint fill:#fee2e2,stroke:#b91c1c,color:#0f172a,stroke-width:1px;');
    lines.push('  classDef data fill:#e5e7eb,stroke:#374151,color:#0f172a,stroke-width:1px;');
    lines.push('  classDef annotation fill:#f3f4f6,stroke:#9ca3af,color:#0f172a,stroke-width:1px;');
    lines.push('  classDef actor fill:#f3f4f6,stroke:#9ca3af,color:#0f172a,stroke-width:1px;');
    lines.push('  classDef task fill:#f3f4f6,stroke:#334155,color:#0f172a,stroke-width:1px;');
    for (const node of template.nodes) {
        const mid = idMap.get(node.id);
        if (!mid)
            continue;
        lines.push(`  class ${mid} ${classForNode(node)};`);
    }
    return lines.join('\n');
}
//# sourceMappingURL=mermaid.js.map