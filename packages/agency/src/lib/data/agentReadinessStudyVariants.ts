import type { PerformanceNarrativeScene } from '@create-something/canon';

export const agentReadinessStudyVariantIds = ['baseline', 'proof-first', 'outcome-first'] as const;

export type AgentReadinessStudyVariantId = (typeof agentReadinessStudyVariantIds)[number];

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
      title: 'See what AI buyers understand—and get wrong—about your business.',
      lede:
        'We test 25 high-intent buyer questions across major AI answer surfaces, compare the answers with up to three competitors, and inspect whether agents can find your pricing, proof, documentation, policies, and implementation details.',
      proof: [
        { label: 'Price', value: '$3,000 one-time' },
        { label: 'Scope', value: 'One brand · one market' },
        { label: 'Delivery', value: '7 business days' }
      ]
    },
    diagnostic: {
      title: 'Ask, compare, and prove before you rebuild anything.',
      description:
        'The audit separates answer-surface symptoms from missing business evidence, then gives each recommended change a source, priority, and owner.',
      scenes: [
        {
          id: 'questions',
          label: 'Ask',
          summary: '25 buyer questions',
          title: 'Test the questions people ask before they contact you.',
          detail:
            'We run 25 high-intent buyer questions across major AI answer surfaces and preserve the model, surface, retrieval context, and time of every response.',
          tone: 'review',
          receipts: ['one brand', 'one market', 'timestamped answers']
        },
        {
          id: 'comparison',
          label: 'Compare',
          summary: 'Your answer set in context',
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
          title: 'Turn the gaps into a bounded 30-day plan.',
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
        'The $3,000 audit diagnoses the problem; it does not include implementation. If the evidence justifies action, CREATE SOMETHING proposes a separately scoped Build. Control from $900/month after launch is available for ongoing Managed AI Operations. No guaranteed rankings, citations, or recommendations.'
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
        'The audit leads with the answer record, then separates missing business evidence from an answer-surface symptom and assigns a source, priority, and owner.',
      scenes: [
        {
          id: 'questions',
          label: 'Record',
          summary: 'Timestamped answers',
          title: 'Keep the answer, source, model, surface, and time together.',
          detail:
            'We run 25 high-intent buyer questions across major AI answer surfaces and preserve the response context before any recommendation is made.',
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
        'The $3,000 audit produces the evidence record and 30-day plan; it does not include implementation. If the evidence justifies action, CREATE SOMETHING proposes a separately scoped Build. Control from $900/month after launch is available for ongoing Managed AI Operations. No guaranteed rankings, citations, or recommendations.'
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
      title: 'Get to the next justified action in three bounded moves.',
      description:
        'The audit starts from the decision you need to make, establishes the answer evidence, and leaves a plan that can be approved without treating a diagnosis as implementation.',
      scenes: [
        {
          id: 'questions',
          label: 'Frame',
          summary: 'One brand · one market',
          title: 'Set a bounded question before the evidence expands.',
          detail:
            'We define the buyer questions for one brand and one market, then run 25 high-intent questions across major AI answer surfaces.',
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
        'The $3,000 audit gives you a bounded diagnostic and cited 30-day plan; it does not include implementation. If the evidence justifies action, CREATE SOMETHING proposes a separately scoped Build. Control from $900/month after launch is available for ongoing Managed AI Operations. No guaranteed rankings, citations, or recommendations.'
    }
  }
};

export function resolveAgentReadinessStudyVariant(value: string | null | undefined) {
  if (value && agentReadinessStudyVariantIds.includes(value as AgentReadinessStudyVariantId)) {
    return agentReadinessStudyVariants[value as AgentReadinessStudyVariantId];
  }
  return agentReadinessStudyVariants.baseline;
}
