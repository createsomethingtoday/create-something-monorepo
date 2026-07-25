import React from 'react';
import { TemplateCard } from '../cards/TemplateCard';
import { isAnchorClickOn } from './templateChatAnalytics';
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

  const cards = payload.items.map((entry, index) => (
    <div
      key={entry.template_slug}
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
      onClickCapture={(event) => {
        if (isAnchorClickOn(event, entry.item.url)) {
          onTemplateClick?.(entry.item, index + 1, payload.layout);
        }
      }}
    >
      <TemplateCard
        templateName={entry.item.name}
        templateLink={{ href: entry.item.url ?? '#', target: '_blank' }}
        price={formatPrice(entry.item)}
        isFree={entry.item.is_free}
        creatorName={entry.item.creator_name ?? ''}
        creatorLink={
          entry.item.creator_profile_url ? { href: entry.item.creator_profile_url, target: '_blank' } : undefined
        }
        creatorIcon={
          entry.item.creator_avatar_url
            ? {
                src: entry.item.creator_avatar_url,
                alt: entry.item.creator_avatar_alt ?? entry.item.creator_name ?? '',
              }
            : undefined
        }
        primaryImage={
          entry.item.thumbnail_image_url ? { src: entry.item.thumbnail_image_url, alt: entry.item.name } : undefined
        }
        cumulativePurchases={entry.item.cumulative_purchases ?? undefined}
        agentNote={entry.reason ? `Why it fits — ${entry.reason}` : undefined}
        showCategoryMeta={false}
        showPreviewLink={Boolean(onPreview && entry.item.website_url)}
        previewLabel="Live preview"
        previewLink={
          onPreview && entry.item.website_url
            ? {
                // Plain click opens the in-chat preview; cmd/middle-click
                // still opens the published site directly.
                href: entry.item.website_url,
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
  ));

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
