import React from 'react';
import { TemplateCard } from '../cards/TemplateCard';
import { isAnchorClickOn } from './templateChatAnalytics';
import { safeImageUrl, safeMarketplaceUrl, safePreviewUrl } from './templateChatSafety';
import type { AgentTemplateItem, DisplayPayload } from './templateChatProtocol';

function formatPrice(item: AgentTemplateItem): string {
  if (item.is_free || item.price === 0) return 'Free';
  return typeof item.price === 'number' ? `$${item.price} USD` : '';
}

export function DisplayArtifact({
  payload,
  onPreview,
  onTemplateClick,
}: {
  payload: DisplayPayload;
  onPreview?: (item: AgentTemplateItem, position: number, layout: string) => void;
  onTemplateClick?: (item: AgentTemplateItem, position: number, layout: string) => void;
}): React.ReactElement {
  const isStrip = payload.layout === 'carousel';
  const isSingle = payload.layout === 'spotlight' || payload.items.length === 1;

  const cards = payload.items.map((entry, index) => {
    // Every URL below arrives from the search index through the agent. Validate
    // locally too, so a poisoned row cannot place an arbitrary origin in a card.
    const templateUrl = safeMarketplaceUrl(entry.item.url);
    const creatorUrl = safeMarketplaceUrl(entry.item.creator_profile_url);
    const avatarUrl = safeImageUrl(entry.item.creator_avatar_url);
    const thumbnailUrl = safeImageUrl(entry.item.thumbnail_image_url);
    const previewUrl = safePreviewUrl(entry.item.website_url);

    return (
    <div
      key={entry.template_slug}
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
      onClickCapture={(event) => {
        if (isAnchorClickOn(event, templateUrl)) {
          onTemplateClick?.(entry.item, index + 1, payload.layout);
        }
      }}
    >
      <TemplateCard
        templateName={entry.item.name}
        templateLink={{ href: templateUrl ?? '#', target: '_blank' }}
        price={formatPrice(entry.item)}
        isFree={entry.item.is_free}
        creatorName={entry.item.creator_name ?? ''}
        creatorLink={creatorUrl ? { href: creatorUrl, target: '_blank' } : undefined}
        creatorIcon={
          avatarUrl
            ? {
                src: avatarUrl,
                alt: entry.item.creator_avatar_alt ?? entry.item.creator_name ?? '',
              }
            : undefined
        }
        primaryImage={thumbnailUrl ? { src: thumbnailUrl, alt: entry.item.name } : undefined}
        cumulativePurchases={entry.item.cumulative_purchases ?? undefined}
        agentNote={entry.reason ? `Why it fits — ${entry.reason}` : undefined}
        showCategoryMeta={false}
        showPreviewLink={Boolean(onPreview && previewUrl)}
        previewLabel="Live preview"
        previewLink={
          onPreview && previewUrl
            ? {
                // Plain click opens the in-chat preview; cmd/middle-click
                // still opens the published site directly.
                href: previewUrl,
                target: '_blank',
                onClick: (event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                  event.preventDefault();
                  onPreview(entry.item, index + 1, payload.layout);
                },
              }
            : undefined
        }
      />
    </div>
    );
  });

  return (
    <div className="tmchat-display">
      {payload.title ? <div className="tmchat-display-title">{payload.title}</div> : null}
      {isStrip ? (
        <div className="tmchat-strip">{cards}</div>
      ) : (
        <div
          className={`tmchat-grid${isSingle ? ' single' : ''}${
            payload.items.length === 3 || payload.items.length >= 6 ? ' wide' : ''
          }`}
        >
          {cards}
        </div>
      )}
    </div>
  );
}
