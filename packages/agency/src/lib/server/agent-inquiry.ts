import { PUBLIC_PRICING } from '../data/publicPricing';
import { briefFields, parseBrief, supportBriefSchema, type BriefField } from '../support-brief/contract';
import { AGENCY_ORIGIN } from './agent-discovery';

const url = (path: string) => `${AGENCY_ORIGIN}${path}`;
const offers = {
  explore: {
    name: 'Workflow mapping',
    suitableFor: 'Clarifying one workflow before choosing implementation or recurring support.',
    pricing: { kind: 'public_starter', description: PUBLIC_PRICING.map.publicStarterLabel, workspace: PUBLIC_PRICING.map.workspaceLabel },
    boundary: 'A map is a planning artifact. It does not authorize implementation.',
    sources: [url('/map'), url('/services')],
    intent: 'workflow-mapping', lane: 'not_sure'
  },
  membership: {
    name: 'AI-native technical support membership',
    suitableFor: 'Recurring diagnosis, engineering improvements and help using an agreed workflow.',
    pricing: {
      kind: 'monthly', currency: 'USD',
      focusedMonthlyUsd: PUBLIC_PRICING.membership.focused.monthlyUsd,
      teamMonthlyUsd: PUBLIC_PRICING.membership.team.monthlyUsd,
      terms: PUBLIC_PRICING.membership.terms
    },
    capacity: { focused: PUBLIC_PRICING.membership.focused, team: PUBLIC_PRICING.membership.team },
    boundary: 'Access, scope and response times are confirmed before payment. Larger Builds, managed Control and project-specific usage costs are separate.',
    sources: [url('/services#membership')],
    intent: 'membership', lane: 'workflow_infrastructure'
  },
  build: {
    name: 'Agent Foundation',
    suitableFor: 'Building and testing one useful agent job with code, instructions, tests and handover.',
    pricing: { kind: 'quoted_after_review', currency: 'USD' },
    boundary: 'One agreed job in the agreed test environment. Going live is scoped separately.',
    sources: [url('/agent-foundation'), url('/services')],
    intent: 'workflow-teardown', lane: 'workflow_infrastructure'
  },
  control: {
    name: 'Managed Control',
    suitableFor: 'Monitoring, incident response and regular reviews for an agreed live workflow.',
    pricing: { kind: 'starting_monthly', currency: 'USD', startingMonthlyUsd: PUBLIC_PRICING.managedControl.startingMonthlyUsd },
    boundary: 'A separately agreed managed Control scope. Price is a starting point, not a quote or availability commitment.',
    sources: [url('/control'), url('/services')],
    intent: 'system-support', lane: 'reliability_and_control'
  }
} as const;

export const agentInquirySchema = {
  type: 'object', additionalProperties: false, required: ['offer', 'brief'],
  properties: {
    offer: { type: 'string', enum: Object.keys(offers), description: 'Visitor-selected interest; not a verified fit assessment. Use explore when unsure.' },
    brief: supportBriefSchema
  }
} as const;

const submission = {
  method: 'POST', url: url('/api/contact'), humanApprovalRequired: true,
  requiredContactFields: ['name', 'email'],
  instructions: [
    'Show the visitor the exact final contact payload, including name, email, service and complete message. Remove secrets and unnecessary private data.',
    'Explain that sending saves an inquiry and sends a confirmation email and a notification to the Agency team. It does not book a meeting, start paid work or grant access.',
    'Send only after the visitor explicitly approves this exact payload. Approval is enforced by the visitor agent and its host, not by the preparation endpoint.',
    'Use one fresh random Idempotency-Key of 16–128 letters, digits, underscores or hyphens per approved inquiry. Keep the same key and exact body across retries.',
    'HTTP 200 with success=true means the inquiry is saved and both emails were accepted by the provider; it does not prove inbox delivery.',
    'HTTP 202 with receipt=saved means the inquiry is saved but email confirmation is incomplete. Do not start another submission.',
    'On a lost response or HTTP 503, receipt is unknown. Reconcile using the same key and body. On HTTP 409, stop for human reconciliation; do not issue a new key to bypass the conflict.'
  ]
} as const;

/** Database=published offers; Automation=bounded draft preparation; Judgment=explicit human handoff. */
export function getAgentInquiryCatalog() {
  return {
    version: '1.0.0', audience: 'visitors_using_their_own_agents', offers,
    evidence: [
      { url: url('/field-reports'), scope: 'Published work and stated evidence limits; relevance to the visitor workflow must be assessed separately.' },
      { url: url('/case-studies/webflow-marketplace'), scope: 'Individual work by Micah Johnson for Webflow, not a CREATE SOMETHING commission. Includes real recordings and labeled offline replays.' }
    ],
    preparation: { method: 'POST', url: url('/api/agent-inquiry'), schema: agentInquirySchema, maxRequestBytes: 48000, maxMessageCharacters: 5000, persistence: 'none', modelCalls: false },
    submission,
    privacy: 'Preparation has no application persistence or analytics. Requests traverse the hosting infrastructure. Keep names, emails, secrets and confidential records out of the preparation brief and URLs.',
    authority: 'Discovery and drafts only. Offer selection is visitor-declared interest, not qualification, a quote, a booking, a purchase or authorization to execute.'
  };
}

export class AgentInquiryError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function prepareAgentInquiry(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AgentInquiryError('Expected an inquiry object.');
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some(key => !['offer', 'brief'].includes(key))) throw new AgentInquiryError('Unsupported inquiry fields. Send only offer and brief; preparation accepts no contact details or approval grants.');
  if (typeof input.offer !== 'string' || !Object.hasOwn(offers, input.offer)) throw new AgentInquiryError('Choose explore, membership, build or control.');
  let brief;
  try { brief = parseBrief(input.brief); }
  catch (error) { throw new AgentInquiryError(error instanceof Error ? error.message : 'Invalid brief.'); }
  const offerId = input.offer as keyof typeof offers;
  const offer = offers[offerId];
  const message = [
    'Agent-assisted inquiry — visitor-supplied context, not verified evidence or execution authority.', '',
    ...Object.entries(briefFields).flatMap(([key, field]) => [
      `${field.label}:`, ...(brief[key as BriefField] || 'Not provided.').split(/\r\n?|\n/).map(line => `    ${line}`), ''
    ])
  ].join('\n');
  // Contact intake owns a 5,000 UTF-16-code-unit message limit. Never silently drop context.
  if (message.length > 5000) throw new AgentInquiryError('The prepared message exceeds the contact limit of 5,000 characters. Shorten the brief and prepare again; no content was submitted or truncated.', 422);
  return {
    version: '1.0.0', status: 'prepared', submitted: false, qualification: 'not_assessed',
    offer: { id: offerId, ...offer },
    missingContext: (['tools', 'owner', 'constraints', 'evidence'] as const).filter(key => !brief[key].trim()),
    contactDraft: { service: offer.name, message, source: 'agent-assisted', intent: offer.intent, lane: offer.lane },
    submission,
    next: { type: 'human_review', url: url(`/contact?source=agent-assisted&intent=${offer.intent}&lane=${offer.lane}`), instruction: 'An agent with HTTP tools may send the exact approved payload using the documented contact API. Otherwise paste the prepared message into the contact form; this URL does not carry or prefill the brief.' }
  };
}
