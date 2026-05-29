import React, { useId, useMemo, useState } from 'react';
import { MarketplaceExperimentRole, trackMarketplaceEvent } from './analytics';

export interface MarketplaceFaqItem {
  question: string;
  answer: string;
}

export interface MarketplaceFaqProps {
  /** Section heading. */
  title?: string;
  /** Optional section intro. */
  description?: string;
  /** JSON array of {question, answer}. */
  items?: string;
  /** Open the first item on initial render. */
  openFirst?: boolean;
  /** Allow multiple FAQ items to stay open. */
  allowMultipleOpen?: boolean;
  /** Emit FAQPage JSON-LD for SEO/AEO once final copy is approved. */
  includeStructuredData?: boolean;
  /** Track FAQ item toggles through wf_analytics and a custom DOM event. */
  enableAnalytics?: boolean;
  /** Experiment role used by Marketplace Landing Experiment Gate selectors. */
  experimentRole?: MarketplaceExperimentRole;
}

const DEFAULT_FAQ_ITEMS: MarketplaceFaqItem[] = [
  {
    question: 'Can I customize a Webflow template?',
    answer:
      'Yes. Webflow templates are built to be customized in Webflow Designer, including layout, styles, content, interactions, and CMS collections.',
  },
  {
    question: 'How do I choose the right template?',
    answer:
      'Start with the template category that best matches the site goal, then compare layout quality, included pages, CMS support, ecommerce support, and responsiveness.',
  },
  {
    question: 'Are free templates available?',
    answer:
      'Yes. The marketplace includes free templates that can be opened in Webflow and customized before publishing.',
  },
  {
    question: 'Can templates include CMS or ecommerce features?',
    answer:
      'Many templates include CMS, ecommerce, or multi-layout support. Use marketplace filters and template details to confirm the included features before choosing a template.',
  },
];

export const DEFAULT_FAQ_ITEMS_JSON = JSON.stringify(DEFAULT_FAQ_ITEMS);

const FAQ_STYLES = `
.mpfaq-section,
.mpfaq-section * {
  box-sizing: border-box;
}

.mpfaq-section {
  width: 100%;
  color: #080808;
  font-family: "WF Visual Sans Variable", "WF Visual Sans", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.mpfaq-header {
  max-width: 760px;
  margin-bottom: 32px;
}

.mpfaq-title {
  max-width: 650px;
  margin: 0;
  color: #080808;
  font-size: 32px;
  font-weight: 600;
  line-height: 1.15;
}

.mpfaq-description {
  margin: 12px 0 0;
  color: #5f5f5f;
  font-size: 16px;
  line-height: 1.55;
}

.mpfaq-list {
  width: 100%;
  border-top: 1px solid #d9d9d9;
}

.mpfaq-item {
  border-bottom: 1px solid #d9d9d9;
}

.mpfaq-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 24px 0;
  color: #080808;
  background: transparent;
  border: 0;
  text-align: left;
  cursor: pointer;
}

.mpfaq-trigger:focus-visible {
  outline: 2px solid #146ef5;
  outline-offset: 4px;
}

.mpfaq-question {
  margin: 0;
  color: #080808;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.3;
}

.mpfaq-icon {
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
  position: relative;
  color: #5f5f5f;
}

.mpfaq-icon::before,
.mpfaq-icon::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  width: 14px;
  height: 2px;
  background: currentColor;
  border-radius: 999px;
  transform: translate(-50%, -50%);
}

.mpfaq-icon::after {
  transform: translate(-50%, -50%) rotate(90deg);
  transition: opacity 0.18s ease;
}

.mpfaq-trigger[aria-expanded="true"] .mpfaq-icon::after {
  opacity: 0;
}

.mpfaq-panel {
  max-width: 780px;
  padding: 0 64px 24px 0;
  color: #363636;
  font-size: 16px;
  line-height: 1.6;
}

.mpfaq-panel p {
  margin: 0;
}

@media (max-width: 767px) {
  .mpfaq-title {
    font-size: 28px;
  }

  .mpfaq-trigger {
    padding: 20px 0;
  }

  .mpfaq-question {
    font-size: 18px;
  }

  .mpfaq-panel {
    padding-right: 0;
  }
}
`;

function normalizeFaqItem(value: unknown): MarketplaceFaqItem | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<MarketplaceFaqItem>;
  const question = typeof candidate.question === 'string' ? candidate.question.trim() : '';
  const answer = typeof candidate.answer === 'string' ? candidate.answer.trim() : '';
  if (!question || !answer) return null;
  return { question, answer };
}

function parseFaqItems(itemsJson?: string): MarketplaceFaqItem[] {
  if (!itemsJson?.trim()) return DEFAULT_FAQ_ITEMS;

  try {
    const parsed = JSON.parse(itemsJson) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_FAQ_ITEMS;
    const items = parsed.map(normalizeFaqItem).filter(Boolean) as MarketplaceFaqItem[];
    return items.length > 0 ? items : DEFAULT_FAQ_ITEMS;
  } catch {
    return DEFAULT_FAQ_ITEMS;
  }
}

function structuredDataFor(items: MarketplaceFaqItem[]): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  });
}

export const MarketplaceFaq: React.FC<MarketplaceFaqProps> = ({
  title = 'Frequently asked questions',
  description = '',
  items: itemsJson,
  openFirst = false,
  allowMultipleOpen = false,
  includeStructuredData = false,
  enableAnalytics = true,
  experimentRole = 'treatment',
}) => {
  const baseId = useId();
  const items = useMemo(() => parseFaqItems(itemsJson), [itemsJson]);
  const [openIds, setOpenIds] = useState<Set<number>>(() => openFirst ? new Set([0]) : new Set());

  const toggleItem = (index: number, item: MarketplaceFaqItem) => {
    const willOpen = !openIds.has(index);
    trackMarketplaceEvent(
      'Marketplace Landing FAQ - Item Toggled',
      {
        component: 'MarketplaceFaq',
        section_title: title,
        faq_position: index + 1,
        faq_question: item.question,
        faq_state: willOpen ? 'opened' : 'closed',
      },
      enableAnalytics,
    );

    setOpenIds((current) => {
      const next = new Set(allowMultipleOpen ? current : []);
      if (current.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <section
      className="mpfaq-section"
      aria-label={title}
      data-marketplace-component="faq"
      data-marketplace-landing-experiment={experimentRole === 'none' ? undefined : experimentRole}
    >
      <style>{FAQ_STYLES}</style>
      {includeStructuredData ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: structuredDataFor(items) }}
        />
      ) : null}
      <div className="mpfaq-header">
        <h2 className="mpfaq-title">{title}</h2>
        {description ? <p className="mpfaq-description">{description}</p> : null}
      </div>
      <div className="mpfaq-list">
        {items.map((item, index) => {
          const open = openIds.has(index);
          const buttonId = `${baseId}-faq-trigger-${index}`;
          const panelId = `${baseId}-faq-panel-${index}`;

          return (
            <div className="mpfaq-item" key={`${item.question}-${index}`}>
              <button
                id={buttonId}
                className="mpfaq-trigger"
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                data-marketplace-faq-position={index + 1}
                onClick={() => toggleItem(index, item)}
              >
                <span className="mpfaq-question">{item.question}</span>
                <span className="mpfaq-icon" aria-hidden="true" />
              </button>
              {open ? (
                <div id={panelId} className="mpfaq-panel" role="region" aria-labelledby={buttonId}>
                  <p>{item.answer}</p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default MarketplaceFaq;
