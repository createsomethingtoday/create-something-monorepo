import {
  siAirtable,
  siCloudflare,
  siGoogle,
  siHubspot,
  siOpenai,
  siSalesforce,
  siSlack,
  siWebflow,
  type SimpleIcon
} from 'simple-icons';

export type IntegrationProofItem = {
  id: string;
  name: string;
  role: 'platform' | 'connector';
  roleLabel: 'Built on' | 'Connects to';
  status: 'current_platform' | 'connector_available';
  statusLabel: 'Current platform' | 'Connector available';
  href: string;
  icon: SimpleIcon;
};

export const integrationProofItems: IntegrationProofItem[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    role: 'platform',
    roleLabel: 'Built on',
    status: 'current_platform',
    statusLabel: 'Current platform',
    href: '/stack',
    icon: siOpenai
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    role: 'platform',
    roleLabel: 'Built on',
    status: 'current_platform',
    statusLabel: 'Current platform',
    href: '/cloudflare',
    icon: siCloudflare
  },
  {
    id: 'googledrive',
    name: 'Google Workspace',
    role: 'connector',
    roleLabel: 'Connects to',
    status: 'connector_available',
    statusLabel: 'Connector available',
    href: '/partners?integration=google#integration-catalog',
    icon: siGoogle
  },
  {
    id: 'slack',
    name: 'Slack',
    role: 'connector',
    roleLabel: 'Connects to',
    status: 'connector_available',
    statusLabel: 'Connector available',
    href: '/partners?integration=slack#integration-catalog',
    icon: siSlack
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    role: 'connector',
    roleLabel: 'Connects to',
    status: 'connector_available',
    statusLabel: 'Connector available',
    href: '/partners?integration=salesforce#integration-catalog',
    icon: siSalesforce
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    role: 'connector',
    roleLabel: 'Connects to',
    status: 'connector_available',
    statusLabel: 'Connector available',
    href: '/partners?integration=hubspot#integration-catalog',
    icon: siHubspot
  },
  {
    id: 'airtable',
    name: 'Airtable',
    role: 'connector',
    roleLabel: 'Connects to',
    status: 'connector_available',
    statusLabel: 'Connector available',
    href: '/partners?integration=airtable#integration-catalog',
    icon: siAirtable
  },
  {
    id: 'webflow',
    name: 'Webflow',
    role: 'connector',
    roleLabel: 'Connects to',
    status: 'connector_available',
    statusLabel: 'Connector available',
    href: '/partners?integration=webflow#integration-catalog',
    icon: siWebflow
  }
];
