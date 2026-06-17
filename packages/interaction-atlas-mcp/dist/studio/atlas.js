import { AI_TASKS, CONSTRAINTS, DATA_ARTIFACTS, HUMAN_TASKS, SYSTEM_TASKS, TOUCHPOINTS } from '@quietloudlab/ai-interaction-atlas';
function paletteFrom(records, kind) {
    return records.slice(0, 18).map((item) => ({
        id: item.id,
        kind,
        label: item.name,
        description: item.elevator_pitch ?? item.description
    }));
}
export function getAtlasStudioPalette() {
    return {
        actor: [
            {
                id: 'actor_client',
                kind: 'actor',
                label: 'Client team',
                description: 'People who own the workflow.'
            },
            {
                id: 'actor_operator',
                kind: 'actor',
                label: 'Operator',
                description: 'Person running the workflow today.'
            },
            {
                id: 'actor_approver',
                kind: 'actor',
                label: 'Approver',
                description: 'Person who can approve risk or access.'
            },
            {
                id: 'actor_agent',
                kind: 'actor',
                label: 'Agent',
                description: 'AI worker that can assist after boundaries are set.'
            }
        ],
        human: paletteFrom(HUMAN_TASKS, 'human'),
        ai: paletteFrom(AI_TASKS, 'ai'),
        system: paletteFrom(SYSTEM_TASKS, 'system'),
        data: paletteFrom(DATA_ARTIFACTS, 'data'),
        constraint: paletteFrom(CONSTRAINTS, 'constraint'),
        touchpoint: paletteFrom(TOUCHPOINTS, 'touchpoint')
    };
}
export function defaultLabelForKind(kind) {
    switch (kind) {
        case 'actor':
            return 'New actor';
        case 'human':
            return 'Human decision';
        case 'ai':
            return 'AI task';
        case 'system':
            return 'System operation';
        case 'data':
            return 'Data artifact';
        case 'constraint':
            return 'Constraint';
        case 'touchpoint':
            return 'Touchpoint';
    }
}
//# sourceMappingURL=atlas.js.map