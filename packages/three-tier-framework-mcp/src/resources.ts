/**
 * Three-Tier Framework — Resource Handlers (Database Tier)
 * 
 * Application-controlled data that agents can read and reference.
 * MCP Resources primitive — the Database tier of this server.
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListResourceTemplatesRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import { TIERS, CROSS_CUTTING_CONCERNS } from './framework/definitions.js';
import { MCP_MAPPINGS, CLOUDFLARE_MAPPINGS, AUTOMOTIVE_MAPPINGS, SAMPLING_EXPLANATION, POLICY_AS_ARTIFACT } from './framework/mappings.js';
import { FRAMEWORK_DOCUMENT } from './framework/document.js';
import { CASE_STUDIES, CASE_STUDY_LIST } from './framework/examples.js';

export function registerResources(server: Server): void {

  // List resource templates (parameterized URIs)
  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
    resourceTemplates: [
      {
        uriTemplate: 'framework://definitions/{tier}',
        name: 'Tier Definition',
        description: 'Individual tier definition. Valid tiers: database, rules, policy.',
        mimeType: 'application/json'
      }
    ]
  }));

  // List all static resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: 'framework://definitions',
        name: 'All Tier Definitions',
        description: 'All three tier definitions (Database, Rules, Policy) as structured JSON.',
        mimeType: 'application/json'
      },
      {
        uri: 'framework://crosscutting',
        name: 'Cross-Cutting Concerns',
        description: 'The four cross-cutting concerns: Touchpoints, Artifacts, Orchestration, Insight.',
        mimeType: 'application/json'
      },
      {
        uri: 'framework://mappings/mcp',
        name: 'MCP Mapping',
        description: 'How MCP primitives (Resources, Tools, Prompts) map to framework tiers via control models.',
        mimeType: 'application/json'
      },
      {
        uri: 'framework://mappings/cloudflare',
        name: 'Cloudflare Mapping',
        description: 'How Cloudflare services map to framework tiers for a unified stack implementation.',
        mimeType: 'application/json'
      },
      {
        uri: 'framework://mappings/automotive',
        name: 'Automotive Mapping',
        description: 'How the Automotive Framework metaphor maps vehicle parts to framework tiers.',
        mimeType: 'application/json'
      },
      {
        uri: 'framework://sampling',
        name: 'Sampling Feedback Loop',
        description: 'The recursive property: how MCP sampling allows Rules to request Policy.',
        mimeType: 'application/json'
      },
      {
        uri: 'framework://policy-as-artifact',
        name: 'Policy as Artifact',
        description: 'How policy flows through tiers as data, not external scaffolding.',
        mimeType: 'application/json'
      },
      {
        uri: 'framework://full',
        name: 'Complete Framework Document',
        description: 'The full Three-Tier Framework document (v1.3) as markdown.',
        mimeType: 'text/markdown'
      },
      {
        uri: 'framework://examples',
        name: 'Case Studies Index',
        description: 'List of all case studies with key insights and tier coverage.',
        mimeType: 'application/json'
      },
      {
        uri: 'framework://examples/workway',
        name: 'Case Study: WORKWAY',
        description: 'Construction automation via Procore analyzed through the Three-Tier Framework.',
        mimeType: 'application/json'
      },
      {
        uri: 'framework://examples/gmail-sync',
        name: 'Case Study: Gmail Sync',
        description: 'Email-to-Notion MCP server analyzed through the Three-Tier Framework.',
        mimeType: 'application/json'
      },
      {
        uri: 'framework://examples/three-tier-framework',
        name: 'Case Study: This Server',
        description: 'The Three-Tier Framework MCP server analyzed through its own framework (recursive).',
        mimeType: 'application/json'
      },
      {
        uri: 'framework://examples/devops-platform',
        name: 'Case Study: DevOps Platform',
        description: 'Reference architecture for a DevOps platform analyzed through the framework.',
        mimeType: 'application/json'
      }
    ]
  }));

  // Read individual resources
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    // Handle parameterized tier definitions
    const tierMatch = uri.match(/^framework:\/\/definitions\/(\w+)$/);
    if (tierMatch) {
      const tierName = tierMatch[1];
      const tier = TIERS[tierName];
      if (!tier) {
        throw new Error(`Unknown tier: ${tierName}. Valid tiers: database, automation, judgment.`);
      }
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(tier, null, 2)
        }]
      };
    }

    // Handle parameterized case study examples
    const exampleMatch = uri.match(/^framework:\/\/examples\/(.+)$/);
    if (exampleMatch) {
      const slug = exampleMatch[1];
      const caseStudy = CASE_STUDIES[slug];
      if (!caseStudy) {
        throw new Error(`Unknown case study: ${slug}. Available: ${Object.keys(CASE_STUDIES).join(', ')}.`);
      }
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(caseStudy, null, 2)
        }]
      };
    }

    // Handle static resources
    switch (uri) {
      case 'framework://definitions':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(TIERS, null, 2)
          }]
        };

      case 'framework://crosscutting':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(CROSS_CUTTING_CONCERNS, null, 2)
          }]
        };

      case 'framework://mappings/mcp':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(MCP_MAPPINGS, null, 2)
          }]
        };

      case 'framework://mappings/cloudflare':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(CLOUDFLARE_MAPPINGS, null, 2)
          }]
        };

      case 'framework://mappings/automotive':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(AUTOMOTIVE_MAPPINGS, null, 2)
          }]
        };

      case 'framework://sampling':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(SAMPLING_EXPLANATION, null, 2)
          }]
        };

      case 'framework://policy-as-artifact':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(POLICY_AS_ARTIFACT, null, 2)
          }]
        };

      case 'framework://full':
        return {
          contents: [{
            uri,
            mimeType: 'text/markdown',
            text: FRAMEWORK_DOCUMENT
          }]
        };

      case 'framework://examples':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(CASE_STUDY_LIST, null, 2)
          }]
        };

      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  });
}
