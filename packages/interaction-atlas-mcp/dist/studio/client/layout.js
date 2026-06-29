const LANE_ORDER = [
    'actor',
    'data',
    'system',
    'ai',
    'human',
    'constraint',
    'touchpoint'
];
const VISUAL_COLUMNS = [
    { kinds: ['actor'], x: 84, y: 198 },
    { kinds: ['data', 'touchpoint'], x: 456, y: 136 },
    { kinds: ['system', 'ai'], x: 828, y: 112 },
    { kinds: ['human', 'constraint'], x: 1200, y: 136 }
];
const COLUMN_GAP = 64;
const KIND_RANK = new Map(LANE_ORDER.map((kind, index) => [kind, index]));
const KIND_COLUMN = new Map(VISUAL_COLUMNS.flatMap((column, index) => column.kinds.map((kind) => [kind, { index, x: column.x, y: column.y }])));
function boundedViewportWidth(width) {
    if (!Number.isFinite(width) || !width)
        return undefined;
    return Math.max(360, Math.min(1680, width));
}
function kindColumnForViewport(viewportWidth) {
    const width = boundedViewportWidth(viewportWidth);
    if (!width || width >= 1360)
        return KIND_COLUMN;
    if (width < 760) {
        return new Map(LANE_ORDER.map((kind) => {
            const column = KIND_COLUMN.get(kind) ?? { index: 0 };
            return [kind, { index: column.index, x: 48, y: 112 }];
        }));
    }
    if (width < 1120) {
        const rightX = Math.min(396, Math.max(328, width - 420));
        const columns = [
            { index: 0, kinds: ['actor', 'data', 'touchpoint'], x: 48, y: 124 },
            {
                index: 1,
                kinds: ['system', 'ai', 'human', 'constraint'],
                x: rightX,
                y: 124
            }
        ];
        return new Map(columns.flatMap((column) => column.kinds.map((kind) => [kind, column])));
    }
    const left = 64;
    const step = Math.max(300, Math.min(372, (width - left - 340) / 3));
    const columns = VISUAL_COLUMNS.map((column, index) => ({
        ...column,
        x: Math.round(left + step * index)
    }));
    return new Map(columns.flatMap((column, index) => column.kinds.map((kind) => [kind, { index, x: column.x, y: column.y }])));
}
export function detailModeForZoom(zoom) {
    if (zoom < 0.58)
        return 'compact';
    if (zoom > 1.08)
        return 'detail';
    return 'standard';
}
export function nodeWidthForMode(node, mode) {
    if (mode === 'compact') {
        return Math.max(208, Math.min(252, node.width || 224));
    }
    const labelLength = node.label.length;
    const noteLength = (node.notes ?? node.evidence ?? '').length;
    const base = labelLength > 42 || noteLength > 150 ? 332 : labelLength > 28 || noteLength > 92 ? 302 : 280;
    if (mode === 'detail') {
        return Math.max(316, Math.min(364, Math.max(node.width || 0, base + 24)));
    }
    return Math.max(264, Math.min(332, Math.max(node.width || 0, base)));
}
function estimatedNodeHeight(node, width) {
    const contentWidth = Math.max(180, width - 34);
    const titleCharactersPerLine = Math.max(18, Math.floor(contentWidth / 8.5));
    const noteCharactersPerLine = Math.max(24, Math.floor(contentWidth / 7));
    const titleLines = Math.max(1, Math.ceil(node.label.length / titleCharactersPerLine));
    const note = node.notes ?? node.evidence ?? '';
    const noteLines = note ? Math.min(4, Math.ceil(note.length / noteCharactersPerLine)) : 2;
    const syncAllowance = node.sync ? 10 : 0;
    const estimated = 96 + titleLines * 18 + noteLines * 14 + syncAllowance;
    return Math.max(node.height || 0, estimated, 122);
}
export function agentActivityFromSessionChange(previous, next) {
    if (!previous)
        return null;
    const previousNodes = new Map(previous.canvas.nodes.map((node) => [node.id, node]));
    const changed = next.canvas.nodes.filter((node) => {
        if (node.createdBy === 'operator')
            return false;
        const prior = previousNodes.get(node.id);
        if (!prior)
            return true;
        return prior.updatedAt !== node.updatedAt;
    });
    if (!changed.length)
        return null;
    const nodeIds = changed.map((node) => node.id);
    const first = changed[0];
    const action = previousNodes.has(first.id) ? 'updated' : 'added';
    const message = changed.length === 1
        ? `Agent ${action} ${first.label}`
        : `Agent updated ${changed.length} cards`;
    return { message, nodeIds };
}
export function focusedStoryNodeSummaries(session) {
    const story = session.story;
    if (!story?.active || !story.focusNodeIds.length)
        return [];
    const nodesById = new Map(session.canvas.nodes.map((node) => [node.id, node]));
    const calloutsByNode = new Map();
    for (const callout of story.callouts) {
        if (!callout.nodeId)
            continue;
        const current = calloutsByNode.get(callout.nodeId) ?? [];
        current.push({ severity: callout.severity, text: callout.text });
        calloutsByNode.set(callout.nodeId, current);
    }
    const questionsByNode = new Map();
    for (const question of story.questions) {
        if (!question.nodeId)
            continue;
        const current = questionsByNode.get(question.nodeId) ?? [];
        current.push({
            owner: question.owner,
            question: question.question,
            status: question.status
        });
        questionsByNode.set(question.nodeId, current);
    }
    return story.focusNodeIds.flatMap((id) => {
        const node = nodesById.get(id);
        if (!node)
            return [];
        return [
            {
                id: node.id,
                label: node.label,
                kind: node.kind,
                owner: node.owner ?? 'Unassigned',
                status: node.status,
                notes: node.notes,
                evidence: node.evidence,
                callouts: calloutsByNode.get(node.id) ?? [],
                questions: questionsByNode.get(node.id) ?? []
            }
        ];
    });
}
export function tidyNodeUpdates(session, options = {}) {
    const cursors = new Map();
    const singleColumn = (boundedViewportWidth(options.viewportWidth) ?? Infinity) < 760;
    const kindColumn = kindColumnForViewport(options.viewportWidth);
    const ordered = [...session.canvas.nodes].sort((a, b) => {
        const columnDelta = (kindColumn.get(a.kind)?.index ?? 0) - (kindColumn.get(b.kind)?.index ?? 0);
        if (columnDelta !== 0)
            return columnDelta;
        if (a.y !== b.y)
            return a.y - b.y;
        const kindDelta = (KIND_RANK.get(a.kind) ?? 0) - (KIND_RANK.get(b.kind) ?? 0);
        if (kindDelta !== 0)
            return kindDelta;
        return a.x - b.x;
    });
    return ordered.flatMap((node) => {
        const column = kindColumn.get(node.kind) ?? { index: 0, x: 84, y: 198 };
        const width = nodeWidthForMode(node, 'standard');
        const cursorIndex = singleColumn ? 0 : column.index;
        const y = cursors.get(cursorIndex) ?? column.y;
        cursors.set(cursorIndex, y + estimatedNodeHeight(node, width) + COLUMN_GAP);
        const next = {
            id: node.id,
            width,
            x: column.x,
            y
        };
        const hasChanged = Math.abs(node.x - next.x) > 1 ||
            Math.abs(node.y - next.y) > 1 ||
            Math.abs((node.width || 0) - next.width) > 1;
        return hasChanged ? [next] : [];
    });
}
//# sourceMappingURL=layout.js.map