export const agencyCoreMessaging = {
  categoryLabel: 'AI workflow systems',
  startWithWorkflowLabel: 'Map one workflow',
  startWithWorkflowHref: '/map',
  tryMapLabel: 'Map one workflow',
  selfMapLabel: 'Map one workflow',
  selfMapHref: '/map',
  governanceChecklistLabel: 'Get Workflow Checklist',
  governanceChecklistHref: '/contact?source=resource&intent=governance-checklist&lane=not_sure',
  workflowTeardownLabel: 'Request Workflow Map',
  workflowTeardownHref: '/contact?source=resource&intent=workflow-teardown&lane=not_sure',
  bookMappingSessionLabel: 'Talk through one workflow',
  workflowMappingSessionHref:
    '/book?source=agency&intent=workflow-mapping&lane=workflow_infrastructure',
  servicesMappingSessionHref:
    '/book?source=services&intent=workflow-mapping&lane=workflow_infrastructure',
  engagementModelLabel: 'See the service path →',
  workflowCtaHeading: 'Bring one workflow your team is ready to delegate.',
  workflowCtaDetail:
    'I map the signals, decision owner, allowed actions, approval pauses, stop conditions, and proof record before AI runs it.'
} as const;
