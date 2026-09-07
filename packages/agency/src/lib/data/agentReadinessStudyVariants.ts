import type { PerformanceNarrativeScene } from '@create-something/canon';

export const agentReadinessStudyVariantIds = ['baseline', 'proof-first', 'outcome-first'] as const;

export type AgentReadinessStudyVariantId = (typeof agentReadinessStudyVariantIds)[number];

export const productionAgentReadinessVariantId: AgentReadinessStudyVariantId = 'baseline';

export interface AgentReadinessStudyVariant {
  id: AgentReadinessStudyVariantId;
  hero: {
    title: string;
    lede: string;
    proof: Array<{ label: string; value: string }>;
  };
  diagnostic: {
    title: string;
    description: string;
    scenes: PerformanceNarrativeScene[];
  };
  handoff: {
    title: string;
    description: string;
  };
}

const sharedHandoff = {
  owner: 'Business owner',
  authority: 'Approve the 30-day plan',
  proof: 'Answers + sources + priorities',
  state: 'ready' as const
};

export const agentReadinessStudyHandoff = sharedHandoff;

export const agentReadinessStudyVariants: Record<
  AgentReadinessStudyVariantId,
  AgentReadinessStudyVariant
> = {
  baseline: {
    id: 'baseline',
    hero: {
      title: 'See what AI tells people about your business.',
      lede:
        'We ask major AI services 25 buyer questions about your business and compare the answers with up to three competitors. We check whether AI can find your pricing, evidence, documentation, policies, and implementation details.',
      proof: [
        { label: 'Price', value: '$3,000 one-time' },
        { label: 'Scope', value: 'One brand · one market' },
        { label: 'Delivery', value: '7 business days' }
      ]
    },
    diagnostic: {
      title: 'Find what is missing before changing your site.',
      description:
        'We check the AI answers against your published information. You get recommended changes, the evidence for each, and a clear order of work.',
      scenes: [
        {
          id: 'questions',
          label: 'Ask',
          summary: '25 buyer questions',
          title: 'Test the questions people ask before they contact you.',
          detail:
            'We ask 25 buyer questions across major AI services. We record each answer, the model, the service, the information it used, and the time.',
          tone: 'review',
          receipts: ['one brand', 'one market', 'timestamped answers']
        },
        {
          id: 'comparison',
          label: 'Compare',
          summary: 'Compare the answers',
          title: 'See where competitors are easier to understand.',
          detail:
            'We compare your answer set with up to three competitors and inspect whether agents can find usable pricing, proof, documentation, policies, and implementation details.',
          tone: 'neutral',
          receipts: ['answer comparison', 'source coverage', 'unsupported claims']
        },
        {
          id: 'plan',
          label: 'Prove',
          summary: 'Evidence before implementation',
          title: 'Get a plan for the next 30 days.',
          detail:
            'You receive cited sources, the evidence behind each gap, and a prioritized 30-day plan. The audit diagnoses the problem; it does not include implementation.',
          tone: 'allow',
          evidence: ['cited sources', 'priority and owner', '30-day sequence'],
          actions: [
            { label: 'See the service path', href: '/services' },
            { label: 'See ongoing Control', href: '/control' }
          ]
        }
      ]
    },
    handoff: {
      title: 'Start with evidence before changing the site.',
      description:
        'The $3,000 audit diagnoses the problem; it does not include implementation. If the evidence justifies action, CREATE SOMETHING proposes a separately scoped Build. Control from $900/month after launch is available for ongoing Managed AI Operations. The audit does not guarantee rankings, citations, or recommendations.'
    }
  },
  'proof-first': {
    id: 'proof-first',
    hero: {
      title: 'Know what AI can prove about your business before you change it.',
      lede:
        'In seven business days, receive timestamped answers to 25 high-intent buyer questions, cited sources for every gap, and a comparison with up to three competitors.',
      proof: [
        { label: 'Evidence', value: 'Timestamped answers + cited sources' },
        { label: 'Comparison', value: 'Up to three competitors' },
        { label: 'Decision', value: 'Prioritized 30-day plan' }
      ]
    },
    diagnostic: {
      title: 'Inspect the evidence before you decide what to build.',
      description:
        'The audit leads with the answer record, then separates missing business evidence from an problem in an AI answer and assigns a source, priority, and owner.',
      scenes: [
        {
          id: 'questions',
          label: 'Record',
          summary: 'Timestamped answers',
          title: 'Keep the answer, source, model, surface, and time together.',
          detail:
            'We run 25 high-intent buyer questions across major AI services and preserve the response context before any recommendation is made.',
          tone: 'review',
          receipts: ['25 buyer questions', 'timestamped answers', 'retrieval context']
        },
        {
          id: 'comparison',
          label: 'Compare',
          summary: 'Evidence in context',
          title: 'Locate the missing proof without guessing why it is missing.',
          detail:
            'We compare your answer set with up to three competitors and inspect whether pricing, proof, documentation, policies, and implementation details are usable.',
          tone: 'neutral',
          receipts: ['answer comparison', 'source coverage', 'unsupported claims']
        },
        {
          id: 'plan',
          label: 'Prioritize',
          summary: 'Cited 30-day plan',
          title: 'Approve the smallest justified next change.',
          detail:
            'You receive cited sources, the evidence behind each gap, and a prioritized 30-day plan. The audit diagnoses the problem; it does not include implementation.',
          tone: 'allow',
          evidence: ['cited sources', 'priority and owner', '30-day sequence'],
          actions: [
            { label: 'See the service path', href: '/services' },
            { label: 'See ongoing Control', href: '/control' }
          ]
        }
      ]
    },
    handoff: {
      title: 'Review the record before you approve a change.',
      description:
        'The $3,000 audit produces the evidence record and 30-day plan; it does not include implementation. If the evidence justifies action, CREATE SOMETHING proposes a separately scoped Build. Control from $900/month after launch is available for ongoing Managed AI Operations. The audit does not guarantee rankings, citations, or recommendations.'
    }
  },
  'outcome-first': {
    id: 'outcome-first',
    hero: {
      title: 'Leave with a prioritized 30-day plan—not another AI assessment.',
      lede:
        'For one brand and one market, we turn 25 high-intent buyer questions and competitive evidence into a cited plan with a named priority and owner in seven business days.',
      proof: [
        { label: 'Price', value: '$3,000 one-time' },
        { label: 'Output', value: 'Cited 30-day plan' },
        { label: 'Delivery', value: '7 business days' }
      ]
    },
    diagnostic: {
      title: 'Find the next useful change in three steps.',
      description:
        'The audit starts from the decision you need to make, establishes the answer evidence, and leaves a plan that can be approved without treating a diagnosis as implementation.',
      scenes: [
        {
          id: 'questions',
          label: 'Frame',
          summary: 'One brand · one market',
          title: 'Agree on the questions to test.',
          detail:
            'We define the buyer questions for one brand and one market, then run 25 high-intent questions across major AI services.',
          tone: 'review',
          receipts: ['one brand', 'one market', '25 buyer questions']
        },
        {
          id: 'comparison',
          label: 'Prove',
          summary: 'Cited answer gaps',
          title: 'Use answer evidence to distinguish a gap from a guess.',
          detail:
            'We preserve timestamped answers, compare up to three competitors, and inspect whether agents can find usable pricing, proof, documentation, policies, and implementation details.',
          tone: 'neutral',
          receipts: ['timestamped answers', 'answer comparison', 'source coverage']
        },
        {
          id: 'plan',
          label: 'Approve',
          summary: 'Prioritized 30-day plan',
          title: 'Choose the smallest next action that the evidence supports.',
          detail:
            'You receive cited sources, the evidence behind each gap, and a prioritized 30-day plan. The audit diagnoses the problem; it does not include implementation.',
          tone: 'allow',
          evidence: ['cited sources', 'priority and owner', '30-day sequence'],
          actions: [
            { label: 'See the service path', href: '/services' },
            { label: 'See ongoing Control', href: '/control' }
          ]
        }
      ]
    },
    handoff: {
      title: 'Approve a plan before you commission a Build.',
      description:
        'The $3,000 audit gives you a focused assessment and cited 30-day plan; it does not include implementation. If the evidence justifies action, CREATE SOMETHING proposes a separately scoped Build. Control from $900/month after launch is available for ongoing Managed AI Operations. The audit does not guarantee rankings, citations, or recommendations.'
    }
  }
};

export function resolveAgentReadinessStudyVariant(value: string | null | undefined) {
  if (value && agentReadinessStudyVariantIds.includes(value as AgentReadinessStudyVariantId)) {
    return agentReadinessStudyVariants[value as AgentReadinessStudyVariantId];
  }
  return agentReadinessStudyVariants[productionAgentReadinessVariantId];
}
