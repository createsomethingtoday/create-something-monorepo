/**
 * Editorial treatments for the opt-in development preview.
 * Selectors are owned by the actual route or its existing Canon component.
 * Every existing editorial hero receives an illustrative context image.
 * Images are never evidence of a run; actual proof and article artifacts remain intact.
 * Dynamic templates cover every slug accepted by the existing route loaders.
 * Workflow inventory: workflowPages.ts (12 prerendered guides).
 * Arc inventory: playbook-mcp/src/arcs.ts (54 generated + 1 explicit prototype).
 * Experiments: D1 WHERE published = 1 AND is_hidden = 0 AND archived = 0.
 * The current published experiment slug inventory requires that database.
 */
export const editorialPageTreatments = [
  {
    route: '/field-reports',
    title: "Read the results, including the limits.",
    titleSelector: '.performance-campaign-opening h1',
    lede: "See what each test measured, what failed, and what remains unknown.",
    ledeSelector: '.performance-campaign-opening__lede',
    copyEdits: [
      {
        "selector": ".performance-conversion-handoff__copy h2",
        "text": "Test one task before expanding."
      },
      {
        "selector": ".performance-conversion-handoff__copy > p",
        "text": "Bring a repeated task, its owner, and an example. We’ll assess whether a small test would help."
      }
    ],
    family: 'editorial',
    image: 'macro',
    shot: 'macro',
    focus: '54% 54%',
    caption: 'Concept illustration · inspection, not a reported test.',
    heroSelector: '.performance-campaign-opening',
    placement: 'hero',
    purpose: 'Lead with the published report index, dates and stated limits. Preserve the existing isometric wayfinding and signal band.'
  },
  {
    route: '/field-reports/template-review',
    lede: "Automation completed 49 of 50 selected Webflow template evidence packets. Automated judgment remained blocked. Reviewer time savings were not measured.",
    ledeSelector: '.performance-campaign-opening__lede',
    family: 'editorial',
    image: 'macro',
    shot: 'macro',
    focus: '48% 58%',
    caption: 'Concept illustration · checking work. Measured review evidence follows.',
    heroSelector: '.field-report .performance-campaign-opening',
    placement: 'hero',
    purpose: 'Keep the measured collection result, blocked decision boundary and source evidence ahead of any illustration.'
  },
  {
    route: '/field-reports/upstream-contributions',
    copyEdits: [
      {
        "selector": ".performance-narrative-stage__header h2",
        "text": "Follow the contribution from proposal to release."
      },
      {
        "selector": ".performance-narrative-stage__header > p",
        "text": "See what maintainers accepted, changed, and released. Contribution credit does not imply endorsement."
      },
      {
        "selector": ".performance-conversion-handoff__copy h2",
        "text": "Bring a workflow that must hold up under review."
      },
      {
        "selector": ".performance-conversion-handoff__copy > p",
        "text": "We reproduce the problem, propose a focused fix, and record the result. Your system’s owners decide what to accept."
      }
    ],
    family: 'editorial',
    image: 'hero',
    shot: 'wide',
    focus: '62% 58%',
    caption: 'Concept illustration · shared work, not a contribution record.',
    heroSelector: '.performance-campaign-opening',
    placement: 'hero',
    purpose: 'Use the actual contribution links and merge-versus-release distinctions as the visual and editorial proof.'
  },
  {
    route: '/workflows',
    title: "Find a guide for your task.",
    titleSelector: '.performance-campaign-opening h1',
    lede: "Learn when an approach helps, how to use it, and how to check the result.",
    ledeSelector: '.performance-campaign-opening__lede',
    copyEdits: [
      {
        "selector": "#playbook-route .performance-narrative-stage__header h2",
        "text": "Know what to observe, protect, keep, and prove."
      },
      {
        "selector": "#playbook-route .performance-narrative-stage__header > p",
        "text": "Each guide follows these four steps."
      },
      {
        "selector": ".performance-conversion-handoff__copy h2",
        "text": "Turn the guide into a plan for your work."
      },
      {
        "selector": ".performance-conversion-handoff__copy > p",
        "text": "Draft one real workflow: who owns it, what it may do, when it stops, and how you’ll check it."
      }
    ],
    family: 'editorial',
    image: 'team',
    shot: 'medium',
    focus: '52% 54%',
    caption: 'Concept illustration · guided practice. Actual steps follow.',
    heroSelector: '.workflow-library .performance-campaign-opening',
    placement: 'hero',
    purpose: 'Introduce the guide library with one material study, then give the numbered guide index the full reading width.'
  },
  {
    route: '/workflows/[slug]',
    family: 'editorial',
    image: 'macro',
    shot: 'macro',
    focus: '58% 56%',
    caption: 'Concept illustration · inspect the task. Follow the guide for actual steps.',
    heroSelector: '.guide-shell .guide-opening',
    placement: 'hero',
    purpose: 'Make the direct answer, fit, operating steps and proof links easy to scan. Preserve the guide route marks and all related guides.'
  },
  {
    route: '/dify/agent-eval-gates',
    family: 'editorial',
    image: null,
    caption: '',
    heroSelector: '.clear-page-section--hero',
    placement: 'none',
    purpose: 'Lead with the existing gate definitions; distinguish the operating requirements from observed evaluation results.'
  },
  {
    route: '/dify/mcp-control-plane',
    family: 'editorial',
    image: null,
    caption: '',
    heroSelector: '.performance-campaign-opening',
    placement: 'none',
    purpose: 'Retain the existing architecture, source evidence and field sequence as the explanation of authority and execution.'
  },
  {
    route: '/dify/ship-dify-app-with-mcp-tools',
    family: 'editorial',
    image: null,
    caption: '',
    heroSelector: '.clear-page-section--hero',
    placement: 'none',
    purpose: 'Keep the existing ArticleVisualFigure and implementation sequence intact; make the runbook and release checks the reading spine.'
  },
  {
    route: '/dify/template-marketplace-proof',
    family: 'editorial',
    image: null,
    caption: '',
    heroSelector: '.clear-page-section--hero',
    placement: 'none',
    purpose: 'Preserve the real template artifacts, existing figure and manual submission boundary without implying marketplace acceptance.'
  },
  {
    route: '/arcs',
    family: 'editorial',
    image: 'hero',
    shot: 'wide',
    focus: '60% 62%',
    caption: 'Concept illustration · a working system. Catalog entries remain read-only presentations.',
    heroSelector: '.arc-catalog__hero',
    placement: 'hero',
    purpose: 'Treat the grouped read-only presentation catalog as the primary artifact. Keep its counts, source relationships and noindex boundary visible.'
  },
  {
    route: '/arc/[slug]',
    family: 'editorial',
    image: 'team',
    shot: 'medium',
    focus: '50% 54%',
    caption: 'Concept illustration · coordinated work, not an executed workflow.',
    heroSelector: '.registry-arc__hero',
    placement: 'hero',
    purpose: 'Let the existing visitor-controlled narrative and registered artifacts explain each workflow. Preserve the explicit no-run claim.'
  },
  {
    route: '/arc/app-review-governance',
    family: 'editorial',
    image: 'macro',
    shot: 'macro',
    focus: '44% 54%',
    caption: 'Concept illustration · inspection. The Arc below is a reference fixture.',
    heroSelector: '.arc-hero',
    placement: 'hero',
    purpose: 'Give the actual ArcDeck priority, preserving its controls, reference-fixture status and separately metered or unknown cost labels.'
  },
  {
    route: '/experiments',
    title: "See what was built and tested.",
    titleSelector: '.performance-campaign-opening h1',
    lede: "Our research lives on .io. Explore the experiments, evidence and limits.",
    ledeSelector: '.performance-campaign-opening__lede',
    family: 'editorial',
    image: 'hero',
    shot: 'wide',
    focus: '58% 62%',
    caption: 'Concept illustration · building and testing, not a published experiment.',
    heroSelector: '.performance-campaign-opening',
    placement: 'hero',
    purpose: 'Preserve the approved hero and point to the canonical .io archive and papers. No agency database collection or invented records.'
  },
  {
    route: '/dispatch',
    title: "The work, with evidence.",
    titleSelector: '.performance-campaign-opening h1',
    lede: "What happened, what we learned, and where each result has limits.",
    ledeSelector: '.performance-campaign-opening__lede',
    copyEdits: [
      {
        "selector": "#cadence-title",
        "text": "One lesson. The right format."
      },
      {
        "selector": ".dispatch section[aria-labelledby=\"cadence-title\"] > .lede",
        "text": "Publication depends on evidence review and approval of the exact content and destination. Email is capped at two validated sends monthly; review slots do not promise publication."
      },
      {
        "selector": ".dispatch .schedule > .lede:last-child",
        "text": "Every selection needs evidence review and approval. We confirm publication and email delivery separately, after they happen."
      },
      {
        "selector": ".dispatch .reader-grid article:nth-child(2) > p",
        "text": "Read the field reports. When a lesson fits your work, map the task, tools, and decisions with us."
      },
      {
        "selector": ".performance-conversion-handoff__copy h2",
        "text": "Show us a handoff you still rebuild by hand."
      }
    ],
    family: 'editorial',
    image: 'team',
    shot: 'medium',
    focus: '48% 52%',
    caption: 'Concept illustration · sharing a method. Publication status follows.',
    heroSelector: '.dispatch .performance-campaign-opening',
    placement: 'hero',
    purpose: 'Make editorial status and evidence rules the content. Keep the planned cadence distinct from an active email subscription.'
  }
] as const;
