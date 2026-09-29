import assert from 'node:assert/strict';
import { test } from 'node:test';
import { htmlToPlainText, normalizeInsights, normalizeTeam } from '../src/worker.mjs';

test('normalizes published resiliency insights with the existing endpoint shape', () => {
  const items = normalizeInsights(
    [
      {
        id: 'draft',
        isDraft: true,
        lastPublished: null,
        fieldData: {
          name: 'Draft alert',
          slug: 'draft-alert',
          categories: ['69fd0f88dd6c789f8c5720a5']
        }
      },
      {
        id: 'published',
        isDraft: true,
        lastPublished: '2026-05-07T00:00:00.000Z',
        fieldData: {
          name: 'Nasal Oral Endotracheal Tubes Backorders',
          slug: 'nasal-oral-endotracheal-tubes-backorders',
          categories: ['69fd0f88dd6c789f8c5720a5'],
          'resource-type': '0e5ef31b9a043353f4c9fc760c3c669b',
          'content-label': 'Resiliency Report',
          'short-summary': 'Allocation pressure is concentrated in pediatric sizes.',
          'publish-date': '2026-05-07T00:00:00.000Z'
        }
      }
    ],
    { category: 'resiliency' }
  );

  assert.equal(items.length, 1);
  assert.deepEqual(
    {
      title: items[0].title,
      slug: items[0].slug,
      href: items[0].href,
      category: items[0].category,
      pill: items[0].pill
    },
    {
      title: 'Nasal Oral Endotracheal Tubes Backorders',
      slug: 'nasal-oral-endotracheal-tubes-backorders',
      href: '/insights/nasal-oral-endotracheal-tubes-backorders',
      category: 'resiliency',
      pill: 'Resiliency Report'
    }
  );
});

test('normalizes team members for endpoint-driven leadership and board components', () => {
  const people = normalizeTeam([
    {
      id: 'ryan',
      lastPublished: '2026-07-06T15:44:00.000Z',
      fieldData: {
        name: 'Ryan Zackon',
        slug: 'ryan-zackon',
        type: '6319b950e246fe2e75f029a26f942eb0',
        'job-position': 'President & Chief Executive Officer',
        bio: '<p>CEO profile.</p>',
        'profile-image': {
          url: 'https://cdn.example.com/ryan-zackon-rz-placeholder.svg'
        },
        order: 5
      }
    },
    {
      id: 'bala',
      lastPublished: '2026-03-12T15:07:00.000Z',
      fieldData: {
        name: 'Bala Iyer',
        type: '6319b950e246fe2e75f029a26f942eb0',
        'job-position': 'Board Chair',
        bio: '<p>Board chair profile.</p>',
        'profile-image': {
          url: 'https://cdn.example.com/bala.webp'
        },
        order: 1
      }
    }
  ]);

  assert.deepEqual(
    people.map((person) => [person.name, person.group, person.imageUrl]),
    [
      ['Bala Iyer', 'board', 'https://cdn.example.com/bala.webp'],
      ['Ryan Zackon', 'leadership', ''],
      ['Ryan Zackon', 'board', '']
    ]
  );
});

test('filters team members by group after expanding both-group profiles', () => {
  const people = normalizeTeam(
    [
      {
        id: 'ryan',
        lastPublished: '2026-07-06T15:44:00.000Z',
        fieldData: {
          name: 'Ryan Zackon',
          type: '6319b950e246fe2e75f029a26f942eb0',
          'job-position': 'President & Chief Executive Officer',
          order: 1
        }
      }
    ],
    { group: 'leadership' }
  );

  assert.equal(people.length, 1);
  assert.equal(people[0].group, 'leadership');
});

test('converts Webflow rich text bio HTML to plain text for modals', () => {
  assert.equal(
    htmlToPlainText('<p>Finance &amp; transformation<br>leader.</p>'),
    'Finance & transformation\nleader.'
  );
});

test('does not expose raw rich text bio through team fieldData', () => {
  const [person] = normalizeTeam([
    {
      id: 'ryan',
      lastPublished: '2026-07-06T15:44:00.000Z',
      fieldData: {
        name: 'Ryan Zackon',
        type: 'b611c7f779873dca0854edd623ff287f',
        bio: '<p>Ryan leads Cato &amp; healthcare teams.</p>',
        order: 1
      }
    }
  ]);

  assert.equal(person.bio, 'Ryan leads Cato & healthcare teams.');
  assert.equal(person.fieldData.bio, 'Ryan leads Cato & healthcare teams.');
  assert.doesNotMatch(person.fieldData.bio, /<p>/);
});
