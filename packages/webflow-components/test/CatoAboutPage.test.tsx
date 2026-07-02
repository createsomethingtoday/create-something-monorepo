import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CatoAboutPage,
  CatoBoardOfDirectorsPage,
  CatoLeadershipPage,
  normalizeEndpointPeople
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
  assert.match(html, /Chief Operating Officer, Co-Founder/);
  assert.match(html, /Ethan Weinberg/);
  assert.match(html, /Meet the team helping hospitals protect supply continuity/);
  assert.match(html, /Leadership Team/);
  assert.doesNotMatch(html, /Chief Operating Officer, Co-Founder &amp; Board Member/);
  assert.doesNotMatch(html, /Toby Ryan/);
  assert.doesNotMatch(html, /Brian Weichel/);
  assert.doesNotMatch(html, /Hannah Hall/);
  assert.doesNotMatch(html, /Nathan Brandon/);
  assert.doesNotMatch(html, /Rhonda Podschelne/);
  assert.doesNotMatch(html, />Board of Directors</);
  assert.equal(countMatches(html, /class="team_card"/g), 3);
  assert.equal(countMatches(html, /class="cato-company-card cato-company-board-card"/g), 0);
});

test('renders the dedicated Cato Board of Directors page without stepped-down board members', () => {
  const html = renderToStaticMarkup(<CatoBoardOfDirectorsPage />);

  assert.match(html, /Governance built for resilient healthcare supply/);
  assert.match(html, />Board of Directors</);
  assert.match(html, /Bala Iyer/);
  assert.match(html, /Board Chair/);
  assert.match(html, /Heather Matzke-Hamlin/);
  assert.match(html, /John Courtney/);
  assert.match(html, /Tiffani Shaw/);
  assert.doesNotMatch(html, /Five board profiles in one dedicated About page/);
  assert.doesNotMatch(html, /keeps governance profiles separate/);
  assert.doesNotMatch(html, /Andy James/);
  assert.doesNotMatch(html, /Lainy Jahnke/);
  assert.doesNotMatch(html, /Brian Weichel/);
  assert.doesNotMatch(html, /Ryan Zackon/);
  assert.equal(countMatches(html, /class="cato-company-card cato-company-person"/g), 0);
  assert.equal(countMatches(html, /class="team_card"/g), 4);
});

test('normalizes Cato people endpoint records with groups and image fields', () => {
  const people = normalizeEndpointPeople({
    items: [
      {
        fieldData: {
          name: 'Ryan Zackon',
          role: 'President & Chief Executive Officer',
          group: 'Leadership',
          bio: 'Approved Ryan bio.',
          headshot: [{ url: 'https://cdn.example.com/ryan.jpg' }],
          linkedin: 'https://www.linkedin.com/in/ryanzackon/',
          order: 1
        }
      },
      {
        name: 'Bala Iyer',
        role: 'Board Chair',
        category: 'Board of Directors',
        imageUrl: 'https://cdn.example.com/bala.jpg',
        order: '2'
      }
    ]
  });

  assert.equal(people.length, 2);
  assert.deepEqual(
    people.map((person) => [person.name, person.group, person.imageUrl]),
    [
      ['Ryan Zackon', 'leadership', 'https://cdn.example.com/ryan.jpg'],
      ['Bala Iyer', 'board', 'https://cdn.example.com/bala.jpg']
    ]
  );
});
