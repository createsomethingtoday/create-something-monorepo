export const agencyCoreMessaging = {
  categoryLabel: 'Workflow Trust Layer',
  startWithWorkflowLabel: 'Map Your Workflow',
  startWithWorkflowHref: '/book?source=nav&intent=workflow-mapping&lane=workflow_infrastructure',
  governanceChecklistLabel: 'Get Trust Checklist',
  governanceChecklistHref: '/contact?source=resource&intent=governance-checklist&lane=not_sure',
  workflowTeardownLabel: 'Request Trust Map',
  workflowTeardownHref: '/contact?source=resource&intent=workflow-teardown&lane=not_sure',
  bookMappingSessionLabel: 'Map Your Workflow',
  workflowMappingSessionHref:
    '/book?source=agency&intent=workflow-mapping&lane=workflow_infrastructure',
  servicesMappingSessionHref:
    '/book?source=services&intent=workflow-mapping&lane=workflow_infrastructure',
  engagementModelLabel: 'See the workflow model →',
  workflowCtaHeading: 'Bring one workflow that should not stay manual.',
  workflowCtaDetail:
    'I map what agents can do, what needs approval, what must stop, and what evidence your team keeps.'
} as const;
