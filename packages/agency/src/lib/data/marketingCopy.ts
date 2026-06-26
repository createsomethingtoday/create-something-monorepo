export const agencyCoreMessaging = {
  categoryLabel: 'Delegated Work Control',
  startWithWorkflowLabel: 'Start Workflow Map',
  startWithWorkflowHref: '/services#atlas-warmup',
  tryMapLabel: 'Map a Workflow',
  selfMapLabel: 'Start Workflow Map',
  selfMapHref: '/services#atlas-warmup',
  governanceChecklistLabel: 'Get Workflow Checklist',
  governanceChecklistHref: '/contact?source=resource&intent=governance-checklist&lane=not_sure',
  workflowTeardownLabel: 'Request Workflow Trust Map',
  workflowTeardownHref: '/contact?source=resource&intent=workflow-teardown&lane=not_sure',
  bookMappingSessionLabel: 'Talk Through a Workflow',
  workflowMappingSessionHref:
    '/book?source=agency&intent=workflow-mapping&lane=workflow_infrastructure',
  servicesMappingSessionHref:
    '/book?source=services&intent=workflow-mapping&lane=workflow_infrastructure',
  engagementModelLabel: 'See the service path →',
  workflowCtaHeading: 'Bring one workflow your team wants to delegate.',
  workflowCtaDetail:
    'I show what can run, what needs approval, what must stop, who owns the decision, and what evidence your team keeps.'
} as const;
