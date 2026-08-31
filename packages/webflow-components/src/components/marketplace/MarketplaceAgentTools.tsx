import React, { useEffect } from 'react';
import {
  MARKETPLACE_AGENT_TOOLS_VERSION,
  createAgentToolsWindowHandle,
  createMarketplaceAgentTools,
  registerMarketplaceAgentTools,
  resolveAgentToolsApiBase,
  type AgentToolsWindowHandle,
} from './agentTools';
import { emitTemplateComponentEvent } from './templateTelemetry';

declare global {
  interface Window {
    __templateMarketplaceAgentToolsInstalled?: boolean;
    __templateMarketplaceAgentTools?: AgentToolsWindowHandle;
  }
}

export interface MarketplaceAgentToolsProps {
  /** Search API base. Defaults to the production templates-api proxy. */
  apiBase?: string;
  /** Register the page-mutating update_page_filters tool. */
  enablePageActions?: boolean;
  /** Emit registration and per-call telemetry through the marketplace analytics fan-out. */
  enableAnalytics?: boolean;
  /** Console logging for QA. */
  debug?: boolean;
}

/**
 * Headless page-level registrar that exposes the Template Marketplace search
 * and discovery experience as WebMCP tools for in-browser agents (ChatGPT's
 * built-in browser, Edge/Chrome `modelContext` implementations).
 *
 * Place once per page. Registration is a page-global singleton: a second mount
 * is a no-op, and unmount does not unregister — WebMCP has no portable
 * unregister, and the tools are stateless per call, so a stale registration on
 * a page without a grid degrades gracefully (update_page_filters reports that
 * no grid is present).
 *
 * In browsers without WebMCP this renders nothing and registers nothing except
 * the `window.__templateMarketplaceAgentTools` debug handle.
 */
export const MarketplaceAgentTools: React.FC<MarketplaceAgentToolsProps> = ({
  apiBase = '',
  enablePageActions = true,
  enableAnalytics = true,
  debug = false,
}) => {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (window.__templateMarketplaceAgentToolsInstalled) {
      if (debug) console.info('[MarketplaceAgentTools] already installed; skipping.');
      return;
    }
    window.__templateMarketplaceAgentToolsInstalled = true;

    const tools = createMarketplaceAgentTools({
      apiBase: resolveAgentToolsApiBase(apiBase),
      enablePageActions,
      onToolCall: enableAnalytics
        ? (info) => emitTemplateComponentEvent('agent-tools', 'tool_call', info)
        : undefined,
    });

    window.__templateMarketplaceAgentTools = createAgentToolsWindowHandle(tools);
    const result = registerMarketplaceAgentTools(tools);

    if (enableAnalytics) {
      try {
        emitTemplateComponentEvent('agent-tools', 'registered', {
          api: result.api,
          tool_count: result.registered,
          tools_version: MARKETPLACE_AGENT_TOOLS_VERSION,
        });
      } catch {
        // Analytics failures must not surface as effect errors on the host page.
      }
    }
    if (debug) {
      console.info(
        `[MarketplaceAgentTools] v${MARKETPLACE_AGENT_TOOLS_VERSION} api=${result.api} tools=${result.registered}`,
      );
    }
  }, [apiBase, debug, enableAnalytics, enablePageActions]);

  return <div hidden data-marketplace-component="agent-tools" />;
};

export default MarketplaceAgentTools;
