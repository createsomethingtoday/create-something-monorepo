import { describe, expect, it } from 'vitest';
import { getPortfolioTitle } from './portfolio-title';

describe('getPortfolioTitle', () => {
  it('falls back to a generic asset title when there are no assets', () => {
    expect(getPortfolioTitle([])).toBe('Your Webflow asset portfolio');
  });

  it('uses the single asset type when the portfolio is uniform', () => {
    expect(getPortfolioTitle([{ type: 'Template' }, { type: 'Template' }])).toBe(
      'Your Webflow template portfolio'
    );
    expect(getPortfolioTitle([{ type: 'App' }])).toBe('Your Webflow app portfolio');
    expect(getPortfolioTitle([{ type: 'Library' }])).toBe('Your Webflow library portfolio');
  });

  it('falls back to the generic asset title when multiple asset types are present', () => {
    expect(getPortfolioTitle([{ type: 'Template' }, { type: 'App' }])).toBe(
      'Your Webflow asset portfolio'
    );
  });
});
