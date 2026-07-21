import React from 'react';
import { createRoot } from 'react-dom/client';
import { TemplateChat } from '../../src/components/chat/TemplateChat';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root');

window.turnstile = {
  render(_container, options) {
    queueMicrotask(() => options.callback('local-verifier-token'));
    return 'local-verifier-widget';
  },
  remove() {},
};

const twoInstances = new URLSearchParams(window.location.search).has('two');

createRoot(root).render(
  twoInstances ? (
    <div className="harness-grid">
      <TemplateChat
        apiBase={window.location.origin}
        variant="inline"
        title="Portfolio finder"
        sessionScope="portfolio-verifier"
        enableAnalytics={false}
        starterPrompts="Show popular templates"
      />
      <TemplateChat
        apiBase={window.location.origin}
        variant="inline"
        title="Store finder"
        sessionScope="store-verifier"
        enableAnalytics={false}
        starterPrompts="Show one spotlight template"
      />
    </div>
  ) : (
    <TemplateChat
      apiBase={window.location.origin}
      defaultOpen
      sessionScope="local-mobile-verifier-v2"
      enableAnalytics={false}
      starterPrompts="Show popular templates,Show one spotlight template,Run performance stress"
      welcomeMessage="Tell me what you are building and I will find a focused set of templates."
    />
  ),
);
