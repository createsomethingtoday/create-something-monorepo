import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { MadeInWebflowTemplateFinder } from './MadeInWebflowTemplateFinder';

export default declareComponent(MadeInWebflowTemplateFinder, {
  name: 'Made in Webflow Template Finder',
  description:
    'Conversational template discovery for Made in Webflow surfaces. Visitors browsing community sites describe what they want to build and get marketplace templates as cards inside the chat. Page actions are disabled: the Made in Webflow grid shows community sites, not templates, so the agent never rewrites URL filters, re-sorts the grid, or highlights cards. Requires the template agent endpoint.',
  group: 'Marketplace',
  props: {
    apiBase: props.Text({
      name: 'Agent API Base URL',
      defaultValue: 'https://templates.webflow.com/templates-api',
      tooltip:
        'Base URL of the template agent proxy (no trailing slash). Use https://templates.webflow.com/templates-api on webflow.com — the direct workers.dev origin is blocked by the webflow.com CSP.',
    }),
    turnstileSiteKey: props.Text({
      name: 'Turnstile Site Key',
      defaultValue: '0x4AAAAAADzmfUVSu5s1hvW5',
      tooltip: 'Public Cloudflare Turnstile site key for the Template Finder. Never enter the secret key here.',
    }),
    title: props.Text({
      name: 'Panel Title',
      defaultValue: 'Template finder',
    }),
    launcherLabel: props.Text({
      name: 'Launcher Label',
      defaultValue: 'Find a template',
    }),
    placeholder: props.Text({
      name: 'Input Placeholder',
      defaultValue: 'Describe the site you want to build…',
    }),
    welcomeMessage: props.Text({
      name: 'Welcome Message',
      defaultValue:
        'Inspired by something you saw here? Tell me about the site you want to build — the business, the look you like, and anything it must support (store, blog, member logins…) — and I’ll find templates you can start from.',
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
    sessionScope: props.Text({
      name: 'Session Scope',
      defaultValue: 'made-in-webflow',
      tooltip:
        'Stable namespace for persisted chat state. Keep distinct from the marketplace Template Chat so conversations don’t bleed between surfaces.',
    }),
    hostOverlaySelectors: props.Text({
      name: 'Host Overlay Selectors',
      defaultValue: '#transcend-consent-manager',
      tooltip:
        'CSS selector list for host-owned consent or modal layers. On phones, the finder yields while one owns the composer area.',
    }),
    enableAnalytics: props.Boolean({
      name: 'Enable Analytics',
      defaultValue: true,
      tooltip:
        'Emit marketplace analytics (wf_analytics / Segment / Amplitude) and write conversion attribution for template clicks.',
    }),
  },
});
