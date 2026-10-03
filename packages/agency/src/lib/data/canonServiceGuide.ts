import { PUBLIC_PRICING } from './publicPricing';

// Curated public service copy only. This is a local prototype, not an AI runtime.
export const canonServiceQuestions = [
  { id: 'tools', label: 'Can you help with my tools?' },
  { id: 'fit', label: 'Which service fits my problem?' },
  { id: 'membership', label: 'What does membership include?' }
] as const;
export type ServiceQuestion = typeof canonServiceQuestions[number]['id'];
export type ServiceAnswer = {
  title: string;
  paragraphs: string[];
  links: { label: string; href: string }[];
};
export const canonServiceAnswers: Record<ServiceQuestion, ServiceAnswer> = {
  tools: {
    title: 'Start with the tools and the handoff.',
    paragraphs: [
      'Technical support covers software and workflows, including forms, automations, integrations and AI-built projects. Fit and access are agreed before work begins; a tool name alone does not confirm compatibility.',
      'Tell us which tools are involved, what should happen and where the work gets stuck. Your team keeps approval authority. Keep passwords, API keys and private customer records out of the inquiry.'
    ],
    links: [
      { label: 'Connected tools', href: '/partners' },
      { label: 'Ownership and tool boundaries', href: '/stack' },
      { label: 'Describe a software problem', href: '/contact?intent=system-support' }
    ]
  },
  fit: {
    title: 'Choose the next useful step.',
    paragraphs: [
      'Use Map to make the task, tools and approvals visible before agreeing on a change. Membership provides recurring diagnosis, engineering improvements and help using the result within agreed capacity. Larger Build projects are quoted separately.',
      `Control is separate managed live operations, ${PUBLIC_PRICING.managedControl.label.toLowerCase()}, under a separate agreement. Membership does not include production incident response; that needs a separate agreement.`,
      'For an existing product, a technical review is another starting point. We confirm fit and scope together rather than choosing a service for you here.'
    ],
    links: [
      { label: 'Map the work', href: '/map' },
      { label: 'Services and membership', href: '/services' },
      { label: 'Managed Control', href: '/control' },
      { label: 'Technical review', href: '/technical-review' }
    ]
  },
  membership: {
    title: 'Agreed capacity, with a handoff you can use.',
    paragraphs: [
      `Focused is ${PUBLIC_PRICING.membership.focused.label}: one workstream and one milestone each billing month, two 30-minute check-ins and two 60-minute attended remote work sessions. Team is ${PUBLIC_PRICING.membership.team.label}: up to two workstreams and two milestones, two 30-minute check-ins and four 60-minute attended remote sessions. Each milestone includes one feedback and revision round.`,
      'Skills, learning resources and Slack support are included. We agree on scope, session times, response times and any usage budget before payment. Resource access is confirmed during onboarding. Cancel before renewal.',
      'Project-specific AI usage, hosting and third-party services are budgeted separately. Larger Builds, managed Control and production incident response need separate agreements. Commissioned deliverables and reusable tools follow your agreement; reusable tools are licensed for continued use.'
    ],
    links: [
      { label: 'Membership scope and cost', href: '/services#membership' },
      { label: 'What you keep', href: '/stack' },
      { label: 'Discuss membership', href: '/contact?intent=membership' }
    ]
  }
};
