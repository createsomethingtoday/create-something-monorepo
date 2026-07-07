import { activateStoryStep, addStoryQuestion, advanceStoryStep, clearStoryFocus, readSession, setStoryFocus } from './store.js';
export const ATLAS_STORY_API_VERSION = 1;
function asRecord(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : {};
}
function firstString(...values) {
    for (const value of values) {
        if (typeof value === 'string' && value.trim())
            return value;
    }
    return undefined;
}
function firstBoolean(...values) {
    for (const value of values) {
        if (typeof value === 'boolean')
            return value;
    }
    return undefined;
}
function firstArray(...values) {
    for (const value of values) {
        if (Array.isArray(value))
            return value;
    }
    return undefined;
}
function stringArray(value) {
    if (!Array.isArray(value))
        return undefined;
    return value.filter((item) => typeof item === 'string' && item.length > 0);
}
function storyActor(input) {
    return input.operator === true || input.updatedBy === 'operator' || input.updated_by === 'operator'
        ? 'operator'
        : 'agent';
}
function normalizeCallouts(input) {
    const explicit = firstArray(input.callouts);
    if (explicit) {
        return explicit.map((item) => {
            const callout = asRecord(item);
            return {
                id: firstString(callout.id),
                nodeId: firstString(callout.nodeId, callout.node_id),
                severity: callout.severity === 'risk' || callout.severity === 'decision' ? callout.severity : 'info',
                text: firstString(callout.text) ?? ''
            };
        });
    }
    const text = firstString(input.calloutText, input.callout_text);
    if (!text)
        return undefined;
    return [
        {
            nodeId: firstString(input.calloutNodeId, input.callout_node_id),
            severity: input.calloutSeverity === 'risk' ||
                input.callout_severity === 'risk' ||
                input.calloutSeverity === 'decision' ||
                input.callout_severity === 'decision'
                ? (input.calloutSeverity ?? input.callout_severity)
                : 'info',
            text
        }
    ];
}
function normalizeQuestions(input) {
    const questions = firstArray(input.questions);
    if (!questions)
        return undefined;
    return questions.map((item) => {
        const question = asRecord(item);
        return {
            id: firstString(question.id),
            nodeId: firstString(question.nodeId, question.node_id),
            owner: firstString(question.owner),
            question: firstString(question.question) ?? '',
            status: question.status === 'answered' ? 'answered' : 'open'
        };
    });
}
function normalizeSteps(input) {
    const steps = firstArray(input.steps);
    if (!steps)
        return undefined;
    return steps.map((item) => {
        const step = asRecord(item);
        const status = step.status === 'done' || step.status === 'current' || step.status === 'next'
            ? step.status
            : undefined;
        return {
            id: firstString(step.id),
            focusEdgeIds: stringArray(firstArray(step.focusEdgeIds, step.focus_edge_ids)),
            focusNodeIds: stringArray(firstArray(step.focusNodeIds, step.focus_node_ids)),
            owner: firstString(step.owner),
            proof: firstString(step.proof),
            status,
            summary: firstString(step.summary, step.body) ?? '',
            title: firstString(step.title) ?? ''
        };
    });
}
function normalizeCanonStoryArtifact(input) {
    const artifact = asRecord(input.storyArtifact ?? input.story_artifact);
    const chapters = firstArray(artifact.chapters);
    if (!chapters)
        return {};
    const steps = chapters.map((item, index) => {
        const chapter = asRecord(item);
        return {
            id: firstString(chapter.id) ?? `chapter-${index + 1}`,
            focusEdgeIds: stringArray(firstArray(chapter.relationshipIds, chapter.relationship_ids)),
            focusNodeIds: stringArray(firstArray(chapter.focusNodeIds, chapter.focus_node_ids)),
            owner: firstString(chapter.eyebrow),
            proof: firstString(chapter.proofLabel, chapter.proof_label),
            status: index === 0 ? 'current' : 'next',
            summary: firstString(chapter.body) ?? '',
            title: firstString(chapter.title) ?? ''
        };
    });
    return {
        activeStepId: steps[0]?.id,
        focusEdgeIds: steps[0]?.focusEdgeIds,
        focusNodeIds: steps[0]?.focusNodeIds,
        narration: firstString(steps[0]?.summary, artifact.summary, artifact.accessibilitySummary),
        steps,
        title: firstString(artifact.headline)
    };
}
export function normalizeStoryFocusInput(input) {
    const record = asRecord(input);
    const artifactDefaults = normalizeCanonStoryArtifact(record);
    return {
        ...artifactDefaults,
        activeStepId: firstString(record.activeStepId, record.active_step_id) ?? artifactDefaults.activeStepId,
        callouts: normalizeCallouts(record),
        dimUnfocused: firstBoolean(record.dimUnfocused, record.dim_unfocused) ?? artifactDefaults.dimUnfocused,
        focusEdgeIds: stringArray(firstArray(record.focusEdgeIds, record.focus_edge_ids)) ?? artifactDefaults.focusEdgeIds,
        focusNodeIds: stringArray(firstArray(record.focusNodeIds, record.focus_node_ids)) ?? artifactDefaults.focusNodeIds,
        narration: firstString(record.narration) ?? artifactDefaults.narration,
        nextAction: firstString(record.nextAction, record.next_action) ?? artifactDefaults.nextAction,
        questions: normalizeQuestions(record),
        steps: normalizeSteps(record) ?? artifactDefaults.steps,
        title: firstString(record.title) ?? artifactDefaults.title,
        updatedBy: storyActor(record)
    };
}
export function normalizeStoryQuestionInput(input) {
    const record = asRecord(input);
    return {
        nodeId: firstString(record.nodeId, record.node_id),
        owner: firstString(record.owner),
        question: firstString(record.question) ?? '',
        updatedBy: storyActor(record)
    };
}
function storyMeta(session, source) {
    const story = session.story;
    const nodeIds = new Set(session.canvas.nodes.map((node) => node.id));
    const edgeIds = new Set(session.canvas.edges.map((edge) => edge.id));
    return {
        apiVersion: ATLAS_STORY_API_VERSION,
        invalidFocusEdgeIds: (story?.focusEdgeIds ?? []).filter((id) => !edgeIds.has(id)),
        invalidFocusNodeIds: (story?.focusNodeIds ?? []).filter((id) => !nodeIds.has(id)),
        source,
        storyContract: 'atlas-story-v1'
    };
}
function storyResult(session, source) {
    return {
        meta: storyMeta(session, source),
        session,
        story: session.story
    };
}
export async function focusStory(sessionId, input, source, cwd = process.cwd()) {
    const session = await setStoryFocus(sessionId, normalizeStoryFocusInput(input), cwd);
    return storyResult(session, source);
}
export async function addStoryApiQuestion(sessionId, input, source, cwd = process.cwd()) {
    const session = await addStoryQuestion(sessionId, normalizeStoryQuestionInput(input), cwd);
    return storyResult(session, source);
}
export async function clearStory(sessionId, source, cwd = process.cwd()) {
    const session = await clearStoryFocus(sessionId, {}, cwd);
    return storyResult(session, source);
}
export async function activateStoryApiStep(sessionId, stepId, source, cwd = process.cwd()) {
    const session = await activateStoryStep(sessionId, stepId, cwd);
    return storyResult(session, source);
}
export async function advanceStoryApiStep(sessionId, direction, source, cwd = process.cwd()) {
    const session = await advanceStoryStep(sessionId, direction, cwd);
    return storyResult(session, source);
}
export async function getStory(sessionId, source, cwd = process.cwd()) {
    const session = await readSession(sessionId, cwd);
    return storyResult(session, source);
}
export function storySessionPayload(result) {
    return {
        meta: result.meta,
        session: result.session,
        story: result.story
    };
}
//# sourceMappingURL=story-api.js.map