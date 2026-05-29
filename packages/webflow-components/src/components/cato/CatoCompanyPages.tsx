import React from 'react';

export type CatoCompanyLinkMode = 'webflow' | 'export';

export interface CatoImageValue {
  src: string;
  alt?: string;
}

export interface CatoValueItem {
  title: string;
  description: string;
  iconUrl?: string;
}

export interface CatoImpactMetric {
  value: string;
  label: string;
  note?: string;
}

export interface CatoTeamMember {
  name: string;
  role: string;
  bio?: string;
  imageUrl?: string;
  linkedinUrl?: string;
}

export interface CatoCaseStudyResult {
  text: string;
  iconUrl?: string;
}

export interface CatoCaseStudyItem {
  title: string;
  slug: string;
  clientName: string;
  summary: string;
  customerProfile?: string;
  featured?: boolean;
  challengeHtml?: string;
  solutionHtml?: string;
  challengeImageUrl?: string | CatoImageValue;
  solutionImageUrl?: string | CatoImageValue;
  results?: CatoCaseStudyResult[];
}

export interface CatoAboutPageProps {
  title?: string;
  summary?: string;
  ctaLabel?: string;
  ctaHref?: string;
  goalTitle?: string;
  goalText?: string;
  missionTitle?: string;
  missionText?: string;
  metricsJson?: string;
  valuesJson?: string;
  leadershipJson?: string;
  boardJson?: string;
  assetBasePath?: string;
  showMission?: boolean;
  showTeam?: boolean;
}

export interface CatoCaseStudiesLandingProps {
  title?: string;
  summary?: string;
  panelLabel?: string;
  panelTitle?: string;
  panelSummary?: string;
  caseStudiesJson?: string;
  linkMode?: CatoCompanyLinkMode;
  pathPrefix?: string;
  contactLabel?: string;
  contactHref?: string;
  assetBasePath?: string;
  showFeatured?: boolean;
}

export interface CatoCaseStudyDetailProps {
  slug?: string;
  title?: string;
  clientName?: string;
  summary?: string;
  customerProfile?: string;
  challengeHtml?: string;
  solutionHtml?: string;
  challengeImage?: CatoImageValue;
  solutionImage?: CatoImageValue;
  challengeImageUrl?: string;
  solutionImageUrl?: string;
  resultsJson?: string;
  caseStudiesJson?: string;
  linkMode?: CatoCompanyLinkMode;
  pathPrefix?: string;
  assetBasePath?: string;
  backLabel?: string;
  backHref?: string;
}

const DEFAULT_METRICS: CatoImpactMetric[] = [
  { value: '34', label: 'Health systems served' },
  { value: '40', label: 'States and growing' },
  { value: '650+', label: 'Brands supported' },
  { value: '113,000+', label: 'SKUs available' },
  { value: '110+', label: 'Domestic suppliers' },
];

const DEFAULT_VALUES: CatoValueItem[] = [
  {
    title: 'Resilience Defines Us',
    description: 'We build for the moments when supply disruption threatens care continuity and teams need dependable options fast.',
  },
  {
    title: 'Our Tech Serves People',
    description: 'Cato uses intelligence, automation, and supplier visibility to help operators make better healthcare procurement decisions.',
  },
  {
    title: 'Transparency Drives Us',
    description: 'We keep sourcing paths, constraints, and response options visible so stakeholders can act with confidence.',
  },
  {
    title: 'Reliability Is Our Commitment',
    description: 'Hospitals need trusted execution. Our work centers on consistent follow-through when supply chains are under pressure.',
  },
  {
    title: 'Allies When Needed Most',
    description: 'We operate as a partner for procurement, supply chain, and clinical teams protecting patient care.',
  },
];

const DEFAULT_LEADERSHIP: CatoTeamMember[] = [
  {
    name: 'Lainy Jahnke',
    role: 'COO, Co-Founder & Board Member',
    bio: 'Leads Cato operations and customer delivery across healthcare procurement and supply continuity programs.',
  },
  {
    name: 'Toby Ryan',
    role: 'Chief of Staff, Co-Founder',
    bio: 'Guides company operations, execution rhythm, and cross-functional coordination.',
  },
  {
    name: 'Ethan Weinberg',
    role: 'VP, Supply Chain, Co-Founder',
    bio: 'Leads supply chain strategy, supplier pathways, and procurement response capabilities.',
  },
  {
    name: 'Brian Weichel',
    role: 'VP Engineering',
    bio: 'Leads the technology platform supporting product search, risk visibility, and operational workflows.',
  },
  {
    name: 'Hannah Hall',
    role: 'Account Executive',
    bio: 'Supports health system teams evaluating Cato for resilient sourcing and procurement intelligence.',
  },
  {
    name: 'Nathan Brandon',
    role: 'Strategic Sourcing Manager',
    bio: 'Works with customers and suppliers to evaluate sourcing options during disruption.',
  },
  {
    name: 'Rhonda Podschelne',
    role: 'Sales Administrator',
    bio: 'Supports customer operations, account coordination, and response workflows.',
  },
];

const DEFAULT_BOARD: CatoTeamMember[] = [
  { name: 'Bala Iyer', role: 'Board Member' },
  { name: 'Heather Matzke-Hamlin', role: 'Board Member' },
  { name: 'John Courtney', role: 'Board Member' },
  { name: 'Tiffani Shaw', role: 'Board Member' },
  { name: 'Lainy Jahnke', role: 'Board Member' },
];

const DEFAULT_CASE_STUDIES: CatoCaseStudyItem[] = [
  {
    title: 'From Uncertainty to Continuity',
    slug: 'from-chaos-to-continuity',
    clientName: 'Tennessee Health System',
    summary:
      'Urgently needed supplies including needles, syringes, irrigation supplies, and blood collection media were unavailable through primary vendors due to ongoing disruptions.',
    customerProfile: 'Regional health system coordinating supply continuity across clinical teams and purchasing stakeholders.',
    featured: true,
    challengeHtml:
      '<p>A Tennessee health system needed a fast, reliable path for critical items that could not be sourced through primary channels. The team needed to protect patient care while avoiding a rushed, opaque buying process.</p>',
    solutionHtml:
      '<p>Cato reviewed disrupted SKUs, confirmed viable alternatives, coordinated supplier readiness, and helped the team move from item uncertainty to purchase-ready options.</p>',
    results: [
      { text: 'Patient care was maintained without interruption.' },
      { text: 'Upon PO receipt, shipments were dispatched the same or next day.' },
      { text: '13 critical SKUs were shipped within 5 hours of request.' },
    ],
  },
  {
    title: 'Complexity Solved at Scale',
    slug: 'complexity-solved-at-scale',
    clientName: 'Nationwide Health System',
    summary: 'A large healthcare organization needed a coordinated sourcing workflow for complex supply needs across multiple facilities.',
    customerProfile: 'Nationwide health system managing product complexity, sourcing variance, and urgent operational requirements.',
    challengeHtml:
      '<p>Scale made sourcing decisions harder to coordinate. The customer needed cleaner visibility into available supply paths and practical alternatives.</p>',
    solutionHtml:
      '<p>Cato organized product requirements, evaluated supplier pathways, and helped the team compare options without losing speed.</p>',
    results: [
      { text: 'Reduced coordination friction across sourcing stakeholders.' },
      { text: 'Expanded visibility into practical supply options.' },
      { text: 'Improved response confidence for complex requests.' },
    ],
  },
  {
    title: 'Vendor Vulnerability Neutralized',
    slug: 'vendor-vulnerability-neutralized',
    clientName: 'Missouri Health System',
    summary: 'A health system used Cato to reduce single-vendor vulnerability and evaluate practical alternatives during disruption.',
    customerProfile: 'Health system working to reduce exposure to constrained supplier channels.',
    challengeHtml:
      '<p>Supplier concentration created continuity risk. The team needed alternatives that could satisfy clinical and operational constraints.</p>',
    solutionHtml:
      '<p>Cato helped identify alternate sourcing paths and clarify options before the disruption became an operational blocker.</p>',
    results: [
      { text: 'Reduced dependence on a constrained supply path.' },
      { text: 'Gave procurement leaders clearer alternate options.' },
      { text: 'Supported continuity planning before escalation.' },
    ],
  },
  {
    title: 'Hurricane Hits, Network Responds',
    slug: 'hurricane-hits-network-responds',
    clientName: 'South Carolina Health System',
    summary: 'When nature strikes, supply continuity depends on quick supplier visibility, alternate routing, and response discipline.',
    customerProfile: 'Regional health system responding to storm-related supply and logistics pressure.',
    challengeHtml:
      '<p>Storm disruption put pressure on standard channels and required fast review of available sourcing paths.</p>',
    solutionHtml:
      '<p>Cato helped the team evaluate options, coordinate supplier response, and prioritize items tied to care continuity.</p>',
    results: [
      { text: 'Improved visibility during a regional disruption.' },
      { text: 'Supported faster review of alternative sourcing paths.' },
      { text: 'Helped preserve focus on care continuity.' },
    ],
  },
];

const CATO_COMPANY_CSS = `
  @keyframes catoFadeUp {
    from { opacity: 0; transform: translate3d(0, 1.15rem, 0); }
    to { opacity: 1; transform: translate3d(0, 0, 0); }
  }
  @keyframes catoPanelIn {
    from { opacity: 0; transform: translate3d(0, 1.4rem, 0) scale(.985); }
    to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
  }
  @keyframes catoLineSweep {
    from { transform: scaleX(0); opacity: .4; }
    to { transform: scaleX(1); opacity: 1; }
  }
  .cato-company {
    --cato-bg: var(--background-color--background-primary, #ffffff);
    --cato-bg-soft: var(--base-color-cream--cream-200, #fbf9f4);
    --cato-border: var(--base-color-cream--cream-600, #e8e4d9);
    --cato-text: var(--text-color--text-primary, #282723);
    --cato-muted: var(--text-color--text-secondary, rgba(40, 39, 35, .7));
    --cato-green: var(--base-color-green--green-900, #0a452e);
    --cato-green-mid: var(--base-color-green--green-800, #125a3b);
    --cato-green-bright: var(--base-color-green--green-400, #42c58f);
    --cato-sky: var(--base-color-sky-blue--sky-blue-900, #235f6b);
    --cato-blue: var(--base-color-blue--blue-500, #0a3e71);
    --cato-blue-dark: var(--base-color-blue--blue-900, #041a2f);
    color: var(--cato-text);
    background: var(--cato-bg);
    font-family: "Inter Variable", Inter, Arial, sans-serif;
    font-size: 1rem;
    line-height: 1.5;
  }
  .cato-company *, .cato-company *::before, .cato-company *::after { box-sizing: border-box; }
  .cato-company a { color: inherit; }
  .cato-company h1, .cato-company h2, .cato-company h3, .cato-company h4, .cato-company p { margin: 0; }
  .cato-company h1, .cato-company h2, .cato-company h3, .cato-company h4 {
    font-family: Switzer, "Inter Variable", Arial, sans-serif;
    font-weight: 400;
    color: var(--cato-text);
  }
  .cato-company h1 { font-size: 4.15rem; line-height: 1.08; }
  .cato-company h2 { font-size: 3rem; line-height: 1.12; }
  .cato-company h3 { font-size: 1.55rem; line-height: 1.2; }
  .cato-company h4 { font-size: 1.15rem; line-height: 1.25; }
  .cato-company p { color: var(--cato-muted); }
  .cato-company-shell { overflow: hidden; background: var(--cato-bg); }
  .cato-company-band { position: relative; padding: 6rem 2.5rem; }
  .cato-company-band::before {
    content: "";
    position: absolute;
    left: max(2rem, calc((100vw - 80rem) / 2));
    right: max(2rem, calc((100vw - 80rem) / 2));
    top: 0;
    height: 1px;
    background: var(--cato-border);
    transform-origin: left center;
    animation: catoLineSweep .7s cubic-bezier(.22, 1, .36, 1) both;
  }
  .cato-company-band:first-of-type::before { display: none; }
  .cato-company-band[data-tone="soft"] { background: var(--cato-bg-soft); }
  .cato-company-container { width: min(100%, 80rem); margin: 0 auto; }
  .cato-company-container[data-width="medium"] { width: min(100%, 64rem); }
  .cato-company-eyebrow { color: var(--cato-green); font-weight: 800; margin-bottom: 1.5rem; }
  .cato-company-lede { max-width: 58rem; font-size: 1.2rem; line-height: 1.55; }
  .cato-company-hero-grid {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(20rem, .65fr);
    align-items: center;
    gap: 4.5rem;
  }
  .cato-company-hero-grid::before {
    content: "c";
    position: absolute;
    z-index: 0;
    left: -9rem;
    top: -5rem;
    color: rgba(66,197,143,.08);
    font-family: Georgia, serif;
    font-size: 22rem;
    line-height: .7;
    font-weight: 800;
    pointer-events: none;
  }
  .cato-company-hero-copy { display: flex; flex-direction: column; align-items: flex-start; gap: 1.5rem; }
  .cato-company-hero-copy,
  .cato-company-panel,
  .cato-company-card,
  .cato-company-mission-visual {
    animation: catoFadeUp .72s cubic-bezier(.22, 1, .36, 1) both;
  }
  .cato-company-panel { animation-name: catoPanelIn; animation-delay: .08s; }
  .cato-company-card:nth-child(2) { animation-delay: .05s; }
  .cato-company-card:nth-child(3) { animation-delay: .1s; }
  .cato-company-card:nth-child(4) { animation-delay: .15s; }
  .cato-company-card:nth-child(5) { animation-delay: .2s; }
  .cato-company-panel {
    position: relative;
    overflow: hidden;
    min-height: 21rem;
    border-radius: 1rem;
    background: var(--cato-sky);
    color: #fff;
    padding: 2.5rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 2rem;
    box-shadow: 0 1.25rem 3.5rem rgba(35, 95, 107, .16);
  }
  .cato-company-panel::after {
    content: "";
    position: absolute;
    inset: auto -18% -34% auto;
    width: 18rem;
    height: 18rem;
    border: 2.5rem solid rgba(255,255,255,.08);
    border-radius: 50%;
    pointer-events: none;
  }
  .cato-company-panel h2, .cato-company-panel h3, .cato-company-panel p { color: #fff; }
  .cato-company-panel p { opacity: .82; font-size: 1.05rem; }
  .cato-company-pill {
    width: fit-content;
    border: 1px solid rgba(255,255,255,.22);
    border-radius: 999px;
    background: rgba(255,255,255,.12);
    color: #fff;
    padding: .35rem .85rem;
    font-size: .78rem;
    line-height: 1;
    text-transform: uppercase;
    font-weight: 800;
  }
  .cato-company-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: .75rem;
    min-height: 3.5rem;
    border: 0;
    border-radius: .5rem;
    background: linear-gradient(105deg, #004080, #8baed0 49%, #3b83cc);
    color: #fff;
    padding: .9rem 1.25rem;
    text-decoration: none;
    font-weight: 700;
    transition: transform .5s cubic-bezier(.19, 1, .22, 1), box-shadow .5s cubic-bezier(.19, 1, .22, 1), background .18s;
  }
  .cato-company-button:hover { transform: translate3d(0, -.1rem, 0); box-shadow: 0 8px 12px rgba(23,132,240,.25), 0 4px 8px rgba(23,132,240,.25); }
  .cato-company-button[data-variant="text"] {
    min-height: auto;
    background: transparent;
    padding: 0;
    color: var(--cato-green);
    box-shadow: none;
  }
  .cato-company-button[data-variant="text"]:hover { transform: none; text-decoration: underline; }
  .cato-company-card {
    border: 1px solid var(--cato-border);
    border-radius: 1rem;
    background: var(--cato-bg);
    box-shadow: 0 .2rem .65rem rgba(40, 39, 35, .05);
    transition: transform .22s cubic-bezier(.22, 1, .36, 1), box-shadow .22s cubic-bezier(.22, 1, .36, 1), border-color .22s;
  }
  .cato-company-card:hover {
    transform: translate3d(0, -.18rem, 0);
    border-color: rgba(10,69,46,.22);
    box-shadow: 0 1rem 2rem rgba(40, 39, 35, .08);
  }
  .cato-company-goal {
    position: relative;
    overflow: hidden;
    border: 1px solid var(--cato-border);
    border-radius: 1.5rem;
    background: var(--cato-sky);
    padding: 4rem;
    color: #eefcff;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.18);
  }
  .cato-company-goal::after {
    content: "c";
    position: absolute;
    right: -6rem;
    bottom: -10rem;
    color: rgba(66,197,143,.12);
    font-family: Georgia, serif;
    font-size: 30rem;
    line-height: .7;
    font-weight: 800;
    pointer-events: none;
  }
  .cato-company-goal-inner { position: relative; z-index: 1; display: grid; grid-template-columns: .75fr 1fr; gap: 4rem; align-items: start; }
  .cato-company-goal h2,
  .cato-company-goal p { color: #eefcff; }
  .cato-company-goal p, .cato-company-mission p { font-size: 1.08rem; line-height: 1.65; white-space: pre-line; }
  .cato-company-metrics-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 1rem;
  }
  .cato-company-metric { min-height: 10rem; padding: 1.5rem; display: flex; flex-direction: column; justify-content: flex-end; gap: .75rem; }
  .cato-company-metric::before {
    content: "";
    display: block;
    width: 2.5rem;
    height: .25rem;
    margin-bottom: auto;
    border-radius: 999px;
    background: var(--cato-green-bright);
  }
  .cato-company-metric strong {
    display: block;
    color: var(--cato-text);
    font-family: Switzer, "Inter Variable", Arial, sans-serif;
    font-size: 2.8rem;
    line-height: 1;
    font-weight: 400;
  }
  .cato-company-section-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 2rem; margin-bottom: 2rem; }
  .cato-company-section-head p { max-width: 34rem; }
  .cato-company-values-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 1rem;
  }
  .cato-company-value {
    min-height: 18rem;
    background: linear-gradient(#e9f6f1, #fff);
    padding: 1.6rem;
    color: var(--cato-text);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 2rem;
    box-shadow: 0 .25rem .9rem rgba(40,39,35,.05);
  }
  .cato-company-value h3 { color: var(--cato-text); }
  .cato-company-value p { color: var(--cato-muted); }
  .cato-company-mission-grid { display: grid; grid-template-columns: .8fr 1.2fr; gap: 3rem; align-items: stretch; }
  .cato-company-mission-visual {
    min-height: 32rem;
    border-radius: 8px;
    overflow: hidden;
    background: linear-gradient(135deg, rgba(66,197,143,.18), rgba(10,69,46,.08));
    box-shadow: 0 1.25rem 3.5rem rgba(40,39,35,.1);
  }
  .cato-company-mission-visual img { display: block; width: 100%; height: 100%; object-fit: cover; }
  .cato-company-team-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1rem;
  }
  .cato-company-person { overflow: hidden; }
  .cato-company-person-image {
    aspect-ratio: 1 / 1;
    background: linear-gradient(135deg, rgba(66,197,143,.18), rgba(10,69,46,.08));
    display: grid;
    place-items: center;
    color: var(--cato-green);
    font-family: Switzer, "Inter Variable", Arial, sans-serif;
    font-size: 2.25rem;
  }
  .cato-company-person-image img { display: block; width: 100%; height: 100%; object-fit: cover; }
  .cato-company-person-body { padding: 1.25rem; display: flex; flex-direction: column; gap: .55rem; }
  .cato-company-person-body p { font-size: .95rem; }
  .cato-company-board-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 1rem;
  }
  .cato-company-board-card { padding: 1.25rem; min-height: 8rem; display: flex; flex-direction: column; justify-content: flex-end; gap: .4rem; }
  .cato-company-case-list {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
  }
  .cato-company-featured-case {
    display: grid;
    grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr);
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .cato-company-case-card {
    min-height: 20rem;
    padding: 1.6rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 2rem;
  }
  .cato-company-case-card h3 { margin-top: .85rem; }
  .cato-company-case-meta { color: var(--cato-green); font-size: .8rem; font-weight: 800; text-transform: uppercase; }
  .cato-company-case-card p { margin-top: .75rem; }
  .cato-company-feature-panel { background: var(--cato-green); color: #fff; padding: 2rem; min-height: 20rem; display: flex; flex-direction: column; justify-content: space-between; }
  .cato-company-feature-panel { box-shadow: 0 1.25rem 3.5rem rgba(10, 69, 46, .18); }
  .cato-company-feature-panel h3, .cato-company-feature-panel p { color: #fff; }
  .cato-company-feature-panel p { opacity: .78; }
  .cato-company-result-list { display: grid; gap: .7rem; margin-top: 1rem; }
  .cato-company-result-item {
    border: 1px solid rgba(255,255,255,.18);
    border-radius: .75rem;
    padding: .85rem;
    color: #fff;
    background: rgba(255,255,255,.08);
  }
  .cato-company-detail-header { background: var(--cato-bg-soft); color: var(--cato-text); padding: 7rem 2.5rem 5rem; }
  .cato-company-detail-header { position: relative; overflow: hidden; }
  .cato-company-detail-header::after {
    content: "c";
    position: absolute;
    right: -8rem;
    top: -5rem;
    color: rgba(66,197,143,.08);
    font-family: Georgia, serif;
    font-size: 28rem;
    line-height: .7;
    font-weight: 800;
    pointer-events: none;
  }
  .cato-company-detail-header h1, .cato-company-detail-header h2, .cato-company-detail-header h3 { color: var(--cato-text); }
  .cato-company-detail-header p { color: var(--cato-muted); }
  .cato-company-detail-grid { display: grid; grid-template-columns: minmax(0, 1fr) 22rem; gap: 4rem; align-items: start; }
  .cato-company-profile { background: linear-gradient(#e9f6f1, #fff); border: 1px solid var(--base-color-green--green-100, #b7e3d2); border-radius: 1rem; padding: 1.5rem; box-shadow: 0 .5rem 1.2rem rgba(40,39,35,.06); }
  .cato-company-detail-content { display: grid; gap: 1.5rem; }
  .cato-company-story-section {
    display: grid;
    grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr);
    gap: 2rem;
    align-items: stretch;
    padding: 2.5rem;
    background: var(--cato-bg-soft);
  }
  .cato-company-story-section[data-flip="true"] { grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr); }
  .cato-company-richtext { color: var(--cato-muted); display: grid; gap: 1rem; font-size: 1.05rem; line-height: 1.65; }
  .cato-company-richtext p { font-size: inherit; line-height: inherit; }
  .cato-company-image-panel { min-height: 24rem; border-radius: 1rem; overflow: hidden; background: linear-gradient(135deg, rgba(66,197,143,.16), rgba(10,69,46,.08)); }
  .cato-company-image-panel { position: relative; }
  .cato-company-image-panel::after {
    content: "";
    position: absolute;
    inset: 1rem;
    border: 1px solid rgba(10,69,46,.14);
    border-radius: .75rem;
    pointer-events: none;
  }
  .cato-company-image-panel img { display: block; width: 100%; height: 100%; object-fit: cover; }
  .cato-company-results-section {
    color: var(--cato-sky);
    background-image: linear-gradient(rgba(84,226,254,.2), rgba(180,243,255,0));
    border-radius: 1.5rem;
    padding: 3.5rem;
  }
  .cato-company-results-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
  }
  .cato-company-result-card {
    min-height: 12rem;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 1rem;
  }
  .cato-company-result-icon {
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 999px;
    background: rgba(66,197,143,.18);
    color: var(--cato-green);
    display: grid;
    place-items: center;
    font-weight: 800;
  }
  .cato-company-more-section {
    position: relative;
    overflow: hidden;
    border: 1px solid var(--cato-border);
    border-radius: 1rem;
    background: var(--cato-bg-soft);
    padding: 2.5rem;
  }
  .cato-company-cta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
    padding: 2rem;
  }
  @media (max-width: 1100px) {
    .cato-company h1 { font-size: 3.5rem; }
    .cato-company h2 { font-size: 2.5rem; }
    .cato-company-hero-grid,
    .cato-company-goal-inner,
    .cato-company-mission-grid,
    .cato-company-detail-grid,
    .cato-company-story-section,
    .cato-company-story-section[data-flip="true"],
    .cato-company-featured-case { grid-template-columns: 1fr; }
    .cato-company-metrics-grid,
    .cato-company-values-grid,
    .cato-company-team-grid,
    .cato-company-board-grid,
    .cato-company-case-list,
    .cato-company-results-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 767px) {
    .cato-company-band { padding: 4rem 1rem; }
    .cato-company h1 { font-size: 2.8rem; }
    .cato-company h2 { font-size: 2.1rem; }
    .cato-company-panel,
    .cato-company-goal,
    .cato-company-story-section { padding: 1.5rem; }
    .cato-company-metrics-grid,
    .cato-company-values-grid,
    .cato-company-team-grid,
    .cato-company-board-grid,
    .cato-company-case-list,
    .cato-company-results-grid { grid-template-columns: 1fr; }
    .cato-company-section-head,
    .cato-company-cta { align-items: flex-start; flex-direction: column; }
    .cato-company-detail-header { padding: 4rem 1rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .cato-company *,
    .cato-company *::before,
    .cato-company *::after {
      animation-duration: .01ms !important;
      animation-iteration-count: 1 !important;
      scroll-behavior: auto !important;
      transition-duration: .01ms !important;
    }
    .cato-company-card:hover,
    .cato-company-button:hover {
      transform: none;
    }
  }
`;

function parseJsonArray<T>(json: string | undefined, fallback: T[]): T[] {
  if (!json?.trim()) return fallback;
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function cleanHtml(html: string | undefined): string {
  if (!html?.trim()) return '<p>No content has been added yet.</p>';
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/\sjavascript:/gi, '');
}

function assetUrl(path: string | CatoImageValue | undefined, assetBasePath?: string): string {
  const source = typeof path === 'string' ? path : path?.src;
  if (!source) return '';
  if (/^(https?:)?\/\//.test(source) || source.startsWith('data:')) return source;
  const cleanPath = source.replace(/^\/+/, '');
  const cleanBase = (assetBasePath || '').replace(/\/+$/, '');
  return cleanBase ? `${cleanBase}/${cleanPath}` : source;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

function caseHref(slug: string, linkMode: CatoCompanyLinkMode = 'webflow', pathPrefix = ''): string {
  const cleanSlug = slug.replace(/^\/+/, '');
  const cleanPrefix = pathPrefix.replace(/\/+$/, '');
  const suffix = linkMode === 'export' ? '.html' : '';
  if (!cleanPrefix) return `/${cleanSlug}${suffix}`;
  return `${cleanPrefix}/${cleanSlug}${suffix}`;
}

function inferCaseSlugFromLocation(): string {
  if (typeof window === 'undefined') return '';
  const parts = window.location.pathname.split('/').filter(Boolean);
  return parts[parts.length - 1]?.replace(/\.html$/, '') || '';
}

function selectCaseStudy(props: CatoCaseStudyDetailProps, cases: CatoCaseStudyItem[]): CatoCaseStudyItem {
  const inferredSlug = inferCaseSlugFromLocation();
  const selectedSlug = inferredSlug || props.slug;
  const selected =
    (selectedSlug && cases.find((item) => item.slug === selectedSlug)) ||
    (props.slug && cases.find((item) => item.slug === props.slug)) ||
    cases.find((item) => item.featured) ||
    cases[0] ||
    DEFAULT_CASE_STUDIES[0];

  return {
    ...selected,
    title: props.title || selected.title,
    clientName: props.clientName || selected.clientName,
    summary: props.summary || selected.summary,
    customerProfile: props.customerProfile || selected.customerProfile,
    challengeHtml: props.challengeHtml || selected.challengeHtml,
    solutionHtml: props.solutionHtml || selected.solutionHtml,
    challengeImageUrl: props.challengeImageUrl || selected.challengeImageUrl,
    solutionImageUrl: props.solutionImageUrl || selected.solutionImageUrl,
    results: parseJsonArray<CatoCaseStudyResult>(props.resultsJson, selected.results || []),
  };
}

function RichText({ html }: { html?: string }) {
  return <div className="cato-company-richtext" dangerouslySetInnerHTML={{ __html: cleanHtml(html) }} />;
}

function PersonCard({ person, assetBasePath }: { person: CatoTeamMember; assetBasePath?: string }) {
  const image = assetUrl(person.imageUrl, assetBasePath);

  return (
    <article className="cato-company-card cato-company-person">
      <div className="cato-company-person-image" aria-hidden={!image}>
        {image ? <img src={image} alt={person.name} loading="lazy" /> : <span>{initials(person.name)}</span>}
      </div>
      <div className="cato-company-person-body">
        <h3>{person.name}</h3>
        <p>{person.role}</p>
        {person.bio ? <p>{person.bio}</p> : null}
        {person.linkedinUrl ? (
          <a className="cato-company-button" data-variant="text" href={person.linkedinUrl} target="_blank" rel="noreferrer">
            LinkedIn
          </a>
        ) : null}
      </div>
    </article>
  );
}

function CaseCard({
  item,
  linkMode,
  pathPrefix,
}: {
  item: CatoCaseStudyItem;
  linkMode?: CatoCompanyLinkMode;
  pathPrefix?: string;
}) {
  return (
    <article className="cato-company-card cato-company-case-card">
      <div>
        <div className="cato-company-case-meta">{item.clientName}</div>
        <h3>{item.title}</h3>
        <p>{item.summary}</p>
      </div>
      <a className="cato-company-button" data-variant="text" href={caseHref(item.slug, linkMode, pathPrefix)}>
        Read case study
        <span aria-hidden="true">-&gt;</span>
      </a>
    </article>
  );
}

export function CatoAboutPage({
  title = 'The Healthcare Procurement Platform Purpose Built for Off-Contract Spend',
  summary = 'Hospital systems depend on nimble supply chains to guarantee care continuity. Traditional contract-driven models for medical supplies expose hospitals to market volatility while holding them accountable for patient care.',
  ctaLabel = 'Contact Us',
  ctaHref = '/contact-us',
  goalTitle = 'We Protect Patient Care When Supply Chain Disruptions Occur',
  goalText = 'Health systems face chronic supply disruptions, including shortages, tariff fluctuations, and product recalls that force them to step outside established channels in 1 out of 5 procurement situations.\n\nOur technology, supported by a team of experts, manages disruptions, optimizes spending, and delivers the products clinicians need to improve patient outcomes without interfering with existing GPO relationships.',
  missionTitle = 'We Are Mission Driven',
  missionText = 'We believe a resilient supply chain contributes to a healthier world. Cato exists to help ensure access to safe, reliable, and cost-effective medical supplies.\n\nAt its core, Cato has a practical mission: ensure dependable access to the supplies required for continuous care delivery. We broaden sourcing options so providers can maintain continuity in volatile markets and focus resources where they matter most: the patient.',
  metricsJson,
  valuesJson,
  leadershipJson,
  boardJson,
  assetBasePath,
  showMission = true,
  showTeam = true,
}: CatoAboutPageProps) {
  const metrics = parseJsonArray<CatoImpactMetric>(metricsJson, DEFAULT_METRICS);
  const values = parseJsonArray<CatoValueItem>(valuesJson, DEFAULT_VALUES);
  const leadership = parseJsonArray<CatoTeamMember>(leadershipJson, DEFAULT_LEADERSHIP);
  const board = parseJsonArray<CatoTeamMember>(boardJson, DEFAULT_BOARD);
  const missionImage = assetUrl('images/mission-bg-img.webp', assetBasePath);

  return (
    <div className="cato-company cato-company-shell">
      <style>{CATO_COMPANY_CSS}</style>
      <section className="cato-company-band" aria-labelledby="cato-about-title">
        <div className="cato-company-container cato-company-hero-grid">
          <div className="cato-company-hero-copy">
            <p className="cato-company-eyebrow">About Cato</p>
            <h1 id="cato-about-title">{title}</h1>
            <p className="cato-company-lede">{summary}</p>
            <a className="cato-company-button" href={ctaHref}>
              {ctaLabel}
              <span aria-hidden="true">-&gt;</span>
            </a>
          </div>
          <aside className="cato-company-panel" aria-label="Cato platform focus">
            <div>
              <div className="cato-company-pill">Purpose built</div>
              <h2>Off-contract supply intelligence for care continuity.</h2>
            </div>
            <p>Search, risk visibility, and sourcing support in one operating layer for healthcare procurement teams.</p>
          </aside>
        </div>
      </section>

      <section className="cato-company-band" data-tone="soft" aria-labelledby="cato-goal-title">
        <div className="cato-company-container">
          <div className="cato-company-goal">
            <div className="cato-company-goal-inner">
              <h2 id="cato-goal-title">{goalTitle}</h2>
              <p>{goalText}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cato-company-band" aria-labelledby="cato-impact-title">
        <div className="cato-company-container">
          <div className="cato-company-section-head">
            <h2 id="cato-impact-title">Our Impact</h2>
            <p>Operational reach designed for health systems that need resilient sourcing options before disruption affects patient care.</p>
          </div>
          <div className="cato-company-metrics-grid">
            {metrics.map((metric) => (
              <article className="cato-company-card cato-company-metric" key={`${metric.value}-${metric.label}`}>
                <strong>{metric.value}</strong>
                <p>{metric.label}</p>
                {metric.note ? <p>{metric.note}</p> : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cato-company-band" data-tone="soft" aria-labelledby="cato-values-title">
        <div className="cato-company-container">
          <div className="cato-company-section-head">
            <h2 id="cato-values-title">Our Values</h2>
          </div>
          <div className="cato-company-values-grid">
            {values.map((value) => (
              <article className="cato-company-card cato-company-value" key={value.title}>
                <div className="cato-company-pill">{value.iconUrl ? 'Value' : 'Cato'}</div>
                <div>
                  <h3>{value.title}</h3>
                  <p>{value.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {showMission ? (
        <section className="cato-company-band" aria-labelledby="cato-mission-title">
          <div className="cato-company-container cato-company-mission-grid">
            <div className="cato-company-mission-visual">{missionImage ? <img src={missionImage} alt="" loading="lazy" /> : null}</div>
            <div className="cato-company-hero-copy cato-company-mission">
              <p className="cato-company-eyebrow">Mission</p>
              <h2 id="cato-mission-title">{missionTitle}</h2>
              <p>{missionText}</p>
            </div>
          </div>
        </section>
      ) : null}

      {showTeam ? (
        <section className="cato-company-band" data-tone="soft" aria-labelledby="cato-team-title">
          <div className="cato-company-container">
            <div className="cato-company-section-head">
              <h2 id="cato-team-title">Leadership Team</h2>
            </div>
            <div className="cato-company-team-grid">
              {leadership.map((person) => (
                <PersonCard key={`${person.name}-${person.role}`} person={person} assetBasePath={assetBasePath} />
              ))}
            </div>
            <div className="cato-company-section-head" style={{ marginTop: '4rem' }}>
              <h2>Board Members</h2>
            </div>
            <div className="cato-company-board-grid">
              {board.map((person) => (
                <article className="cato-company-card cato-company-board-card" key={`${person.name}-${person.role}`}>
                  <h3>{person.name}</h3>
                  <p>{person.role}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function CatoCaseStudiesLanding({
  title = 'Customer Success Stories',
  summary = 'Healthcare teams use Cato to navigate disruption, broaden sourcing options, and protect care continuity when standard channels cannot keep pace.',
  panelLabel = 'Featured now',
  panelTitle = 'Operational resilience in real sourcing moments.',
  panelSummary = 'Use this page to collect approved customer stories and show how Cato helps healthcare teams respond to supply disruption.',
  caseStudiesJson,
  linkMode = 'webflow',
  pathPrefix = '',
  contactLabel = 'Get in Touch',
  contactHref = '/contact-us',
  showFeatured = true,
}: CatoCaseStudiesLandingProps) {
  const cases = parseJsonArray<CatoCaseStudyItem>(caseStudiesJson, DEFAULT_CASE_STUDIES);
  const featured = cases.find((item) => item.featured) || cases[0];
  const remaining = showFeatured ? cases.filter((item) => item.slug !== featured?.slug) : cases;

  return (
    <div className="cato-company cato-company-shell">
      <style>{CATO_COMPANY_CSS}</style>
      <section className="cato-company-band" data-tone="soft" aria-labelledby="cato-case-studies-title">
        <div className="cato-company-container cato-company-hero-grid">
          <div className="cato-company-hero-copy">
            <p className="cato-company-eyebrow">Case Studies</p>
            <h1 id="cato-case-studies-title">{title}</h1>
            <p className="cato-company-lede">{summary}</p>
          </div>
          <aside className="cato-company-panel">
            <div>
              <div className="cato-company-pill">{panelLabel}</div>
              <h2>{panelTitle}</h2>
            </div>
            <p>{panelSummary}</p>
          </aside>
        </div>
      </section>

      <section className="cato-company-band" aria-labelledby="cato-case-study-list-title">
        <div className="cato-company-container">
          <div className="cato-company-section-head">
            <div>
              <p className="cato-company-eyebrow">Customer outcomes</p>
              <h2 id="cato-case-study-list-title">Stories from disrupted supply moments</h2>
            </div>
            <a className="cato-company-button" href={contactHref}>
              {contactLabel}
              <span aria-hidden="true">-&gt;</span>
            </a>
          </div>

          {showFeatured && featured ? (
            <div className="cato-company-featured-case">
              <article className="cato-company-card cato-company-case-card">
                <div>
                  <div className="cato-company-case-meta">{featured.clientName}</div>
                  <h3>{featured.title}</h3>
                  <p>{featured.summary}</p>
                </div>
                <a className="cato-company-button" href={caseHref(featured.slug, linkMode, pathPrefix)}>
                  Read featured case
                  <span aria-hidden="true">-&gt;</span>
                </a>
              </article>
              <aside className="cato-company-card cato-company-feature-panel">
                <div>
                  <div className="cato-company-pill">Results</div>
                  <h3>What changed</h3>
                </div>
                <div className="cato-company-result-list">
                  {(featured.results || []).slice(0, 3).map((result) => (
                    <div className="cato-company-result-item" key={result.text}>
                      {result.text}
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          ) : null}

          <div className="cato-company-case-list">
            {remaining.map((item) => (
              <CaseCard key={item.slug} item={item} linkMode={linkMode} pathPrefix={pathPrefix} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export function CatoCaseStudyDetail(props: CatoCaseStudyDetailProps) {
  const cases = parseJsonArray<CatoCaseStudyItem>(props.caseStudiesJson, DEFAULT_CASE_STUDIES);
  const selected = selectCaseStudy(props, cases);
  const related = cases.filter((item) => item.slug !== selected.slug).slice(0, 3);
  const backLabel = props.backLabel || 'See all case studies';
  const backHref = props.backHref || (props.linkMode === 'export' ? 'case-studies.html' : '/case-studies');
  const challengeImage = assetUrl(props.challengeImage || selected.challengeImageUrl, props.assetBasePath);
  const solutionImage = assetUrl(props.solutionImage || selected.solutionImageUrl, props.assetBasePath);

  return (
    <div className="cato-company cato-company-shell">
      <style>{CATO_COMPANY_CSS}</style>
      <header className="cato-company-detail-header">
        <div className="cato-company-container cato-company-detail-grid">
          <div className="cato-company-hero-copy">
            <a className="cato-company-button" data-variant="text" href={backHref}>
              {backLabel}
              <span aria-hidden="true">-&gt;</span>
            </a>
            <div className="cato-company-pill">{selected.clientName}</div>
            <h1>{selected.title}</h1>
            <p className="cato-company-lede">{selected.summary}</p>
          </div>
          <aside className="cato-company-profile">
            <h3>Customer Profile</h3>
            <p>{selected.customerProfile || selected.clientName}</p>
          </aside>
        </div>
      </header>

      <main className="cato-company-band" aria-label="Case study content">
        <div className="cato-company-container cato-company-detail-content">
          <section className="cato-company-card cato-company-story-section" aria-labelledby="cato-challenge-title">
            <div>
              <p className="cato-company-eyebrow">The Challenge</p>
              <h2 id="cato-challenge-title">The Challenge</h2>
              <RichText html={selected.challengeHtml} />
            </div>
            <div className="cato-company-image-panel">{challengeImage ? <img src={challengeImage} alt="" loading="lazy" /> : null}</div>
          </section>

          <section className="cato-company-card cato-company-story-section" data-flip="true" aria-labelledby="cato-solution-title">
            <div className="cato-company-image-panel">{solutionImage ? <img src={solutionImage} alt="" loading="lazy" /> : null}</div>
            <div>
              <p className="cato-company-eyebrow">Solution</p>
              <h2 id="cato-solution-title">Solutions</h2>
              <RichText html={selected.solutionHtml} />
            </div>
          </section>

          <section className="cato-company-results-section" aria-labelledby="cato-results-title">
            <div className="cato-company-section-head">
              <h2 id="cato-results-title">Results</h2>
            </div>
            <div className="cato-company-results-grid">
              {(selected.results || []).map((result, index) => (
                <article className="cato-company-card cato-company-result-card" key={result.text}>
                  <div className="cato-company-result-icon">{index + 1}</div>
                  <p>{result.text}</p>
                </article>
              ))}
            </div>
          </section>

          {related.length ? (
            <section className="cato-company-more-section" aria-labelledby="cato-more-cases-title">
              <div className="cato-company-section-head">
                <h2 id="cato-more-cases-title">Read More Case Studies</h2>
              </div>
              <div className="cato-company-case-list">
                {related.map((item) => (
                  <CaseCard key={item.slug} item={item} linkMode={props.linkMode} pathPrefix={props.pathPrefix} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
