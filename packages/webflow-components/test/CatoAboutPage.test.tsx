import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CatoAboutPage,
  CatoBoardOfDirectorsPage,
  CatoCaseStudiesLanding,
  CatoCaseStudyDetail,
  CatoLeadershipPage,
  normalizeEndpointPeople,
  resolveCatoPeopleEndpointUrl
} from '../src/components/cato/CatoCompanyPages';

function countMatches(value: string, pattern: RegExp): number {
  return value.match(pattern)?.length ?? 0;
}

test('renders the Cato About default without profile sections', () => {
  const html = renderToStaticMarkup(<CatoAboutPage />);

  assert.match(html, /About Cato/);
  assert.match(html, /cato-company-about-hero/);
  assert.match(html, /cato-company-about-hero-copy/);
  assert.match(html, /cato-company-goal cato-company-goal--about/);
  assert.doesNotMatch(html, /<aside class="cato-company-panel"/);
  assert.doesNotMatch(html, /Ryan Zackon/);
  assert.doesNotMatch(html, />Leadership</);
  assert.doesNotMatch(html, />Board of Directors</);
  assert.equal(countMatches(html, /class="cato-company-card cato-company-person"/g), 0);
  assert.equal(countMatches(html, /class="cato-company-card cato-company-board-card"/g), 0);
});

test('renders the dedicated Cato Leadership page with requested leadership profiles', () => {
  const html = renderToStaticMarkup(<CatoLeadershipPage />);

  assert.match(html, /Ryan Zackon/);
  assert.match(html, /President &amp; Chief Executive Officer/);
  assert.match(html, /6a4be8fcf01d87d956a44c73_6a4be8204d1e9fa14eeccb81_ryan-zackon-headshot\.png/);
  assert.match(html, /Ryan Zackon is a hands-on leader/);
  assert.doesNotMatch(html, /&lt;p&gt;Ryan Zackon/);
  assert.match(html, /Toby Ryan/);
  assert.match(html, /Chief of Staff, Co-Founder/);
  assert.match(html, /69258d509a9a68b48fb42105_toby\.webp/);
  assert.match(html, /Lainy Jahnke/);
  assert.match(html, /Chief Operating Officer, Co-Founder/);
  assert.match(html, /692863dff0b80335329330b4_lainy%20\(1\)\.webp/);
  assert.match(html, /Ethan Weinberg/);
  assert.match(html, /692863e9d536e0083d9660b1_ethan%20\(1\)\.webp/);
  assert.match(html, /Leadership Team/);
  assert.match(html, /Cato combines healthcare procurement experience/);
  assert.match(html, /class="section_team-hero"/);
  assert.match(html, /class="section_team section_team--list"/);
  assert.ok(html.indexOf('section_team-hero') < html.indexOf('team_cms-list'));
  assert.match(html, /class="team_card"[\s\S]*?<\/article><div data-team="modal"/);
  assert.match(html, /class="[^"]*cato-team-read-bio/);
  assert.doesNotMatch(html, /href="\/team-members\//);
  assert.doesNotMatch(html, /Chief Operating Officer, Co-Founder &amp; Board Member/);
  assert.doesNotMatch(html, /Brian Weichel/);
  assert.doesNotMatch(html, /Hannah Hall/);
  assert.doesNotMatch(html, /Nathan Brandon/);
  assert.doesNotMatch(html, /Rhonda Podschelne/);
  assert.doesNotMatch(html, />Board of Directors</);
  assert.equal(countMatches(html, /class="team_card"/g), 4);
  assert.equal(countMatches(html, /class="cato-company-card cato-company-board-card"/g), 0);
});

test('renders the dedicated Cato Board of Directors page without stepped-down board members', () => {
  const html = renderToStaticMarkup(<CatoBoardOfDirectorsPage />);

  assert.match(html, /Board Members/);
  assert.match(html, /Cato is guided by leaders with healthcare/);
  assert.match(html, /Bala Iyer/);
  assert.match(html, /Board Chair/);
  assert.match(html, /692863f6de1e2f0929879e3e_Bala%20\(1\)\.webp/);
  assert.match(html, /overseen more than 100 acquisitions and divestitures/);
  assert.match(html, /Ryan Zackon/);
  assert.match(html, /President &amp; Chief Executive Officer/);
  assert.match(html, /6a4be8fcf01d87d956a44c73_6a4be8204d1e9fa14eeccb81_ryan-zackon-headshot\.png/);
  assert.match(html, /Ryan Zackon is a hands-on leader/);
  assert.doesNotMatch(html, /&lt;p&gt;Ryan Zackon/);
  assert.match(html, /Heather Matzke-Hamlin/);
  assert.match(html, /6928640b6ea4b46f7af3f386_Heather%20\(1\)\.webp/);
  assert.match(html, /John Courtney/);
  assert.match(html, /692f2da62d8fd0d8d2f26f4f_johncourtney\.webp/);
  assert.match(html, /Tiffani Shaw/);
  assert.match(html, /692f2e2415ff4b8fb1bd4397_tiffani\.webp/);
  assert.match(html, /class="section_team-hero"/);
  assert.match(html, /class="section_team section_team--list"/);
  assert.ok(html.indexOf('section_team-hero') < html.indexOf('team_cms-list'));
  assert.match(html, /class="team_card"[\s\S]*?<\/article><div data-team="modal"/);
  assert.match(html, /class="[^"]*cato-team-read-bio/);
  assert.doesNotMatch(html, /href="\/team-members\//);
  assert.doesNotMatch(html, /Five board profiles in one dedicated About page/);
  assert.doesNotMatch(html, /keeps governance profiles separate/);
  assert.doesNotMatch(html, /Andy James/);
  assert.doesNotMatch(html, /Lainy Jahnke/);
  assert.doesNotMatch(html, /Brian Weichel/);
  assert.doesNotMatch(html, /Toby Ryan/);
  assert.equal(countMatches(html, /class="cato-company-card cato-company-person"/g), 0);
  assert.equal(countMatches(html, /class="team_card"/g), 5);
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

test('resolves relative Cato people endpoint props to the Worker origin', () => {
  assert.equal(
    resolveCatoPeopleEndpointUrl('/api/cato/team'),
    'https://cato-supply-insights-cms.createsomething.workers.dev/api/cato/team'
  );
  assert.equal(
    resolveCatoPeopleEndpointUrl('api/cato/team?group=leadership'),
    'https://cato-supply-insights-cms.createsomething.workers.dev/api/cato/team?group=leadership'
  );
  assert.equal(
    resolveCatoPeopleEndpointUrl('?group=board'),
    'https://cato-supply-insights-cms.createsomething.workers.dev/api/cato/team?group=board'
  );
  assert.equal(
    resolveCatoPeopleEndpointUrl(
      'https://cato-insights-cms.createsomething.workers.dev/api/cato/team'
    ),
    'https://cato-supply-insights-cms.createsomething.workers.dev/api/cato/team'
  );
  assert.equal(
    resolveCatoPeopleEndpointUrl('https://example.com/people.json'),
    'https://example.com/people.json'
  );
});

test('renders case study surfaces with the refined Cato design system', () => {
  const landingHtml = renderToStaticMarkup(<CatoCaseStudiesLanding />);
  const detailHtml = renderToStaticMarkup(<CatoCaseStudyDetail />);

  assert.match(landingHtml, /cato-company-band cato-company-case-hero/);
  assert.match(landingHtml, /cato-company-band cato-company-case-section/);
  assert.match(landingHtml, /cato-company-case-hero \{[^}]*background: linear-gradient\(180deg, rgba\(255,255,255,.98\), rgba\(251,249,244,.96\)\)/);
  assert.match(landingHtml, /cato-company-case-hero .cato-company-panel \{[^}]*background: var\(--cato-green-mid\)/);
  assert.match(landingHtml, /cato-company-case-card:hover \{[^}]*transform: translate3d\(0, -.18rem, 0\)/);
  assert.match(detailHtml, /cato-company-detail-header \{[^}]*background: linear-gradient\(180deg, rgba\(255,255,255,.98\), rgba\(251,249,244,.96\)\)/);
  assert.match(detailHtml, /cato-company-profile \{[^}]*background: var\(--cato-green-mid\)/);
  assert.match(detailHtml, /cato-company-results-section,\s*.cato-company-more-section \{ padding: 1.25rem; \}/);
});
