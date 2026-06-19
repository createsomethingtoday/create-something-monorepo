export const agencyCoreMessaging = {
  categoryLabel: 'Workflow control service',
  startWithWorkflowLabel: 'Start Atlas Map',
  startWithWorkflowHref: '/services#atlas-warmup',
  selfMapLabel: 'Start Atlas Map',
  selfMapHref: '/services#atlas-warmup',
  governanceChecklistLabel: 'Get Workflow Checklist',
  governanceChecklistHref: '/contact?source=resource&intent=governance-checklist&lane=not_sure',
  workflowTeardownLabel: 'Request Trust Map',
  workflowTeardownHref: '/contact?source=resource&intent=workflow-teardown&lane=not_sure',
  bookMappingSessionLabel: 'Book Mapping Session',
  workflowMappingSessionHref:
    '/book?source=agency&intent=workflow-mapping&lane=workflow_infrastructure',
  servicesMappingSessionHref:
    '/book?source=services&intent=workflow-mapping&lane=workflow_infrastructure',
  engagementModelLabel: 'See the service path →',
  workflowCtaHeading: 'Bring one workflow that should not stay manual.',
  workflowCtaDetail:
    'I map what agents can do, what needs approval, what must stop, and what evidence your team keeps.'
} as const;
