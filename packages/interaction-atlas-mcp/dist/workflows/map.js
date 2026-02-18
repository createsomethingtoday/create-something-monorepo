import { isValidTaskId } from '@quietloudlab/ai-interaction-atlas';
function slugify(input) {
    return input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'mapped-workflow';
}
function chooseValidTaskId(candidates) {
    const desired = candidates[0] ?? 'system_api';
    for (const id of candidates) {
        if (isValidTaskId(id))
            return { desired, taskId: id, usedFallback: id !== desired, allInvalid: false };
    }
    // No candidates exist in the Atlas dataset. Keep the desired id so validation
    // surfaces the issue, and emit a warning for operators.
    return { desired, taskId: desired, usedFallback: false, allInvalid: true };
}
function classifyToolToAtlasTask(toolName) {
    const t = toolName.toLowerCase();
    // Notifications / outbound comms
    if (/(^|_)(notify|slack|email|send|message)(_|$)/.test(t)) {
        return { kind: 'notify', candidates: ['system_notification', 'system_api'] };
    }
    // Inbound triggers / schedules
    if (/(^|_)(webhook)(_|$)/.test(t))
        return { kind: 'other', candidates: ['system_webhook', 'system_api'] };
    if (/(^|_)(timer|cron|schedule)(_|$)/.test(t))
        return { kind: 'other', candidates: ['system_timer', 'system_api'] };
    // CRUD-ish tools
    if (/(^|_)(create|add|insert|new)(_|$)/.test(t)) {
        return { kind: 'write', candidates: ['system_create_db', 'system_write_db', 'system_api'] };
    }
    if (/(^|_)(update|modify|patch|upsert|set)(_|$)/.test(t)) {
        return { kind: 'write', candidates: ['system_update_db', 'system_write_db', 'system_create_db', 'system_api'] };
    }
    if (/(^|_)(delete|remove|archive|trash|purge)(_|$)/.test(t)) {
        return { kind: 'write', candidates: ['system_delete_db', 'system_archive_db', 'system_write_db', 'system_api'] };
    }
    if (/(^|_)(list|get|read|fetch|find|search|query)(_|$)/.test(t)) {
        return { kind: 'read', candidates: ['system_read_db', 'system_query_db', 'system_api'] };
    }
    // Default: external API / system op
    return { kind: 'other', candidates: ['system_api'] };
}
function defaultLabelFor(tool, server) {
    return server ? `${server}.${tool}` : tool;
}
export function mapToolSequenceToWorkflowDefinition(input) {
    const name = input.name?.trim() || 'Mapped Workflow';
    const workflowId = input.workflow_id?.trim() || slugify(name);
    const warnings = [];
    const steps = [];
    // Always start with human intent specification.
    steps.push({
        referenceId: 'human_type_input',
        label: 'Provide Goal / Query',
        notes: 'User describes objective and scope for the run (what “good” looks like).',
    });
    if (!isValidTaskId('human_type_input')) {
        warnings.push('Atlas task id invalid: "human_type_input" is not defined in the dataset.');
    }
    for (const item of input.sequence) {
        const classified = classifyToolToAtlasTask(item.tool);
        const label = defaultLabelFor(item.tool, item.server);
        const resolved = chooseValidTaskId(classified.candidates);
        if (resolved.usedFallback) {
            warnings.push(`Atlas task id fallback for "${label}": "${resolved.desired}" is not defined; using "${resolved.taskId}".`);
        }
        else if (resolved.allInvalid) {
            warnings.push(`Atlas task id invalid for "${label}": none of [${classified.candidates.map((c) => `"${c}"`).join(', ')}] are defined.`);
        }
        const attachments = [];
        // Conservative defaults: log and gate writes
        attachments.push({ type: 'constraint', referenceId: 'const_audit_log', notes: 'Record tool call + result for audit.' });
        if (classified.kind === 'write') {
            attachments.push({ type: 'constraint', referenceId: 'const_human_loop', notes: 'Human approval before writes/destructive actions.' });
            attachments.push({ type: 'constraint', referenceId: 'const_authorization', notes: 'RBAC and least-privilege enforcement.' });
        }
        // PII-sensitive channels
        if (item.server?.toLowerCase().includes('gmail') || item.tool.toLowerCase().includes('gmail')) {
            attachments.push({ type: 'constraint', referenceId: 'const_privacy', notes: 'Email data often contains PII.' });
        }
        steps.push({
            referenceId: resolved.taskId,
            label,
            notes: `Mapped from tool call: ${label}`,
            attachments,
        });
    }
    const addSynthesis = input.add_synthesis ?? true;
    const addVerification = input.add_verification ?? true;
    const addHumanReview = input.add_human_review ?? true;
    if (addSynthesis) {
        steps.push({
            referenceId: 'task_synthesize',
            notes: 'Synthesize tool outputs into a coherent result for the user.',
        });
        if (!isValidTaskId('task_synthesize')) {
            warnings.push('Atlas task id invalid: "task_synthesize" is not defined in the dataset.');
        }
    }
    if (addVerification) {
        steps.push({
            referenceId: 'task_verify',
            notes: 'Verify key claims against evidence (tool outputs) and flag low-confidence areas.',
            attachments: [{ type: 'constraint', referenceId: 'const_quality_threshold' }],
        });
        if (!isValidTaskId('task_verify')) {
            warnings.push('Atlas task id invalid: "task_verify" is not defined in the dataset.');
        }
    }
    if (addHumanReview) {
        steps.push({
            referenceId: 'human_review',
            notes: 'Human reviews and approves next actions (especially if any write ops are proposed).',
            attachments: [{ type: 'constraint', referenceId: 'const_human_loop' }],
        });
        if (!isValidTaskId('human_review')) {
            warnings.push('Atlas task id invalid: "human_review" is not defined in the dataset.');
        }
    }
    const definition = {
        id: workflowId,
        name,
        description: 'Automatically mapped workflow from an observed/planned tool-call sequence.',
        primaryUseCase: input.primaryUseCase?.trim() || 'Workflow mapping for client review',
        tags: ['auto-mapped', 'tool-sequence'],
        touchpoints: input.touchpoints ?? ['tp_cli', 'tp_api'],
        constraints: input.constraints,
        steps,
        policy: {
            notes: 'Generated mapping. Treat as a draft and review before using for governance.',
        },
    };
    return { definition, warnings };
}
//# sourceMappingURL=map.js.map