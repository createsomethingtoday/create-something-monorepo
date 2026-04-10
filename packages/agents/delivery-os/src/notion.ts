import type { NotionDatabaseBlueprint, NotionPageBlueprint } from './types.js';

export const NOTION_DATABASE_BLUEPRINTS: NotionDatabaseBlueprint[] = [
  {
    name: 'Clients',
    purpose: 'One row per client account with ownership and status.',
    backedByTable: 'delivery_clients',
    properties: [
      { name: 'Client', type: 'title', description: 'Canonical client name.' },
      { name: 'Slug', type: 'text', description: 'Stable identifier used across native systems.' },
      { name: 'Industry', type: 'select', description: 'Primary industry or wedge.' },
      { name: 'Primary contact', type: 'people', description: 'Internal owner or client lead.' },
      { name: 'Status', type: 'status', description: 'Lead, active, paused, or complete.' }
    ]
  },
  {
    name: 'Engagements',
    purpose: 'Commercial delivery unit with launch state and ownership.',
    backedByTable: 'delivery_engagements',
    properties: [
      { name: 'Engagement', type: 'title', description: 'Sold initiative or retained workstream.' },
      { name: 'Client', type: 'relation', description: 'Relation back to Clients.' },
      { name: 'Status', type: 'status', description: 'Lead through managed / complete.' },
      { name: 'Target launch', type: 'date', description: 'Expected launch or handoff date.' },
      { name: 'Delivery owner', type: 'people', description: 'Primary delivery lead.' },
      { name: 'Commercial owner', type: 'people', description: 'Primary commercial contact.' }
    ]
  },
  {
    name: 'Delivery components',
    purpose: 'Shared record for site, platform, and product work inside one engagement.',
    backedByTable: 'delivery_components',
    properties: [
      { name: 'Component', type: 'title', description: 'Name of the build unit.' },
      { name: 'Engagement', type: 'relation', description: 'Relation back to Engagements.' },
      { name: 'Kind', type: 'select', description: 'site, platform, or product.' },
      { name: 'Status', type: 'status', description: 'Planned through live.' },
      { name: 'Live URL', type: 'url', description: 'Production URL when available.' },
      { name: 'Repo URL', type: 'url', description: 'Source repository link.' }
    ]
  },
  {
    name: 'Artifacts',
    purpose: 'Client-facing and internal docs, walkthroughs, contracts, and runbooks.',
    backedByTable: 'delivery_artifacts',
    properties: [
      { name: 'Artifact', type: 'title', description: 'Human-readable document name.' },
      { name: 'Engagement', type: 'relation', description: 'Owning engagement.' },
      { name: 'Component', type: 'relation', description: 'Optional related component.' },
      { name: 'Type', type: 'select', description: 'PRD, onboarding, contract, invoice, runbook, walkthrough, etc.' },
      { name: 'Status', type: 'status', description: 'Draft through paid.' },
      { name: 'Visibility', type: 'select', description: 'Internal, client, or operator.' },
      { name: 'Source URL', type: 'url', description: 'Canonical doc URL.' }
    ]
  },
  {
    name: 'Milestones',
    purpose: 'Delivery checkpoints and phase transitions.',
    backedByTable: 'delivery_milestones',
    properties: [
      { name: 'Milestone', type: 'title', description: 'Launch, kickoff, QA, handoff, etc.' },
      { name: 'Engagement', type: 'relation', description: 'Owning engagement.' },
      { name: 'Component', type: 'relation', description: 'Optional related component.' },
      { name: 'Status', type: 'status', description: 'Planned, active, blocked, done.' },
      { name: 'Target date', type: 'date', description: 'Planned target date.' }
    ]
  },
  {
    name: 'Integrations',
    purpose: 'Connected systems and their current state.',
    backedByTable: 'delivery_integrations',
    properties: [
      { name: 'Integration', type: 'title', description: 'Provider and purpose label.' },
      { name: 'Component', type: 'relation', description: 'Owning component.' },
      { name: 'Provider', type: 'select', description: 'Mailchimp, Stripe, Notion, MCP, etc.' },
      { name: 'Direction', type: 'select', description: 'Read, write, or bidirectional.' },
      { name: 'Status', type: 'status', description: 'Needed through connected.' },
      { name: 'Owner', type: 'people', description: 'Who owns the setup or credential.' }
    ]
  },
  {
    name: 'Commercials',
    purpose: 'Contracts, invoices, and ongoing management plans.',
    backedByTable: 'delivery_contracts + delivery_invoices + delivery_subscriptions',
    properties: [
      { name: 'Record', type: 'title', description: 'Contract or invoice label.' },
      { name: 'Engagement', type: 'relation', description: 'Owning engagement.' },
      { name: 'Type', type: 'select', description: 'Contract, invoice, subscription.' },
      { name: 'Status', type: 'status', description: 'Draft through paid.' },
      { name: 'Amount', type: 'number', description: 'Commercial amount.' },
      { name: 'Source URL', type: 'url', description: 'Invoice or contract URL.' }
    ]
  },
  {
    name: 'Operations',
    purpose: 'Access checklist, risks, decisions, and support state.',
    backedByTable: 'delivery_access_items + delivery_risks + delivery_decisions + delivery_support_plans',
    properties: [
      { name: 'Item', type: 'title', description: 'Risk, access item, or support record.' },
      { name: 'Engagement', type: 'relation', description: 'Owning engagement.' },
      { name: 'Component', type: 'relation', description: 'Optional related component.' },
      { name: 'Type', type: 'select', description: 'Access, risk, decision, support.' },
      { name: 'Status', type: 'status', description: 'Current operating state.' },
      { name: 'Owner', type: 'people', description: 'Responsible person.' }
    ]
  }
];

export const NOTION_ENGAGEMENT_HUB_BLUEPRINT: NotionPageBlueprint[] = [
  {
    title: 'Overview',
    audience: 'client',
    sections: ['What is being delivered', 'What is already live', 'What remains', 'Primary links']
  },
  {
    title: 'Execution snapshot',
    audience: 'client',
    sections: ['Milestones', 'Open decisions', 'Current blockers', 'Required client inputs']
  },
  {
    title: 'Commercials',
    audience: 'client',
    sections: ['Contract', 'Invoice', 'Ongoing management', 'Approval path']
  },
  {
    title: 'Operator handoff',
    audience: 'operator',
    sections: ['Access checklist', 'Integrations', 'Runbook', 'Rollback and support']
  },
  {
    title: 'Product pack',
    audience: 'client',
    sections: ['PRD', 'Timeline', 'Onboarding', 'Walkthrough', 'Support guide']
  }
];

export const COMPONENT_SPEC_PAGE_BLUEPRINTS: Record<'site' | 'platform' | 'product', NotionPageBlueprint> = {
  site: {
    title: 'Site component spec',
    audience: 'client',
    sections: ['Audience and goal', 'Page map', 'Forms and destinations', 'Domains and analytics', 'Ad destinations']
  },
  platform: {
    title: 'Platform component spec',
    audience: 'client',
    sections: ['User journeys', 'Roles and access', 'Operator workflows', 'Launch criteria', 'Support model']
  },
  product: {
    title: 'Product component spec',
    audience: 'client',
    sections: ['Capability catalog', 'Integrations', 'MCP and auth boundaries', 'Approval model', 'Observability and maintenance']
  }
};
