import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CatoAboutPage,
  CatoBoardOfDirectorsPage,
  CatoLeadershipPage,
  filterCatoTeamMembers,
  normalizeCatoTeamMembers,
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

test('renders the dedicated Cato Leadership page with active published leadership profiles', () => {
  const html = renderToStaticMarkup(<CatoLeadershipPage />);

  assert.match(html, /Ryan Zackon/);
  assert.match(html, /President &amp; Chief Executive Officer/);
  assert.match(html, /Lainy Jahnke/);
  assert.match(html, /Toby Ryan/);
  assert.match(html, /Ethan Weinberg/);
  assert.match(html, /Nicole Scarbrough/);
  assert.match(html, /Executive Operations Leader/);
  assert.match(html, /Nicole%20Scarbrough%20Headshot%20Smiling%20White%20Suit\.PNG/);
  assert.match(html, /Meet the team helping hospitals protect supply continuity/);
  assert.match(html, /Leadership Team/);
  assert.doesNotMatch(html, /Brian Weichel/);
  assert.doesNotMatch(html, /Hannah Hall/);
  assert.doesNotMatch(html, /Nathan Brandon/);
  assert.doesNotMatch(html, /Rhonda Podschelne/);
  assert.doesNotMatch(html, /forthcoming/i);
  assert.doesNotMatch(html, /about_lottie/);
  assert.doesNotMatch(html, />Board of Directors</);
  assert.equal(countMatches(html, /class="team_card"/g), 5);
  assert.equal(countMatches(html, /class="cato-team-read-bio"/g), 5);
  assert.doesNotMatch(html, /is-parent w-inline-block cato-team-read-bio/);
  assert.match(html, /\.cato-company \.team_modal \{[\s\S]*z-index: 2147483000/);
  assert.match(html, /\.cato-company \.team_modal\.is-open \{[\s\S]*display: grid/);
  assert.equal(countMatches(html, /class="cato-company-card cato-company-board-card"/g), 0);
});

test('renders the dedicated Cato Board of Directors page with active published board profiles', () => {
  const html = renderToStaticMarkup(<CatoBoardOfDirectorsPage />);

  assert.match(html, /Governance built for resilient healthcare supply/);
  assert.match(html, />Board of Directors</);
  assert.match(html, /Bala Iyer/);
  assert.match(html, /Board Chair/);
  assert.match(html, /Heather Matzke-Hamlin/);
  assert.match(html, /John Courtney/);
  assert.match(html, /Ryan Zackon/);
  assert.match(html, /Tiffani Shaw/);
  assert.doesNotMatch(html, /Five board profiles in one dedicated About page/);
  assert.doesNotMatch(html, /keeps governance profiles separate/);
  assert.doesNotMatch(html, /Brian Weichel/);
  assert.doesNotMatch(html, /Andy James/);
  assert.doesNotMatch(html, /forthcoming/i);
  assert.doesNotMatch(html, /about_lottie/);
  assert.equal(countMatches(html, /class="cato-company-card cato-company-person"/g), 0);
  assert.equal(countMatches(html, /class="team_card"/g), 5);
});

test('normalizes Webflow Team Members API items by type, image, order, and draft state', () => {
  const payload = {
    items: [
      {
        isArchived: false,
        isDraft: false,
        fieldData: {
          type: '72d1f715caf524ef1ccad0f01f4483b4',
          'profile-image': { url: 'https://cdn.example.com/nicole.png', alt: 'Nicole Scarbrough headshot' },
          'job-position': 'Executive Operations Leader',
          bio: '<p>Approved Nicole bio.</p>',
          order: null,
          'linkedin-link': null,
          name: 'Nicole Scarbrough',
          slug: 'nicole-scarbrough',
        },
      },
      {
        isArchived: false,
        isDraft: false,
        fieldData: {
          type: 'b611c7f779873dca0854edd623ff287f',
          'profile-image': { url: 'https://cdn.example.com/ryan.png', alt: 'Ryan Zackon headshot' },
          'job-position': 'President & Chief Executive Officer',
          bio: '<p>Approved Ryan bio.</p>',
          order: 5,
          name: 'Ryan Zackon',
          slug: 'ryan-zackon',
        },
      },
      {
        isArchived: true,
        isDraft: true,
        fieldData: {
          type: '72d1f715caf524ef1ccad0f01f4483b4',
          'job-position': 'VP, Engineering',
          bio: '<p>Archived bio.</p>',
          order: 3,
          name: 'Brian Weichel',
          slug: 'brian-weichel',
        },
      },
    ],
  };

  const members = normalizeCatoTeamMembers(payload);
  const leadership = filterCatoTeamMembers(members, 'leadership');
  const board = filterCatoTeamMembers(members, 'board');

  assert.deepEqual(
    members.map((member) => member.name),
    ['Ryan Zackon', 'Nicole Scarbrough']
  );
  assert.deepEqual(
    leadership.map((member) => member.name),
    ['Ryan Zackon', 'Nicole Scarbrough']
  );
  assert.deepEqual(
    board.map((member) => member.name),
    ['Ryan Zackon']
  );
  assert.equal(leadership[1]?.imageUrl, 'https://cdn.example.com/nicole.png');
  assert.equal(leadership[1]?.imageAlt, 'Nicole Scarbrough headshot');
});

test('renders shared Team Members JSON into the correct Leadership and Board pages', () => {
  const teamMembersJson = JSON.stringify({
    items: [
      {
        isArchived: false,
        isDraft: false,
        fieldData: {
          type: '72d1f715caf524ef1ccad0f01f4483b4',
          'profile-image': { url: 'https://cdn.example.com/nicole.png', alt: 'Nicole Scarbrough headshot' },
          'job-position': 'Executive Operations Leader',
          bio: '<p>Approved Nicole bio.</p>',
          order: 1,
          name: 'Nicole Scarbrough',
          slug: 'nicole-scarbrough',
        },
      },
      {
        isArchived: false,
        isDraft: false,
        fieldData: {
          type: '6319b950e246fe2e75f029a26f942eb0',
          'profile-image': { url: 'https://cdn.example.com/bala.png', alt: 'Bala Iyer headshot' },
          'job-position': 'Board Chair',
          bio: '<p>Approved board bio.</p>',
          order: 1,
          name: 'Bala Iyer',
          slug: 'bala-iyer',
        },
      },
    ],
  });

  const leadershipHtml = renderToStaticMarkup(<CatoLeadershipPage teamMembersJson={teamMembersJson} />);
  const boardHtml = renderToStaticMarkup(<CatoBoardOfDirectorsPage teamMembersJson={teamMembersJson} />);

  assert.match(leadershipHtml, /Nicole Scarbrough/);
  assert.doesNotMatch(leadershipHtml, /Bala Iyer/);
  assert.match(boardHtml, /Bala Iyer/);
  assert.doesNotMatch(boardHtml, /Nicole Scarbrough/);
});
