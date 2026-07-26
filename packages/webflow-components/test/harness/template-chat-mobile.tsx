import React from 'react';
import { createRoot } from 'react-dom/client';
import { MadeInWebflowTemplateFinder } from '../../src/components/chat/MadeInWebflowTemplateFinder';
import { TemplateChat } from '../../src/components/chat/TemplateChat';
import {
  TemplateCampaignLane,
  TemplateCampaignVideoModal,
} from '../../src/components/marketplace/TemplateCampaignLane';

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
const combinedLibrary = new URLSearchParams(window.location.search).has('combined');
const campaignOnly = new URLSearchParams(window.location.search).has('campaign');
const campaignError = new URLSearchParams(window.location.search).has('campaign-error');
const campaignAnalytics = new URLSearchParams(window.location.search).has('campaign-analytics');
const campaignLoading = new URLSearchParams(window.location.search).has('campaign-loading');
const madeInWebflow = new URLSearchParams(window.location.search).has('made-in-webflow');
const mount = document.createElement('div');
const shadowBoundary = !(
  twoInstances ||
  combinedLibrary ||
  campaignOnly ||
  campaignError ||
  campaignAnalytics ||
  campaignLoading
);
if (shadowBoundary) root.attachShadow({ mode: 'open' }).append(mount);
else root.append(mount);

createRoot(mount).render(
  campaignLoading ? (
    <TemplateCampaignVideoModal
      onClose={() => undefined}
      videoSrc="/delayed-campaign-video.mp4"
      setupHref="#mcp-setup"
    />
  ) : campaignAnalytics ? (
    <main className="harness-combined">
      <div aria-hidden="true" style={{ height: 1200 }} />
      <TemplateCampaignLane enableAnalytics setupHref="#mcp-setup" />
    </main>
  ) : campaignError ? (
    <TemplateCampaignVideoModal
      onClose={() => undefined}
      videoSrc="/missing-campaign-video.mp4"
      setupHref="#mcp-setup"
    />
  ) : campaignOnly ? (
    <main className="harness-combined">
      <header className="harness-heading">
        <p>Template Marketplace campaign verification</p>
        <h1>Featured website templates</h1>
      </header>
      <TemplateCampaignLane enableAnalytics={false} setupHref="#mcp-setup" />
    </main>
  ) : combinedLibrary ? (
    <main className="harness-combined">
      <header className="harness-heading">
        <p>Combined Marketplace library verification</p>
        <h1>Featured website templates</h1>
      </header>
      <TemplateCampaignLane enableAnalytics={false} setupHref="#mcp-setup" />
      <TemplateChat
        apiBase={window.location.origin}
        defaultOpen
        sessionScope="combined-library-verifier"
        enableAnalytics={false}
        starterPrompts="A restaurant site with a menu,Show one spotlight template"
        welcomeMessage="Tell me what you are building and I will find a focused set of templates."
      />
    </main>
  ) : twoInstances ? (
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
  ) : madeInWebflow ? (
    <MadeInWebflowTemplateFinder
      apiBase={window.location.origin}
      defaultOpen
      sessionScope="made-in-webflow-verifier"
      enableAnalytics={false}
      starterPrompts="A restaurant site with a menu"
      welcomeMessage="Describe the site you want to build and I will find templates without changing this community grid."
    />
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
