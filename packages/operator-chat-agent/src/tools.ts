import { tool, type ToolSet } from 'ai';
import { z } from 'zod';

import { listOpenLinearIssues } from './linear.js';
import { paidCapabilityMaxUsd, paidCapabilityMode, toolAccessMode, type Env } from './env.js';

export interface PaidCapabilityHandoff {
  status: 'handoff_required';
  capabilityPlane: 'poncho_agentcash';
  requestedCapability: string;
  businessReason: string;
  estimatedMaxUsd: number;
  operatorPolicy: {
    paidCapabilityMode: string;
    maxUsd: number;
    execution: 'no_live_spend_from_poc';
  };
  nextStep: string;
}

export function buildPaidCapabilityHandoff(input: {
  requestedCapability: string;
  businessReason: string;
  estimatedMaxUsd: number;
  mode: string;
  maxUsd: number;
}): PaidCapabilityHandoff {
  return {
    status: 'handoff_required',
    capabilityPlane: 'poncho_agentcash',
    requestedCapability: input.requestedCapability,
    businessReason: input.businessReason,
    estimatedMaxUsd: input.estimatedMaxUsd,
    operatorPolicy: {
      paidCapabilityMode: input.mode,
      maxUsd: input.maxUsd,
      execution: 'no_live_spend_from_poc'
    },
    nextStep:
      'Create or update a Linear issue with the requested capability, expected artifact, spend ceiling, and approval evidence before any live Poncho/AgentCash execution.'
  };
}

export function createOperatorTools(env: Env): ToolSet {
  return {
    operator_status: tool({
      description:
        'Summarize the current CREATE SOMETHING operator chat runtime, policy posture, and available planes.',
      inputSchema: z.object({}),
      execute: async () => ({
        runtime: 'cloudflare-think-telegram-poc',
        mobileIngress: 'telegram',
        accessMode: toolAccessMode(env),
        paidCapabilityMode: paidCapabilityMode(env),
        paidCapabilityMaxUsd: paidCapabilityMaxUsd(env),
        planes: [
          {
            name: 'connected_saas',
            examples: ['Linear', 'Notion', 'Composio-backed MCP tools'],
            posture: 'durable authenticated operations'
          },
          {
            name: 'paid_capability',
            examples: ['Poncho', 'AgentCash'],
            posture: 'per-call external capability with spend and artifact evidence'
          }
        ]
      })
    }),

    linear_open_issues: tool({
      description:
        'List recent open CREATE SOMETHING Linear issues. Returns an empty list with setup guidance when LINEAR_API_KEY is not configured.',
      inputSchema: z.object({
        first: z.number().int().min(1).max(10).optional()
      }),
      execute: async ({ first }) => {
        const issues = await listOpenLinearIssues(env, first ?? 5);
        if (issues.length === 0 && !env.LINEAR_API_KEY?.trim()) {
          return {
            issues,
            setup: 'Set LINEAR_API_KEY and LINEAR_TEAM_KEY in Worker secrets/vars for live read-only issue lookup.'
          };
        }

        return { issues };
      }
    }),

    research_lane_summary: tool({
      description:
        'Explain how this mobile operator shell relates to Poncho, AgentCash, Composio, and CREATE SOMETHING governance.',
      inputSchema: z.object({}),
      execute: async () => ({
        hypothesis:
          'The mobile app is not the differentiator. The differentiator is a governed operator shell that can route between durable SaaS operations and paid per-call capability under policy.',
        composio:
          'Best fit for durable authenticated SaaS operations where a known account owns the data and permissions.',
        ponchoAgentCash:
          'Best fit for buying a bounded external capability or artifact when the operator does not already own a direct SaaS integration.',
        pocBoundary:
          'This package proves mobile chat, durable agent state, and policy-gated spend handoff. It does not execute live paid capability calls.'
      })
    }),

    request_paid_capability: tool({
      description:
        'Prepare a governed Poncho/AgentCash-style paid capability request. This POC creates a handoff only and never spends money.',
      inputSchema: z.object({
        requestedCapability: z
          .string()
          .min(3)
          .describe('The external paid capability or artifact the operator wants.'),
        businessReason: z.string().min(3).describe('Why this capability is needed.'),
        estimatedMaxUsd: z
          .number()
          .positive()
          .max(250)
          .describe('Requested spend ceiling in USD for operator review.')
      }),
      execute: async ({ requestedCapability, businessReason, estimatedMaxUsd }) => {
        const maxUsd = paidCapabilityMaxUsd(env);
        if (estimatedMaxUsd > maxUsd) {
          return {
            status: 'blocked',
            reason: `Requested ceiling ${estimatedMaxUsd} exceeds configured cap ${maxUsd}.`,
            nextStep: 'Lower the request or raise the cap through the owning policy/deploy path.'
          };
        }

        return buildPaidCapabilityHandoff({
          requestedCapability,
          businessReason,
          estimatedMaxUsd,
          mode: paidCapabilityMode(env),
          maxUsd
        });
      }
    })
  };
}
