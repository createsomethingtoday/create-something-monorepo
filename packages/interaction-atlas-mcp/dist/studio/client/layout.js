const LANES = {
    actor: { x: 84, y: 198 },
    data: { x: 424, y: 144 },
    system: { x: 768, y: 112 },
    ai: { x: 768, y: 326 },
    human: { x: 1112, y: 144 },
    constraint: { x: 1112, y: 354 },
    touchpoint: { x: 424, y: 456 }
};
const LANE_ORDER = [
    'actor',
    'data',
    'system',
    'ai',
    'human',
    'constraint',
    'touchpoint'
];
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
    const message = changed.length === 1 ? `Agent ${action} ${first.label}` : `Agent updated ${changed.length} cards`;
    return { message, nodeIds };
}
export function tidyNodeUpdates(session) {
    const offsets = new Map();
    const ordered = [...session.canvas.nodes].sort((a, b) => {
        const laneDelta = LANE_ORDER.indexOf(a.kind) - LANE_ORDER.indexOf(b.kind);
        if (laneDelta !== 0)
            return laneDelta;
        if (a.y !== b.y)
            return a.y - b.y;
        return a.x - b.x;
    });
    return ordered.flatMap((node) => {
        const lane = LANES[node.kind];
        const offset = offsets.get(node.kind) ?? 0;
        offsets.set(node.kind, offset + 1);
        const next = {
            id: node.id,
            width: nodeWidthForMode(node, 'standard'),
            x: lane.x,
            y: lane.y + offset * 174
        };
        const hasChanged = Math.abs(node.x - next.x) > 1 ||
            Math.abs(node.y - next.y) > 1 ||
            Math.abs((node.width || 0) - next.width) > 1;
        return hasChanged ? [next] : [];
    });
}
//# sourceMappingURL=layout.js.map