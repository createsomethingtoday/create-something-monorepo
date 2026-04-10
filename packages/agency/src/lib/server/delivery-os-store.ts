import type {
  ArtifactStatus,
  ArtifactType,
  CommercialStatus,
  DeliveryAccessItem,
  DeliveryArtifact,
  DeliveryClient,
  DeliveryCommercialSnapshot,
  DeliveryComponent,
  DeliveryComponentKind,
  DeliveryEngagement,
  DeliveryIntegration,
  DeliveryListFilter,
  DeliveryMilestone,
  DeliveryOsStore,
  DeliveryRisk,
  EngagementStatus,
  IntegrationDirection,
  IntegrationStatus,
  MilestoneStatus,
  RiskSeverity
} from '@create-something/delivery-os';

function client(
  id: string,
  name: string,
  slug: string,
  industry: string
): DeliveryClient {
  return { id, name, slug, industry, status: 'active', metadata: {} };
}

function engagement(
  id: string,
  clientId: string,
  name: string,
  status: EngagementStatus,
  summary: string,
  targetLaunchDate?: string,
  options: Partial<DeliveryEngagement> = {}
): DeliveryEngagement {
  return {
    id,
    clientId,
    name,
    status,
    startDate: options.startDate ?? null,
    commercialOwner: options.commercialOwner ?? null,
    deliveryOwner: options.deliveryOwner ?? null,
    summary,
    targetLaunchDate: targetLaunchDate ?? null,
    metadata: options.metadata ?? {}
  };
}

function component(
  id: string,
  engagementId: string,
  kind: DeliveryComponentKind,
  name: string,
  status: DeliveryComponent['status'],
  summary: string,
  options: Partial<DeliveryComponent> = {}
): DeliveryComponent {
  return {
    id,
    engagementId,
    kind,
    name,
    status,
    summary,
    brand: options.brand ?? null,
    liveUrl: options.liveUrl ?? null,
    repoUrl: options.repoUrl ?? null,
    dependsOnComponentId: options.dependsOnComponentId ?? null,
    metadata: options.metadata ?? {}
  };
}

function artifact(
  id: string,
  engagementId: string,
  type: ArtifactType,
  title: string,
  status: ArtifactStatus,
  visibility: DeliveryArtifact['visibility'],
  summary: string,
  options: Partial<DeliveryArtifact> = {}
): DeliveryArtifact {
  return {
    id,
    engagementId,
    componentId: options.componentId ?? null,
    type,
    title,
    status,
    sourceSystem: options.sourceSystem ?? 'notion',
    sourceUrl: options.sourceUrl ?? null,
    visibility,
    summary,
    metadata: options.metadata ?? {}
  };
}

function milestone(
  id: string,
  engagementId: string,
  title: string,
  status: MilestoneStatus,
  summary: string,
  options: Partial<DeliveryMilestone> = {}
): DeliveryMilestone {
  return {
    id,
    engagementId,
    componentId: options.componentId ?? null,
    title,
    status,
    summary,
    targetDate: options.targetDate ?? null,
    completedAt: options.completedAt ?? null,
    metadata: options.metadata ?? {}
  };
}

function integration(
  id: string,
  componentId: string,
  provider: string,
  purpose: string,
  direction: IntegrationDirection,
  status: IntegrationStatus,
  notes?: string
): DeliveryIntegration {
  return {
    id,
    componentId,
    provider,
    purpose,
    direction,
    status,
    notes: notes ?? null,
    metadata: {}
  };
}

function risk(
  id: string,
  engagementId: string,
  severity: RiskSeverity,
  summary: string,
  owner?: string,
  componentId?: string
): DeliveryRisk {
  return {
    id,
    engagementId,
    componentId: componentId ?? null,
    severity,
    summary,
    owner: owner ?? null,
    status: 'open',
    metadata: {}
  };
}

function accessItem(
  id: string,
  componentId: string,
  system: string,
  accessType: string,
  status: DeliveryAccessItem['status'],
  notes?: string,
  options: Partial<DeliveryAccessItem> = {}
): DeliveryAccessItem {
  return {
    id,
    componentId,
    system,
    accessType,
    owner: options.owner ?? null,
    status,
    notes: notes ?? null,
    metadata: options.metadata ?? {}
  };
}

function commercialSnapshot(
  engagementId: string,
  contractStatus: CommercialStatus,
  invoiceStatus: CommercialStatus,
  buildFee: number,
  monthlyFee?: number
): DeliveryCommercialSnapshot {
  return {
    engagementId,
    contractStatus,
    invoiceStatus,
    buildFee,
    monthlyFee: monthlyFee ?? null,
    metadata: {}
  };
}

export const deliveryClients: DeliveryClient[] = [
  client('client-create-something', 'CREATE SOMETHING', 'create-something', 'Internal products'),
  client('client-np-group', 'The NP Group', 'the-np-group', 'Healthcare staffing'),
  client('client-outerfields', 'Outerfields', 'outerfields', 'Creator platforms'),
  client('client-shivworks', 'ShivWorks', 'shivworks', 'Community and member network'),
  client('client-the-stack', 'The Stack', 'the-stack', 'Media and brand site')
];

export const deliveryEngagements: DeliveryEngagement[] = [
  engagement(
    'engagement-abundance',
    'client-np-group',
    'Abundance AI-native staffing pipeline',
    'onboarding',
    'Public nurse intake is live. Next phase is service connection, location-targeted marketing, and operator workflow expansion.',
    '2026-05-08',
    {
      metadata: {
        shareSlug: 'abundance'
      }
    }
  ),
  engagement(
    'engagement-outerfields-pcn',
    'client-outerfields',
    'Outerfields PCN platform',
    'managed',
    'Member platform is operating, but the operator handoff pack and documentation system need consolidation.',
    '2026-04-18',
    {
      metadata: {
        shareSlug: 'outerfields-pcn'
      }
    }
  ),
  engagement(
    'engagement-shivworks-pcn',
    'client-shivworks',
    'ShivWorks PCN network',
    'building',
    'PCN implementation is being built on the proven Outerfields pattern. Main missing piece is the client-facing and operator-facing documentation pack.',
    '2026-04-25',
    {
      metadata: {
        shareSlug: 'shivworks-pcn'
      }
    }
  ),
  engagement(
    'engagement-the-stack',
    'client-the-stack',
    'The Stack site delivery',
    'live',
    'Site delivery is complete and serves as the lighter-weight site-only version of the same delivery model.',
    '2026-03-28',
    {
      metadata: {
        shareSlug: 'the-stack'
      }
    }
  ),
  engagement(
    'engagement-tether',
    'client-create-something',
    'Tether Shopify sync app',
    'building',
    'Embedded Shopify app syncing Shopify data into Airtable and Notion, with OAuth bridges, background sync, and production hardening still in progress.',
    '2026-05-02',
    {
      metadata: {
        shareSlug: 'tether'
      }
    }
  )
];

export const deliveryComponents: DeliveryComponent[] = [
  component(
    'component-abundance-site',
    'engagement-abundance',
    'site',
    'Abundance marketing landing',
    'live',
    'Public campaign entry that routes nurses into the guided intake flow.',
    {
      brand: 'Abundance',
      liveUrl: 'https://abundance-concierge-chat.pages.dev',
      repoUrl: 'https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/concierge-chat'
    }
  ),
  component(
    'component-abundance-platform',
    'engagement-abundance',
    'platform',
    'Abundance intake and staffing workflow',
    'live',
    'Guided nurse intake, verification, uploads, recruiter booking, and operator progression.',
    {
      brand: 'Abundance',
      liveUrl: 'https://abundance-concierge-chat.pages.dev/apply',
      repoUrl: 'https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/concierge-chat'
    }
  ),
  component(
    'component-abundance-product',
    'engagement-abundance',
    'product',
    'Abundance operator and MCP layer',
    'building',
    'Operator workflow, database management, and MCP-enabled service orchestration for the staffing pipeline.',
    {
      brand: 'Abundance'
    }
  ),
  component(
    'component-outerfields-platform',
    'engagement-outerfields-pcn',
    'platform',
    'Outerfields PCN member network',
    'live',
    'Member experience, content library, admin workflows, video pipeline, and paid access controls.'
  ),
  component(
    'component-outerfields-product',
    'engagement-outerfields-pcn',
    'product',
    'Outerfields MCP and operator layer',
    'live',
    'Remote and local MCP surfaces plus platform operator tooling.'
  ),
  component(
    'component-shivworks-platform',
    'engagement-shivworks-pcn',
    'platform',
    'ShivWorks network',
    'building',
    'Paid network with dashboard, library, community, live sessions, VIP flows, and admin operations.',
    {
      repoUrl: 'https://github.com/createsomethingtoday/shivworks-network'
    }
  ),
  component(
    'component-shivworks-product',
    'engagement-shivworks-pcn',
    'product',
    'ShivWorks operator package',
    'planned',
    'Client docs, operator runbook, and support surface for the PCN delivery.'
  ),
  component(
    'component-stack-site',
    'engagement-the-stack',
    'site',
    'The Stack website',
    'live',
    'Delivered public-facing site and content experience.'
  ),
  component(
    'component-tether-platform',
    'engagement-tether',
    'platform',
    'Tether embedded merchant app',
    'building',
    'Shopify embedded app with dashboard, connections, sync history, and settings for one-way external sync.',
    {
      brand: 'Tether'
    }
  ),
  component(
    'component-tether-product',
    'engagement-tether',
    'product',
    'Tether sync engine and OAuth bridges',
    'building',
    'Shopify-to-Airtable and Shopify-to-Notion sync layer with provider OAuth bridges, Prisma persistence, and deployment hardening.',
    {
      brand: 'Tether'
    }
  )
];

export const deliveryArtifacts: DeliveryArtifact[] = [
  artifact(
    'artifact-abundance-hub',
    'engagement-abundance',
    'engagement_hub',
    'Engagement — The NP Group — Abundance AI-native staffing pipeline',
    'sent',
    'client',
    'Primary Notion hub for the sold next phase.',
    {
      sourceUrl: 'https://www.notion.so/The-NP-Group-Abundance-AI-native-staffing-pipeline-33efa8740b15818fa1d8fdeb885cff0e'
    }
  ),
  artifact(
    'artifact-abundance-prd',
    'engagement-abundance',
    'prd',
    'PRD — Abundance build and onboarding',
    'sent',
    'client',
    'Scope for the next build phase across intake, service connection, and operator workflow.',
    {
      componentId: 'component-abundance-platform',
      sourceUrl: 'https://www.notion.so/PRD-Abundance-build-and-onboarding-33efa8740b1581fc8939ca9688fda4e3'
    }
  ),
  artifact(
    'artifact-abundance-onboarding',
    'engagement-abundance',
    'onboarding',
    'Onboarding — access, setup, and team handoff',
    'sent',
    'client',
    'Client access checklist and onboarding steps.',
    {
      componentId: 'component-abundance-product',
      sourceUrl: 'https://www.notion.so/Onboarding-access-setup-and-team-handoff-33efa8740b1581ef8a66c834a41f01f2'
    }
  ),
  artifact(
    'artifact-abundance-timeline',
    'engagement-abundance',
    'timeline',
    'Timeline — proposed build sequence',
    'sent',
    'client',
    'Proposed rollout and phase timing for the next build.',
    {
      sourceUrl: 'https://www.notion.so/Timeline-proposed-build-sequence-33efa8740b1581199633d3f80741297e'
    }
  ),
  artifact(
    'artifact-abundance-contract',
    'engagement-abundance',
    'contract',
    'Contract — Abundance build scope and commercial terms',
    'sent',
    'client',
    'Contract for the next phase build and onboarding work.',
    {
      sourceUrl: 'https://www.notion.so/Contract-Abundance-build-scope-and-commercial-terms-33efa8740b158158b0cdea1c8b65f28e'
    }
  ),
  artifact(
    'artifact-abundance-invoice',
    'engagement-abundance',
    'invoice',
    'Invoice — kickoff deposit for Abundance build',
    'sent',
    'client',
    'Kickoff deposit invoice for the next build phase.',
    {
      sourceUrl: 'https://www.notion.so/Invoice-kickoff-deposit-for-Abundance-build-33efa8740b1581a9ac60d146a82b8cdd'
    }
  ),
  artifact(
    'artifact-abundance-walkthrough',
    'engagement-abundance',
    'walkthrough',
    'Abundance walkthrough video',
    'approved',
    'client',
    'Walkthrough of the live pilot and AI-native intake flow.',
    {
      sourceSystem: 'external',
      sourceUrl: 'https://share.descript.com/view/0wxPcYQzl8G'
    }
  ),
  artifact(
    'artifact-abundance-support',
    'engagement-abundance',
    'support_guide',
    'Abundance pilot support notes',
    'approved',
    'operator',
    'Current production state, rollout notes, and next-step management framing.'
  ),
  artifact(
    'artifact-outerfields-operator',
    'engagement-outerfields-pcn',
    'operator_guide',
    'Outerfields PCN operator guide',
    'draft',
    'operator',
    'Needs consolidation from platform docs, deployment notes, MCP setup, and admin workflows.'
  ),
  artifact(
    'artifact-outerfields-client-brief',
    'engagement-outerfields-pcn',
    'notes',
    'Outerfields PCN delivery brief',
    'approved',
    'client',
    'Client-facing delivery summary covering live platform scope, current managed-state posture, and remaining documentation consolidation.'
  ),
  artifact(
    'artifact-shivworks-repo',
    'engagement-shivworks-pcn',
    'notes',
    'ShivWorks platform repository',
    'approved',
    'operator',
    'Primary repo for the ShivWorks network build.',
    {
      sourceSystem: 'external',
      sourceUrl: 'https://github.com/createsomethingtoday/shivworks-network'
    }
  ),
  artifact(
    'artifact-shivworks-client-brief',
    'engagement-shivworks-pcn',
    'notes',
    'ShivWorks build and launch brief',
    'draft',
    'client',
    'Shareable build brief for the ShivWorks PCN rollout, current phase, and next handoff deliverables.'
  ),
  artifact(
    'artifact-shivworks-handoff',
    'engagement-shivworks-pcn',
    'operator_guide',
    'ShivWorks PCN handoff pack',
    'draft',
    'client',
    'Client/operator documentation pack still needs to be assembled.'
  ),
  artifact(
    'artifact-stack-walkthrough',
    'engagement-the-stack',
    'walkthrough',
    'The Stack delivery notes',
    'approved',
    'operator',
    'Reference site-only delivery using the same commercial and handoff pattern.'
  ),
  artifact(
    'artifact-stack-client-summary',
    'engagement-the-stack',
    'notes',
    'The Stack delivery summary',
    'approved',
    'client',
    'Client-facing summary of the completed site delivery and the lighter-weight site-only version of the model.'
  ),
  artifact(
    'artifact-tether-readme',
    'engagement-tether',
    'notes',
    'Tether README and deployment baseline',
    'approved',
    'operator',
    'Primary overview for the Shopify embedded app, local environment, OAuth bridges, and production checklist.',
    {
      componentId: 'component-tether-platform',
      sourceSystem: 'native'
    }
  ),
  artifact(
    'artifact-tether-onboarding',
    'engagement-tether',
    'onboarding',
    'Tether developer onboarding guide',
    'approved',
    'operator',
    'Detailed onboarding covering Shopify data model, embedded app architecture, sync concepts, and platform constraints.',
    {
      componentId: 'component-tether-product',
      sourceSystem: 'native'
    }
  ),
  artifact(
    'artifact-tether-client-brief',
    'engagement-tether',
    'notes',
    'Tether production readiness brief',
    'review',
    'client',
    'Client-safe overview of the Shopify app scope, current production hardening, and the remaining approval/deployment items.'
  ),
  artifact(
    'artifact-tether-operator-pack',
    'engagement-tether',
    'operator_guide',
    'Tether delivery and operator pack',
    'draft',
    'operator',
    'Client/operator handoff still needs to be consolidated into a reusable delivery package for future Shopify app deliveries.',
    {
      componentId: 'component-tether-product'
    }
  )
];

export const deliveryMilestones: DeliveryMilestone[] = [
  milestone(
    'milestone-abundance-pilot-live',
    'engagement-abundance',
    'Pilot intake flow live',
    'done',
    'Public nurse intake, verification, uploads, and recruiter booking are live.',
    {
      componentId: 'component-abundance-platform',
      completedAt: '2026-04-10'
    }
  ),
  milestone(
    'milestone-abundance-doc-pack',
    'engagement-abundance',
    'Client onboarding package sent',
    'done',
    'PRD, timeline, contract, invoice, and onboarding docs delivered in Notion.',
    {
      completedAt: '2026-04-10'
    }
  ),
  milestone(
    'milestone-abundance-kickoff',
    'engagement-abundance',
    'Kickoff payment and access collection',
    'active',
    'Core service logins are now in hand. Remaining kickoff items are client approval, deposit, Facebook ad account access, and connection work inside the live system.',
    {
      targetDate: '2026-04-17'
    }
  ),
  milestone(
    'milestone-abundance-service-connection',
    'engagement-abundance',
    'Service connection sprint',
    'planned',
    'Connect Mailchimp, Paylocity, Jotform, Facebook ads, and operator MCP surfaces.',
    {
      componentId: 'component-abundance-product',
      targetDate: '2026-04-24'
    }
  ),
  milestone(
    'milestone-outerfields-live',
    'engagement-outerfields-pcn',
    'Outerfields PCN live operations',
    'done',
    'Platform and operator surfaces are in managed operation.',
    {
      completedAt: '2026-04-01'
    }
  ),
  milestone(
    'milestone-outerfields-docs',
    'engagement-outerfields-pcn',
    'Operator doc consolidation',
    'active',
    'Unify deployment, MCP, admin, and support docs into one handoff pack.',
    {
      targetDate: '2026-04-18'
    }
  ),
  milestone(
    'milestone-shivworks-build',
    'engagement-shivworks-pcn',
    'Platform build active',
    'active',
    'Core ShivWorks member network is in implementation.',
    {
      targetDate: '2026-04-25'
    }
  ),
  milestone(
    'milestone-shivworks-docs',
    'engagement-shivworks-pcn',
    'Client/operator docs package',
    'planned',
    'Create the handoff pack for launch, operations, and support.',
    {
      componentId: 'component-shivworks-product',
      targetDate: '2026-04-28'
    }
  ),
  milestone(
    'milestone-stack-live',
    'engagement-the-stack',
    'Site delivery complete',
    'done',
    'Stack website shipped as the site-only version of the delivery model.',
    {
      completedAt: '2026-03-28'
    }
  ),
  milestone(
    'milestone-tether-airtable',
    'engagement-tether',
    'Airtable connection and sync proven',
    'done',
    'Airtable auth and one-way sync are live in the embedded app.',
    {
      componentId: 'component-tether-product',
      completedAt: '2026-04-09'
    }
  ),
  milestone(
    'milestone-tether-notion',
    'engagement-tether',
    'Notion connection and sync proven',
    'done',
    'Notion auth and one-way sync are live in the embedded app.',
    {
      componentId: 'component-tether-product',
      completedAt: '2026-04-09'
    }
  ),
  milestone(
    'milestone-tether-production',
    'engagement-tether',
    'Production deployment hardening',
    'active',
    'Production database, encryption, stable app URL, and OAuth redirect alignment are still being finalized.',
    {
      componentId: 'component-tether-platform',
      targetDate: '2026-05-02'
    }
  ),
  milestone(
    'milestone-tether-docs',
    'engagement-tether',
    'Reusable Shopify app delivery docs',
    'planned',
    'Consolidate README, onboarding, architecture, and support guidance into the repeatable delivery OS format.',
    {
      componentId: 'component-tether-product',
      targetDate: '2026-05-06'
    }
  )
];

export const deliveryIntegrations: DeliveryIntegration[] = [
  integration(
    'integration-abundance-resend',
    'component-abundance-platform',
    'Resend',
    'One-time email verification for protected intake steps.',
    'write',
    'connected'
  ),
  integration(
    'integration-abundance-mapbox',
    'component-abundance-platform',
    'Mapbox',
    'Location normalization and fallback recovery.',
    'read',
    'connected'
  ),
  integration(
    'integration-abundance-mailchimp',
    'component-abundance-product',
    'Mailchimp',
    'Marketing funnel and candidate nurture routing.',
    'bidirectional',
    'requested',
    'Login details received. Audience, automation, and nurture routing still need to be connected and validated.'
  ),
  integration(
    'integration-abundance-paylocity',
    'component-abundance-product',
    'Paylocity',
    'Downstream employer and workforce data connection.',
    'bidirectional',
    'requested',
    'Login details received. Employer and workforce connection still needs to be wired and validated.'
  ),
  integration(
    'integration-abundance-jotform',
    'component-abundance-product',
    'Jotform',
    'Structured intake and document routing where needed.',
    'bidirectional',
    'requested',
    'Login details received. Form routing and document handoff still need to be connected where needed.'
  ),
  integration(
    'integration-abundance-facebook',
    'component-abundance-site',
    'Facebook Ads',
    'Traffic and campaign routing into the live intake app.',
    'write',
    'needed',
    'Ad creative, account access, and spend remain client-owned.'
  ),
  integration(
    'integration-outerfields-stream',
    'component-outerfields-platform',
    'Cloudflare Stream',
    'Direct upload, processing, and playback pipeline.',
    'bidirectional',
    'connected'
  ),
  integration(
    'integration-outerfields-circle',
    'component-outerfields-platform',
    'Circle',
    'Community/member surface integration.',
    'read',
    'connected'
  ),
  integration(
    'integration-outerfields-stripe',
    'component-outerfields-platform',
    'Stripe',
    'Paid access and membership state.',
    'bidirectional',
    'connected'
  ),
  integration(
    'integration-shivworks-clerk',
    'component-shivworks-platform',
    'Clerk',
    'Identity and membership authentication.',
    'bidirectional',
    'connected'
  ),
  integration(
    'integration-shivworks-stripe',
    'component-shivworks-platform',
    'Stripe',
    'Bronze/VIP purchase and access gating.',
    'bidirectional',
    'connected'
  ),
  integration(
    'integration-shivworks-resend',
    'component-shivworks-platform',
    'Resend',
    'Onboarding and transactional email.',
    'write',
    'connected'
  ),
  integration(
    'integration-tether-shopify',
    'component-tether-platform',
    'Shopify Admin API',
    'Embedded merchant app auth, resource access, and sync source of truth.',
    'bidirectional',
    'connected'
  ),
  integration(
    'integration-tether-airtable',
    'component-tether-product',
    'Airtable',
    'External sync target with OAuth app and field mapping.',
    'bidirectional',
    'connected'
  ),
  integration(
    'integration-tether-notion',
    'component-tether-product',
    'Notion',
    'External sync target with OAuth app and database mapping.',
    'bidirectional',
    'connected'
  ),
  integration(
    'integration-tether-cloudflare',
    'component-tether-product',
    'Cloudflare Workers',
    'Stable Airtable and Notion OAuth callback bridges during Shopify CLI and hosted runtime.',
    'write',
    'connected'
  )
];

export const deliveryRisks: DeliveryRisk[] = [
  risk(
    'risk-abundance-ad-access',
    'engagement-abundance',
    'high',
    'Facebook ad account access and campaign ownership still need client handoff before paid traffic can begin.',
    'client',
    'component-abundance-site'
  ),
  risk(
    'risk-abundance-location-list',
    'engagement-abundance',
    'medium',
    'Target staffing locations and market priority list still need explicit client confirmation.',
    'client',
    'component-abundance-product'
  ),
  risk(
    'risk-abundance-service-access',
    'engagement-abundance',
    'medium',
    'Mailchimp, Paylocity, and Jotform login details are in hand, but those services still need to be connected and validated in the system.',
    'operator',
    'component-abundance-product'
  ),
  risk(
    'risk-outerfields-docs',
    'engagement-outerfields-pcn',
    'medium',
    'Delivery documentation is fragmented across deployment notes, MCP docs, and public-facing collateral.',
    'operator',
    'component-outerfields-product'
  ),
  risk(
    'risk-shivworks-docs',
    'engagement-shivworks-pcn',
    'high',
    'Client and operator handoff documentation has not been packaged yet for the ShivWorks PCN delivery.',
    'operator',
    'component-shivworks-product'
  ),
  risk(
    'risk-tether-pcd',
    'engagement-tether',
    'high',
    'Orders and customers require Shopify Protected Customer Data approval before those sync paths can be fully productionized.',
    'operator',
    'component-tether-product'
  ),
  risk(
    'risk-tether-production',
    'engagement-tether',
    'medium',
    'Production deployment still needs persistent database, encryption key, and stable app URL with provider redirect alignment.',
    'operator',
    'component-tether-platform'
  ),
  risk(
    'risk-tether-docs',
    'engagement-tether',
    'medium',
    'Delivery handoff docs are still spread across repo docs instead of a client-ready operator package.',
    'operator',
    'component-tether-product'
  )
];

export const deliveryAccessItems: DeliveryAccessItem[] = [
  accessItem(
    'access-abundance-facebook',
    'component-abundance-site',
    'Facebook Ads',
    'ad_account',
    'needed',
    'Client-owned ad account, spend, and management access.',
    { owner: 'client' }
  ),
  accessItem(
    'access-abundance-mailchimp',
    'component-abundance-product',
    'Mailchimp',
    'api_access',
    'granted',
    'Login details received. Connection and validation are now in progress.',
    { owner: 'client' }
  ),
  accessItem(
    'access-abundance-paylocity',
    'component-abundance-product',
    'Paylocity',
    'api_access',
    'granted',
    'Login details received. Employer and workforce connection is pending implementation.',
    { owner: 'client' }
  ),
  accessItem(
    'access-abundance-jotform',
    'component-abundance-product',
    'Jotform',
    'workspace_access',
    'granted',
    'Login details received. Form routing will be connected as part of the service sprint.',
    { owner: 'client' }
  ),
  accessItem(
    'access-shivworks-operator',
    'component-shivworks-product',
    'ShivWorks operator docs',
    'handoff_pack',
    'needed',
    'Need to create and deliver the operator runbook and support guide.',
    { owner: 'operator' }
  ),
  accessItem(
    'access-tether-shopify',
    'component-tether-platform',
    'Shopify Partner + dev store',
    'platform_access',
    'granted',
    'Required for embedded app configuration, scopes, and deployment.',
    { owner: 'operator' }
  ),
  accessItem(
    'access-tether-airtable',
    'component-tether-product',
    'Airtable OAuth app',
    'oauth_credentials',
    'granted',
    'Needed for Airtable auth and stable callback bridge configuration.',
    { owner: 'operator' }
  ),
  accessItem(
    'access-tether-notion',
    'component-tether-product',
    'Notion OAuth app',
    'oauth_credentials',
    'granted',
    'Needed for Notion auth and stable callback bridge configuration.',
    { owner: 'operator' }
  ),
  accessItem(
    'access-tether-hosting',
    'component-tether-platform',
    'Production hosting env',
    'deploy_access',
    'needed',
    'Need final production runtime configuration with persistent DB and encryption key.',
    { owner: 'operator' }
  )
];

export const deliveryCommercials: DeliveryCommercialSnapshot[] = [
  commercialSnapshot('engagement-abundance', 'sent', 'sent', 5000, 900)
];

export const deliveryOsSeed = {
  clients: deliveryClients,
  engagements: deliveryEngagements,
  components: deliveryComponents,
  artifacts: deliveryArtifacts,
  milestones: deliveryMilestones,
  integrations: deliveryIntegrations,
  risks: deliveryRisks,
  accessItems: deliveryAccessItems,
  commercials: deliveryCommercials
};

function getEngagementShareSlug(engagement: DeliveryEngagement): string {
  const candidate = engagement.metadata?.shareSlug;
  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    return candidate.trim().toLowerCase();
  }

  return engagement.id.replace(/^engagement-/, '');
}

export function getDeliverySharePath(engagement: DeliveryEngagement): string {
  return `/delivery/${getEngagementShareSlug(engagement)}`;
}

export type DeliverySharePage = Awaited<ReturnType<typeof getDeliverySharePage>>;

export function listShareableDeliveries() {
  return deliveryEngagements.map((engagement) => {
    const client = getClientById(engagement.clientId) ?? null;

    return {
      slug: getEngagementShareSlug(engagement),
      path: getDeliverySharePath(engagement),
      engagement,
      client
    };
  });
}

function matchesFilter(
  component: { engagementId?: string | null; componentId?: string | null; status?: string | null },
  filter: DeliveryListFilter
): boolean {
  if (filter.engagementId && component.engagementId !== filter.engagementId) return false;
  if (filter.componentId && component.componentId !== filter.componentId) return false;
  if (filter.status && component.status !== filter.status) return false;
  return true;
}

function getClientById(clientId: string): DeliveryClient | undefined {
  return deliveryClients.find((row) => row.id === clientId);
}

export function createSeedDeliveryOsStore(): DeliveryOsStore {
  return {
    async listEngagements(filter: DeliveryListFilter = {}) {
      return deliveryEngagements.filter((row) => {
        if (filter?.engagementId && row.id !== filter.engagementId) return false;
        if (filter?.status && row.status !== filter.status) return false;
        if (filter?.clientId && row.clientId !== filter.clientId) return false;
        if (filter?.clientSlug) {
          const clientRow = getClientById(row.clientId);
          if (clientRow?.slug !== filter.clientSlug) return false;
        }
        return true;
      });
    },
    async getEngagement(input: { engagementId?: string; clientSlug?: string }) {
      if (input.engagementId) {
        return deliveryEngagements.find((row) => row.id === input.engagementId) ?? null;
      }
      if (input.clientSlug) {
        const targetClient = deliveryClients.find((row) => row.slug === input.clientSlug);
        if (!targetClient) return null;
        return deliveryEngagements.find((row) => row.clientId === targetClient.id) ?? null;
      }
      return null;
    },
    async listComponents(filter: DeliveryListFilter) {
      return deliveryComponents.filter((row) => {
        if (!matchesFilter({ engagementId: row.engagementId, status: row.status }, filter)) return false;
        if (filter.kind && row.kind !== filter.kind) return false;
        return true;
      });
    },
    async listArtifacts(filter: DeliveryListFilter & { visibility?: DeliveryArtifact['visibility'] }) {
      return deliveryArtifacts.filter((row) => {
        if (!matchesFilter({ engagementId: row.engagementId, componentId: row.componentId, status: row.status }, filter)) return false;
        if (filter.visibility && row.visibility !== filter.visibility) return false;
        return true;
      });
    },
    async listMilestones(filter: DeliveryListFilter) {
      return deliveryMilestones.filter((row) =>
        matchesFilter({ engagementId: row.engagementId, componentId: row.componentId, status: row.status }, filter)
      );
    },
    async listIntegrations(filter: DeliveryListFilter) {
      return deliveryIntegrations.filter((row) => {
        if (filter.componentId && row.componentId !== filter.componentId) return false;
        if (filter.status && row.status !== filter.status) return false;
        if (filter.engagementId) {
          const componentRow = deliveryComponents.find((component) => component.id === row.componentId);
          if (componentRow?.engagementId !== filter.engagementId) return false;
        }
        if (filter.kind) {
          const componentRow = deliveryComponents.find((component) => component.id === row.componentId);
          if (componentRow?.kind !== filter.kind) return false;
        }
        return true;
      });
    },
    async listRisks(filter: DeliveryListFilter) {
      return deliveryRisks.filter((row) =>
        matchesFilter({ engagementId: row.engagementId, componentId: row.componentId, status: row.status }, filter)
      );
    },
    async listAccessItems(filter: DeliveryListFilter) {
      return deliveryAccessItems.filter((row) => {
        if (filter.componentId && row.componentId !== filter.componentId) return false;
        if (filter.status && row.status !== filter.status) return false;
        if (filter.engagementId) {
          const componentRow = deliveryComponents.find((component) => component.id === row.componentId);
          if (componentRow?.engagementId !== filter.engagementId) return false;
        }
        if (filter.kind) {
          const componentRow = deliveryComponents.find((component) => component.id === row.componentId);
          if (componentRow?.kind !== filter.kind) return false;
        }
        return true;
      });
    },
    async getCommercialSnapshot(input: { engagementId: string }) {
      return deliveryCommercials.find((row) => row.engagementId === input.engagementId) ?? null;
    }
  };
}

export async function getDeliveryWorkspace(engagementId?: string) {
  const store = createSeedDeliveryOsStore();
  const engagements = await store.listEngagements();
  const selectedEngagement = engagementId
    ? (await store.getEngagement({ engagementId })) ?? engagements[0] ?? null
    : engagements[0] ?? null;

  if (!selectedEngagement) {
    return {
      engagements,
      selectedEngagement: null,
      selectedClient: null,
      components: [],
      artifacts: [],
      milestones: [],
      integrations: [],
      risks: [],
      accessItems: [],
      commercial: null
    };
  }

  const selectedClient = getClientById(selectedEngagement.clientId) ?? null;
  const components = await store.listComponents({ engagementId: selectedEngagement.id });
  const artifacts = await store.listArtifacts({ engagementId: selectedEngagement.id });
  const milestones = await store.listMilestones({ engagementId: selectedEngagement.id });
  const integrations = await store.listIntegrations({ engagementId: selectedEngagement.id });
  const risks = await store.listRisks({ engagementId: selectedEngagement.id });
  const accessItems = await store.listAccessItems({ engagementId: selectedEngagement.id });
  const commercial = await store.getCommercialSnapshot({ engagementId: selectedEngagement.id });

  return {
    engagements,
    selectedEngagement,
    selectedClient,
    components,
    artifacts,
    milestones,
    integrations,
    risks,
    accessItems,
    commercial
  };
}

export async function getDeliverySharePage(shareSlug: string) {
  const engagement = deliveryEngagements.find((row) => getEngagementShareSlug(row) === shareSlug);
  if (!engagement) return null;

  const client = getClientById(engagement.clientId) ?? null;
  const components = deliveryComponents.filter((row) => row.engagementId === engagement.id);
  const artifacts = deliveryArtifacts.filter(
    (row) => row.engagementId === engagement.id && row.visibility === 'client'
  );
  const milestones = deliveryMilestones.filter((row) => row.engagementId === engagement.id);
  const integrations = deliveryIntegrations.filter((row) => {
    const componentRow = deliveryComponents.find((component) => component.id === row.componentId);
    return componentRow?.engagementId === engagement.id;
  });
  const clientRisks = deliveryRisks.filter(
    (row) => row.engagementId === engagement.id && row.owner === 'client' && row.status !== 'closed'
  );
  const clientAccessItems = deliveryAccessItems.filter((row) => {
    const componentRow = deliveryComponents.find((component) => component.id === row.componentId);
    return componentRow?.engagementId === engagement.id && row.owner === 'client';
  });
  const clientActions = clientAccessItems.filter((row) => {
    const componentRow = deliveryComponents.find((component) => component.id === row.componentId);
    return (
      componentRow?.engagementId === engagement.id &&
      row.status !== 'granted' &&
      row.status !== 'revoked'
    );
  });
  const commercial = deliveryCommercials.find((row) => row.engagementId === engagement.id) ?? null;

  return {
    slug: getEngagementShareSlug(engagement),
    path: getDeliverySharePath(engagement),
    engagement,
    client,
    components,
    artifacts,
    milestones,
    integrations,
    clientRisks,
    clientAccessItems,
    clientActions,
    commercial
  };
}
