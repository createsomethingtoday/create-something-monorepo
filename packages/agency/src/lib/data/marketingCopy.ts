export const agencyCoreMessaging = {
  categoryLabel: 'AI workflow systems',
  startWithWorkflowLabel: 'Start a private workflow draft',
  startWithWorkflowHref: '/map',
  tryMapLabel: 'Start a private workflow draft',
  selfMapLabel: 'Start a private workflow draft',
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
  agentReadinessAuditHref: '/agent-readiness',
  agentReadinessAuditBookingHref:
    '/book?source=agent-readiness&intent=ai-readiness-audit&lane=workflow_infrastructure',
  engagementModelLabel: 'See the service path →',
  workflowCtaHeading: 'Bring one workflow your team is ready to delegate.',
  workflowCtaDetail:
    'I map the signals, decision owner, allowed actions, approval pauses, stop conditions, and proof record before AI runs it.'
} as const;
