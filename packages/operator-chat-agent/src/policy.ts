import type { PaidCapabilityMode, ToolAccessMode } from './env.js';

export type RouteClass = 'read' | 'write' | 'destructive' | 'auth_admin' | 'control_plane' | 'spend';

export interface ToolPolicyInput {
  toolName: string;
  accessMode: ToolAccessMode;
  paidMode: PaidCapabilityMode;
}

export interface ToolPolicyDecision {
  allowed: boolean;
  routeClass: RouteClass;
  reason: string;
}

const routeClassByTool = new Map<string, RouteClass>([
  ['operator_status', 'read'],
  ['linear_open_issues', 'read'],
  ['research_lane_summary', 'read'],
  ['request_paid_capability', 'spend']
]);

export function classifyTool(toolName: string): RouteClass {
  return routeClassByTool.get(toolName) ?? 'write';
}

export function decideToolPolicy(input: ToolPolicyInput): ToolPolicyDecision {
  const routeClass = classifyTool(input.toolName);

  if (input.accessMode === 'off') {
    return {
      allowed: false,
      routeClass,
      reason: 'Operator tool access is off.'
    };
  }

  if (routeClass === 'spend') {
    if (input.paidMode === 'off') {
      return {
        allowed: false,
        routeClass,
        reason: 'Paid capability requests are disabled.'
      };
    }

    return {
      allowed: true,
      routeClass,
      reason:
        input.paidMode === 'live'
          ? 'Paid capability request allowed by live mode.'
          : 'Paid capability request allowed as handoff-only.'
    };
  }

  if (input.accessMode === 'read_only' && routeClass !== 'read') {
    return {
      allowed: false,
      routeClass,
      reason: `Read-only mode blocks ${routeClass} tools.`
    };
  }

  return {
    allowed: true,
    routeClass,
    reason: 'Tool allowed by current operator access mode.'
  };
}
