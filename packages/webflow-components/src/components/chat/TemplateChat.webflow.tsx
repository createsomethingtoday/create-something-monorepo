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
    variant: props.Variant({
      name: 'Display Variant',
      options: ['floating', 'inline'],
      defaultValue: 'floating',
      tooltip:
        'Floating: launcher button + docked panel. Inline: fills its parent element — use for a dedicated page section. Both can expand to the immersive fullscreen state.',
    }),
    starterPrompts: props.Text({
      name: 'Starter Prompts',
      defaultValue:
        'A portfolio with bold animations, An online store for a clothing brand, A restaurant site with a menu, A SaaS landing page with a blog',
      tooltip: 'Comma-separated suggestion chips shown before the first message (max 6).',
    }),
    defaultOpen: props.Boolean({
      name: 'Open By Default',
      defaultValue: false,
      tooltip: 'Floating variant only — inline is always open.',
    }),
    defaultImmersive: props.Boolean({
      name: 'Immersive By Default',
      defaultValue: false,
      tooltip: 'Start in the fullscreen immersive state.',
    }),
  },
});
