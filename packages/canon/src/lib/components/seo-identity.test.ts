// @vitest-environment node
import { render } from 'svelte/server';
import { readable } from 'svelte/store';
import { describe, expect, it } from 'vitest';

import SEO from './SEO.svelte';

const organizationId = 'https://createsomething.ltd/#organization';
const organizationLogoUrl = 'https://createsomething.ltd/icon-512.png';

function schemasFor(propertyName: 'agency' | 'space' | 'io' | 'ltd') {
  return schemasFromHead(headFor(propertyName));
}

function headFor(propertyName: 'agency' | 'space' | 'io' | 'ltd') {
  const { head } = render(SEO, {
    props: {
      title: `${propertyName} page`,
      description: `${propertyName} description`,
      propertyName
    },
    context: pageContext(`https://createsomething.${propertyName}/`)
  });

  return head;
}

function schemasFromHead(head: string) {
  return [...head.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
    ([, serialized]) => JSON.parse(serialized)
  );
}

function pageContext(url: string) {
  return new Map([
    [
      '__svelte__',
      {
        page: readable({ url: new URL(url) }),
        navigating: readable(null),
        updated: { subscribe: readable(false).subscribe }
      }
    ]
  ]);
}

describe('SEO public identity graph', () => {
  it.each([
    ['agency', 'https://createsomething.agency/og-image.png'],
    ['space', 'https://createsomething.space/og-image.png'],
    ['io', 'https://createsomething.io/og-image.png'],
    ['ltd', 'https://createsomething.ltd/og-image.png']
  ] as const)('uses one Organization and a property-owned page image for %s', (propertyName, socialImage) => {
    const schemas = schemasFor(propertyName);
    const organization = schemas.find((schema) => schema['@type'] === 'Organization');
    const website = schemas.find((schema) => schema['@type'] === 'WebSite');
    const webPage = schemas.find((schema) => schema['@type'] === 'WebPage');

    expect(organization).toMatchObject({
      '@id': organizationId,
      url: 'https://createsomething.ltd',
      logo: {
        '@type': 'ImageObject',
        url: organizationLogoUrl,
        width: 512,
        height: 512
      }
    });
    expect(website.publisher).toEqual({ '@id': organizationId });
    expect(webPage.publisher).toEqual({ '@id': organizationId });
    expect(webPage.primaryImageOfPage).toMatchObject({
      '@type': 'ImageObject',
      url: socialImage,
      contentUrl: socialImage,
      width: 1200,
      height: 630
    });
  });

  it.each([
    ['agency', 'https://createsomething.agency/og-image.png'],
    ['space', 'https://createsomething.space/og-image.png'],
    ['io', 'https://createsomething.io/og-image.png'],
    ['ltd', 'https://createsomething.ltd/og-image.png']
  ] as const)('publishes a complete PNG social image record for %s', (propertyName, socialImage) => {
    const head = headFor(propertyName);

    expect(head).toContain(`property="og:image" content="${socialImage}"`);
    expect(head).toContain('property="og:image:type" content="image/png"');
    expect(head).toContain('property="og:image:width" content="1200"');
    expect(head).toContain('property="og:image:height" content="630"');
    expect(head).toContain(`name="twitter:image" content="${socialImage}"`);
    expect(head).toContain('name="twitter:image:alt"');
  });

  it.each([
    [0, 0],
    [900, 900],
    ['900.50', 900.5]
  ])('publishes a numeric service price for %s, including free offers', (price, expected) => {
    const { head } = render(SEO, {
      props: {
        title: 'Services', description: 'Agreed workflow support', propertyName: 'agency',
        services: [{ name: 'Support', price, priceDescription: 'Starting monthly price; scoped separately' }]
      },
      context: pageContext('https://createsomething.agency/services')
    });
    const service = schemasFromHead(head).find((schema) => schema['@type'] === 'Service');
    expect(service.offers).toMatchObject({
      '@type': 'Offer', price: expected, priceCurrency: 'USD',
      description: 'Starting monthly price; scoped separately'
    });
  });

  it.each(['Custom', 'From $900/month', '$0 browser-local starter', '', -1, NaN, Infinity, null, undefined])(
    'keeps quote terms without emitting an invalid service price for %s', (price) => {
      const { head } = render(SEO, {
        props: {
          title: 'Services', description: 'Agreed workflow support', propertyName: 'agency',
          services: [{ name: 'Build', price, priceDescription: 'Quoted after fit' }]
        },
        context: pageContext('https://createsomething.agency/services')
      });
      const service = schemasFromHead(head).find((schema) => schema['@type'] === 'Service');
      expect(service.offers.description).toBe('Quoted after fit');
      expect(service.offers).not.toHaveProperty('price');
      expect(service.offers).not.toHaveProperty('priceCurrency');
    }
  );

  it.each([
    ['ltd', /operating library/i],
    ['space', /public workshop/i]
  ] as const)('describes the current %s property role in WebSite schema', (propertyName, role) => {
    const website = schemasFor(propertyName).find((schema) => schema['@type'] === 'WebSite');
    expect(website.description).toMatch(role);
  });

  it('makes Article records reuse the page image and canonical Organization', () => {
    const { head } = render(SEO, {
      props: {
        title: 'Article page',
        description: 'Article description',
        propertyName: 'agency',
        ogType: 'article',
        publishedTime: '2026-08-12T00:00:00.000Z'
      },
      context: pageContext('https://createsomething.agency/')
    });
    const article = schemasFromHead(head).find((schema) => schema['@type'] === 'Article');

    expect(article.publisher).toEqual({ '@id': organizationId });
    expect(article.author).toEqual({ '@id': organizationId, name: 'Create Something' });
    expect(article.image).toMatchObject({
      url: 'https://createsomething.agency/og-image.png',
      width: 1200,
      height: 630
    });
    expect(article.mainEntityOfPage).toEqual({
      '@id': 'https://createsomething.agency#webpage'
    });
  });
});
