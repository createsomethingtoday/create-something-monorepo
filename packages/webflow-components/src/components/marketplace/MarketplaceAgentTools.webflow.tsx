import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { MarketplaceAgentTools } from './MarketplaceAgentTools';

export default declareComponent(MarketplaceAgentTools, {
  name: 'Marketplace Agent Tools',
  description:
    'Headless WebMCP registrar: exposes template search, taxonomy, template detail, page state, and page-filter tools to in-browser AI agents (ChatGPT built-in browser, Edge/Chrome modelContext). Place once per marketplace page. Renders nothing.',
  group: 'Marketplace',
  props: {
    apiBase: props.Text({
      name: 'API Base',
      defaultValue: '',
      tooltip:
        'Leave empty for the production templates-api proxy. Worker/staging bases are rewritten to production (webflow.com CSP only allows *.webflow.com).',
    }),
    enablePageActions: props.Boolean({
      name: 'Enable Page Actions',
      defaultValue: true,
      tooltip:
        'Registers update_page_filters so agents can filter/sort the visible grid (with pulse affordances and Back-button undo). Disable for read-only tool exposure.',
    }),
    enableAnalytics: props.Boolean({
      name: 'Enable Analytics',
      defaultValue: true,
      tooltip: 'Emit registration and per-tool-call events through the marketplace analytics fan-out.',
    }),
    debug: props.Boolean({
      name: 'Debug Logging',
      defaultValue: false,
    }),
  },
});
