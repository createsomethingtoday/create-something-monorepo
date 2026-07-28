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
  src: '/abundance/hero-home-2026.webp',
  alt: 'Nurse and staffing recruiter reviewing a tablet together in a bright clinical office',
  caption: 'Guided intake. Recruiter review. Clear handoff.',
  note: 'Designed for nurses, recruiters, and coordinators.'
};

export const publicHeroVisuals = {
  nurses: {
    src: '/abundance/hero-nurses-2026.webp',
    alt: 'Travel nurse reviewing role preferences on her phone with a notebook nearby'
  },
  jobs: {
    src: '/abundance/hero-jobs-2026.webp',
    alt: 'Registered nurse comparing nursing opportunities on a tablet at a hospital desk'
  },
  facilities: {
    src: '/abundance/hero-facilities-2026.webp',
    alt: 'Nurse and staffing coordinator reviewing a facility coverage request together'
  },
  agents: {
    src: '/abundance/hero-agents-2026.webp',
    alt: 'Staffing recruiter reviewing nurse application context during a video conversation'
  }
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
    label: '1',
    title: 'Role and shift request',
    body:
      'Capture role, specialty, unit, dates, shift, location, urgency, credential requirements, and budget constraints.'
  },
  {
    label: '2',
    title: 'Shortlist with gaps',
    body:
      'Agents draft candidate-fit context and missing-information flags for the recruiter instead of making a final staffing call.'
  },
  {
    label: '3',
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
    lane: 'Application start',
    summary: 'Helps nurses describe the role, shift, location, timing, and fit they actually want.',
    proof: 'Starts simple. Verification appears only for protected steps.'
  },
  {
    name: 'Abundance Jobs',
    lane: 'Role discovery',
    summary: 'Shows a fresh view of available nursing roles so nurses can see the market before applying.',
    proof: 'Public listings stay read-only and recruiter-reviewed.'
  },
  {
    name: 'Abundance Recruiter Desk',
    lane: 'Recruiter support',
    summary: 'Organizes fit notes, gaps, timing, and next-step context before a recruiter reviews.',
    proof: 'People make staffing decisions. Agents prepare the handoff.'
  },
  {
    name: 'Abundance Staffing Desk',
    lane: 'Facility coverage',
    summary: 'Keeps facility needs, unit details, credentials, urgency, and candidate context together.',
    proof: 'Coverage requests stay structured from first note to follow-up.'
  },
  {
    name: 'Abundance Compliance',
    lane: 'Credential readiness',
    summary: 'Supports document, consent, license, and verification readiness when placement requires it.',
    proof: 'Private records stay private behind secure access.'
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

export const staffingCareCards = [
  {
    title: 'Guided nurse intake',
    body: 'Role, shift, license, timing, and preferences captured once.',
    image: '/abundance/nurse-intake.png',
    href: '/nurses'
  },
  {
    title: 'Facility coverage requests',
    body: 'Unit, urgency, credentials, and approval owner kept visible.',
    image: '/abundance/facility-coverage.png',
    href: '/facilities'
  },
  {
    title: 'Recruiter review desk',
    body: 'Fit, gaps, documents, and next action prepared for review.',
    image: '/abundance/recruiter-review.png',
    href: '/agents'
  }
];

export const staffingRoles = [
  {
    name: 'Travel RN',
    lane: 'ICU, ER, Med Surg',
    image: '/abundance/nurse-intake.png'
  },
  {
    name: 'Per diem nurse',
    lane: 'Flexible coverage',
    image: '/abundance/hero-handoff.png'
  },
  {
    name: 'Facility coordinator',
    lane: 'Shift requests',
    image: '/abundance/facility-coverage.png'
  },
  {
    name: 'Recruiter',
    lane: 'Human review',
    image: '/abundance/recruiter-review.png'
  }
];

export const staffingProcess = [
  {
    title: 'Start',
    body: 'Nurse or facility shares the need.'
  },
  {
    title: 'Prepare',
    body: 'Agents organize profile, role, and missing context.'
  },
  {
    title: 'Review',
    body: 'Recruiter confirms fit before staffing moves.'
  }
];

export const staffingJournal = [
  {
    title: 'Public jobs stay read-only',
    body: 'Search runs from Abundance-controlled data, not browser-paid ingest calls.',
    href: '/jobs'
  },
  {
    title: 'Private steps wait for verification',
    body: 'Documents and protected review open only when the workflow needs them.',
    href: '/apply'
  },
  {
    title: 'Agents support, people approve',
    body: 'The public story is clear about the recruiter decision boundary.',
    href: '/agents'
  }
];

export const staffingServiceHighlights = [
  {
    title: 'Travel and per diem placement',
    body: 'Find roles matched to specialty, shift, location, and start window.',
    href: '/jobs'
  },
  {
    title: 'Facility shift coverage',
    body: 'Request urgent needs with unit, credentials, and coverage window clear.',
    href: '/facilities'
  },
  {
    title: 'Recruiter-guided fit review',
    body: 'A staffing recruiter reviews fit before submissions or next steps.',
    href: '/agents'
  },
  {
    title: 'Credential readiness',
    body: 'Keep licenses, documents, and verification status moving when needed.',
    href: '/apply'
  }
];

export const staffingFaqs = [
  {
    question: 'Can a nurse start without an account?',
    answer: 'Yes. Intake starts in plain language. Verification appears only for protected steps.'
  },
  {
    question: 'Can facilities request coverage?',
    answer: 'Yes. The facility path captures role, unit, shift, urgency, and credential needs.'
  },
  {
    question: 'Do agents make staffing decisions?',
    answer: 'No. Agents prepare context. Recruiters approve staffing moves.'
  },
  {
    question: 'Where do job results come from?',
    answer: 'Public discovery reads from Abundance-controlled job data behind the site.'
  }
];
