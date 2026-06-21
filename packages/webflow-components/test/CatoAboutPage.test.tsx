import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CatoAboutPage,
  CatoBoardOfDirectorsPage,
  CatoLeadershipPage,
} from '../src/components/cato/CatoCompanyPages';

function countMatches(value: string, pattern: RegExp): number {
  return value.match(pattern)?.length ?? 0;
}

test('renders the Cato About default without profile sections', () => {
  const html = renderToStaticMarkup(<CatoAboutPage />);

  assert.match(html, /About Cato/);
  assert.doesNotMatch(html, /Ryan Zackon/);
  assert.doesNotMatch(html, />Leadership</);
  assert.doesNotMatch(html, />Board of Directors</);
  assert.equal(countMatches(html, /class="cato-company-card cato-company-person"/g), 0);
  assert.equal(countMatches(html, /class="cato-company-card cato-company-board-card"/g), 0);
});

test('renders the dedicated Cato Leadership page with Ryan-controlled leadership count', () => {
  const html = renderToStaticMarkup(<CatoLeadershipPage />);

  assert.match(html, /Ryan Zackon/);
  assert.match(html, /President &amp; Chief Executive Officer/);
  assert.match(html, /Lainy Jahnke/);
  assert.match(html, /Ethan Weinberg/);
  assert.match(html, /Meet the team helping hospitals protect supply continuity/);
  assert.match(html, /Leadership Team/);
  assert.doesNotMatch(html, /Toby Ryan/);
  assert.doesNotMatch(html, /Brian Weichel/);
  assert.doesNotMatch(html, /Hannah Hall/);
  assert.doesNotMatch(html, /Nathan Brandon/);
  assert.doesNotMatch(html, /Rhonda Podschelne/);
  assert.doesNotMatch(html, />Board of Directors</);
  assert.equal(countMatches(html, /class="team_card"/g), 3);
  assert.equal(countMatches(html, /class="cato-company-card cato-company-board-card"/g), 0);
});

test('renders the dedicated Cato Board of Directors page with five board profiles', () => {
  const html = renderToStaticMarkup(<CatoBoardOfDirectorsPage />);

  assert.match(html, /Governance built for resilient healthcare supply/);
  assert.match(html, />Board of Directors</);
  assert.match(html, /Bala Iyer/);
  assert.match(html, /Board Chair/);
  assert.match(html, /Andy James/);
  assert.match(html, /Heather Matzke-Hamlin/);
  assert.match(html, /John Courtney/);
  assert.match(html, /Tiffani Shaw/);
  assert.doesNotMatch(html, /Five board profiles in one dedicated About page/);
  assert.doesNotMatch(html, /keeps governance profiles separate/);
  assert.doesNotMatch(html, /Brian Weichel/);
  assert.doesNotMatch(html, /Ryan Zackon/);
  assert.equal(countMatches(html, /class="cato-company-card cato-company-person"/g), 0);
  assert.equal(countMatches(html, /class="team_card"/g), 5);
});
