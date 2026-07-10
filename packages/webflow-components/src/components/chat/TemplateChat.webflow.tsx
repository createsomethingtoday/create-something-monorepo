import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { TemplateChat } from './TemplateChat';

export default declareComponent(TemplateChat, {
  name: 'Template Chat',
  description:
    'Conversational template discovery. A floating chat assistant that searches the marketplace with capability-aware filters (features, ecommerce, memberships, CMS) and renders recommendations as template cards with follow-up suggestions. Requires the template agent endpoint.',
  group: 'Marketplace',
  props: {
    apiBase: props.Text({
      name: 'Agent API Base URL',
      defaultValue: '',
      tooltip:
        'Base URL of the template agent worker (no trailing slash). Must be reachable under the webflow.com CSP (a *.webflow.com proxy path in production).',
    }),
    title: props.Text({
      name: 'Panel Title',
      defaultValue: 'Template assistant',
    }),
    launcherLabel: props.Text({
      name: 'Launcher Label',
      defaultValue: 'Find your template',
    }),
    placeholder: props.Text({
      name: 'Input Placeholder',
      defaultValue: 'Describe the site you want to build…',
    }),
    welcomeMessage: props.Text({
      name: 'Welcome Message',
      defaultValue:
        'Hi! Tell me about the site you want to build — the business, the look you like, and anything it must support (store, blog, member logins…) — and I’ll find templates that fit.',
    }),
    defaultOpen: props.Boolean({
      name: 'Open By Default',
      defaultValue: false,
      tooltip: 'Designer preview convenience — leave off in production.',
    }),
  },
});
