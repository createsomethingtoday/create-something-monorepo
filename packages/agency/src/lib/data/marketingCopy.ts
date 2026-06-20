export const agencyCoreMessaging = {
  categoryLabel: 'Workflow Trust Layer',
  startWithWorkflowLabel: 'Start Workflow Map',
  startWithWorkflowHref: '/services#atlas-warmup',
  selfMapLabel: 'Start Workflow Map',
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
  workflowCtaHeading: 'Bring the workflow your team still protects by hand.',
  workflowCtaDetail:
    'I map what can run, what needs approval, what must stop, and what evidence your team keeps.'
} as const;
