export const agencyCoreMessaging = {
  categoryLabel: 'AI workflow systems',
  startWithWorkflowLabel: 'Map your workflow',
  startWithWorkflowHref: '/map',
  tryMapLabel: 'Map your workflow',
  selfMapLabel: 'Map your workflow',
  selfMapHref: '/map',
  governanceChecklistLabel: 'Get Workflow Checklist',
  governanceChecklistHref: '/contact?source=resource&intent=governance-checklist&lane=not_sure',
  workflowTeardownLabel: 'Request a workflow map',
  workflowTeardownHref: '/contact?source=resource&intent=workflow-teardown&lane=not_sure',
  bookMappingSessionLabel: 'Book a mapping session',
  workflowMappingSessionHref:
    '/book?source=agency&intent=workflow-mapping&lane=workflow_infrastructure',
  servicesMappingSessionHref:
    '/book?source=services&intent=workflow-mapping&lane=workflow_infrastructure',
  workflowCompilerIntegrationHref: '/workflow-compiler-integration',
  workflowCompilerIntegrationBookingHref:
    '/book?source=workflow-compiler-integration&intent=compiler-integration&lane=workflow_infrastructure',
  agentFoundationLabel: 'Agent Foundation',
  agentFoundationHref: '/agent-foundation',
  reviewAgentFoundationLabel: 'See what we build',
  bookAgentFoundationLabel: 'Talk about your project',
  agentFoundationBookingHref:
    '/book?source=agent-foundation&intent=agent-foundation&lane=workflow_infrastructure',
  agentReadinessAuditHref: '/agent-readiness',
  agentReadinessAuditBookingHref:
    '/book?source=agent-readiness&intent=ai-readiness-audit&lane=workflow_infrastructure',
  engagementModelLabel: 'See how it works →',
  workflowCtaHeading: 'Tell us which task needs too much of your time.',
  workflowCtaDetail:
    'We’ll look at how the work happens today, where AI could help, and which decisions need a person.'
} as const;
