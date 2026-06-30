import React, { FormEvent, useEffect, useId, useState } from 'react';

export interface CatoInsightCategory {
  id: string;
  page: string;
  title: string;
  filterLabel: string;
  cardLabel: string;
  cardTitle: string;
  cardSummary: string;
  cardCta: string;
  heroSummary: string;
  panelLabel: string;
  panelTitle: string;
  panelSummary: string;
  archiveEyebrow: string;
  archiveTitle: string;
  archiveSummary: string;
  hasSubscribe?: boolean;
}

export interface CatoInsightBodySection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface CatoInsightImageValue {
  src: string;
  alt?: string;
}

export interface CatoInsightItem {
  id: string;
  slug: string;
  category: string;
  resourceType: string;
  pill: string;
  title: string;
  summary: string;
  date: string;
  ctaLabel: string;
  featured?: boolean;
  menuFeature?: boolean;
  audience: string;
  body: CatoInsightBodySection[];
  takeaways: string[];
  featuredImage?: CatoInsightImageValue | string;
  featuredImageUrl?: CatoInsightImageValue | string;
  featuredImageAlt?: string;
  featuredImageCaption?: string;
  href?: string;
  externalUrl?: string;
}

export interface CatoInsightsDataProps {
  categoriesJson?: string;
  itemsJson?: string;
  itemsEndpointUrl?: string;
  fetchItems?: boolean;
  linkMode?: 'webflow' | 'export';
  pathPrefix?: string;
}

export interface CatoInsightsHubProps extends CatoInsightsDataProps {
  title?: string;
  summary?: string;
  featuredPanelLabel?: string;
  featuredPanelTitle?: string;
  featuredPanelSummary?: string;
  featuredPanelCta?: string;
  filterRailNote?: string;
  insightsHomeLink?: CatoInsightLinkProp;
  featuredPanelLink?: CatoInsightLinkProp;
  resiliencyLink?: CatoInsightLinkProp;
  researchLink?: CatoInsightLinkProp;
  whitepapersLink?: CatoInsightLinkProp;
  newsroomLink?: CatoInsightLinkProp;
  previewEyebrow?: string;
  previewTitle?: string;
  previewSummary?: string;
  itemLimit?: number;
  showFilterRail?: boolean;
  showCmsModel?: boolean;
}

export interface CatoInsightsArchiveProps extends CatoInsightsDataProps {
  categoryId?: string;
  categorySlug?: string;
  showSubscribe?: boolean;
}

export interface CatoInsightsArchiveShellProps extends CatoInsightsDataProps {
  categoryId?: string;
  categorySlug?: string;
  showHero?: boolean;
  showArchiveIntro?: boolean;
  showSubscribe?: boolean;
  showItems?: boolean;
}

export interface CatoInsightLinkProp {
  href: string;
  target?: string;
  preload?: string;
}

export interface CatoInsightRelatedItem {
  title: string;
  href?: string;
  resourceType?: string;
  date?: string;
}

export interface CatoInsightCmsCardProps extends Pick<
  CatoInsightsDataProps,
  'linkMode' | 'pathPrefix'
> {
  title?: string;
  summary?: string;
  resourceType?: string;
  contentLabel?: string;
  date?: string;
  ctaLabel?: string;
  slug?: string;
  itemLink?: CatoInsightLinkProp;
  featured?: boolean;
}

export interface CatoInsightDetailProps extends CatoInsightsDataProps {
  slug?: string;
  title?: string;
  summary?: string;
  resourceType?: string;
  date?: string;
  pill?: string;
  audience?: string;
  heroCardLabel?: string;
  heroCardTitle?: string;
  heroCardSummary?: string;
  heroCardCta?: string;
  heroCardHref?: string;
  featuredImage?: CatoInsightImageValue | string;
  featuredImageUrl?: string;
  featuredImageAlt?: string;
  featuredImageCaption?: string;
  featuredImageFit?: 'cover' | 'contain';
  categoryId?: string;
  bodyHtml?: React.ReactNode;
  bodyJson?: string;
  takeawaysHtml?: React.ReactNode;
  takeawaysJson?: string;
  takeawaysPlacement?: 'main' | 'sidebar' | 'both' | 'hidden';
  shareCtaLabel?: string;
  shareCtaHref?: string;
  relatedRailTitle?: string;
  relatedItemsJson?: string;
  showRelatedRail?: boolean;
  showResourceDetails?: boolean;
}

export interface CatoInsightsMegaMenuProps extends CatoInsightsDataProps {
  introKicker?: string;
  heading?: string;
  summary?: string;
  introCtaLabel?: string;
  browseKicker?: string;
  featureLabel?: string;
  featureTitle?: string;
  featureSummary?: string;
  featureCta?: string;
  featureHref?: string;
  featureItemsJson?: string;
  showFeatureItems?: boolean;
  showFeatureCta?: boolean;
  featureItemLimit?: number;
  insightsHomeLink?: CatoInsightLinkProp;
  resiliencyLink?: CatoInsightLinkProp;
  researchLink?: CatoInsightLinkProp;
  whitepapersLink?: CatoInsightLinkProp;
  newsroomLink?: CatoInsightLinkProp;
}

const DEFAULT_CATEGORIES: CatoInsightCategory[] = [
  {
    id: 'resiliency',
    page: 'resiliency-reports.html',
    title: 'Resiliency Report Alerts',
    filterLabel: 'Reports',
    cardLabel: 'Resiliency Report',
    cardTitle: 'Supply volatility tracking.',
    cardSummary: 'Access market signals for active supply disruptions.',
    cardCta: 'Explore alerts',
    heroSummary:
      "Subscribe for recurring healthcare supply risk alerts and browse Cato's archive of disruption reports, sourcing signals, and care continuity analysis.",
    panelLabel: 'Subscribe + archive',
    panelTitle: 'Built for recurring supply risk reports.',
    panelSummary:
      'Use this page as the entry point for Resiliency Report Alerts and the archive for recurring healthcare supply risk analysis.',
    archiveEyebrow: 'Archive',
    archiveTitle: 'Latest Resiliency Reports',
    archiveSummary:
      'Published reports collect here so supply chain, procurement, and clinical operations teams can scan recent disruption signals.',
    hasSubscribe: true
  },
  {
    id: 'research',
    page: 'cato-research.html',
    title: 'Cato Research',
    filterLabel: 'Research',
    cardLabel: 'Cato Research',
    cardTitle: 'Procurement strategy unpacked.',
    cardSummary: 'Explore supply chain resilience best practices.',
    cardCta: 'Browse research',
    heroSummary:
      'Whitepapers and research on intelligent procurement, supply optionality, and healthcare supply chain resilience.',
    panelLabel: 'Research archive',
    panelTitle: "A home for Cato's procurement point of view.",
    panelSummary:
      "Approved research, whitepapers, and annual reports collect here as Cato's market perspective grows.",
    archiveEyebrow: 'Research archive',
    archiveTitle: 'Latest Cato Research',
    archiveSummary:
      'Whitepapers and analysis organized for executives, procurement leaders, and supply chain operators.'
  },
  {
    id: 'resources',
    page: 'resource-library.html',
    title: 'Resource Library',
    filterLabel: 'Resources',
    cardLabel: 'Whitepapers',
    cardTitle: 'Executive thought leadership.',
    cardSummary: 'Implement sourcing frameworks for operational continuity.',
    cardCta: 'Learn best practices',
    heroSummary:
      'Guides, explainers, and operational resources for healthcare procurement, supply chain, and clinical value teams.',
    panelLabel: 'Resource archive',
    panelTitle: 'A practical library for supply gap response.',
    panelSummary:
      'Guides, explainers, and briefings collect here for teams managing substitution, shortage, and backorder response.',
    archiveEyebrow: 'Resource library',
    archiveTitle: 'Latest Operational Resources',
    archiveSummary:
      'Practical resources for procurement, supply chain, and clinical value teams protecting care continuity.'
  },
  {
    id: 'newsroom',
    page: 'newsroom.html',
    title: 'Newsroom',
    filterLabel: 'News',
    cardLabel: 'Newsroom',
    cardTitle: 'Newsroom',
    cardSummary: 'Follow Cato launches, events, press notes, and milestones.',
    cardCta: 'Visit newsroom',
    heroSummary: 'Company news, launch updates, events, and announcements from Cato.',
    panelLabel: 'Latest updates',
    panelTitle: 'Launches, events, and company milestones.',
    panelSummary:
      'Track Cato announcements, event field notes, media mentions, and product milestones in one newsroom archive.',
    archiveEyebrow: 'Newsroom archive',
    archiveTitle: 'Latest Company Updates',
    archiveSummary:
      'Launch notes, event recaps, media mentions, and company announcements collect here as approved Newsroom entries are published.'
  }
];

const REVIEW_ITEMS: CatoInsightItem[] = [
  {
    id: 'supply-disruption-preparedness-brief',
    slug: '2026-supply-disruption-preparedness-brief',
    category: 'resiliency',
    resourceType: 'Resiliency Report',
    pill: 'Featured report',
    title: '2026 Supply Disruption Preparedness Brief',
    summary:
      'A planning brief for healthcare procurement teams preparing for supplier shortages, backorders, and regional disruption risk.',
    date: 'May 8, 2026',
    ctaLabel: 'Read report',
    featured: true,
    menuFeature: true,
    audience: 'Procurement, supply chain, and clinical operations teams.',
    body: [
      {
        heading: 'Why this matters',
        paragraphs: [
          'Healthcare supply disruption planning is moving from exception handling to routine operating discipline. Teams need a repeatable way to identify pressure, evaluate alternatives, and decide when clinical partners should be involved.',
          'This brief gives procurement and supply chain teams a shared frame for reviewing shortage exposure before backorders turn into care continuity risk.'
        ]
      },
      {
        heading: 'What to watch',
        paragraphs: [
          'Monitor supplier concentration, substitute availability, contract constraints, regional logistics pressure, and product categories with known recall or allocation patterns.'
        ],
        bullets: [
          'Identify SKUs with limited clinical substitutes.',
          'Track lead-time changes before formal backorder notices arrive.',
          'Document escalation owners for high-risk categories.'
        ]
      },
      {
        heading: 'How teams can use it',
        paragraphs: [
          'Use the checklist as a meeting artifact for sourcing reviews, value analysis conversations, and recurring supply continuity planning.'
        ]
      }
    ],
    takeaways: [
      'Use recurring signals, not one-off alerts.',
      'Prioritize categories that affect clinical workflows.',
      'Keep substitute paths visible before disruption.'
    ]
  },
  {
    id: 'backorder-response-planning',
    slug: 'backorder-response-planning-clinical-teams',
    category: 'resiliency',
    resourceType: 'Alert',
    pill: 'Alert',
    title: 'Backorder Response Planning for Clinical Teams',
    summary:
      'A rapid-response note for care teams evaluating disrupted items, substitutions, and timing risk.',
    date: 'May 8, 2026',
    ctaLabel: 'View alert',
    audience: 'Clinical value analysis, procurement, and supply chain teams.',
    body: [
      {
        heading: 'Response planning frame',
        paragraphs: [
          'Backorder response works best when procurement, supply chain, and clinical teams share the same decision sequence. Start with patient impact, then evaluate substitution quality, cost, availability, and training requirements.'
        ]
      },
      {
        heading: 'Operational checks',
        paragraphs: [
          'A response plan should show who owns supplier outreach, who approves clinical substitutions, and when the team will revisit the risk.'
        ],
        bullets: [
          'Confirm projected available inventory.',
          'Separate clinically acceptable substitutes from purchasing alternatives.',
          'Record communication needs for affected departments.'
        ]
      }
    ],
    takeaways: [
      'Make clinical acceptance visible.',
      'Separate temporary substitutions from standardization decisions.',
      'Set a review date for every disruption response.'
    ]
  },
  {
    id: 'regional-sourcing-signal-watchlist',
    slug: 'regional-sourcing-signal-watchlist',
    category: 'resiliency',
    resourceType: 'Watchlist',
    pill: 'Watchlist',
    title: 'Regional Sourcing Signal Watchlist',
    summary:
      'A focused scan of sourcing pressure, alternate supply paths, and continuity considerations for healthcare teams.',
    date: 'May 8, 2026',
    ctaLabel: 'Open watchlist',
    audience: 'Healthcare supply chain and sourcing teams.',
    body: [
      {
        heading: 'Signals to monitor',
        paragraphs: [
          'Regional sourcing pressure often appears first as pricing volatility, delayed confirmations, or tighter substitute availability. Watchlist reporting gives teams a simple place to track those early indicators.'
        ]
      },
      {
        heading: 'Suggested review rhythm',
        paragraphs: [
          'Review the watchlist weekly during active pressure periods, then move to a monthly rhythm once supplier confirmations and substitute paths stabilize.'
        ]
      }
    ],
    takeaways: [
      'Watch regional availability patterns.',
      'Keep alternate supply paths current.',
      'Review sourcing pressure on a recurring cadence.'
    ]
  },
  {
    id: 'intelligent-procurement-optionality',
    slug: 'intelligent-procurement-expands-supply-optionality',
    category: 'research',
    resourceType: 'Cato Research',
    pill: 'Cato Research',
    title: 'How Intelligent Procurement Expands Supply Optionality',
    summary:
      'Cato research on how better market visibility helps care teams evaluate alternatives before shortages become operational blockers.',
    date: 'May 8, 2026',
    ctaLabel: 'Read research',
    audience: 'Executives, procurement leaders, and supply chain operators.',
    body: [
      {
        heading: 'Research premise',
        paragraphs: [
          'Supply optionality depends on visibility. Teams that can see alternative items, supplier paths, and clinical constraints earlier are better positioned to respond without forcing rushed purchasing decisions.'
        ]
      },
      {
        heading: 'Procurement implications',
        paragraphs: [
          'The strongest procurement programs treat intelligence as an operating layer that connects sourcing, value analysis, and clinical planning.'
        ],
        bullets: [
          'Map equivalent products before disruption.',
          'Use demand and availability signals together.',
          'Treat supplier optionality as resilience infrastructure.'
        ]
      }
    ],
    takeaways: [
      'Visibility creates optionality.',
      'Optionality reduces rushed substitutions.',
      'Procurement intelligence should be shared across functions.'
    ]
  },
  {
    id: 'healthcare-supply-optionality-outlook',
    slug: 'healthcare-supply-optionality-outlook',
    category: 'research',
    resourceType: 'Whitepaper',
    pill: 'Whitepaper',
    title: 'Healthcare Supply Optionality Outlook',
    summary:
      'A research perspective on how healthcare organizations can build resilience by widening safe sourcing options.',
    date: 'May 8, 2026',
    ctaLabel: 'Read whitepaper',
    audience: 'Healthcare executives and procurement leaders.',
    body: [
      {
        heading: 'Outlook summary',
        paragraphs: [
          'Healthcare systems are rethinking sourcing resilience as margin pressure, supplier volatility, and clinical standardization requirements converge.'
        ]
      },
      {
        heading: 'What changes',
        paragraphs: [
          'The next phase of procurement intelligence will favor teams that can evaluate availability, clinical acceptance, and financial impact in one repeatable workflow.'
        ]
      }
    ],
    takeaways: [
      'Optionality is a strategic capability.',
      'Sourcing decisions need clinical and financial context.',
      'Repeatable workflows scale better than ad hoc workarounds.'
    ]
  },
  {
    id: 'medical-supply-sourcing-checklist',
    slug: 'medical-supply-sourcing-checklist',
    category: 'resources',
    resourceType: 'Resource Library',
    pill: 'Resource Library',
    title: 'Medical Supply Sourcing Checklist',
    summary:
      'A practical checklist for teams evaluating disrupted SKUs, substitution options, supplier readiness, and delivery timelines.',
    date: 'May 8, 2026',
    ctaLabel: 'View resource',
    audience: 'Procurement, supply chain, and clinical value teams.',
    body: [
      {
        heading: 'When to use this checklist',
        paragraphs: [
          'Use this checklist when a product disruption requires a fast, repeatable comparison of alternate SKUs, supplier paths, clinical constraints, and timing risk.'
        ]
      },
      {
        heading: 'Triage the disruption',
        paragraphs: [
          'Start with the facts that determine urgency and decision ownership before comparing substitutions.'
        ],
        bullets: [
          'Current item, manufacturer, contract status, and affected facilities.',
          'Known inventory, open orders, backorder timing, and supplier confidence.',
          'Clinical use case, frequency of use, and potential patient-care impact.',
          'Teams that need to approve substitutions before a switch can happen.'
        ]
      },
      {
        heading: 'Compare viable alternatives',
        paragraphs: [
          'A substitute should be evaluated against supply availability and adoption risk together, not as a purchasing-only decision.'
        ],
        bullets: [
          'Functional match, sizing, sterility, packaging, and documentation requirements.',
          'Training impact for clinical teams and any change in workflow.',
          'Pricing variance, freight impact, contract constraints, and approval path.',
          'Supplier reliability, delivery confidence, and contingency options.'
        ]
      },
      {
        heading: 'Create the decision record',
        paragraphs: [
          'Close the review with a clear recommendation, named owners, and the trigger that would cause the team to revisit the decision.'
        ],
        bullets: [
          'Recommended path and backup option.',
          'Approvers and implementation owner.',
          'Expected review date or inventory threshold.',
          'Open questions for sourcing, clinical, or supplier teams.'
        ]
      }
    ],
    takeaways: [
      'Use one repeatable checklist for every disruption review.',
      'Document clinical constraints before purchasing substitutes.',
      'Compare availability, cost, and adoption risk in the same decision.'
    ]
  },
  {
    id: 'supply-continuity-briefing',
    slug: 'supply-continuity-briefing-backorder-risk',
    category: 'resources',
    resourceType: 'Webinar',
    pill: 'Webinar',
    title: 'Supply Continuity Briefing: Preparing for Backorder Risk',
    summary:
      'A briefing format for procurement, supply chain, and clinical operations teams monitoring supply pressure.',
    date: 'May 8, 2026',
    ctaLabel: 'Watch briefing',
    audience: 'Supply chain, sourcing, and clinical operations leaders.',
    body: [
      {
        heading: 'Briefing format',
        paragraphs: [
          'This briefing model helps teams move from raw supply updates to coordinated operational decisions.'
        ]
      },
      {
        heading: 'Discussion prompts',
        paragraphs: [
          'Each briefing should answer what changed, what categories are exposed, what alternatives are viable, and which decisions need clinical input.'
        ]
      }
    ],
    takeaways: [
      'Make the briefing recurring.',
      'Tie every signal to an owner.',
      'Capture decisions for future reviews.'
    ]
  },
  {
    id: 'procurement-intelligence-hub-launch',
    slug: 'cato-launches-expanded-procurement-intelligence-hub',
    category: 'newsroom',
    resourceType: 'Company update',
    pill: 'Company update',
    title: 'Cato Launches Expanded Procurement Intelligence Hub',
    summary:
      "A company update introducing Cato's expanded Insights structure for reports, research, resources, and launch news.",
    date: 'May 8, 2026',
    ctaLabel: 'Read update',
    audience: 'Customers, partners, investors, and media contacts.',
    body: [
      {
        heading: 'Launch summary',
        paragraphs: [
          'Cato is expanding its Insights experience to give healthcare procurement teams a clearer home for recurring reports, research, practical resources, and company news.'
        ]
      },
      {
        heading: 'Why it matters',
        paragraphs: [
          'The new structure makes it easier to publish high-priority updates once and surface them across the hub, category pages, and navigation feature areas.'
        ]
      }
    ],
    takeaways: [
      "Insights becomes the hub for Cato's publishing system.",
      'Category pages can grow as content volume increases.',
      'Featured items can be promoted in the menu and hub.'
    ]
  },
  {
    id: 'idm-summit-field-notes',
    slug: 'idm-summit-field-notes-healthcare-sourcing',
    category: 'newsroom',
    resourceType: 'Event recap',
    pill: 'Event recap',
    title: 'IDM Summit Field Notes for Healthcare Sourcing Teams',
    summary:
      'Event takeaways, customer conversations, and procurement themes worth surfacing for the wider Cato audience.',
    date: 'May 8, 2026',
    ctaLabel: 'Read recap',
    audience: 'Healthcare sourcing leaders, customers, and partners.',
    body: [
      {
        heading: 'Field notes',
        paragraphs: [
          'The IDM Summit surfaced recurring questions around supply visibility, substitution planning, and how procurement teams can make better use of market signals.'
        ]
      },
      {
        heading: 'What Cato heard',
        paragraphs: [
          'Teams want fewer disconnected updates and more practical intelligence that supports sourcing decisions before a shortage becomes urgent.'
        ]
      }
    ],
    takeaways: [
      'Event recaps can become durable audience content.',
      'Customer questions should feed future research topics.',
      'The newsroom should connect events back to the Insights hub.'
    ]
  },
  {
    id: 'capstone-launch-brief',
    slug: 'capstone-launch-brief',
    category: 'newsroom',
    resourceType: 'Launch brief',
    pill: 'Launch brief',
    title: 'Capstone Launch Brief',
    summary:
      'A short launch brief on how Cato is expanding procurement intelligence for healthcare supply teams.',
    date: 'May 8, 2026',
    ctaLabel: 'Read brief',
    audience: 'Customers, partners, and healthcare procurement leaders.',
    body: [
      {
        heading: 'Launch context',
        paragraphs: [
          'Capstone gives Cato a way to package product and market updates as concise launch briefs for audiences that need the operational context, not just the announcement.'
        ]
      },
      {
        heading: 'Publishing use',
        paragraphs: [
          'This format can support future partner launches, product milestones, and market-facing announcements.'
        ]
      }
    ],
    takeaways: [
      'Launch briefs should stay concise.',
      'Each brief should connect announcement value to user impact.',
      'The newsroom can preserve launch history over time.'
    ]
  },
  {
    id: 'healthcare-procurement-coverage',
    slug: 'healthcare-procurement-coverage',
    category: 'newsroom',
    resourceType: 'Media note',
    pill: 'Media note',
    title: 'Cato Supply Featured in Healthcare Procurement Coverage',
    summary:
      "Media notes and partner mentions for teams tracking Cato's work across healthcare supply and procurement resilience.",
    date: 'May 8, 2026',
    ctaLabel: 'Read note',
    audience: 'Media, partners, customers, and investors.',
    body: [
      {
        heading: 'Coverage note',
        paragraphs: [
          'Media notes give Cato a lightweight format for collecting third-party mentions, partner coverage, and relevant market commentary.'
        ]
      },
      {
        heading: 'How to use it',
        paragraphs: [
          'Use this content type when an update is externally visible but does not need a full launch announcement or research treatment.'
        ]
      }
    ],
    takeaways: [
      'Keep media notes short and attributable.',
      'Link back to coverage when available.',
      'Use the newsroom archive for discoverability.'
    ]
  }
];

const PUBLISHED_CMS_ITEMS: CatoInsightItem[] = [
  {
    id: 'vascular-angiographic-dialysis-kits-shortages',
    slug: 'vascular-angiographic-dialysis-kits-shortages',
    category: 'resiliency',
    resourceType: 'Resiliency Report',
    pill: 'Alert',
    title: 'Vascular, Angiographic, and Dialysis Kits Shortages',
    summary:
      'Vascular access, angiographic, and dialysis procedure kit backorders are being driven by recalls and quarantines across sheath introducers, control syringes, sizing catheters, and bloodlines.',
    date: 'May 14, 2026',
    ctaLabel: 'Read report',
    audience: 'Healthcare procurement, sourcing, supply chain, and clinical value teams.',
    body: [
      {
        heading: 'Alert context',
        paragraphs: [
          'Health systems are reporting prolonged allocation constraints on vascular access, angiographic, and dialysis procedure kits.'
        ]
      }
    ],
    takeaways: [
      'Map affected procedure kit SKUs against recall and quarantine scope before deciding what remains usable.',
      'Evaluate clinical equivalents with visibility into kit bill-of-materials dependencies.',
      'Use secondary channels to find matching or functionally equivalent kit options when primary channels are constrained.'
    ]
  },
  {
    id: 'nasal-oral-ett-backorders',
    slug: 'nasal-oral-ett-backorders',
    category: 'resiliency',
    resourceType: 'Resiliency Report',
    pill: 'Alert',
    title: 'Nasal Oral Endotracheal Tubes Backorders',
    summary:
      'Nasal and oral/nasal endotracheal tube allocation pressure is concentrated in pediatric and small adult sizes due to recalls, market exits, and limited manufacturing surge capacity.',
    date: 'May 7, 2026',
    ctaLabel: 'Read report',
    audience: 'Healthcare procurement, sourcing, supply chain, and clinical value teams.',
    body: [],
    takeaways: []
  },
  {
    id: 'neurosponges-disruption',
    slug: 'neurosponges-disruption',
    category: 'resiliency',
    resourceType: 'Resiliency Report',
    pill: 'Alert',
    title: 'Neurosponges Disruption',
    summary:
      'Neuro sponge and neuro strip constraints are tightening after recall activity, thinned secondary supply, and allocation pressure across Medline, Integra, and remaining suppliers.',
    date: 'May 1, 2026',
    ctaLabel: 'Read report',
    audience: 'Healthcare procurement, sourcing, supply chain, and clinical value teams.',
    body: [],
    takeaways: []
  },
  {
    id: 'capstone-partnership',
    slug: 'capstone-partnership',
    category: 'newsroom',
    resourceType: 'Newsroom',
    pill: 'Company update',
    title: 'Capstone Partnership',
    summary:
      'Cato announced a partnership with Capstone Health Alliance to support supply chain resiliency, sourcing initiatives, care continuity, and cost-saving opportunities for Capstone members.',
    date: 'Apr 14, 2026',
    ctaLabel: 'Read announcement',
    audience: 'Customers, partners, media contacts, and healthcare procurement leaders.',
    body: [],
    takeaways: []
  },
  {
    id: 'nbr-medical-supplies',
    slug: 'nbr-medical-supplies',
    category: 'resiliency',
    resourceType: 'Resiliency Report',
    pill: 'Alert',
    title: 'NBR Medical Supplies',
    summary:
      'Conflict-driven volatility in petroleum-derived polymer inputs may pressure medical consumables including gloves, PPE, syringes, IV bags, and wound care supplies.',
    date: 'Apr 7, 2026',
    ctaLabel: 'Read report',
    audience: 'Healthcare procurement, sourcing, supply chain, and clinical value teams.',
    body: [],
    takeaways: []
  },
  {
    id: 'avagard-shortage',
    slug: 'avagard-shortage',
    category: 'resiliency',
    resourceType: 'Resiliency Report',
    pill: 'Alert',
    title: 'Avagard Shortage',
    summary:
      'Extended rolling backorders on Avagard surgical hand antiseptics are tied to upstream chemical disruption, validation timelines, and constrained production capacity.',
    date: 'Mar 19, 2026',
    ctaLabel: 'Read report',
    audience: 'Healthcare procurement, sourcing, supply chain, and clinical value teams.',
    body: [],
    takeaways: []
  },
  {
    id: 'stryker-cyberattack',
    slug: 'stryker-cyberattack',
    category: 'resiliency',
    resourceType: 'Resiliency Report',
    pill: 'Alert',
    title: 'Stryker Cyberattack',
    summary:
      "Stryker's cyberattack and global network disruption are affecting electronic ordering workflows, creating supply continuity risk for health systems that rely on Stryker products.",
    date: 'Mar 13, 2026',
    ctaLabel: 'Read report',
    audience: 'Healthcare procurement, sourcing, supply chain, and clinical value teams.',
    body: [],
    takeaways: []
  },
  {
    id: 'iv-sets-allocation',
    slug: 'iv-sets-allocation',
    category: 'resiliency',
    resourceType: 'Resiliency Report',
    pill: 'Alert',
    title: 'IV Sets Allocation',
    summary:
      'Procurement teams are managing tight allocations on Baxter IV administration sets, particularly ClearLink and Continu-Flo product lines.',
    date: 'Mar 12, 2026',
    ctaLabel: 'Read report',
    audience: 'Healthcare procurement, sourcing, supply chain, and clinical value teams.',
    body: [],
    takeaways: []
  },
  {
    id: 'bair-hugger-backorders',
    slug: 'bair-hugger-backorders',
    category: 'resiliency',
    resourceType: 'Resiliency Report',
    pill: 'Alert',
    title: 'Bair Hugger Backorders',
    summary:
      'Health systems are reporting prolonged allocation constraints on Bair Hugger warming blankets, including the 55000, 63000, and 63500 series.',
    date: 'Mar 7, 2026',
    ctaLabel: 'Read report',
    audience: 'Healthcare procurement, sourcing, supply chain, and clinical value teams.',
    body: [],
    takeaways: []
  },
  {
    id: 'gowns-drapes-disruption',
    slug: 'gowns-drapes-disruption',
    category: 'resiliency',
    resourceType: 'Resiliency Report',
    pill: 'Alert',
    title: 'Gowns and Drapes Disruption',
    summary:
      'Sterile surgical gown and drape supply is seeing disruption from recalls, distributor allocations, and raw material and capacity constraints.',
    date: 'Feb 10, 2026',
    ctaLabel: 'Read report',
    audience: 'Healthcare procurement, sourcing, supply chain, and clinical value teams.',
    body: [],
    takeaways: []
  }
];

const DEFAULT_ITEMS = PUBLISHED_CMS_ITEMS.length ? PUBLISHED_CMS_ITEMS : REVIEW_ITEMS;
const DEFAULT_ITEMS_ENDPOINT_URL =
  'https://cato-supply-insights-cms.createsomething.workers.dev/api/cato/insights';

const CATO_CSS = `
  .cato-cc {
    --cato-bg: var(--background-color--background-primary, #ffffff);
    --cato-bg-soft: var(--background-color--background-secondary, #fbf9f4);
    --cato-text: var(--text-color--text-primary, #282723);
    --cato-muted: var(--text-color--text-secondary, rgba(40, 39, 35, 0.72));
    --cato-border: var(--border-color--border-primary, rgba(40, 39, 35, 0.14));
    --cato-border-strong: var(--border-color--border-secondary, rgba(40, 39, 35, 0.24));
    --cato-green: var(--base-color-green--green-900, #0a452e);
    --cato-green-mid: var(--base-color-green--green-800, #125a3b);
    --cato-green-bright: var(--base-color-green--green-400, #18a56d);
    --cato-white: var(--base-color-charcoal--white, #ffffff);
    color: var(--cato-text);
    background: var(--cato-bg);
    font-family: "Inter Variable", Inter, Arial, sans-serif;
    font-size: 1rem;
    line-height: 1.5;
  }
  .cato-cc *, .cato-cc *::before, .cato-cc *::after { box-sizing: border-box; }
  .cato-cc a { color: inherit; }
  .cato-cc-card-component { background: transparent; }
  .cato-cc-card-component .cato-cc-cms-card { height: 100%; min-height: 15rem; }
  .cato-cc-section { background: var(--cato-bg); padding: 4rem 2.5rem; }
  .cato-cc-section--compact { padding-top: 2.5rem; padding-bottom: 2.5rem; }
  .cato-cc-hero { position: relative; overflow: hidden; background: var(--cato-bg); padding-top: 10rem; }
  .cato-cc-hero[data-variant="detail"] { padding-top: 6.25rem; }
  .cato-cc-container { width: min(100%, 80rem); margin: 0 auto; }
  .cato-cc-hero-grid { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(20rem, .65fr); gap: 2rem; align-items: stretch; margin-bottom: 3rem; }
  .cato-cc-hero-grid[data-variant="detail"] { grid-template-columns: minmax(0, 1.45fr) minmax(18rem, .55fr); align-items: center; }
  .cato-cc-copy { display: flex; flex-direction: column; gap: 1.25rem; justify-content: center; max-width: 58rem; }
  .cato-cc-eyebrow { color: var(--cato-green); margin: 0; font-weight: 600; }
  .cato-cc h1, .cato-cc h2, .cato-cc h3 { margin: 0; color: var(--cato-text); font-family: Switzer, Arial, sans-serif; font-weight: 400; }
  .cato-cc h1 { max-width: 56rem; font-size: 3.5rem; line-height: 1.2; letter-spacing: -.14rem; }
  .cato-cc h2 { font-size: clamp(1.55rem, 2vw, 1.9rem); line-height: 1.22; letter-spacing: 0; }
  .cato-cc h3 { font-size: 1.5rem; line-height: 1.4; letter-spacing: -.03rem; }
  .cato-cc-preview-header h2,
  .cato-cc-system-copy > h2 {
    font-size: 3rem;
    line-height: 1.2;
    letter-spacing: -.06rem;
  }
  .cato-cc-lede { color: var(--cato-muted); max-width: 54rem; margin: 0; font-size: 1.125rem; line-height: 1.55; }
  .cato-cc-panel { display: flex; flex-direction: column; justify-content: space-between; gap: 1.5rem; min-height: 100%; padding: 2rem; overflow: hidden; border-radius: .75rem; color: var(--cato-white); background: var(--background-color--background-tertiary, var(--cato-green)); }
  .cato-cc-hero-grid[data-variant="detail"] .cato-cc-panel { align-self: center; justify-content: flex-start; gap: 1.15rem; width: 100%; max-width: 25rem; min-height: auto; margin-left: auto; padding: 1.9rem; }
  .cato-cc-panel h2, .cato-cc-panel h3, .cato-cc-panel p { color: var(--cato-white); margin: 0; }
  .cato-cc-panel h2, .cato-cc-panel h3 { font-size: 1.5rem; line-height: 1.4; letter-spacing: -.03rem; }
  .cato-cc-hero-grid[data-variant="detail"] .cato-cc-panel h2 { font-size: 1.35rem; line-height: 1.32; }
  .cato-cc-panel p:not(.cato-cc-panel-label) { font-size: 1rem; line-height: 1.5; }
  .cato-cc-hero-grid[data-variant="detail"] .cato-cc-panel p:not(.cato-cc-panel-label) { line-height: 1.45; opacity: .92; }
  .cato-cc-panel-link { color: var(--cato-white); font-weight: 600; text-decoration: none; margin-top: auto; }
  .cato-cc-panel-link:hover { text-decoration: underline; }
  .cato-cc-panel-label, .cato-cc-pill { display: inline-flex; align-items: center; width: fit-content; max-width: 100%; border-radius: 999rem; line-height: 1; }
  .cato-cc-panel-label { text-transform: uppercase; border: 1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.10); padding: .38rem .75rem; font-family: Switzer, Arial, sans-serif; font-size: .8125rem; font-weight: 600; }
  .cato-cc-pill { color: rgba(40,39,35,.72); background: rgba(10,69,46,.06); border: 1px solid rgba(10,69,46,.14); padding: .38rem .75rem; font-size: .8125rem; text-transform: uppercase; }
  .cato-cc-card-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1rem; }
  .cato-cc-card-grid[data-count="3"] { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .cato-cc-card-grid[data-count="2"] { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .cato-cc-card, .cato-cc-cms-card, .cato-cc-detail-card, .cato-cc-sidebar-card { border: 1px solid var(--cato-border); background: var(--cato-bg); border-radius: .75rem; box-shadow: 0 1px 2px rgba(17,16,15,.04); }
  .cato-cc-card, .cato-cc-cms-card { display: flex; flex-direction: column; align-items: flex-start; justify-content: space-between; gap: 1rem; color: var(--cato-text); text-decoration: none; transition: transform .18s, border-color .18s, box-shadow .18s; }
  .cato-cc-card { align-items: center; justify-content: center; gap: .85rem; min-height: 11.75rem; padding: 1.45rem 1.5rem; text-align: center; }
  .cato-cc-card[data-category="resiliency"] .cato-cc-pill { color: #0a452e; background: rgba(10,69,46,.07); border-color: rgba(10,69,46,.18); }
  .cato-cc-card[data-category="research"] .cato-cc-pill { color: #245082; background: rgba(36,80,130,.08); border-color: rgba(36,80,130,.18); }
  .cato-cc-card[data-category="resources"] .cato-cc-pill { color: #775321; background: rgba(119,83,33,.09); border-color: rgba(119,83,33,.18); }
  .cato-cc-card[data-category="newsroom"] .cato-cc-pill { color: #61456d; background: rgba(97,69,109,.08); border-color: rgba(97,69,109,.18); }
  .cato-cc-card[data-category="resiliency"] h3 { color: #0a452e; }
  .cato-cc-card[data-category="research"] h3 { color: #245082; }
  .cato-cc-card[data-category="resources"] h3 { color: #775321; }
  .cato-cc-card[data-category="newsroom"] h3 { color: #61456d; }
  .cato-cc-card h3 { max-width: 20rem; font-size: 1.35rem; line-height: 1.32; }
  .cato-cc-card:hover, .cato-cc-cms-card:hover { border-color: var(--cato-border-strong); transform: translate3d(0, -.25rem, 0); box-shadow: 0 1rem 2rem rgba(17,16,15,.08); }
  .cato-cc-card p, .cato-cc-cms-card p { color: var(--cato-muted); margin: 0; line-height: 1.5; }
  .cato-cc-card p { max-width: 18rem; }
  .cato-cc-link { color: var(--cato-green); margin-top: auto; font-weight: 600; display: inline-block; transition: transform .18s, color .18s; }
  .cato-cc-card .cato-cc-link { margin-top: .45rem; }
  .cato-cc-card:hover .cato-cc-link, .cato-cc-cms-card:hover .cato-cc-link { transform: translate3d(.18rem, 0, 0); }
  .cato-cc-preview-header { display: flex; flex-direction: column; align-items: center; gap: 1rem; max-width: 54rem; margin: 0 auto 2rem; text-align: center; }
  .cato-cc-layout { display: grid; grid-template-columns: minmax(14rem, .34fr) minmax(0, 1fr); gap: 1.5rem; align-items: start; }
  .cato-cc-filter-rail { display: flex; flex-direction: column; gap: 1rem; position: sticky; top: 7rem; border: 1px solid var(--cato-border); background: var(--cato-bg); border-radius: .75rem; padding: 1.25rem; }
  .cato-cc-filter-title { font-weight: 800; }
  .cato-cc-filter-list { display: flex; flex-direction: column; gap: .5rem; }
  .cato-cc-filter { display: flex; align-items: center; justify-content: space-between; gap: 1rem; border: 1px solid transparent; border-radius: .5rem; color: var(--cato-muted); padding: .65rem .75rem; font-weight: 700; text-decoration: none; transition: background-color .18s, border-color .18s, color .18s, transform .18s; }
  .cato-cc-filter:hover, .cato-cc-filter[data-active="true"] { color: var(--cato-green); background: rgba(10,69,46,.05); border-color: rgba(10,69,46,.14); }
  .cato-cc-filter[data-category] { color: var(--cato-filter-accent); border-color: var(--cato-filter-border); background: var(--cato-filter-bg); }
  .cato-cc-filter[data-category="resiliency"] { --cato-filter-accent: #0a452e; --cato-filter-bg: rgba(10,69,46,.06); --cato-filter-border: rgba(10,69,46,.16); }
  .cato-cc-filter[data-category="research"] { --cato-filter-accent: #245082; --cato-filter-bg: rgba(36,80,130,.07); --cato-filter-border: rgba(36,80,130,.16); }
  .cato-cc-filter[data-category="resources"] { --cato-filter-accent: #775321; --cato-filter-bg: rgba(119,83,33,.08); --cato-filter-border: rgba(119,83,33,.16); }
  .cato-cc-filter[data-category="newsroom"] { --cato-filter-accent: #61456d; --cato-filter-bg: rgba(97,69,109,.07); --cato-filter-border: rgba(97,69,109,.16); }
  .cato-cc-filter[data-category]:hover { border-color: var(--cato-filter-accent); background: var(--cato-filter-bg); }
  .cato-cc-filter[data-category] .cato-cc-filter-count { color: var(--cato-filter-accent); background: rgba(255,255,255,.72); }
  .cato-cc-filter-count { color: var(--cato-muted); background: rgba(10,69,46,.05); border-radius: 999rem; min-width: 1.65rem; padding: .16rem .48rem; text-align: center; font-size: .78rem; }
  .cato-cc-filter-note { color: var(--cato-muted); margin: 0; font-size: .92rem; line-height: 1.45; }
  .cato-cc-cms-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.25rem; align-items: stretch; }
  .cato-cc-cms-card { min-height: 18rem; padding: 1.5rem; }
  .cato-cc-cms-card[data-featured="true"] { grid-column: 1 / -1; padding: 2rem; }
  .cato-cc-card-top { display: flex; align-items: center; justify-content: space-between; gap: 1rem; width: 100%; }
  .cato-cc-card-body { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: 2rem; width: 100%; }
  .cato-cc-meta { display: flex; align-items: center; flex-wrap: wrap; gap: .5rem; color: var(--cato-muted); font-size: .875rem; line-height: 1.35; }
  .cato-cc-system-band { display: grid; grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr); align-items: center; gap: 3rem; border: 1px solid var(--cato-border); background: var(--cato-bg); border-radius: .75rem; padding: 3rem; }
  .cato-cc-system-band[data-subscribe="true"] { grid-template-columns: minmax(0, .85fr) minmax(0, 1fr); align-items: stretch; gap: 1.5rem; padding: 1.5rem; }
  .cato-cc-system-band[data-archive="true"] { align-items: start; }
  .cato-cc-system-band[data-archive-shell="true"] { grid-template-columns: 1fr; }
  .cato-cc-system-band[data-archive-shell="true"] .cato-cc-system-copy { max-width: 56rem; }
  .cato-cc-system-copy { display: flex; flex-direction: column; gap: 1rem; }
  .cato-cc-system-list { display: flex; flex-direction: column; gap: .75rem; }
  .cato-cc-system-card { display: flex; flex-direction: column; gap: .35rem; background: rgba(10,69,46,.055); border: 0; border-radius: .625rem; box-shadow: none; padding: 1.25rem; }
  .cato-cc-system-card p { margin: 0; color: var(--cato-muted); line-height: 1.5; }
  .cato-cc-archive-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
  .cato-cc-archive-list .cato-cc-cms-card { min-height: 15rem; padding: 1.25rem; }
  .cato-cc-back-link { color: var(--cato-green); margin-top: .25rem; font-weight: 700; text-decoration: none; display: inline-block; }
  .cato-cc-hero-actions { display: flex; flex-wrap: wrap; gap: .75rem; margin-top: .25rem; }
  .cato-cc-share-link { display: inline-flex; align-items: center; justify-content: center; min-height: 2.75rem; border: 1px solid rgba(10,69,46,.18); border-radius: .5rem; background: rgba(10,69,46,.055); color: var(--cato-green); padding: .7rem 1rem; font-weight: 800; line-height: 1.2; text-decoration: none; }
  .cato-cc-share-link:hover { border-color: rgba(10,69,46,.28); background: rgba(10,69,46,.09); }
  .cato-cc-subscribe-card { background: var(--cato-bg); border: 1px solid var(--cato-border); box-shadow: 0 1px 2px rgba(17,16,15,.04); }
  .cato-cc-note-card { background: rgba(10,69,46,.04); }
  .cato-cc-form-intro { display: flex; flex-direction: column; gap: .65rem; }
  .cato-cc-form-intro p { color: var(--cato-muted); max-width: 34rem; margin: 0; line-height: 1.5; }
  .cato-cc-benefits { display: flex; flex-wrap: wrap; gap: .5rem; margin: 0; padding: 0; list-style: none; }
  .cato-cc-benefits li { display: flex; align-items: center; gap: .4rem; color: var(--cato-green); background: rgba(10,69,46,.05); border: 1px solid rgba(10,69,46,.14); border-radius: 999rem; padding: .38rem .7rem; font-size: .84rem; font-weight: 700; line-height: 1.2; }
  .cato-cc-benefits li::before { content: ""; width: .38rem; height: .38rem; flex: none; border-radius: 999rem; background: var(--cato-green-bright); }
  .cato-cc-form { margin-top: .25rem; }
  .cato-cc-form label { display: block; color: var(--cato-text); margin-bottom: .5rem; font-weight: 600; }
  .cato-cc-form-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .75rem; align-items: stretch; }
  .cato-cc-input { min-height: 3.25rem; border: 1px solid var(--cato-border); border-radius: .45rem; padding: .7rem .875rem; font: inherit; color: var(--cato-text); background: var(--cato-bg); transition: border-color .18s, box-shadow .18s, background-color .18s; }
  .cato-cc-input:hover { border-color: var(--cato-border-strong); }
  .cato-cc-input:focus, .cato-cc-input:focus-visible { border-color: var(--cato-green-bright); outline: 0; box-shadow: 0 0 0 .25rem rgba(70,183,138,.14); }
  .cato-cc-input::placeholder { color: rgba(40,39,35,.42); }
  .cato-cc-button, .cato-cc-cta,
  .cato-cc button.cato-cc-button,
  .cato-cc a.cato-cc-cta {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    min-height: 3.25rem;
    border: 1px solid var(--cato-green-mid);
    border-radius: .5rem;
    background: var(--cato-green-mid);
    color: var(--cato-white) !important;
    -webkit-text-fill-color: var(--cato-white);
    padding: .85rem 1.15rem;
    font: inherit;
    font-weight: 600;
    line-height: 1.2;
    letter-spacing: 0;
    text-decoration: none;
    text-transform: none;
    white-space: nowrap;
    cursor: pointer;
    transition: background-color .18s, border-color .18s, box-shadow .18s, transform .18s;
  }
  .cato-cc-button:hover, .cato-cc-cta:hover,
  .cato-cc-button:focus-visible, .cato-cc-cta:focus-visible,
  .cato-cc-button:visited, .cato-cc-cta:visited {
    color: var(--cato-white) !important;
    -webkit-text-fill-color: var(--cato-white);
  }
  .cato-cc-button:hover, .cato-cc-cta:hover { background: var(--cato-green); border-color: var(--cato-green); transform: translate3d(0, -.1rem, 0); box-shadow: 0 .7rem 1.25rem rgba(10,69,46,.14); }
  .cato-cc-button:active, .cato-cc-cta:active { transform: translate3d(0, 0, 0); box-shadow: none; }
  .cato-cc-form-note { color: var(--cato-muted); margin: .65rem 0 0; font-size: .86rem; line-height: 1.4; }
  .cato-cc-form-status { border-radius: .5rem; margin: .75rem 0 0; padding: .8rem .95rem; font-weight: 700; line-height: 1.4; }
  .cato-cc-form-status[data-status="success"] { color: var(--cato-green); background: rgba(10,69,46,.08); border: 1px solid rgba(10,69,46,.16); }
  .cato-cc-form-status[data-status="error"] { color: #8f332b; background: rgba(143,51,43,.08); border: 1px solid rgba(143,51,43,.16); }
  .cato-cc-archive-cta { display: flex; grid-column: 1 / -1; align-items: center; justify-content: space-between; gap: 1rem; position: relative; z-index: 1; isolation: isolate; border: 1px solid rgba(10,69,46,.14); background: rgba(10,69,46,.05); border-radius: .75rem; margin-top: .75rem; padding: 1.25rem; box-shadow: inset 0 1px 0 rgba(255,255,255,.7), 0 .75rem 1.5rem rgba(10,69,46,.05); }
  .cato-cc-archive-cta span { display: block; color: var(--cato-muted); margin-top: .2rem; line-height: 1.45; }
  .cato-cc-archive-cta .cato-cc-cta { flex: none; padding: .75rem 1rem; font-weight: 800; }
  .cato-cc-detail-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(18rem, .38fr); align-items: start; gap: 2.5rem; }
  .cato-cc-detail-card { padding: clamp(1.5rem, 3vw, 2.5rem); }
  .cato-cc-detail-meta { display: flex; align-items: center; flex-wrap: wrap; gap: .75rem; color: var(--cato-muted); margin-bottom: 2rem; }
  .cato-cc-featured-image { width: 100%; margin: 0 0 2rem; }
  .cato-cc-featured-image-frame { width: 100%; aspect-ratio: 16 / 9; overflow: hidden; border: 1px solid var(--cato-border); border-radius: .75rem; background: rgba(10,69,46,.045); }
  .cato-cc-featured-image img { display: block; width: 100%; height: 100%; object-position: center; }
  .cato-cc-featured-caption { color: var(--cato-muted); margin: .65rem 0 0; font-size: .875rem; line-height: 1.45; }
  .cato-cc-rich { max-width: 44rem; }
  .cato-cc-rich section + section { margin-top: 2.5rem; }
  .cato-cc-rich > *:first-child, .cato-cc-rich-content > *:first-child, .cato-cc-rich [class*="w-richtext"] > *:first-child { margin-top: 0; }
  .cato-cc-rich > *:last-child, .cato-cc-rich-content > *:last-child, .cato-cc-rich [class*="w-richtext"] > *:last-child { margin-bottom: 0; }
  .cato-cc-rich h1, .cato-cc-rich h2, .cato-cc-rich h3, .cato-cc-rich h4,
  .cato-cc .cato-cc-detail-card .cato-cc-rich-content h1,
  .cato-cc .cato-cc-detail-card .cato-cc-rich-content h2,
  .cato-cc .cato-cc-detail-card .cato-cc-rich-content h3,
  .cato-cc .cato-cc-detail-card .cato-cc-rich-content h4 {
    max-width: 42rem;
    margin: 2rem 0 .85rem !important;
    color: var(--cato-text) !important;
    font-family: Switzer, Arial, sans-serif !important;
    font-weight: 400 !important;
    letter-spacing: 0 !important;
  }
  .cato-cc-rich h1, .cato-cc .cato-cc-detail-card .cato-cc-rich-content h1 { font-size: 2rem !important; line-height: 1.18 !important; }
  .cato-cc-rich h2, .cato-cc .cato-cc-detail-card .cato-cc-rich-content h2 { font-size: 1.75rem !important; line-height: 1.25 !important; }
  .cato-cc-rich h3, .cato-cc .cato-cc-detail-card .cato-cc-rich-content h3 { font-size: 1.35rem !important; line-height: 1.3 !important; }
  .cato-cc-rich .cato-cc-rich-section-heading { font-size: 1.75rem !important; line-height: 1.25 !important; }
  .cato-cc-rich h4, .cato-cc .cato-cc-detail-card .cato-cc-rich-content h4 { font-size: 1.12rem !important; line-height: 1.35 !important; font-weight: 600 !important; }
  .cato-cc .cato-cc-detail-card :where(h1, h2, h3, h4) {
    max-width: 42rem;
    margin: 2rem 0 .75rem !important;
    color: var(--cato-text) !important;
    font-family: Switzer, Arial, sans-serif !important;
    font-weight: 500 !important;
    letter-spacing: 0 !important;
  }
  .cato-cc .cato-cc-detail-card :where(h1, h2) { font-size: clamp(1.55rem, 2vw, 1.9rem) !important; line-height: 1.22 !important; }
  .cato-cc .cato-cc-detail-card :where(h3) { font-size: 1.28rem !important; line-height: 1.32 !important; }
  .cato-cc .cato-cc-detail-card :where(h4) { font-size: 1.08rem !important; line-height: 1.38 !important; }
  .cato-cc-rich p, .cato-cc-rich li,
  .cato-cc .cato-cc-detail-card .cato-cc-rich-content p,
  .cato-cc .cato-cc-detail-card .cato-cc-rich-content li {
    color: var(--cato-muted) !important;
    font-size: 1.0625rem !important;
    line-height: 1.65 !important;
  }
  .cato-cc .cato-cc-detail-card :where(p, li) {
    color: var(--cato-muted) !important;
    font-size: 1rem !important;
    line-height: 1.68 !important;
  }
  .cato-cc .cato-cc-detail-card :where(li strong) { color: var(--cato-text) !important; font-weight: 700 !important; }
  .cato-cc-rich p, .cato-cc .cato-cc-detail-card .cato-cc-rich-content p { margin: 0 0 1rem !important; }
  .cato-cc-rich ul, .cato-cc-rich ol, .cato-cc .cato-cc-detail-card .cato-cc-rich-content ul, .cato-cc .cato-cc-detail-card .cato-cc-rich-content ol, .cato-cc .cato-cc-detail-card :where(ul, ol) { display: flex; flex-direction: column; gap: .65rem; margin: 1rem 0 1.25rem !important; padding-left: 1.25rem !important; }
  .cato-cc-rich blockquote, .cato-cc .cato-cc-detail-card .cato-cc-rich-content blockquote { margin: 1.5rem 0 !important; border-left: .2rem solid rgba(10,69,46,.24); padding: .25rem 0 .25rem 1rem; color: var(--cato-text) !important; }
  .cato-cc-rich a, .cato-cc .cato-cc-detail-card .cato-cc-rich-content a { color: var(--cato-green) !important; font-weight: 600; text-decoration-thickness: .06em; text-underline-offset: .18em; }
  .cato-cc-rich img, .cato-cc-rich figure, .cato-cc .cato-cc-detail-card .cato-cc-rich-content img, .cato-cc .cato-cc-detail-card .cato-cc-rich-content figure { max-width: 100%; border-radius: .5rem; }
  .cato-cc-rich-content slot::slotted(h1) { font-size: 2rem !important; line-height: 1.18 !important; margin: 2rem 0 .85rem !important; }
  .cato-cc-rich-content slot::slotted(h2) { font-size: 1.75rem !important; line-height: 1.25 !important; margin: 2rem 0 .85rem !important; }
  .cato-cc-rich-content slot::slotted(h3) { font-size: 1.35rem !important; line-height: 1.3 !important; margin: 2rem 0 .85rem !important; }
  .cato-cc-rich-content slot::slotted(p), .cato-cc-rich-content slot::slotted(li) { font-size: 1.0625rem !important; line-height: 1.65 !important; color: var(--cato-muted) !important; }
  .cato-cc-sidebar { display: flex; flex-direction: column; gap: 1rem; position: sticky; top: 7rem; }
  .cato-cc-sidebar-card { display: flex; flex-direction: column; gap: 1rem; padding: 1.5rem; }
  .cato-cc-takeaways-card { display: flex; flex-direction: column; gap: 1rem; border: 1px solid rgba(10,69,46,.24); background: rgba(10,69,46,.035); border-radius: .65rem; margin: 0 0 2rem; padding: 1.5rem; }
  .cato-cc-takeaways-card .cato-cc-eyebrow, .cato-cc-sidebar-card .cato-cc-eyebrow { margin: 0; }
  .cato-cc-sidebar-list { display: flex; flex-direction: column; gap: 0; }
  .cato-cc-sidebar-link { display: flex; flex-direction: column; gap: .35rem; border-top: 1px solid var(--cato-border); color: var(--cato-text); padding: 1rem 0; text-decoration: none; }
  .cato-cc-sidebar-link:first-child { border-top: 0; padding-top: 0; }
  .cato-cc-sidebar-link:last-child { padding-bottom: 0; }
  .cato-cc-sidebar-link strong { font-size: 1rem; line-height: 1.28; }
  .cato-cc-sidebar-link span { color: var(--cato-muted); font-size: .86rem; line-height: 1.35; }
  .cato-cc-sidebar-link:hover strong { color: var(--cato-green); }
  .cato-cc-field { display: flex; flex-direction: column; gap: .35rem; }
  .cato-cc-field span, .cato-cc-field a, .cato-cc-takeaways, .cato-cc-takeaways-html { color: var(--cato-muted); }
  .cato-cc-field a { font-weight: 700; text-decoration: none; }
  .cato-cc-takeaways { display: flex; flex-direction: column; gap: .65rem; margin: 0; padding-left: 1.25rem; }
  .cato-cc-takeaways-html h1, .cato-cc-takeaways-html h2, .cato-cc-takeaways-html h3 { margin: 0 0 .75rem; font-size: 1rem; line-height: 1.35; font-weight: 700; letter-spacing: 0; }
  .cato-cc-takeaways-html ul, .cato-cc-takeaways-html ol { display: flex; flex-direction: column; gap: .65rem; margin: 0; padding-left: 1.25rem; }
  .cato-cc-takeaways-html p { margin: 0 0 .75rem; line-height: 1.5; }
  .cato-cc-mega { background: var(--cato-bg); color: var(--cato-text); border-top: 1px solid rgba(40,39,35,.08); border-bottom: 1px solid rgba(40,39,35,.12); box-shadow: 0 28px 70px rgba(46,34,27,.16); }
  .cato-cc-mega-inner { display: grid; grid-template-columns: .78fr 1.32fr .82fr; gap: 2.25rem; align-items: stretch; width: min(100%, 80rem); min-height: 23rem; margin: 0 auto; padding: 2.5rem; }
  .cato-cc-mega-intro { border-right: 1px solid rgba(40,39,35,.10); padding-right: 2rem; }
  .cato-cc-mega-kicker { color: var(--cato-muted); text-transform: uppercase; margin: 0 0 1rem; font-size: .76rem; font-weight: 800; }
  .cato-cc-mega-title { max-width: 23rem; margin: 0 0 3rem; font-size: clamp(1.8rem, 2.5vw, 2.55rem); line-height: 1.06; font-weight: 800; }
  .cato-cc-mega-copy { color: var(--cato-muted); max-width: 18rem; margin: 0 0 1.6rem; font-size: .95rem; line-height: 1.5; }
  .cato-cc-mega-home { font-weight: 800; text-decoration: none; }
  .cato-cc-mega-links { display: grid; grid-template-columns: 1fr 1fr; align-content: start; gap: 1rem 1.5rem; }
  .cato-cc-mega-link { display: flex; flex-direction: column; align-items: flex-start; gap: .5rem; border-radius: .5rem; padding: .75rem 1rem; text-decoration: none; }
  .cato-cc-mega-link:hover { background: var(--base-color-cream--cream-200, #f2eee8); }
  .cato-cc-mega-link strong { font-size: .98rem; line-height: 1.2; }
  .cato-cc-mega-link span { color: var(--cato-muted); font-size: .86rem; line-height: 1.4; }
  .cato-cc-mega-feature { display: flex; flex-direction: column; gap: 1rem; min-height: 18rem; background: var(--cato-green-mid); color: var(--cato-white); border-radius: .5rem; padding: 1.5rem; text-decoration: none; }
  .cato-cc-mega-feature span, .cato-cc-mega-feature p, .cato-cc-mega-feature strong, .cato-cc-mega-feature h3 { color: var(--cato-white); }
  .cato-cc-mega-feature h3 { font-size: 1.2rem; line-height: 1.3; }
  .cato-cc-mega-feature p { font-size: .92rem; line-height: 1.42; }
  .cato-cc-mega-feature .cato-cc-pill { color: var(--cato-white); border-color: rgba(255,255,255,.35); background: transparent; }
  .cato-cc-mega-feature-list { display: flex; flex-direction: column; gap: .35rem; border-top: 1px solid rgba(255,255,255,.16); padding: .7rem 0; }
  .cato-cc-mega-feature-list strong { display: block; font-size: .9rem; line-height: 1.16; }
  .cato-cc-mega-feature-list span { opacity: .72; text-transform: uppercase; font-size: .7rem; line-height: 1.2; }
  .cato-cc-mega-feature-cta { margin-top: .25rem; font-weight: 800; }
  .cato-cc a:focus-visible, .cato-cc button:focus-visible { outline: 2px solid var(--cato-green-bright); outline-offset: 3px; }
  @media (prefers-reduced-motion: reduce) {
    .cato-cc *, .cato-cc *::before, .cato-cc *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; }
  }
  @media (max-width: 991px) {
    .cato-cc-hero-grid, .cato-cc-system-band, .cato-cc-layout, .cato-cc-detail-layout { grid-template-columns: 1fr; }
    .cato-cc-card-grid, .cato-cc-cms-grid, .cato-cc-archive-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .cato-cc-filter-rail, .cato-cc-sidebar { position: static; }
    .cato-cc-filter-list { flex-flow: row wrap; }
    .cato-cc-hero { padding-top: 8rem; }
    .cato-cc-hero[data-variant="detail"] { padding-top: 5.5rem; }
    .cato-cc-mega-inner { grid-template-columns: 1fr; min-height: auto; }
    .cato-cc-mega-intro { border-right: 0; padding-right: 0; }
  }
  @media (max-width: 767px) {
    .cato-cc-section { padding: 4rem 1.25rem; }
    .cato-cc-hero { padding-top: 7rem; }
    .cato-cc-hero[data-variant="detail"] { padding-top: 4.75rem; }
    .cato-cc h1 { font-size: 3.5rem; line-height: 1.2; }
    .cato-cc h2 { font-size: 1.65rem; line-height: 1.25; }
    .cato-cc-preview-header h2,
    .cato-cc-system-copy > h2 { font-size: 2rem; }
    .cato-cc h3 { font-size: 1.25rem; }
    .cato-cc-card-grid, .cato-cc-cms-grid, .cato-cc-card-body, .cato-cc-archive-list { grid-template-columns: 1fr; }
    .cato-cc-card, .cato-cc-cms-card, .cato-cc-cms-card[data-featured="true"], .cato-cc-panel, .cato-cc-detail-card, .cato-cc-sidebar-card { min-height: auto; padding: 1.25rem; }
    .cato-cc-system-band { padding: 1.25rem; }
    .cato-cc-form-row, .cato-cc-archive-cta { grid-template-columns: 1fr; flex-direction: column; align-items: stretch; }
    .cato-cc-button, .cato-cc-cta { width: 100%; }
    .cato-cc-filter-list { flex-direction: column; }
    .cato-cc-mega-intro, .cato-cc-mega-feature { display: none; }
    .cato-cc-mega-inner { display: block; padding: .75rem 0; }
    .cato-cc-mega-links { display: block; }
    .cato-cc-mega-kicker { padding: 1rem 1.25rem .25rem; }
    .cato-cc-mega-link { border-radius: 0; padding: 1rem 1.25rem; }
  }
`;

const CATO_DETAIL_GLOBAL_STYLE_ID = 'cato-cc-detail-richtext-styles';

const CATO_DETAIL_GLOBAL_CSS = `
  .cato-cc .cato-cc-detail-card .w-richtext,
  .cato-cc .cato-cc-detail-card [class*="w-richtext"],
  .cato-cc .cato-cc-detail-card .cato-cc-rich-content {
    max-width: 44rem;
  }
  .cato-cc .cato-cc-detail-card :is(h1, h2, h3, h4) {
    max-width: 42rem !important;
    color: var(--cato-text, #282723) !important;
    font-family: Switzer, Arial, sans-serif !important;
    font-weight: 500 !important;
    letter-spacing: 0 !important;
  }
  .cato-cc .cato-cc-detail-card :is(h1, h2) {
    margin: 2.15rem 0 .85rem !important;
    font-size: clamp(1.55rem, 2vw, 1.9rem) !important;
    line-height: 1.22 !important;
  }
  .cato-cc .cato-cc-detail-card :is(h3) {
    margin: 1.75rem 0 .7rem !important;
    font-size: 1.28rem !important;
    line-height: 1.32 !important;
  }
  .cato-cc .cato-cc-detail-card :is(h4) {
    margin: 1.5rem 0 .6rem !important;
    font-size: 1.08rem !important;
    line-height: 1.38 !important;
  }
  .cato-cc .cato-cc-detail-card :is(p, li) {
    color: var(--cato-muted, #706e68) !important;
    font-size: 1rem !important;
    line-height: 1.7 !important;
  }
  .cato-cc .cato-cc-detail-card p {
    margin: 0 0 1.1rem !important;
  }
  .cato-cc .cato-cc-detail-card :is(h1, h2, h3, h4) + p {
    margin-top: 0 !important;
  }
  .cato-cc .cato-cc-detail-card :is(ul, ol) {
    display: flex !important;
    flex-direction: column !important;
    gap: .65rem !important;
    margin: 1rem 0 1.35rem !important;
    padding-left: 1.35rem !important;
  }
  .cato-cc .cato-cc-detail-card :is(li strong) {
    color: var(--cato-text, #282723) !important;
    font-weight: 700 !important;
  }
  .cato-cc .cato-cc-detail-card :is(a) {
    color: var(--cato-green, #0a452e) !important;
    font-weight: 600 !important;
    text-decoration-thickness: .06em !important;
    text-underline-offset: .18em !important;
  }
  .cato-cc .cato-cc-detail-card :is(p, ul, ol, blockquote):last-child {
    margin-bottom: 0 !important;
  }
`;

function CatoDetailGlobalStyles() {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const existing = document.getElementById(CATO_DETAIL_GLOBAL_STYLE_ID);
    const style = existing ?? document.createElement('style');
    style.id = CATO_DETAIL_GLOBAL_STYLE_ID;
    style.textContent = CATO_DETAIL_GLOBAL_CSS;

    if (!existing) {
      document.head.appendChild(style);
    }
  }, []);

  return <style>{CATO_DETAIL_GLOBAL_CSS}</style>;
}

function parseJsonArray<T>(json: string | undefined, fallback: T[]): T[] {
  if (!json?.trim()) return fallback;

  try {
    const parsed = JSON.parse(json) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeTextContent(value: string): string {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/gi, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\u200b/g, '')
    .trim();
}

function richTextHasContent(value: unknown): boolean {
  if (typeof value === 'string')
    return Boolean(normalizeTextContent(value)) || /<(img|video|iframe|figure)\b/i.test(value);
  if (typeof value === 'number' || typeof value === 'boolean') return true;
  if (React.isValidElement(value)) {
    const props = value.props as Record<string, unknown> | undefined;
    const html = (props?.dangerouslySetInnerHTML as Record<string, unknown> | undefined)?.__html;
    if (props?.children !== undefined || html !== undefined) {
      return richTextHasContent(props?.children) || richTextHasContent(html);
    }
    return true;
  }
  if (Array.isArray(value)) return value.some(richTextHasContent);

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return (
      richTextHasContent(record.html) ||
      richTextHasContent(record.innerHTML) ||
      richTextHasContent(record.children) ||
      richTextHasContent(record.innerText) ||
      richTextHasContent(record.text) ||
      richTextHasContent((record.props as Record<string, unknown> | undefined)?.children)
    );
  }

  return false;
}

function richTextToHtml(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && !React.isValidElement(value)) {
    const record = value as Record<string, unknown>;
    const html = record.html ?? record.innerHTML;
    if (typeof html === 'string') return html;
  }
  return '';
}

function richTextToPlain(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(richTextToPlain).filter(Boolean).join(' ');
  if (value && typeof value === 'object' && !React.isValidElement(value)) {
    const record = value as Record<string, unknown>;
    return richTextToPlain(
      record.innerText ??
        record.text ??
        record.children ??
        (record.props as Record<string, unknown> | undefined)?.children
    );
  }
  return '';
}

function displayText(value: unknown, fallback = ''): string {
  const text = richTextToPlain(value).trim();
  return text || fallback;
}

function normalizeInsightImage(
  image?: CatoInsightImageValue | string | null
): Partial<CatoInsightImageValue> {
  if (!image) return {};
  if (typeof image === 'string') return { src: image };
  return image;
}

function displayDate(value: unknown, fallback = ''): string {
  const text = displayText(value, fallback);
  if (!/^\d{4}-\d{2}-\d{2}/.test(text)) return text;

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(date);
}

function cleanHtml(html: unknown): string {
  const rawHtml = richTextToHtml(html);
  if (!rawHtml.trim()) return '';
  return rawHtml
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/\sjavascript:/gi, '');
}

function RichHtml({ html, className }: { html?: unknown; className?: string }) {
  if (React.isValidElement(html) || Array.isArray(html)) {
    return <div className={className}>{html as React.ReactNode}</div>;
  }

  const sanitized = cleanHtml(html);
  if (!sanitized) {
    const text = richTextToPlain(html);
    if (!text.trim()) return null;
    return <div className={className}>{text}</div>;
  }

  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

function resolveData({ categoriesJson, itemsJson }: CatoInsightsDataProps) {
  return {
    categories: parseJsonArray<CatoInsightCategory>(categoriesJson, DEFAULT_CATEGORIES),
    items: parseJsonArray<CatoInsightItem>(itemsJson, DEFAULT_ITEMS)
  };
}

function pickRecordString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function pickRecordBoolean(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', 'yes', '1'].includes(normalized)) return true;
      if (['false', 'no', '0'].includes(normalized)) return false;
    }
  }
  return false;
}

function recordsFromEndpointPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  const record = payload as Record<string, unknown>;
  for (const key of ['items', 'results', 'data', 'collectionItems']) {
    const value = record[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') {
      const nested = value as Record<string, unknown>;
      if (Array.isArray(nested.items)) return nested.items;
      if (Array.isArray(nested.results)) return nested.results;
    }
  }

  return [];
}

function normalizeEndpointItem(raw: unknown): CatoInsightItem | null {
  if (!raw || typeof raw !== 'object') return null;

  const rawRecord = raw as Record<string, unknown>;
  const fieldData =
    rawRecord.fieldData && typeof rawRecord.fieldData === 'object'
      ? (rawRecord.fieldData as Record<string, unknown>)
      : {};
  const record = { ...rawRecord, ...fieldData };
  const title = pickRecordString(record, ['title', 'Title', 'name', 'Name']);
  const slug = pickRecordString(record, ['slug', 'Slug']);
  if (!title && !slug) return null;

  const summary = pickRecordString(record, [
    'summary',
    'Summary',
    'shortSummary',
    'short-summary',
    'Short Summary',
    'short_summary'
  ]);
  const resourceType = pickRecordString(record, [
    'resourceType',
    'resource-type',
    'Resource Type',
    'resource_type',
    'type'
  ]);
  const contentLabel = pickRecordString(record, [
    'contentLabel',
    'content-label',
    'Content Label',
    'content_label',
    'pill',
    'Pill'
  ]);
  const label = contentLabel || resourceType || 'Insight';
  const displayResourceType = contentLabel || resourceType || label;
  const category =
    pickRecordString(record, ['category', 'categoryId', 'category-id', 'archive', 'Archive']) ||
    categoryKeyFromResourceType(label) ||
    'resources';
  const date = pickRecordString(record, [
    'date',
    'Date',
    'publishDate',
    'publish-date',
    'Publish Date',
    'publishedOn',
    'lastPublished',
    'createdOn'
  ]);
  const ctaLabel =
    pickRecordString(record, ['ctaLabel', 'cta-label', 'CTA Label', 'cta_label']) ||
    (category === 'newsroom' ? 'Read update' : 'Read report');

  return {
    id: pickRecordString(record, ['id', '_id', 'itemId', 'item-id']) || slug || title,
    slug:
      slug ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''),
    category,
    resourceType: displayResourceType,
    pill: label,
    title: title || slug,
    summary: summary || 'Read the latest Cato insight.',
    date: displayDate(date),
    ctaLabel,
    featured: pickRecordBoolean(record, ['featured', 'Featured']),
    audience: pickRecordString(record, ['audience', 'Audience']),
    body: [],
    takeaways: []
  };
}

export function normalizeEndpointItems(payload: unknown) {
  return recordsFromEndpointPayload(payload)
    .map(normalizeEndpointItem)
    .filter((item): item is CatoInsightItem => Boolean(item));
}

function useInsightItems(dataProps: CatoInsightsDataProps) {
  const { items } = resolveData(dataProps);
  const [remoteItems, setRemoteItems] = useState<CatoInsightItem[] | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const configuredEndpointUrl = dataProps.itemsEndpointUrl?.trim() || '';
  const hasConfiguredItems = Boolean(dataProps.itemsJson?.trim());
  const endpointUrl =
    configuredEndpointUrl || (hasConfiguredItems ? '' : DEFAULT_ITEMS_ENDPOINT_URL);
  const shouldFetch = dataProps.fetchItems !== false && Boolean(endpointUrl);

  useEffect(() => {
    if (!shouldFetch || typeof fetch === 'undefined') {
      setRemoteItems(null);
      setStatus('idle');
      return;
    }

    let isMounted = true;
    setStatus('loading');

    fetch(endpointUrl, { headers: { Accept: 'application/json' } })
      .then((response) => {
        if (!response.ok) throw new Error(`Insights endpoint returned ${response.status}`);
        return response.json();
      })
      .then((payload: unknown) => {
        if (!isMounted) return;
        const normalizedItems = normalizeEndpointItems(payload);
        setRemoteItems(normalizedItems.length ? normalizedItems : null);
        setStatus('ready');
      })
      .catch(() => {
        if (!isMounted) return;
        setRemoteItems(null);
        setStatus('error');
      });

    return () => {
      isMounted = false;
    };
  }, [endpointUrl, shouldFetch]);

  return { items: remoteItems || items, status };
}

function useInsightsData(dataProps: CatoInsightsDataProps) {
  const { categories } = resolveData(dataProps);
  const itemsState = useInsightItems(dataProps);

  return {
    categories,
    ...itemsState
  };
}

function normalizePrefix(prefix = '') {
  if (!prefix) return '';
  return prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
}

function hrefForPage(
  page: string,
  linkMode: CatoInsightsDataProps['linkMode'] = 'webflow',
  pathPrefix = ''
) {
  const prefix = normalizePrefix(pathPrefix);
  const clean = linkMode === 'export' ? page : page.replace(/\.html$/, '');
  return `${prefix}/${clean}`.replace(/\/{2,}/g, '/');
}

function hrefForItem(
  item: CatoInsightItem,
  linkMode: CatoInsightsDataProps['linkMode'] = 'webflow',
  pathPrefix = ''
) {
  if (item.href) return item.href;

  const suffix = linkMode === 'export' ? '.html' : '';
  const prefix = normalizePrefix(linkMode === 'webflow' ? pathPrefix || '/insights' : pathPrefix);
  return `${prefix}/${item.slug}${suffix}`.replace(/\/{2,}/g, '/');
}

function hrefFromLink(link: CatoInsightLinkProp | undefined, fallbackHref: string) {
  const href = link?.href?.trim();
  return href && href !== '#' ? href : fallbackHref || '#';
}

function relForTarget(target?: string) {
  return target === '_blank' ? 'noreferrer' : undefined;
}

function normalizeCategoryKey(value?: string) {
  return value
    ?.trim()
    .toLowerCase()
    .replace(/\.html$/, '')
    .replace(/^\/+|\/+$/g, '');
}

function slugifyCategoryTitle(value?: string) {
  return normalizeCategoryKey(value)
    ?.replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function categoryKeyFromResourceType(value?: string) {
  const normalized = normalizeCategoryKey(value);
  if (!normalized) return '';
  if (normalized.includes('research') || normalized.includes('whitepaper')) return 'research';
  if (normalized.includes('resource') || normalized.includes('webinar')) return 'resources';
  if (
    normalized.includes('news') ||
    normalized.includes('event') ||
    normalized.includes('announcement') ||
    normalized.includes('launch')
  )
    return 'newsroom';
  if (
    normalized.includes('resiliency') ||
    normalized.includes('report') ||
    normalized.includes('alert') ||
    normalized.includes('watchlist')
  )
    return 'resiliency';
  return '';
}

function inferCategorySlugFromLocation() {
  if (typeof window === 'undefined') return '';
  const parts = window.location.pathname.split('/').filter(Boolean);
  return parts[parts.length - 1] || '';
}

function inferItemSlugFromLocation() {
  if (typeof window === 'undefined') return '';
  const parts = window.location.pathname.split('/').filter(Boolean);
  return parts[parts.length - 1]?.replace(/\.html$/, '') || '';
}

function categoryByKey(
  categories: CatoInsightCategory[],
  primaryKey?: string,
  fallbackKey?: string
) {
  const keys = [primaryKey, fallbackKey].map(normalizeCategoryKey).filter(Boolean);
  const match = categories.find((category) => {
    const candidates = [
      category.id,
      category.page,
      category.page.replace(/\.html$/, ''),
      slugifyCategoryTitle(category.title),
      slugifyCategoryTitle(category.cardLabel)
    ].map(normalizeCategoryKey);

    return keys.some((key) => candidates.includes(key));
  });

  return match || categories[0] || DEFAULT_CATEGORIES[0];
}

function Hero({
  title,
  summary,
  panelLabel,
  panelTitle,
  panelSummary,
  panelCta,
  panelHref,
  panelTarget,
  panelRel,
  backLink,
  actions,
  children,
  variant = 'default'
}: {
  title: string;
  summary: string;
  panelLabel: string;
  panelTitle: string;
  panelSummary: string;
  panelCta?: string;
  panelHref?: string;
  panelTarget?: string;
  panelRel?: string;
  backLink?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  variant?: 'default' | 'detail';
}) {
  return (
    <section
      className="cato-cc-section cato-cc-hero"
      data-variant={variant === 'detail' ? 'detail' : undefined}
    >
      <div className="cato-cc-container">
        <div
          className="cato-cc-hero-grid"
          data-variant={variant === 'detail' ? 'detail' : undefined}
        >
          <div className="cato-cc-copy">
            <p className="cato-cc-eyebrow">Insights</p>
            <h1>{title}</h1>
            <p className="cato-cc-lede">{summary}</p>
            {actions ? <div className="cato-cc-hero-actions">{actions}</div> : null}
            {backLink}
          </div>
          <div className="cato-cc-panel">
            <p className="cato-cc-panel-label">{panelLabel}</p>
            <h2>{panelTitle}</h2>
            <p>{panelSummary}</p>
            {panelCta && panelHref ? (
              <a
                className="cato-cc-panel-link"
                href={panelHref}
                target={panelTarget}
                rel={panelRel}
              >
                {panelCta}
              </a>
            ) : null}
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

function CategoryCard({
  category,
  href,
  target,
  rel
}: {
  category: CatoInsightCategory;
  href: string;
  target?: string;
  rel?: string;
}) {
  return (
    <a href={href} className="cato-cc-card" data-category={category.id} target={target} rel={rel}>
      <h3>{category.cardTitle}</h3>
      <p>{category.cardSummary}</p>
      <span className="cato-cc-link">{category.cardCta}</span>
    </a>
  );
}

function InsightCard({
  item,
  href,
  featured = false,
  target,
  rel
}: {
  item: CatoInsightItem;
  href: string;
  featured?: boolean;
  target?: string;
  rel?: string;
}) {
  return (
    <a
      href={href}
      className="cato-cc-cms-card"
      data-featured={featured ? 'true' : undefined}
      target={target}
      rel={rel}
    >
      {featured ? (
        <>
          <div className="cato-cc-card-top">
            <span className="cato-cc-pill">{item.pill}</span>
            <span className="cato-cc-meta">{item.date}</span>
          </div>
          <div className="cato-cc-card-body">
            <div>
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
            </div>
            <span className="cato-cc-link">{item.ctaLabel}</span>
          </div>
        </>
      ) : (
        <>
          <span className="cato-cc-pill">{item.pill}</span>
          <div>
            <div className="cato-cc-meta">{item.date}</div>
            <h3>{item.title}</h3>
            <p>{item.summary}</p>
          </div>
          <span className="cato-cc-link">{item.ctaLabel}</span>
        </>
      )}
    </a>
  );
}

function TakeawaysBox({ html, items }: { html?: React.ReactNode; items: string[] }) {
  if (!richTextHasContent(html) && items.length === 0) return null;

  return (
    <div className="cato-cc-takeaways-card">
      <p className="cato-cc-eyebrow">Key takeaways</p>
      {richTextHasContent(html) ? (
        <RichHtml html={html} className="cato-cc-takeaways-html" />
      ) : (
        <ul className="cato-cc-takeaways">
          {items.map((takeaway) => (
            <li key={takeaway}>{takeaway}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RelatedRail({ title, items }: { title: string; items: CatoInsightRelatedItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="cato-cc-sidebar-card">
      <p className="cato-cc-eyebrow">{title}</p>
      <div className="cato-cc-sidebar-list">
        {items.map((item) => (
          <a
            key={`${item.title}-${item.href || ''}`}
            className="cato-cc-sidebar-link"
            href={displayText(item.href, '#')}
          >
            <strong>{item.title}</strong>
            {item.resourceType || item.date ? (
              <span>{[item.resourceType, item.date].filter(Boolean).join(' - ')}</span>
            ) : null}
          </a>
        ))}
      </div>
    </div>
  );
}

function FeaturedImage({
  image,
  url,
  alt,
  caption,
  fit = 'cover'
}: {
  image?: CatoInsightImageValue | string;
  url?: CatoInsightImageValue | string;
  alt?: string;
  caption?: string;
  fit?: 'cover' | 'contain';
}) {
  const boundImage = normalizeInsightImage(image);
  const fallbackImage = normalizeInsightImage(url);
  const src = displayText(boundImage.src, displayText(fallbackImage.src));
  if (!src) return null;

  const altText = displayText(alt, displayText(boundImage.alt, displayText(fallbackImage.alt)));

  return (
    <figure className="cato-cc-featured-image">
      <div className="cato-cc-featured-image-frame">
        <img src={src} alt={altText} loading="lazy" style={{ objectFit: fit }} />
      </div>
      {displayText(caption) ? (
        <figcaption className="cato-cc-featured-caption">{caption}</figcaption>
      ) : null}
    </figure>
  );
}

function ArchiveItemList({
  items,
  status,
  linkMode,
  pathPrefix,
  shouldShowSubscribe
}: {
  items: CatoInsightItem[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  linkMode: CatoInsightsDataProps['linkMode'];
  pathPrefix: string;
  shouldShowSubscribe: boolean | undefined;
}) {
  return (
    <div className="cato-cc-archive-list">
      {items.map((item) => (
        <InsightCard key={item.id} item={item} href={hrefForItem(item, linkMode, pathPrefix)} />
      ))}
      {status === 'loading' && items.length === 0 ? (
        <div className="cato-cc-system-card">Loading latest insights...</div>
      ) : null}
      {status === 'error' ? (
        <div className="cato-cc-system-card cato-cc-note-card">
          <strong>Showing cached archive items.</strong>
          <p>
            The live CMS endpoint did not respond, so this component is using its configured
            fallback data.
          </p>
        </div>
      ) : null}
      {items.length === 0 && status !== 'loading' ? (
        <div className="cato-cc-system-card cato-cc-note-card">
          <strong>No published items yet.</strong>
          <p>Published CMS entries will appear here after the endpoint refreshes.</p>
        </div>
      ) : null}
      {shouldShowSubscribe ? (
        <div className="cato-cc-archive-cta">
          <div>
            <strong>Want future alerts?</strong>
            <span>Subscribe once and receive new Resiliency Report Alerts as they publish.</span>
          </div>
          <a href="#cato-resiliency-alerts" className="cato-cc-cta">
            Subscribe for alerts
          </a>
        </div>
      ) : null}
    </div>
  );
}

function SubscribeBlock() {
  const emailId = useId();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      setStatus('error');
      return;
    }
    setStatus('success');
    form.reset();
  }

  return (
    <section className="cato-cc-section cato-cc-section--compact" id="cato-resiliency-alerts">
      <div className="cato-cc-container">
        <div className="cato-cc-system-band" data-subscribe="true">
          <div className="cato-cc-system-copy">
            <p className="cato-cc-eyebrow">Resiliency Report Alerts</p>
            <h2>Subscribe for Resiliency Report Alerts.</h2>
            <p className="cato-cc-lede">
              Receive updates when Cato publishes new healthcare supply risk signals, disruption
              analysis, and report archive entries.
            </p>
          </div>
          <div className="cato-cc-system-list">
            <div className="cato-cc-system-card cato-cc-subscribe-card">
              <div className="cato-cc-form-intro">
                <span className="cato-cc-pill">Email alerts</span>
                <h3>Receive new Resiliency Report Alerts.</h3>
                <p>
                  Get healthcare supply risk signals, disruption reports, and sourcing notes as they
                  publish.
                </p>
              </div>
              <ul className="cato-cc-benefits">
                <li>New report releases</li>
                <li>Supply disruption signals</li>
                <li>Procurement response notes</li>
              </ul>
              <form className="cato-cc-form" method="get" onSubmit={submit} noValidate>
                <label htmlFor={emailId}>Work email address</label>
                <div className="cato-cc-form-row">
                  <input
                    id={emailId}
                    className="cato-cc-input"
                    type="email"
                    name="email"
                    placeholder="you@organization.com"
                    required
                  />
                  <button className="cato-cc-button" type="submit">
                    Subscribe to alerts
                  </button>
                </div>
                <p className="cato-cc-form-note">No spam. Unsubscribe anytime.</p>
                {status === 'success' ? (
                  <div className="cato-cc-form-status" data-status="success" role="status">
                    You are subscribed. New Resiliency Report Alerts will be sent to your inbox.
                  </div>
                ) : null}
                {status === 'error' ? (
                  <div className="cato-cc-form-status" data-status="error" role="alert">
                    Something went wrong. Please try again.
                  </div>
                ) : null}
              </form>
            </div>
            <div className="cato-cc-system-card cato-cc-note-card">
              <strong>Archive status</strong>
              <p>
                Browse published resiliency reports below as the archive grows from recurring market
                signals and care continuity analysis.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export const CatoInsightsHub: React.FC<CatoInsightsHubProps> = ({
  title = 'Supply Chain Insights for Outstanding Patient Care',
  summary = 'Stay ahead of disruptions with practical procurement intelligence.',
  featuredPanelLabel = 'Featured now',
  featuredPanelTitle = 'Relevant disruptions and strategic resources.',
  featuredPanelSummary = 'Use this area to feature the market signals, research, and company updates that matter most from a business perspective.',
  featuredPanelCta = 'Access these reports',
  filterRailNote = 'Use these filters to scan current reports, research, and newsroom updates by content type.',
  insightsHomeLink,
  featuredPanelLink,
  resiliencyLink,
  researchLink,
  whitepapersLink,
  newsroomLink,
  previewEyebrow = 'Insights hub',
  previewTitle = 'Actionable Supply Chain Insights for Healthcare Leaders',
  previewSummary = 'Browse by content type to access active supply disruptions, overcome market volatility, and apply sourcing strategies that increase supply chain resilience.',
  itemLimit = 4,
  showFilterRail = false,
  showCmsModel = false,
  linkMode = 'webflow',
  pathPrefix = '',
  ...dataProps
}) => {
  const { categories, items } = useInsightsData(dataProps);
  const hubCategories = categories.filter((category) => category.id !== 'resources');
  const hubCategoryIds = new Set(hubCategories.map((category) => category.id));
  const hubItems = items.filter((item) => hubCategoryIds.has(item.category));
  const categoryLinkOverrides: Record<string, CatoInsightLinkProp | undefined> = {
    resiliency: resiliencyLink,
    research: researchLink,
    resources: whitepapersLink,
    newsroom: newsroomLink
  };
  const insightsHomeHref = hrefFromLink(
    insightsHomeLink,
    hrefForPage('insights.html', linkMode, pathPrefix)
  );
  const panelLink = featuredPanelLink || resiliencyLink;
  const panelHref = hrefFromLink(
    panelLink,
    hrefForPage('resiliency-reports.html', linkMode, pathPrefix)
  );
  const linkForCategory = (category: CatoInsightCategory) => categoryLinkOverrides[category.id];
  const hrefForCategory = (category: CatoInsightCategory) =>
    hrefFromLink(linkForCategory(category), hrefForPage(category.page, linkMode, pathPrefix));
  const featured = hubItems.find((item) => item.featured) || hubItems[0];
  const rest = hubItems.filter((item) => item.id !== featured?.id);
  const previewItems = showFilterRail
    ? [featured, ...rest].filter((item): item is CatoInsightItem => Boolean(item))
    : hubItems.slice(0, Math.max(1, itemLimit));

  return (
    <div className="cato-cc">
      <style>{CATO_CSS}</style>
      <Hero
        title={title}
        summary={summary}
        panelLabel={featuredPanelLabel}
        panelTitle={featuredPanelTitle}
        panelSummary={featuredPanelSummary}
        panelCta={featuredPanelCta}
        panelHref={panelHref}
        panelTarget={panelLink?.target}
        panelRel={relForTarget(panelLink?.target)}
      >
        <div className="cato-cc-card-grid" data-count={hubCategories.length}>
          {hubCategories.map((category) => {
            const link = linkForCategory(category);
            return (
              <CategoryCard
                key={category.id}
                category={category}
                href={hrefForCategory(category)}
                target={link?.target}
                rel={relForTarget(link?.target)}
              />
            );
          })}
        </div>
      </Hero>
      <section className="cato-cc-section">
        <div className="cato-cc-container">
          <div className="cato-cc-preview-header">
            <p className="cato-cc-eyebrow">{previewEyebrow}</p>
            <h2>{previewTitle}</h2>
            <p className="cato-cc-lede">{previewSummary}</p>
          </div>
          {showFilterRail ? (
            <div className="cato-cc-layout">
              <aside className="cato-cc-filter-rail" aria-label="Browse insights by content type">
                <div className="cato-cc-filter-title">Browse by type</div>
                <div className="cato-cc-filter-list">
                  <a
                    href={insightsHomeHref}
                    className="cato-cc-filter"
                    data-active="true"
                    target={insightsHomeLink?.target}
                    rel={relForTarget(insightsHomeLink?.target)}
                  >
                    <span>All insights</span>
                    <span className="cato-cc-filter-count">{hubItems.length}</span>
                  </a>
                  {hubCategories.map((category) => {
                    const link = linkForCategory(category);
                    return (
                      <a
                        key={category.id}
                        href={hrefForCategory(category)}
                        className="cato-cc-filter"
                        data-category={category.id}
                        target={link?.target}
                        rel={relForTarget(link?.target)}
                      >
                        <span>{category.filterLabel}</span>
                        <span className="cato-cc-filter-count">
                          {items.filter((item) => item.category === category.id).length}
                        </span>
                      </a>
                    );
                  })}
                </div>
                {displayText(filterRailNote) ? (
                  <p className="cato-cc-filter-note">{filterRailNote}</p>
                ) : null}
              </aside>
              <div className="cato-cc-cms-grid">
                {previewItems.map((item, index) => (
                  <InsightCard
                    key={item.id}
                    item={item}
                    href={hrefForItem(item, linkMode, pathPrefix)}
                    featured={index === 0}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="cato-cc-cms-grid">
              {previewItems.map((item) => (
                <InsightCard
                  key={item.id}
                  item={item}
                  href={hrefForItem(item, linkMode, pathPrefix)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
      {showCmsModel ? (
        <section className="cato-cc-section">
          <div className="cato-cc-container">
            <div className="cato-cc-system-band">
              <div className="cato-cc-system-copy">
                <p className="cato-cc-eyebrow">CMS model</p>
                <h2>A local preview of the Webflow collection shape.</h2>
                <p className="cato-cc-lede">
                  This component mirrors the exported fields needed in Webflow: title, slug, type,
                  category, summary, body, date, featured state, menu feature state, CTA label,
                  audience, and archive routing.
                </p>
              </div>
              <div className="cato-cc-system-list">
                <div className="cato-cc-system-card">
                  <strong>Collection</strong>
                  <p>
                    Insights entries power the hub, focused archive pages, detail pages, and
                    featured navigation content.
                  </p>
                </div>
                <div className="cato-cc-system-card">
                  <strong>Focused archives</strong>
                  <p>
                    Resiliency Reports, Newsroom, and Research can each filter the same collection
                    by category.
                  </p>
                </div>
                <div className="cato-cc-system-card">
                  <strong>Native target</strong>
                  <p>
                    Drop the component into Webflow now; replace JSON props with CMS-bound fields
                    when the live collection is ready.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
};

export const CatoInsightsArchive: React.FC<CatoInsightsArchiveProps> = ({
  categoryId = 'resiliency',
  categorySlug = '',
  showSubscribe = true,
  linkMode = 'webflow',
  pathPrefix = '',
  ...dataProps
}) => {
  const { categories, items, status } = useInsightsData(dataProps);
  const normalizedCategorySlug = categorySlug.trim().toLowerCase();

  if (['__detail__', 'detail', 'insight-detail'].includes(normalizedCategorySlug)) {
    return <CatoInsightDetail linkMode={linkMode} pathPrefix={pathPrefix} {...dataProps} />;
  }

  const category = categoryByKey(
    categories,
    categorySlug || inferCategorySlugFromLocation(),
    categoryId
  );
  const categoryItems = items.filter((item) => item.category === category.id);
  const shouldShowSubscribe = showSubscribe && category.hasSubscribe;

  return (
    <div className="cato-cc">
      <style>{CATO_CSS}</style>
      <Hero
        title={category.title}
        summary={category.heroSummary}
        panelLabel={category.panelLabel}
        panelTitle={category.panelTitle}
        panelSummary={category.panelSummary}
        backLink={
          <a
            href={hrefForPage('insights.html', linkMode, pathPrefix)}
            className="cato-cc-back-link"
          >
            Back to all Insights
          </a>
        }
      />
      <section className="cato-cc-section">
        <div className="cato-cc-container">
          <div className="cato-cc-system-band" data-archive="true">
            <div className="cato-cc-system-copy">
              <p className="cato-cc-eyebrow">{category.archiveEyebrow}</p>
              <h2>{category.archiveTitle}</h2>
              <p className="cato-cc-lede">{category.archiveSummary}</p>
            </div>
            <ArchiveItemList
              items={categoryItems}
              status={status}
              linkMode={linkMode}
              pathPrefix={pathPrefix}
              shouldShowSubscribe={false}
            />
          </div>
        </div>
      </section>
      {shouldShowSubscribe ? <SubscribeBlock /> : null}
    </div>
  );
};

export const CatoInsightsArchiveShell: React.FC<CatoInsightsArchiveShellProps> = ({
  categoryId = 'resiliency',
  categorySlug = '',
  showHero = true,
  showArchiveIntro = true,
  showSubscribe = true,
  showItems = true,
  linkMode = 'webflow',
  pathPrefix = '',
  ...dataProps
}) => {
  const { categories, items, status } = useInsightsData(dataProps);
  const category = categoryByKey(
    categories,
    categorySlug || inferCategorySlugFromLocation(),
    categoryId
  );
  const categoryItems = items.filter((item) => item.category === category.id);
  const shouldShowSubscribe = showSubscribe && category.hasSubscribe;
  const shouldRenderItems = showItems && (categoryItems.length > 0 || status !== 'idle');

  return (
    <div className="cato-cc">
      <style>{CATO_CSS}</style>
      {showHero ? (
        <Hero
          title={category.title}
          summary={category.heroSummary}
          panelLabel={category.panelLabel}
          panelTitle={category.panelTitle}
          panelSummary={category.panelSummary}
          backLink={
            <a
              href={hrefForPage('insights.html', linkMode, pathPrefix)}
              className="cato-cc-back-link"
            >
              Back to all Insights
            </a>
          }
        />
      ) : null}
      {showArchiveIntro ? (
        <section className="cato-cc-section">
          <div className="cato-cc-container">
            <div
              className="cato-cc-system-band"
              data-archive="true"
              data-archive-shell={shouldRenderItems ? undefined : 'true'}
            >
              <div className="cato-cc-system-copy">
                <p className="cato-cc-eyebrow">{category.archiveEyebrow}</p>
                <h2>{category.archiveTitle}</h2>
                <p className="cato-cc-lede">{category.archiveSummary}</p>
              </div>
              {showItems ? (
                <ArchiveItemList
                  items={categoryItems}
                  status={status}
                  linkMode={linkMode}
                  pathPrefix={pathPrefix}
                  shouldShowSubscribe={false}
                />
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
      {shouldShowSubscribe ? <SubscribeBlock /> : null}
    </div>
  );
};

export const CatoInsightCmsCard: React.FC<CatoInsightCmsCardProps> = ({
  title = 'Insight title',
  summary = 'Read the latest Cato insight.',
  resourceType = '',
  contentLabel = '',
  date = '',
  ctaLabel = 'Read update',
  slug = '',
  itemLink,
  featured = false,
  linkMode = 'webflow',
  pathPrefix = '/insights'
}) => {
  const titleText = displayText(title, 'Insight title');
  const label = displayText(contentLabel) || displayText(resourceType) || 'Insight';
  const normalizedSlug = displayText(
    slug,
    titleText
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  );
  const item: CatoInsightItem = {
    id: normalizedSlug || titleText,
    slug: normalizedSlug,
    category: categoryKeyFromResourceType(label) || 'resources',
    resourceType: displayText(resourceType, label),
    pill: label,
    title: titleText,
    summary: displayText(summary, 'Read the latest Cato insight.'),
    date: displayDate(date),
    ctaLabel: displayText(ctaLabel, 'Read update'),
    featured,
    audience: '',
    body: [],
    takeaways: []
  };
  const fallbackHref = item.slug ? hrefForItem(item, linkMode, pathPrefix) : '#';
  const href = hrefFromLink(itemLink, fallbackHref);

  return (
    <div className="cato-cc cato-cc-card-component">
      <style>{CATO_CSS}</style>
      <InsightCard
        item={item}
        href={href}
        featured={featured}
        target={itemLink?.target}
        rel={relForTarget(itemLink?.target)}
      />
    </div>
  );
};

export const CatoInsightDetail: React.FC<CatoInsightDetailProps> = ({
  slug = '2026-supply-disruption-preparedness-brief',
  title,
  summary,
  resourceType,
  date,
  pill,
  audience,
  heroCardLabel,
  heroCardTitle,
  heroCardSummary,
  heroCardCta,
  heroCardHref,
  featuredImage,
  featuredImageUrl,
  featuredImageAlt,
  featuredImageCaption,
  featuredImageFit = 'cover',
  categoryId,
  bodyHtml,
  bodyJson,
  takeawaysHtml,
  takeawaysJson,
  takeawaysPlacement = 'main',
  shareCtaLabel = 'Share',
  shareCtaHref,
  relatedRailTitle,
  relatedItemsJson,
  showRelatedRail = true,
  showResourceDetails = false,
  linkMode = 'webflow',
  pathPrefix = '',
  ...dataProps
}) => {
  const { categories, items } = useInsightsData(dataProps);
  const inferredSlug = inferItemSlugFromLocation();
  const configuredSlug = displayText(slug, '2026-supply-disruption-preparedness-brief');
  const selectedSlug = inferredSlug || configuredSlug;
  const titleText = displayText(title);
  const normalizedTitle = normalizeTextContent(titleText).toLowerCase();
  const fallbackItem =
    items.find((candidate) => candidate.slug === selectedSlug) ||
    items.find((candidate) => candidate.slug === configuredSlug) ||
    (normalizedTitle
      ? items.find((candidate) => candidate.title.toLowerCase() === normalizedTitle)
      : undefined) ||
    items[0] ||
    DEFAULT_ITEMS[0];
  const resourceTypeText = displayText(resourceType, fallbackItem.resourceType);
  const inferredCategory = categoryKeyFromResourceType(resourceTypeText);
  const category = categoryByKey(
    categories,
    inferredCategory || categoryId || fallbackItem.category
  );
  const body = parseJsonArray<CatoInsightBodySection>(bodyJson, fallbackItem.body);
  const takeaways = parseJsonArray<string>(takeawaysJson, fallbackItem.takeaways);
  const item = {
    ...fallbackItem,
    title: displayText(title, fallbackItem.title),
    summary: displayText(summary, fallbackItem.summary),
    resourceType: resourceTypeText,
    date: displayText(date, fallbackItem.date),
    pill: displayText(pill, fallbackItem.pill),
    audience: displayText(audience, fallbackItem.audience),
    body,
    takeaways
  };
  const selectedFeaturedImage = featuredImage || item.featuredImage || item.featuredImageUrl;
  const selectedFeaturedImageUrl =
    featuredImageUrl ||
    (typeof item.featuredImageUrl === 'string' ? item.featuredImageUrl : undefined);
  const selectedFeaturedImageAlt = displayText(
    featuredImageAlt,
    displayText(item.featuredImageAlt, item.title)
  );
  const selectedFeaturedImageCaption = displayText(
    featuredImageCaption,
    displayText(item.featuredImageCaption)
  );
  const selectedFeaturedImageFit = featuredImageFit === 'contain' ? 'contain' : 'cover';
  const audienceContext = item.audience
    ? `Designed for ${item.audience.toLowerCase()}`
    : 'Designed for healthcare procurement teams';
  const heroCardCtaText = displayText(heroCardCta);
  const normalizedTakeawaysPlacement = ['main', 'sidebar', 'both', 'hidden'].includes(
    takeawaysPlacement
  )
    ? takeawaysPlacement
    : 'main';
  const showMainTakeaways =
    normalizedTakeawaysPlacement === 'main' || normalizedTakeawaysPlacement === 'both';
  const showSidebarTakeaways =
    normalizedTakeawaysPlacement === 'sidebar' || normalizedTakeawaysPlacement === 'both';
  const shareLabel = displayText(shareCtaLabel);
  const shareHref = displayText(shareCtaHref, `mailto:?subject=${encodeURIComponent(item.title)}`);
  const fallbackRelatedItems: CatoInsightRelatedItem[] = items
    .filter((candidate) => candidate.slug !== item.slug && candidate.category === item.category)
    .slice(0, 4)
    .map((candidate) => ({
      title: candidate.title,
      href: hrefForItem(candidate, linkMode, pathPrefix),
      resourceType: candidate.resourceType,
      date: candidate.date
    }));
  const relatedItems = parseJsonArray<CatoInsightRelatedItem>(
    relatedItemsJson,
    fallbackRelatedItems
  )
    .filter((candidate) => displayText(candidate.title))
    .slice(0, 5);
  const relatedTitle = displayText(
    relatedRailTitle,
    item.category === 'resiliency' ? 'Latest alerts' : `More in ${category.title}`
  );

  return (
    <div className="cato-cc">
      <style>{CATO_CSS}</style>
      <CatoDetailGlobalStyles />
      <Hero
        variant="detail"
        title={item.title}
        summary={item.summary}
        panelLabel={displayText(heroCardLabel, item.resourceType)}
        panelTitle={displayText(heroCardTitle, category.title)}
        panelSummary={displayText(heroCardSummary, audienceContext)}
        panelCta={heroCardCtaText}
        panelHref={
          heroCardCtaText
            ? displayText(heroCardHref, hrefForPage(category.page, linkMode, pathPrefix))
            : undefined
        }
        actions={
          shareLabel ? (
            <a className="cato-cc-share-link" href={shareHref}>
              {shareLabel}
            </a>
          ) : undefined
        }
        backLink={
          <a href={hrefForPage(category.page, linkMode, pathPrefix)} className="cato-cc-back-link">
            Back to {category.title}
          </a>
        }
      />
      <section className="cato-cc-section">
        <div className="cato-cc-container">
          <div className="cato-cc-detail-layout">
            <article className="cato-cc-detail-card">
              <div className="cato-cc-detail-meta">
                <span className="cato-cc-pill">{item.pill}</span>
                <span>{item.date}</span>
              </div>
              <FeaturedImage
                image={selectedFeaturedImage}
                url={selectedFeaturedImageUrl}
                alt={selectedFeaturedImageAlt}
                caption={selectedFeaturedImageCaption}
                fit={selectedFeaturedImageFit}
              />
              {showMainTakeaways ? (
                <TakeawaysBox html={takeawaysHtml} items={item.takeaways} />
              ) : null}
              <div className="cato-cc-rich">
                {richTextHasContent(bodyHtml) ? (
                  <RichHtml html={bodyHtml} className="cato-cc-rich-content" />
                ) : (
                  item.body.map((section) => (
                    <section key={section.heading}>
                      <h3 className="cato-cc-rich-section-heading">{section.heading}</h3>
                      {section.paragraphs.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                      {section.bullets?.length ? (
                        <ul>
                          {section.bullets.map((bullet) => (
                            <li key={bullet}>{bullet}</li>
                          ))}
                        </ul>
                      ) : null}
                    </section>
                  ))
                )}
              </div>
            </article>
            <aside className="cato-cc-sidebar" aria-label="Related content">
              {showRelatedRail ? <RelatedRail title={relatedTitle} items={relatedItems} /> : null}
              {showResourceDetails ? (
                <div className="cato-cc-sidebar-card">
                  <p className="cato-cc-eyebrow">Resource details</p>
                  <div className="cato-cc-field">
                    <strong>Resource type</strong>
                    <span>{item.resourceType}</span>
                  </div>
                  <div className="cato-cc-field">
                    <strong>Archive</strong>
                    <a href={hrefForPage(category.page, linkMode, pathPrefix)}>{category.title}</a>
                  </div>
                  <div className="cato-cc-field">
                    <strong>Built for</strong>
                    <span>{item.audience}</span>
                  </div>
                  <div className="cato-cc-field">
                    <strong>Published</strong>
                    <span>{item.date}</span>
                  </div>
                </div>
              ) : null}
              {showSidebarTakeaways ? (
                <TakeawaysBox html={takeawaysHtml} items={item.takeaways} />
              ) : null}
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
};

export const CatoInsightsMegaMenu: React.FC<CatoInsightsMegaMenuProps> = ({
  introKicker = '',
  heading = 'Procurement Intelligence for Resilient Care',
  summary = '',
  introCtaLabel = 'Explore Cato Insights',
  browseKicker = '',
  featureLabel = 'Featured',
  featureTitle = 'Resiliency Report Alerts',
  featureSummary = 'Active supply disruptions and market signals for care continuity.',
  featureCta = '',
  featureHref = '',
  featureItemsJson = '',
  showFeatureItems = true,
  showFeatureCta = false,
  featureItemLimit = 3,
  insightsHomeLink,
  resiliencyLink,
  researchLink,
  whitepapersLink,
  newsroomLink,
  linkMode = 'webflow',
  pathPrefix = '',
  ...dataProps
}) => {
  const { categories, items } = useInsightsData(dataProps);
  const menuCategories = categories.filter((category) => category.id !== 'resources');
  const configuredFeatureItems = parseJsonArray<Pick<CatoInsightItem, 'title' | 'resourceType'>>(
    featureItemsJson,
    []
  );
  const fallbackFeatureItems = items.filter((item) => item.category === 'resiliency');
  const featureItems = (
    configuredFeatureItems.length ? configuredFeatureItems : fallbackFeatureItems
  ).slice(0, Math.max(1, featureItemLimit));
  const insightsHomeHref = hrefFromLink(
    insightsHomeLink,
    hrefForPage('insights.html', linkMode, pathPrefix)
  );
  const categoryLinkOverrides: Record<string, CatoInsightLinkProp | undefined> = {
    resiliency: resiliencyLink,
    research: researchLink,
    resources: whitepapersLink,
    newsroom: newsroomLink
  };
  const hrefForCategory = (category: CatoInsightCategory) =>
    hrefFromLink(
      categoryLinkOverrides[category.id],
      hrefForPage(category.page, linkMode, pathPrefix)
    );
  const resiliencyHref =
    displayText(featureHref) ||
    hrefFromLink(resiliencyLink, hrefForPage('resiliency-reports.html', linkMode, pathPrefix));

  return (
    <div className="cato-cc">
      <style>{CATO_CSS}</style>
      <div className="cato-cc-mega">
        <div className="cato-cc-mega-inner">
          <section className="cato-cc-mega-intro" aria-label="Insights overview">
            {introKicker ? <p className="cato-cc-mega-kicker">{introKicker}</p> : null}
            <h2 className="cato-cc-mega-title">{heading}</h2>
            {summary ? <p className="cato-cc-mega-copy">{summary}</p> : null}
            <a
              href={insightsHomeHref}
              target={insightsHomeLink?.target}
              rel={relForTarget(insightsHomeLink?.target)}
              className="cato-cc-mega-home"
            >
              {introCtaLabel}
            </a>
          </section>
          <section aria-label="Insights navigation">
            {browseKicker ? <p className="cato-cc-mega-kicker">{browseKicker}</p> : null}
            <div className="cato-cc-mega-links">
              {menuCategories.map((category) => {
                const categoryLink = categoryLinkOverrides[category.id];
                return (
                  <a
                    key={category.id}
                    href={hrefForCategory(category)}
                    target={categoryLink?.target}
                    rel={relForTarget(categoryLink?.target)}
                    className="cato-cc-mega-link"
                  >
                    <strong>{category.title}</strong>
                    <span>{category.cardSummary}</span>
                  </a>
                );
              })}
            </div>
          </section>
          <a
            href={resiliencyHref}
            target={resiliencyLink?.target}
            rel={relForTarget(resiliencyLink?.target)}
            className="cato-cc-mega-feature"
          >
            {featureLabel ? <span className="cato-cc-pill">{featureLabel}</span> : null}
            <div>
              <h3>{featureTitle}</h3>
              <p>{featureSummary}</p>
              {showFeatureItems && featureItems.length ? (
                <div className="cato-cc-mega-feature-list">
                  {featureItems.map((item) => (
                    <div key={`${item.title}-${item.resourceType}`}>
                      <strong>{item.title}</strong>
                      <span>{item.resourceType}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              {showFeatureCta && featureCta ? (
                <strong className="cato-cc-mega-feature-cta">{featureCta}</strong>
              ) : null}
            </div>
          </a>
        </div>
      </div>
    </div>
  );
};

export const catoInsightsDefaults = {
  categories: DEFAULT_CATEGORIES,
  items: DEFAULT_ITEMS
};
