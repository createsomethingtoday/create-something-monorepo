import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MadeInWebflowTemplateFinder } from '../../src/components/chat/MadeInWebflowTemplateFinder';
import { TemplateChat } from '../../src/components/chat/TemplateChat';
import {
  TemplateCampaignLane,
  TemplateCampaignVideoModal,
} from '../../src/components/marketplace/TemplateCampaignLane';
import {
  FeaturedTemplatePreview,
  type FeaturedTemplatePreviewItem,
} from '../../src/components/marketplace/FeaturedTemplatePreview';

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
const featuredPreview = new URLSearchParams(window.location.search).has('featured');
const featuredPreviewError = new URLSearchParams(window.location.search).has('featured-error');
const mount = document.createElement('div');
const shadowBoundary = !(
  twoInstances ||
  combinedLibrary ||
  campaignOnly ||
  campaignError ||
  campaignAnalytics ||
  campaignLoading ||
  featuredPreview ||
  featuredPreviewError
);
if (shadowBoundary) root.attachShadow({ mode: 'open' }).append(mount);
else root.append(mount);

const featuredItems: FeaturedTemplatePreviewItem[] = [
  {
    id: 'featured-one',
    template_slug: 'featured-one',
    name: 'Featured One',
    url: '/templates/html/featured-one',
    website_url: '/preview/featured-one',
    purchase_url: '/dashboard/marketplace-checkout/redirect?rid=featured-one',
    creator_name: 'Marketplace Reviewer Fixture',
    price: 79,
    is_free: false,
    reviewer_pick_reason: 'A focused hierarchy and unusually clear path from first impression to action.',
    description_short: 'A conversion-focused launch template for growing software teams.',
    template_type: 'Multi Page',
    category_groups: [{ name: 'Business', slug: 'business' }],
    child_categories: [{ name: 'SaaS', slug: 'saas' }],
    styles: [{ name: 'Modern', slug: 'modern' }],
  },
  {
    id: 'featured-two',
    template_slug: 'featured-two',
    name: 'Featured Two',
    url: '/templates/html/featured-two',
    website_url: '/preview/featured-two',
    purchase_url: '/dashboard/marketplace-checkout/redirect?rid=featured-two',
    creator_name: 'Marketplace Reviewer Fixture',
    price: 129,
    is_free: false,
    reviewer_pick_reason: 'Distinctive art direction with a polished responsive composition.',
    description_short: 'A portfolio-forward studio template with room for large-format project storytelling.',
    template_type: 'Multi Layout',
    category_groups: [{ name: 'Creative', slug: 'creative' }],
    child_categories: [{ name: 'Agency', slug: 'agency' }],
    styles: [{ name: 'Dark', slug: 'dark' }],
  },
];

function FeaturedPreviewHarness({ showError }: { showError: boolean }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  return (
    <main className="harness-combined">
      <header className="harness-heading">
        <p>Featured preview verification</p>
        <h1>Featured website templates</h1>
      </header>
      <button type="button" data-featured-launch onClick={() => setOpen(true)}>
        Open Featured preview
      </button>
      {open ? (
        <FeaturedTemplatePreview
          item={featuredItems[index]}
          index={index}
          total={featuredItems.length}
          hasPrevious={index > 0}
          hasNext={index < featuredItems.length - 1}
          navigationError={showError ? 'Unable to load more Featured templates.' : null}
          onClose={() => setOpen(false)}
          onNavigate={(direction) => setIndex((current) => Math.max(0, Math.min(featuredItems.length - 1, current + direction)))}
        />
      ) : null}
    </main>
  );
}

createRoot(mount).render(
  featuredPreview || featuredPreviewError ? (
    <FeaturedPreviewHarness showError={featuredPreviewError} />
  ) : campaignLoading ? (
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
