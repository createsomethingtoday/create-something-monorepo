export const dentalDemoHref = 'https://lumen-dental-agent.createsomethingltd.chatgpt.site';

/** Public vendor-service copy. The demonstration contains synthetic records only. */
export const dentalAgentAnswer =
  'We build OpenAI-powered website agents for dental practices that answer approved front-desk questions, guide visitors, and prepare appointment requests. Your practice controls the sources, permissions, confirmation steps, and handoff to staff.';
export const dentalAgentService = {
  name: 'OpenAI agent integration for dental practices',
  type: 'AI workflow integration',
  description: dentalAgentAnswer,
  priceDescription:
    'Implementation, hosting, AI usage and ongoing operation are scoped and agreed separately.'
};
export const dentalAgentFaqs = [
  {
    question: 'What can an OpenAI website agent do for a dental practice?',
    answer: dentalAgentAnswer
  },
  {
    question: 'Can it book into our existing dental software?',
    answer:
      'We first check your scheduler’s supported APIs, account permissions, and booking rules. When an approved write path exists, the system can recheck availability and save a booking after confirmation. When it does not, the agent prepares a request for your staff instead. We do not promise compatibility with every practice system.'
  },
  {
    question: 'Does the agent make clinical decisions or replace our front desk?',
    answer:
      'The workflow supports your front desk. Approved practice questions and appointment preparation can be delegated; clinical questions, exceptions, and unsupported requests go to your team. It does not diagnose, recommend treatment, or verify insurance benefits.'
  },
  {
    question: 'How is patient information handled?',
    answer:
      'Before connecting patient information, we agree on the minimum data needed, access, retention, provider agreements, and applicable privacy and security requirements. The public example uses synthetic records only. A working demo is not a compliance determination, and patient records do not become public proof.'
  },
  {
    question: 'What does the Lumen Dental demonstration prove?',
    answer:
      'Lumen is a fictional practice with a working OpenAI agent, database-grounded answers, navigation, confirmed synthetic bookings, visible tool receipts, and aggregate website and agent analytics. It is a public demonstration you can open from this page. It does not establish real clinic integration, patient outcomes, time savings, revenue, or search visibility.'
  },
  {
    question: 'Will the agent improve our SEO or visibility in AI answers?',
    answer:
      'A chat agent and search visibility serve different jobs. We can make approved public practice information crawlable, clear, and consistent, with suitable metadata and structured data. We measure search performance separately from website and agent activity. Rankings, inclusion, and AI citations are not guaranteed.'
  },
  {
    question: 'Who owns the accounts, costs, and day-to-day decisions?',
    answer:
      'Your practice keeps its accounts, data, and approval authority. We agree on implementation scope, acceptance checks, usage budgets, and recovery instructions before connecting production systems. Project-specific hosting and OpenAI API usage are budgeted separately; ongoing operation needs an agreed scope.'
  }
];
