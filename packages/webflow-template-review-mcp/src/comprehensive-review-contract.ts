export const COMPREHENSIVE_REVIEW_CONTRACT_VERSION = 'template-review-comprehensive-evidence.v1';

export const RUBRIC_DIMENSIONS = [
  'overall_user_experience',
  'graphic_design',
  'typography',
  'interaction_design',
  'hierarchy',
  'layout_design_quality',
  'responsive_design',
  'conversion_best_practices',
  'site_optimization',
  'accessibility',
] as const;

export const COMPREHENSIVE_REVIEW_CONTRACT = {
  version: COMPREHENSIVE_REVIEW_CONTRACT_VERSION,
  intent:
    'Produce a complete evidence packet for human template reviewers. This is supplemental review support, not an autonomous approval, rejection, rating, or publishing decision.',
  evidenceLabels: ['Auto', 'Partial', 'Manual'],
  requiredReportSections: [
    'Confirmed summary',
    'Coverage matrix',
    'Confirmed findings',
    'Human follow-up',
    'Manual checks remaining',
    'Decision boundary',
  ],
  reviewLanes: [
    {
      id: 'intake_context',
      evidenceLabel: 'Auto',
      requiredEvidence: [
        'version_id',
        'asset_id',
        'template name',
        'review status',
        'published URL',
        'submitted date when available',
        'whether Agent Review Feedback was blank before write when writing',
      ],
    },
    {
      id: 'published_site_validator',
      evidenceLabel: 'Auto/Partial',
      requiredEvidence: [
        'rubricCoverage',
        'pages analyzed',
        'validator issue counts by category',
        'critical errors versus warnings',
        'content, asset, accessibility, interaction, GSAP/custom-code signals',
      ],
    },
    {
      id: 'e2b_public_site_pass',
      evidenceLabel: 'Auto/Partial',
      requiredEvidence: [
        'exact URLs fetched',
        'HTTP status per sampled page',
        'page titles and H1s',
        'visible text evidence for content issues',
        'utility-page discovery and required license text checks',
        'same-origin link and empty-link signals',
        'form labels and button copy when forms exist',
        'responsive, console, screenshot, or performance observations when available',
      ],
    },
    {
      id: 'rubric_dimension_matrix',
      evidenceLabel: 'Auto/Partial/Manual',
      requiredEvidence: [
        'one row for every rubric dimension',
        'the evidence label for that dimension',
        'the current evidence or the reason the dimension remains manual',
      ],
    },
    {
      id: 'designer_admin_manual_checks',
      evidenceLabel: 'Manual',
      requiredEvidence: [
        'components',
        'variables',
        'unused styles/classes',
        'interactions cleanup',
        'Designer responsive QA',
        'forms',
        'CMS/dynamic page setup',
        'site settings',
        'custom fonts and licenses',
        'asset thumbnail',
        'template name and categories',
        'pricing/page-count calculation',
        'MRP/admin publishing prerequisites',
        'visual quality, originality, similarity/flooding, and category fit',
      ],
    },
  ],
  rubricDimensions: RUBRIC_DIMENSIONS,
  agentReviewFeedbackFormat: [
    'Supplemental agent initial review evidence',
    'Coverage matrix',
    'Confirmed findings',
    'Human follow-up',
    'Manual checks remaining',
    'Decision boundary',
  ],
  utilityPagePolicy:
    'Required utility pages do not need root-only slugs. Treat a failed guessed path, such as /utility-pages/licenses, as a failed candidate path unless the site linked to it. Verify discoverable linked utility pages and required license text before calling a license page missing.',
  decisionBoundary:
    'Do not emit approve, reject, quality rating, request changes, or creator-facing feedback unless the reviewer explicitly asks and the reviewer-owned write preconditions pass. Agent Review Feedback remains internal supplemental evidence and is not an official review decision.',
  findingRules: [
    'Every confirmed issue must cite a URL, validator category, visible evidence text, count, or current tool output.',
    'Every comprehensive report must state which URLs E2B fetched.',
    'Every comprehensive report must include manual checks remaining even when automated results are clean.',
    'Do not call visual quality, originality, similarity, category fit, or final quality band confirmed from published-site automation alone.',
  ],
};

export const COMPREHENSIVE_REVIEW_WORKFLOW_GUIDANCE = `## Comprehensive Review Evidence Contract

For comprehensive reports and Agent Review Feedback summaries, use ${COMPREHENSIVE_REVIEW_CONTRACT_VERSION}. The goal is a complete evidence packet for human reviewers, not an autonomous final decision.

Call \`template_review_get_comprehensive_review_contract\` when the user asks for a comprehensive review, asks to populate Agent Review Feedback from automated review evidence, or asks whether the review is complete enough to rely on.

Required comprehensive sections:
1. Confirmed summary
2. Coverage matrix
3. Confirmed findings
4. Human follow-up
5. Manual checks remaining
6. Decision boundary

The coverage matrix must include these lanes and label each as Auto, Partial, or Manual:
- Intake/context
- Published-site validator
- E2B public-site pass
- Rubric dimensions
- Designer/Admin/manual checks

The rubric matrix must mention every dimension: overall user experience, graphic design, typography, interaction design, hierarchy, layout design quality, responsive design, conversion best practices, site optimization, and accessibility.

Manual checks remaining must include Designer/Admin review areas that published-site automation cannot prove: components, variables, unused styles/classes, interactions cleanup, Designer responsive QA, forms, CMS/dynamic page setup, site settings, custom fonts/licenses, asset thumbnail, template name/categories, pricing/page-count calculation, MRP/admin publishing prerequisites, visual quality, originality, similarity/flooding, and category fit.

For utility pages, do not overstate guessed path failures. Required utility pages may be nested. If a sampled candidate path such as \`/utility-pages/licenses\` returns 404, say the candidate path failed and ask the reviewer to verify the actual linked license page unless the site itself linked to that broken URL.

Agent Review Feedback should be reviewer-skimable. Use the same section shape above, keep evidence concrete, and close with a decision boundary that says the note is internal supplemental evidence and not an official review decision.`;
