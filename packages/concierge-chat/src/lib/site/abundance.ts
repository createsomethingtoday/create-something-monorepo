export const staffingStats = [
  {
    label: 'Two-sided staffing site',
    value: 'Nurses + facilities',
    detail: 'Public paths for job seekers, facility staffing requests, and recruiter review.'
  },
  {
    label: 'Agent boundary',
    value: 'Recruiter-gated',
    detail: 'Agents prepare intake, jobs, and handoff context without autonomous staffing decisions.'
  },
  {
    label: 'Runtime proof',
    value: 'D1 + MCP + Dify',
    detail: 'Jobs, staff context, and operator actions stay behind governed server-side surfaces.'
  }
];

export const heroVisual = {
  src: 'https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=82',
  alt: 'Supportive healthcare moment with hands held in a bright clinical setting',
  caption: 'Guided intake, recruiter review, and staffing handoff in one calm workflow.',
  note: 'Designed for real nurses and coordinators, not only for the database behind them.'
};

export const staffingPages = [
  {
    eyebrow: 'For Nurses',
    title: 'Find the next contract without another long intake form.',
    body:
      'Abundance Concierge turns a plain-language conversation into a reviewed profile, matching context, and recruiter-ready next step.',
    href: '/nurses',
    cta: 'Nurse path'
  },
  {
    eyebrow: 'For Facilities',
    title: 'Request staffing with the handoff, owner, and approval boundary visible.',
    body:
      'Facility requests route into a staffed workflow with role needs, shift context, gaps, and approval points preserved.',
    href: '/facilities',
    cta: 'Facility path'
  },
  {
    eyebrow: 'For Operators',
    title: 'Use Abundance agents with proof beside every claim.',
    body:
      'Agent work is branded for Abundance and separated from the internal Ona design precedent. Keys and write actions stay gated.',
    href: '/agents',
    cta: 'Agent system'
  }
];

export const nurseSteps = [
  {
    label: '1',
    title: 'Start with the role',
    body:
      'Share specialty, shift, location, pay constraints, start date, and anything that would make a contract a poor fit.'
  },
  {
    label: '2',
    title: 'Confirm the profile',
    body:
      'Concierge keeps a running profile and asks for corrections before matching or recruiter review.'
  },
  {
    label: '3',
    title: 'Verify when needed',
    body:
      'Uploads, consent, and recruiter review unlock with secure verification only when the workflow actually needs them.'
  },
  {
    label: '4',
    title: 'Move with a recruiter',
    body:
      'The system stages the shortlist and staffing packet, but a recruiter owns the review and next staffing action.'
  }
];

export const facilitySteps = [
  {
    label: 'Need',
    title: 'Role and shift request',
    body:
      'Capture role, specialty, unit, dates, shift, location, urgency, credential requirements, and budget constraints.'
  },
  {
    label: 'Match',
    title: 'Shortlist with gaps',
    body:
      'Agents draft candidate-fit context and missing-information flags for the recruiter instead of making a final staffing call.'
  },
  {
    label: 'Approve',
    title: 'Recruiter handoff',
    body:
      'Submission, outreach, and onboarding steps stay behind named approval and evidence trails.'
  }
];

export const jobHighlights = [
  {
    role: 'Travel RN - ICU',
    location: 'Dallas, TX',
    term: '13 weeks, nights',
    detail: 'Best for ICU travelers who want compact-license-friendly matching and recruiter review.'
  },
  {
    role: 'RN - Med Surg',
    location: 'Chicago, IL',
    term: '12 weeks, days',
    detail: 'Use Concierge to confirm unit experience, schedule constraints, and start window.'
  },
  {
    role: 'RN - Labor and Delivery',
    location: 'Sacramento, CA',
    term: '13 weeks, nights',
    detail: 'Capture specialty context and documents once the recruiter review step is ready.'
  }
];

export const abundanceAgents = [
  {
    name: 'Abundance Concierge',
    lane: 'Nurse intake',
    summary:
      'Guides nurses through specialty, shift, location, documents, consent, and profile confirmation.',
    proof: 'Public application path with protected verification.'
  },
  {
    name: 'Abundance Jobs',
    lane: 'Job discovery',
    summary:
      'Searches normalized public job data and explains available coverage without calling paid ingest paths.',
    proof: 'Read-only Jobs MCP and D1 serving contract.'
  },
  {
    name: 'Abundance Recruiter Desk',
    lane: 'Review prep',
    summary:
      'Drafts shortlists, highlights missing information, and prepares recruiter review context.',
    proof: 'Recruiter approval gate before protected staffing moves.'
  },
  {
    name: 'Abundance Staffing Desk',
    lane: 'Facility handoff',
    summary:
      'Packages facility needs, staffing queue state, and candidate handoff details for coordinator action.',
    proof: 'Governed staffing packet and operator action trail.'
  },
  {
    name: 'Abundance Compliance',
    lane: 'Credential readiness',
    summary:
      'Keeps document, consent, and verification requirements visible without exposing private records publicly.',
    proof: 'Secure verification and private upload boundary.'
  }
];

export const trustProof = [
  'No browser-side Dify Service API key',
  'Recruiter review before staffing decisions',
  'Protected uploads require verification',
  'Public job discovery stays read-only',
  'Private employee rows and credentials stay out of public pages'
];

export const careStories = [
  {
    title: 'For the nurse who is between shifts',
    body:
      'Start with a sentence about the role you want. Concierge turns that into the profile details a recruiter actually needs.'
  },
  {
    title: 'For the recruiter protecting fit',
    body:
      'Shortlists include gaps, assumptions, and review state so judgment stays visible before a candidate moves forward.'
  },
  {
    title: 'For the facility needing coverage',
    body:
      'Requests preserve shift, unit, credential, urgency, and owner context instead of becoming a loose message thread.'
  }
];

export const stylePrinciples = [
  {
    title: 'Healthcare clarity',
    body:
      'Use plain language, direct headings, strong contrast, visible form states, and readable line lengths.'
  },
  {
    title: 'Trust before automation',
    body:
      'Show what runs, what waits, who approves, and what evidence proves the next action.'
  },
  {
    title: 'Two-sided navigation',
    body:
      'Nurses need jobs and application progress. Facilities need staffing requests, quality proof, and contact paths.'
  },
  {
    title: 'Abundance agent brand',
    body:
      'Public agent names belong to Abundance. Ona remains an internal operator-design precedent, not the client brand.'
  }
];

export const colorTokens = [
  { name: 'Ink', token: '--ink', value: '#171512' },
  { name: 'Clinical Blue', token: '--accent', value: '#1d6f8a' },
  { name: 'Care Green', token: '--good', value: '#2f7555' },
  { name: 'Signal Gold', token: '--warn', value: '#9b6a20' },
  { name: 'Warm Tan', token: '--accent-secondary', value: '#af7c54' },
  { name: 'Emergency Red', token: '--danger', value: '#b4233c' }
];

export const sourceModel = [
  {
    title: 'Market sitemap pattern',
    body:
      'Large healthcare staffing agencies consistently split navigation between job seekers and employers, with jobs, staffing request, workforce solution, benefits, about, and contact paths.'
  },
  {
    title: 'Design-system base',
    body:
      'The visual system follows CMS and USWDS discipline: accessible components, real user needs, earned trust, and continuity.'
  },
  {
    title: 'Abundance differentiator',
    body:
      'The site makes governed AI agents and recruiter approval visible as the product proof, not as an unbounded automation claim.'
  }
];
