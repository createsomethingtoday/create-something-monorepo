/**
 * Owned public-system translations of the licensed Meridian visual patterns.
 * These are deliberately content-neutral: properties supply real evidence,
 * destinations, and offers rather than inheriting template claims.
 */
export interface MeridianMetric {
  value: string;
  label: string;
  detail?: string;
}

export interface MeridianCard {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  ctaLabel?: string;
  meta?: string;
  /** Maps the card's visual role, not a claim about the content. */
  kind?: 'service' | 'case' | 'article' | 'profile' | 'offer';
  tone?: 'ink' | 'paper' | 'court' | 'brand';
}

export interface MeridianEvidence {
  eyebrow: string;
  title: string;
  detail: string;
  source: string;
  href?: string;
}

export interface MeridianAccordionItem {
  question: string;
  answer: string;
}
