export const staffingStats = [
  {
    label: 'Nurses',
    value: 'Start once',
    detail: 'Role, shift, location, and timing in one guided thread.'
  },
  {
    label: 'Facilities',
    value: 'Request clearly',
    detail: 'Need, urgency, credentials, and owner captured up front.'
  },
  {
    label: 'Recruiters',
    value: 'Review first',
    detail: 'Agents prepare context. People approve staffing moves.'
  }
];

export const heroVisual = {
  src: 'https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=82',
  alt: 'Supportive healthcare moment with hands held in a bright clinical setting',
  caption: 'Guided intake. Recruiter review. Clear handoff.',
  note: 'Designed for nurses, recruiters, and coordinators.'
};

export const staffingPages = [
  {
    eyebrow: 'For Nurses',
    title: 'Tell us the contract you want.',
    body: 'Concierge turns plain language into a recruiter-ready profile.',
    href: '/nurses',
    cta: 'For nurses'
  },
  {
    eyebrow: 'For Facilities',
    title: 'Request coverage without losing context.',
    body: 'Shift, unit, urgency, and credential needs stay visible.',
    href: '/facilities',
    cta: 'For facilities'
  },
  {
    eyebrow: 'For Recruiters',
    title: 'Review prepared handoffs.',
    body: 'Agents stage the packet. Recruiters make the call.',
    href: '/agents',
    cta: 'Agent roles'
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
    summary: 'Captures specialty, shift, location, timing, and profile basics.',
    proof: 'Public application path with protected verification.'
  },
  {
    name: 'Abundance Jobs',
    lane: 'Job discovery',
    summary: 'Surfaces public jobs and coverage without paid browser calls.',
    proof: 'Read-only Jobs MCP and D1 serving contract.'
  },
  {
    name: 'Abundance Recruiter Desk',
    lane: 'Review prep',
    summary: 'Highlights fit, gaps, and recruiter review context.',
    proof: 'Recruiter approval gate before protected staffing moves.'
  },
  {
    name: 'Abundance Staffing Desk',
    lane: 'Facility handoff',
    summary: 'Packages needs, queue state, and candidate handoff details.',
    proof: 'Governed staffing packet and operator action trail.'
  },
  {
    name: 'Abundance Compliance',
    lane: 'Credential readiness',
    summary: 'Keeps document, consent, and verification status visible.',
    proof: 'Secure verification and private upload boundary.'
  }
];

export const trustProof = [
  'No service keys in the browser',
  'Recruiter review before staffing decisions',
  'Secure verification for uploads',
  'Public jobs are read-only',
  'Private records stay private'
];

export const careStories = [
  {
    title: 'Nurses',
    body: 'Start with the role, shift, location, and timing.'
  },
  {
    title: 'Recruiters',
    body: 'See the fit, gaps, and next review step.'
  },
  {
    title: 'Facilities',
    body: 'Request coverage with the approval boundary clear.'
  }
];

export const stylePrinciples = [
  {
    title: 'Healthcare clarity',
    body: 'Plain language, strong contrast, visible states, readable lines.'
  },
  {
    title: 'Trust before automation',
    body: 'Show what runs, what waits, and who approves.'
  },
  {
    title: 'Two-sided navigation',
    body: 'Separate nurse, facility, job, and agent paths.'
  },
  {
    title: 'Abundance agent brand',
    body: 'Public names belong to Abundance, not internal tools.'
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
    body: 'Staffing sites split job seekers, employers, jobs, and contact paths.'
  },
  {
    title: 'Design-system base',
    body: 'Accessibility, hierarchy, and continuity come first.'
  },
  {
    title: 'Abundance differentiator',
    body: 'Agents are proof support, not autonomous staffing claims.'
  }
];
