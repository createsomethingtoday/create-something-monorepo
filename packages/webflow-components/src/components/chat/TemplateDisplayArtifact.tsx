import React from 'react';
import { TemplateCard } from '../cards/TemplateCard';
import { isAnchorClickOn } from './templateChatAnalytics';
import { safeImageUrl, safeMarketplaceUrl, safePreviewUrl } from './templateChatSafety';
import type { AgentTemplateItem, DisplayPayload } from './templateChatProtocol';
import {
  DEFAULT_TEMPLATE_CHAT_STRINGS,
  formatTemplatePrice,
  type TemplateChatStrings,
} from './templateChatStrings';

function formatPrice(
  item: AgentTemplateItem,
  freeLabel: string,
  locale?: string,
  currency?: string,
): string {
  if (item.is_free || item.price === 0) return freeLabel;
  return typeof item.price === 'number' ? formatTemplatePrice(item.price, locale, currency) : '';
}

export function DisplayArtifact({
  payload,
  onPreview,
  onTemplateClick,
  strings = DEFAULT_TEMPLATE_CHAT_STRINGS,
  locale,
  currency,
}: {
  payload: DisplayPayload;
  onPreview?: (item: AgentTemplateItem, position: number, layout: string, trigger?: HTMLElement | null) => void;
  onTemplateClick?: (item: AgentTemplateItem, position: number, layout: string) => void;
  strings?: TemplateChatStrings;
  locale?: string;
  currency?: string;
}): React.ReactElement {
  // On phones a multi-card set becomes a horizontal snap deck. Without a group
  // label it is announced as a run of loose links with no sense of the set.
  const deckLabel = strings.deckLabel(payload.items.length, payload.title);
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
        price={formatPrice(entry.item, strings.priceFree, locale, currency)}
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
        agentNote={entry.reason ? strings.whyItFits(entry.reason) : undefined}
        showCategoryMeta={false}
        showPreviewLink={Boolean(onPreview && previewUrl)}
        previewLabel={strings.previewLabel}
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
                  // Hand back the control that opened the preview so focus can
                  // return to this card instead of the composer on close.
                  onPreview(
                    entry.item,
                    index + 1,
                    payload.layout,
                    event.currentTarget instanceof HTMLElement ? event.currentTarget : null,
                  );
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
        <div className="tmchat-strip" role="group" aria-label={deckLabel}>
          {cards}
        </div>
      ) : (
        <div
          className={`tmchat-grid${isSingle ? ' single' : ''}${
            payload.items.length === 3 || payload.items.length >= 6 ? ' wide' : ''
          }`}
          role="group"
          aria-label={deckLabel}
        >
          {cards}
        </div>
      )}
    </div>
  );
}
